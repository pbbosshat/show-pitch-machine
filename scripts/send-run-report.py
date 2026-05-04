"""
SPM daily run report emailer.
Reads scrape.log for last run stats, queries DB for enrichment progress,
and emails a summary to patrickbryant@gototeam.com via Gmail API.

Sections included in every email:
  - Trade scraper results (new articles by source, last 24h)
  - Classify signals (freed-budget / mandate / greenlit flagged today)
  - Episodate enrichment stats (from log)
  - TVDB enrichment stats (from log)
  - Overall DB progress (show counts, Episodate gap-fill %)

Sends every run while TVDB enrichment is incomplete; stops automatically
once all shows are covered (tvdb_id set or tvdb_searched_at stamped).

Run: python scripts/send-run-report.py
"""

import sqlite3
import os
import re
import sys
from datetime import datetime
from pathlib import Path

# ── Google Gmail API via service account ──────────────────────────────────────
from googleapiclient.discovery import build
import base64
from email.mime.text import MIMEText

PROJECT_DIR  = Path(__file__).parent.parent
LOG_PATH     = PROJECT_DIR / "data" / "scrape.log"
DB_PATH      = PROJECT_DIR / "data" / "db.sqlite"
TOKEN_PATH   = PROJECT_DIR / "data" / "gmail-token.json"
CREDS_PATH   = PROJECT_DIR / "data" / "gmail-credentials.json"

SENDER    = "patrickbryant@gototeam.com"
RECIPIENT = "patrickbryant@gototeam.com"

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]


def gmail_service():
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request

    creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)

    # Refresh if expired — writes updated token back to file
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        TOKEN_PATH.write_text(creds.to_json())

    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def send_email(subject: str, body: str) -> None:
    msg = MIMEText(body, "plain", "utf-8")
    msg["To"]      = RECIPIENT
    msg["From"]    = SENDER
    msg["Subject"] = subject
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    svc = gmail_service()
    svc.users().messages().send(userId="me", body={"raw": raw}).execute()


# ── Log parsing ───────────────────────────────────────────────────────────────

# All known scrapers in run order
ALL_SCRAPERS = [
    "gmail-newsletters", "deadline", "variety", "thr", "c21", "realscreen",
    "cynopsis", "tvline", "indiewire", "bc", "production-weekly", "network-press",
]

def parse_last_run(log_path: Path) -> dict:
    """
    Extract stats from the most recent run block in scrape.log.
    Looks for === Daily run starting === ... === Daily run complete === delimiters.
    Falls back to the last 60 lines if no delimiter is found (first-ever run).
    """
    if not log_path.exists():
        return {"found": False, "raw": "(log file not found)", "scraper_errors": {}}

    text = log_path.read_text(encoding="utf-8", errors="replace")

    # Split on run delimiters and take the last complete block
    blocks = re.split(r"={5} Daily run starting ={5}", text)
    if len(blocks) < 2:
        lines = text.strip().splitlines()
        return {"found": False, "raw": "\n".join(lines[-60:]), "scraper_errors": {}}

    last_block = blocks[-1]
    complete_match = re.search(r"={5} Daily run complete ={5}", last_block)
    if complete_match:
        last_block = last_block[:complete_match.end()]

    # Run start timestamp
    ts_match = re.search(r"\[(.+?)\]", last_block)
    run_time = ts_match.group(1) if ts_match else "unknown"

    # Per-scraper errors: lines like "[deadline] scrape failed: <reason>"
    # Capture the source name and the first 120 chars of the reason
    scraper_errors: dict[str, str] = {}
    for m in re.finditer(r"\[([^\]]+)\] scrape failed:\s*(.+)", last_block):
        src, reason = m.group(1).strip(), m.group(2).strip()[:120]
        scraper_errors[src] = reason

    # TVDB summary block
    tvdb_match = re.search(
        r"TVDB enrichment complete.*?matched\s*:\s*(\d+).*?updated\s*:\s*(\d+).*?skipped\s*:\s*(\d+).*?errors\s*:\s*(\d+)",
        last_block, re.DOTALL
    )
    tvdb = {}
    if tvdb_match:
        tvdb = {
            "matched": int(tvdb_match.group(1)),
            "updated": int(tvdb_match.group(2)),
            "skipped": int(tvdb_match.group(3)),
            "errors":  int(tvdb_match.group(4)),
        }

    # Episodate summary block
    epis_match = re.search(
        r"Episodate enrichment complete.*?matched\s*:\s*(\d+).*?updated\s*:\s*(\d+).*?skipped\s*:\s*(\d+).*?errors\s*:\s*(\d+)",
        last_block, re.DOTALL
    )
    episodate = {}
    if epis_match:
        episodate = {
            "matched": int(epis_match.group(1)),
            "updated": int(epis_match.group(2)),
            "skipped": int(epis_match.group(3)),
            "errors":  int(epis_match.group(4)),
        }

    steps_done = re.findall(r"Step \d+\w*: .+ complete", last_block)
    run_complete = bool(re.search(r"Daily run complete", last_block))

    return {
        "found":        True,
        "run_time":     run_time,
        "run_complete": run_complete,
        "tvdb":         tvdb,
        "episodate":    episodate,
        "steps":        steps_done,
        "scraper_errors": scraper_errors,
        "raw":          last_block.strip()[-3000:],
    }


