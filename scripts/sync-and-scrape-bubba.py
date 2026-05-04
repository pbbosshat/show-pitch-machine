"""
Sync Show Pitch Machine scraper files to Bubba (10.0.0.16), run the full scraper
suite using Bubba's local Chrome (port 9222), then pull the resulting SQLite DB
back to this machine.

Run once manually; future runs just re-sync changed files and re-run scrapers.
"""

import paramiko
import os
import sys
import json
import time
import stat

BUBBA_HOST = '10.0.0.16'
BUBBA_USER = 'rdp_pb'
REMOTE_DIR = 'C:/Users/rdp_pb/show-pitch-machine'

LOCAL_PROJECT = r'c:\Users\pb\Documents\Claude Code Local\My Entertainment\Show Pitch Machine'
SERVICE_ACCOUNT_PATH = r'C:\Users\pb\.claude\google\service_account.json'

LOCAL_DB_DEST = os.path.join(LOCAL_PROJECT, 'data', 'db.sqlite')

# Files to upload: (local_subpath, remote_subpath)
UPLOAD_DIRS = ['scrapers', 'lib', 'scripts', 'migrations', 'types']
UPLOAD_ROOT_FILES = ['package.json', 'package-lock.json', 'tsconfig.json']

ENV_CONTENT = """BROWSER_MODE=local
GMAIL_NEWSLETTER_USER=sm@gototeam.com
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=C:/Users/rdp_pb/show-pitch-machine/service_account.json
DATABASE_PATH=C:/Users/rdp_pb/show-pitch-machine/data/db.sqlite
"""


def connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    # Try key auth first, fall back to empty password
    try:
        key_path = os.path.expanduser('~/.ssh/id_ed25519')
        client.connect(BUBBA_HOST, username=BUBBA_USER, key_filename=key_path, timeout=12)
    except Exception:
        client.connect(BUBBA_HOST, username=BUBBA_USER, password='', timeout=12)
    print(f'[ssh] Connected to {BUBBA_HOST} as {BUBBA_USER}')
    return client


def run_cmd(client, cmd, timeout=60):
    """Run a command and return (stdout, stderr, exit_code)."""
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    code = stdout.channel.recv_exit_status()
    return out, err, code


def sftp_mkdir_p(sftp, remote_path):
    """Create remote directory tree, ignoring existing dirs."""
    parts = remote_path.replace('\\', '/').split('/')
    # Build up path incrementally
    current = ''
    for part in parts:
        if not part:
            continue
        current = current + '/' + part if current else part
        # Handle drive letter (e.g. 'C:')
        if current.endswith(':'):
            current += '/'
            continue
        try:
            sftp.stat(current)
        except FileNotFoundError:
            try:
                sftp.mkdir(current)
            except Exception:
                pass  # Already exists or can't create — continue


def upload_dir(sftp, local_dir, remote_dir):
    """Recursively upload all files from local_dir to remote_dir."""
    os.makedirs(local_dir, exist_ok=False) if False else None  # no-op
    if not os.path.isdir(local_dir):
        print(f'  [skip] {local_dir} not found locally')
        return

    sftp_mkdir_p(sftp, remote_dir)

    for entry in os.listdir(local_dir):
        local_path = os.path.join(local_dir, entry)
        # Normalise remote path: always use forward slashes
        remote_path = remote_dir.rstrip('/') + '/' + entry

        if os.path.isdir(local_path):
            upload_dir(sftp, local_path, remote_path)
        elif os.path.isfile(local_path):
            sftp.put(local_path, remote_path)
            print(f'  -> {remote_path}')


