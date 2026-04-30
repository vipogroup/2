param(
    [string]$Tag = "latest-stable"
)

Write-Host "📦 Rolling back to tag '$Tag'..."

try {
    git fetch origin | Out-Null
    Write-Host "✅ Fetched latest from origin"

    git checkout $Tag | Out-Null
    Write-Host "✅ Checked out tag $Tag"

    if (Test-Path package-lock.json) {
        Write-Host "📦 Installing dependencies (npm ci)..."
        npm ci | Out-Null
    } else {
        Write-Host "📦 Installing dependencies (npm install)..."
        npm install | Out-Null
    }

    if (Test-Path package.json) {
        Write-Host "⚙️  Building project (npm run build)..."
        npm run build | Out-Null
    }

    # Restart script placeholder – adjust to actual process manager
    if (Test-Path .\Start-Server.ps1) {
        Write-Host "🚀 Restarting server via Start-Server.ps1"
        & .\Start-Server.ps1
    } else {
        Write-Host "⚠️  Start-Server.ps1 not found. Please restart your server manually."
    }

    Write-Host "🎉 Rollback completed."
} catch {
    Write-Error "❌ Rollback failed: $($_.Exception.Message)"
    exit 1
}