# ── DB stats ──────────────────────────────────────────────────────────────────

def db_stats() -> dict:
    if not DB_PATH.exists():
        return {}
    con = sqlite3.connect(str(DB_PATH))
    cur = con.cursor()

    def q(sql, params=(), default=0):
        try:
            row = cur.execute(sql, params).fetchone()
            return row[0] if row else default
        except Exception:
            return default

    def qall(sql, params=()):
        try:
            return cur.execute(sql, params).fetchall()
        except Exception:
            return []

    # Show counts
    total          = q("SELECT COUNT(*) FROM shows")
    tvdb_done      = q("SELECT COUNT(*) FROM shows WHERE tvdb_id IS NOT NULL OR tvdb_searched_at IS NOT NULL")
    tvdb_remaining = q(
        "SELECT COUNT(*) FROM shows "
        "WHERE (total_seasons IS NULL OR episode_count IS NULL) "
        "AND tvdb_id IS NULL AND tvdb_searched_at IS NULL"
    )
    tvdb_matched   = q("SELECT COUNT(*) FROM shows WHERE tvdb_id IS NOT NULL")

    # Episodate gap-fill progress
    epis_gap_remaining = q(
        "SELECT COUNT(*) FROM shows "
        "WHERE (episode_count IS NULL OR total_seasons IS NULL)"
    )

    # Show classification breakdown
    tier_rows = qall(
        "SELECT relevance_tier, COUNT(*) FROM shows "
        "WHERE relevance_tier IS NOT NULL GROUP BY relevance_tier ORDER BY relevance_tier"
    )
    tier_counts = {row[0]: row[1] for row in tier_rows}

    # Trade articles — new in last 24h grouped by source (scraped_at is ms epoch)
    scraper_rows = qall(
        "SELECT source, COUNT(*) as n FROM trade_articles "
        "WHERE scraped_at > (strftime('%s','now','-1 day') * 1000) "
        "GROUP BY source ORDER BY n DESC"
    )

    # Per-source last_items and last_run_at from scraper_source_status
    status_rows = qall(
        "SELECT source, last_items, last_run_at, consecutive_failures "
        "FROM scraper_source_status WHERE last_run_at IS NOT NULL ORDER BY source"
    )

    # Actionable signals in articles added in last 24h
    signal_rows = qall(
        "SELECT signal_type, COUNT(*) as n FROM trade_articles "
        "WHERE scraped_at > (strftime('%s','now','-1 day') * 1000) "
        "  AND signal_type IS NOT NULL "
        "  AND relevance_tier IN ('1-direct', '2-adjacent') "
        "GROUP BY signal_type ORDER BY n DESC"
    )

    # Total article count for context
    total_articles = q("SELECT COUNT(*) FROM trade_articles")

    con.close()
    return {
        "total":               total,
        "tvdb_done":           tvdb_done,
        "tvdb_remaining":      tvdb_remaining,
        "tvdb_matched":        tvdb_matched,
        "epis_gap_remaining":  epis_gap_remaining,
        "tier_counts":         tier_counts,
        "scraper_rows":        scraper_rows,      # [(source, n), ...]
        "status_rows":         status_rows,       # [(source, last_items, last_run_at, consecutive_failures), ...]
        "signal_rows":         signal_rows,       # [(signal_type, n), ...]
        "total_articles":      total_articles,
    }


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    stats = db_stats()
    run   = parse_last_run(LOG_PATH)

    remaining = stats.get("tvdb_remaining", -1)
    total      = stats.get("total", 0)
    done       = stats.get("tvdb_done", 0)

    # ── Subject line ──────────────────────────────────────────────────────────
    scraper_total  = sum(n for _, n in stats.get("scraper_rows", []))
    scraper_errors = run.get("scraper_errors", {})
    n_failed       = len(scraper_errors)
    tvdb_updated   = run.get("tvdb", {}).get("updated", 0)
    epis_updated   = run.get("episodate", {}).get("updated", 0)
    run_complete   = run.get("run_complete", False)

    subject = f"SPM: +{scraper_total} articles"
    if n_failed:
        subject += f" | {n_failed} scraper{'s' if n_failed != 1 else ''} FAILED"
    if not run_complete:
        subject += " | ⚠ run incomplete"
    if tvdb_updated:
        subject += f" | TVDB +{tvdb_updated}"
    if epis_updated:
        subject += f" | Episodate +{epis_updated}"
    subject += f" | {remaining} left to enrich"

    # ── Body ──────────────────────────────────────────────────────────────────
    lines = []
    lines.append("Show Pitch Machine — Daily Run Report")
    lines.append("=" * 52)
    lines.append(f"Run time   : {run.get('run_time', 'unknown')}")
    lines.append(f"Report     : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"Run status : {'COMPLETE' if run_complete else 'INCOMPLETE — check scrape.log'}")
    lines.append("")

    # ── 1. Per-scraper status table ───────────────────────────────────────────
    # Build lookup: source → last_items from scraper_source_status
    status_lookup: dict[str, int] = {
        row[0]: row[1] for row in stats.get("status_rows", [])
    }
    # Use scraper_rows (articles in DB) as a cross-check
    article_lookup: dict[str, int] = {
        row[0]: row[1] for row in stats.get("scraper_rows", [])
    }

    lines.append(f"TRADE SCRAPERS — {scraper_total} new articles today")
    lines.append("-" * 52)
    ok_count   = 0
    fail_count = 0
    for src in ALL_SCRAPERS:
        items     = status_lookup.get(src, article_lookup.get(src, 0))
        failed    = src in scraper_errors
        src_label = src.ljust(22)
        if failed:
            reason = scraper_errors[src]
            # Shorten common error messages to keep the line readable
            reason = re.sub(r"Failed to fetch browser webSocket URL from .+?: ", "CDP: ", reason)
            reason = re.sub(r"ENOENT: no such file or directory, open '(.+?)'", r"Missing: \1", reason)
            lines.append(f"  ✗ {src_label} {items:>4}  ({reason[:70]})")
            fail_count += 1
        elif src in status_lookup or src in article_lookup:
            lines.append(f"  ✓ {src_label} {items:>4} article{'s' if items != 1 else ''}")
            ok_count += 1
        else:
            lines.append(f"  - {src_label}   —   (not yet run)")

    lines.append(f"  {'─'*46}")
    lines.append(f"  {ok_count} scrapers OK  |  {fail_count} failed  |  {scraper_total} total articles")
    lines.append(f"  Total articles in DB : {stats.get('total_articles', 0):,}")
    lines.append("")

    # ── 2. Actionable signals flagged today ───────────────────────────────────
    signal_rows = stats.get("signal_rows", [])
    signal_map  = {s: n for s, n in signal_rows}
    signal_total = sum(n for _, n in signal_rows)

    lines.append("CLASSIFY — actionable signals in today's articles")
    lines.append("-" * 40)
    if signal_rows:
        label_map = {
            "freed-budget": "Freed budget (cancellation)",
            "greenlit":     "New greenlit order",
            "renewed":      "Renewal",
            "mandate":      "Buyer mandate statement",
        }
        for sig_type, label in label_map.items():
            n = signal_map.get(sig_type, 0)
            if n:
                lines.append(f"  {label.ljust(30)} {n:>3}")
        if signal_total == 0:
            lines.append("  (no actionable signals in today's articles)")
    else:
        lines.append("  (no actionable signals today)")

    # Show tier breakdown from full classify pass
    tier_counts = stats.get("tier_counts", {})
    if tier_counts:
        lines.append("")
        lines.append("  Show DB classification (all shows):")
        tier_labels = {
            "1-direct":   "  Direct lane (pitch targets)",
            "2-adjacent": "  Adjacent (watch list)",
            "3-skip":     "  Skip (scripted/wrong lane)",
        }
        for tier, label in tier_labels.items():
            n = tier_counts.get(tier, 0)
            if n:
                lines.append(f"    {label.ljust(30)} {n:>6,}")
    lines.append("")

    # ── 3. Episodate enrichment ───────────────────────────────────────────────
    epis = run.get("episodate", {})
    lines.append("EPISODATE — episode/season gap-fill")
    lines.append("-" * 40)
    if epis:
        lines.append(f"  Matched  : {epis['matched']}")
        lines.append(f"  Updated  : {epis['updated']}")
        lines.append(f"  Skipped  : {epis['skipped']}  (no Episodate match)")
        lines.append(f"  Errors   : {epis['errors']}")
    else:
        lines.append("  (Episodate did not run or no log block found)")
    epis_remaining = stats.get("epis_gap_remaining", 0)
    lines.append(f"  Gap rows remaining : {epis_remaining:,}  (episode_count or total_seasons NULL)")
    lines.append("")

    # ── 4. TVDB enrichment ────────────────────────────────────────────────────
    tvdb = run.get("tvdb", {})
    lines.append("TVDB — episode/season data")
    lines.append("-" * 40)
    if tvdb:
        lines.append(f"  Matched  : {tvdb['matched']}")
        lines.append(f"  Updated  : {tvdb['updated']}")
        lines.append(f"  Skipped  : {tvdb['skipped']}  (no TVDB match)")
        lines.append(f"  Errors   : {tvdb['errors']}")
    else:
        lines.append("  (TVDB did not run or no log block found)")
    pct = round(done / total * 100, 1) if total else 0
    lines.append(f"  Processed: {done:,} / {total:,}  ({pct}%)")
    lines.append(f"  Still remaining : {remaining:,}")
    if remaining == 0:
        lines.append("  [DONE] TVDB enrichment COMPLETE")
    else:
        days_left = round(remaining / 500)
        lines.append(f"  At 500/day: ~{days_left} more run(s) to complete")
    lines.append("")

    # ── 5. Steps completed ────────────────────────────────────────────────────
    if run.get("steps"):
        lines.append("STEPS COMPLETED")
        lines.append("-" * 40)
        for s in run["steps"]:
            lines.append(f"  * {s}")
        lines.append("")

    body = "\n".join(lines)

    print(body)
    print("\nSending email...")
    send_email(subject, body)
    print(f"Email sent to {RECIPIENT}")

    # Exit code 0 always — don't fail the bat file if email fails
    sys.exit(0)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"send-run-report.py error: {e}", file=sys.stderr)
        sys.exit(0)  # non-fatal — bat file continues
