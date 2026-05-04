import paramiko, os

SRC = r"C:\Users\pb\Documents\Claude Code Local\My Entertainment\Show Pitch Machine"
DST = "C:/Users/bang/show-pitch-machine"
EXCLUDE_DIRS = {'node_modules', 'data', '.next', '.git', '__pycache__'}
EXCLUDE_EXT = {'.sqlite', '.sqlite-wal', '.sqlite-shm', '.zip'}
EXCLUDE_FILES = {'.env'}

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('10.0.0.208', username='bang', password='', timeout=10)
sftp = client.open_sftp()

def ensure_dir(sftp, path):
    path = path.replace('\\', '/')
    parts = [p for p in path.split('/') if p]
    current = ''
    for part in parts:
        current = current + '/' + part if current else part
        try:
            sftp.stat(current)
        except FileNotFoundError:
            sftp.mkdir(current)

count = 0
errors = 0
for root, dirs, files in os.walk(SRC):
    dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
    rel_root = os.path.relpath(root, SRC).replace('\\', '/')
    remote_dir = (DST + '/' + rel_root).replace('//', '/') if rel_root != '.' else DST
    try:
        ensure_dir(sftp, remote_dir)
    except Exception as e:
        print(f"mkdir error {remote_dir}: {e}")
        continue
    for fname in files:
        if fname in EXCLUDE_FILES:
            continue
        if os.path.splitext(fname)[1].lower() in EXCLUDE_EXT:
            continue
        local_path = os.path.join(root, fname)
        remote_path = remote_dir + '/' + fname
        try:
            sftp.put(local_path, remote_path)
            count += 1
            if count % 50 == 0:
                print(f"  {count} files transferred...")
        except Exception as e:
            print(f"ERROR {fname}: {e}")
            errors += 1

sftp.close()
client.close()
print(f"Done: {count} files transferred, {errors} errors")
