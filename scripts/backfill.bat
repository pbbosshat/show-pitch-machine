@echo off
cd /d C:\Users\bang\show-pitch-machine
"C:\Program Files\nodejs\npx.cmd" tsx scripts/backfill-emails.ts > data\backfill.log 2>&1
