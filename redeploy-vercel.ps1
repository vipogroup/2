# ========================================
# VIPO - Vercel Redeploy Script
# ========================================

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  VIPO - Vercel Redeploy" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Using single deployment flow (Git push only)." -ForegroundColor Yellow
Write-Host ""

# Navigate to project directory
Set-Location -Path $PSScriptRoot

# Deploy via Git integration (single deployment source)
git status --short
Write-Host ""
Write-Host "Pushing current branch to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "  ✅ Deployment complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your site: https://vipo-agents-test.vercel.app" -ForegroundColor Cyan
Write-Host ""
Write-Host "Done! 🎉" -ForegroundColor Green
Write-Host ""