def main():
    client = connect()
    sftp = client.open_sftp()

    # ── 1. Create base directory ──────────────────────────────────────────────
    print('\n[1] Creating remote directory structure...')
    sftp_mkdir_p(sftp, REMOTE_DIR)
    sftp_mkdir_p(sftp, REMOTE_DIR + '/data')

    # ── 2. Upload source directories ─────────────────────────────────────────
    print('\n[2] Uploading source files...')
    for d in UPLOAD_DIRS:
        local_d = os.path.join(LOCAL_PROJECT, d)
        remote_d = REMOTE_DIR + '/' + d
        upload_dir(sftp, local_d, remote_d)

    for f in UPLOAD_ROOT_FILES:
        local_f = os.path.join(LOCAL_PROJECT, f)
        if os.path.exists(local_f):
            remote_f = REMOTE_DIR + '/' + f
            sftp.put(local_f, remote_f)
            print(f'  -> {remote_f}')

    # ── 3. Upload service account key ─────────────────────────────────────────
    print('\n[3] Uploading service account key...')
    sftp.put(SERVICE_ACCOUNT_PATH, REMOTE_DIR + '/service_account.json')
    print(f'  -> {REMOTE_DIR}/service_account.json')

    # ── 4. Write .env file ───────────────────────────────────────────────────
    print('\n[4] Writing .env...')
    with sftp.file(REMOTE_DIR + '/.env', 'w') as f:
        f.write(ENV_CONTENT)
    print('  -> .env written')

    sftp.close()

    # ── 5. npm install ────────────────────────────────────────────────────────
    print('\n[5] Running npm install (this takes ~2-3 minutes)...')
    npm_cmd = (
        f'set PUPPETEER_SKIP_DOWNLOAD=1 && '
        f'set npm_config_prefix={REMOTE_DIR}\\npm-global && '
        f'cd /d "{REMOTE_DIR.replace("/", chr(92))}" && '
        f'npm install --prefer-offline 2>&1'
    )
    out, err, code = run_cmd(client, npm_cmd, timeout=300)
    # npm writes progress to stderr and summary to stdout
    combined = (out + err).strip()
    if combined:
        # Print last 20 lines to avoid flooding
        lines = combined.split('\n')
        for line in lines[-20:]:
            print(' ', line)
    if code != 0:
        print(f'[npm install] Exit code {code} — may still be OK if packages installed')
    else:
        print('[npm install] Done')

    # ── 6. Verify Chrome is accessible ───────────────────────────────────────
    print('\n[6] Checking Bubba Chrome at localhost:9222...')
    out, err, _ = run_cmd(client, 'curl -sf http://localhost:9222/json/version', timeout=10)
    if '"webSocketDebuggerUrl"' in out or 'Browser' in out:
        print('  Chrome CDP is up')
    else:
        print('  WARNING: Chrome may not be running at localhost:9222')
        print('  Starting via scheduled task...')
        run_cmd(client, 'schtasks /Run /TN ChromeDebugLaunch 2>&1', timeout=15)
        time.sleep(8)
        out, _, _ = run_cmd(client, 'curl -sf http://localhost:9222/json/version', timeout=10)
        if 'Browser' in out or 'webSocketDebuggerUrl' in out:
            print('  Chrome is now up')
        else:
            print('  Chrome still not responding — scrapers may fail for web sources')

    # ── 7. Run scrapers ───────────────────────────────────────────────────────
    print('\n[7] Running scrapers on Bubba...')
    scrape_cmd = (
        f'cd /d "{REMOTE_DIR.replace("/", chr(92))}" && '
        f'npx tsx --env-file=.env scripts/scrape-all.ts 2>&1'
    )
    print(f'  CMD: {scrape_cmd}')

    # Stream output line by line
    _, stdout, stderr = client.exec_command(scrape_cmd, timeout=600)
    while True:
        line = stdout.readline()
        if not line:
            break
        print(' ', line.rstrip())

    exit_code = stdout.channel.recv_exit_status()
    print(f'\n[scraper] Exit code: {exit_code}')

    # ── 8. Pull DB back to PB ─────────────────────────────────────────────────
    print('\n[8] Pulling db.sqlite back to PB machine...')
    remote_db = REMOTE_DIR + '/data/db.sqlite'
    os.makedirs(os.path.dirname(LOCAL_DB_DEST), exist_ok=True)

    sftp = client.open_sftp()
    try:
        stat_result = sftp.stat(remote_db)
        size_mb = stat_result.st_size / (1024 * 1024)
        print(f'  Remote DB size: {size_mb:.1f} MB')
        sftp.get(remote_db, LOCAL_DB_DEST)
        print(f'  Saved to: {LOCAL_DB_DEST}')
    except FileNotFoundError:
        print('  ERROR: Remote DB not found — scrapers may have failed')
    finally:
        sftp.close()

    client.close()
    print('\nDone.')


if __name__ == '__main__':
    main()
