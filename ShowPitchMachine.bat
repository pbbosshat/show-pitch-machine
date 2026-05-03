@echo off
cd /d "%~dp0"

REM Run migrations to ensure schema is up to date
call npx tsx scripts/migrate.ts

REM Seed if database is empty (safe to run multiple times — uses INSERT OR IGNORE)
call npx tsx scripts/seed.ts

REM Start the Next.js server in background (no console window)
start /B npm run start

REM Wait 3 seconds for server to be ready
timeout /t 3 /nobreak >nul

REM Open the app in the default browser
start http://localhost:3000
