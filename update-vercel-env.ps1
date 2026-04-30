# ========================================
# VIPO - Vercel Environment Variables Update Script
# ========================================

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  VIPO - Vercel Env Update Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is installed
Write-Host "[1/4] Checking Vercel CLI..." -ForegroundColor Yellow
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "  ❌ Vercel CLI not found. Installing..." -ForegroundColor Red
    Write-Host ""
    npm install -g vercel
    Write-Host ""
    Write-Host "  ✅ Vercel CLI installed!" -ForegroundColor Green
} else {
    Write-Host "  ✅ Vercel CLI found!" -ForegroundColor Green
}

Write-Host ""

# Login to Vercel
Write-Host "[2/4] Logging in to Vercel..." -ForegroundColor Yellow
Write-Host "  Please follow the browser login process..." -ForegroundColor Gray
Write-Host ""
vercel login

Write-Host ""
Write-Host "  ✅ Logged in successfully!" -ForegroundColor Green
Write-Host ""

# Link to project
Write-Host "[3/4] Linking to project..." -ForegroundColor Yellow
Write-Host ""
vercel link --project=vipo-agents-test --scope=vipos-projects-0154d019 --yes

Write-Host ""
Write-Host "  ✅ Project linked!" -ForegroundColor Green
Write-Host ""

# Add environment variables
Write-Host "[4/4] Adding environment variables..." -ForegroundColor Yellow
Write-Host ""

$envVars = @{
    "SMTP_HOST" = "smtp.gmail.com"
    "SMTP_PORT" = "587"
    "SMTP_USER" = "vipogroup1@gmail.com"
    "SMTP_PASS" = "rllitkaIxayfhgir"
    "EMAIL_FROM" = "VIPO <vipogroup1@gmail.com>"
    "ADMIN_EMAIL" = "m0587009938@gmail.com"
    "ADMIN_PASSWORD" = "12345678"
}

$count = 0
$total = $envVars.Count

foreach ($key in $envVars.Keys) {
    $count++
    $value = $envVars[$key]
    
    Write-Host "  [$count/$total] Adding $key..." -ForegroundColor Cyan
    
    # Add to production
    echo $value | vercel env add $key production --force
    
    # Add to preview
    echo $value | vercel env add $key preview --force
    
    # Add to development
    echo $value | vercel env add $key development --force
    
    Write-Host "    ✅ $key added to all environments" -ForegroundColor Green
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "  ✅ All variables added!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# Trigger redeploy
Write-Host "Do you want to trigger deploy by pushing to main now? (y/n): " -ForegroundColor Yellow -NoNewline
$redeploy = Read-Host

if ($redeploy -eq "y" -or $redeploy -eq "Y") {
    Write-Host ""
    Write-Host "Deploying with Git integration (single source)..." -ForegroundColor Yellow
    Write-Host ""
    git push origin main
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "  ✅ Deployment complete!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Check your site at: https://vipo-agents-test.vercel.app" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Skipping deploy. Use Vercel Dashboard > Redeploy when ready." -ForegroundColor Gray
}

Write-Host ""
Write-Host "Done! 🎉" -ForegroundColor Green
Write-Host ""
