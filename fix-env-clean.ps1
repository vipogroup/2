# Fix MONGODB_DB with clean value (no newlines)
$ErrorActionPreference = "Continue"

Write-Host "Fixing MONGODB_DB environment variable..." -ForegroundColor Cyan
Write-Host ""

# Remove old variables
Write-Host "Removing old MONGODB_DB..." -ForegroundColor Yellow
vercel env rm MONGODB_DB production --yes 2>$null
vercel env rm MONGODB_DB preview --yes 2>$null
vercel env rm MONGODB_DB development --yes 2>$null

Write-Host ""
Write-Host "Adding clean MONGODB_DB (no whitespace)..." -ForegroundColor Green

# Create a temp file with JUST the value (no newline)
$value = "vipo"
[System.IO.File]::WriteAllText("$PSScriptRoot\temp_db_value.txt", $value, [System.Text.Encoding]::ASCII)

# Add to each environment using the file
Get-Content "$PSScriptRoot\temp_db_value.txt" -Raw | vercel env add MONGODB_DB production
Get-Content "$PSScriptRoot\temp_db_value.txt" -Raw | vercel env add MONGODB_DB preview  
Get-Content "$PSScriptRoot\temp_db_value.txt" -Raw | vercel env add MONGODB_DB development

# Clean up temp file
Remove-Item "$PSScriptRoot\temp_db_value.txt" -Force

Write-Host ""
Write-Host "No automatic CLI deploy (prevents duplicate deployments)." -ForegroundColor Cyan
Write-Host "Redeploy from Vercel Dashboard or push once to main." -ForegroundColor Gray

Write-Host ""
Write-Host "Done! Wait 30 seconds for deployment to complete." -ForegroundColor Green
