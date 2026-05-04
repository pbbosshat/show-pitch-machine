# Pull the latest scraped DB from Bang to PB's local dev environment.
# Run manually after Bang's 6am scrape, or schedule at 6:30am.
# Usage: powershell -File pull-db-from-bang.ps1

$bangDb   = "bang@10.0.0.208:C:/Users/bang/show-pitch-machine/data/db.sqlite"
$localDb  = "C:\Users\pb\Documents\Claude Code Local\My Entertainment\Show Pitch Machine\data\db.sqlite"
$keyFile  = "$env:USERPROFILE\.ssh\id_ed25519"

Write-Host "Pulling DB from Bang..."
scp -i $keyFile -o StrictHostKeyChecking=no $bangDb $localDb
if ($LASTEXITCODE -eq 0) {
    Write-Host "Done. DB updated at $localDb"
} else {
    Write-Host "SCP failed (exit $LASTEXITCODE)" -ForegroundColor Red
}
