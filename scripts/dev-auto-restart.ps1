param(
  [string]$ProjectPath = (Resolve-Path "$PSScriptRoot/.."),
  [string]$DevCommand = "npm run dev",
  [int]$DebounceSeconds = 2,
  [string[]]$WatchExtensions = @(
    'js','jsx','ts','tsx','mjs','cjs','json','md','mdx','css','scss','sass','less','env','html'
  )
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $ProjectPath)) {
  throw "Project path '$ProjectPath' was not found."
}

$ProjectPath = (Resolve-Path $ProjectPath).Path
$script:ServerProcess = $null
$script:LastTrigger = Get-Date '2000-01-01'

function Kill-ExistingServerOnPort {
  param([int]$Port = 3001)
  
  Write-Host "Checking for existing server on port $Port..." -ForegroundColor Yellow
  
  try {
    # שיטה 1: netstat
    $netstatOutput = netstat -ano 2>$null | Select-String ":$Port\s"
    foreach ($line in $netstatOutput) {
      if ($line -match '\s+(\d+)\s*$') {
        $processId = $matches[1]
        if ($processId -and $processId -ne '0') {
          Write-Host "Killing process $processId on port $Port (netstat)" -ForegroundColor Red
          Start-Process -FilePath "taskkill" -ArgumentList "/PID", $processId, "/F", "/T" -NoNewWindow -Wait -ErrorAction SilentlyContinue
        }
      }
    }
    
    # שיטה 2: Get-NetTCPConnection (יותר אמין)
    $tcpConnections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    foreach ($conn in $tcpConnections) {
      if ($conn.OwningProcess -and $conn.OwningProcess -ne 0) {
        Write-Host "Killing process $($conn.OwningProcess) on port $Port (TCP)" -ForegroundColor Red
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
      }
    }
    
    # המתנה לסגירה
    Start-Sleep -Seconds 2
    Write-Host "Port $Port should be free now" -ForegroundColor Green
    
  } catch {
    Write-Host "Note: $($_.Exception.Message)" -ForegroundColor DarkYellow
  }
}

function Start-Server {
  if ($script:ServerProcess -and -not $script:ServerProcess.HasExited) {
    return
  }

  # סגירת שרת קיים על הפורט (לא משנה מי הפעיל)
  Kill-ExistingServerOnPort -Port 3001
  Start-Sleep -Seconds 1

  Write-Host "Starting dev server: $DevCommand" -ForegroundColor Cyan
  $escapedPath = $ProjectPath.Replace("'", "''")
  $commandText = "Set-Location '$escapedPath'; $DevCommand"
  $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($commandText))
  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = 'powershell'
  $startInfo.Arguments = "-NoExit -EncodedCommand $encoded"
  $startInfo.WorkingDirectory = $ProjectPath
  $startInfo.UseShellExecute = $true
  $script:ServerProcess = [System.Diagnostics.Process]::Start($startInfo)
}

function Stop-Server {
  if (-not $script:ServerProcess) { return }
  if ($script:ServerProcess.HasExited) {
    $script:ServerProcess = $null
    return
  }

  Write-Host 'Stopping dev server…' -ForegroundColor Yellow
  $script:ServerProcess.CloseMainWindow() | Out-Null
  Start-Sleep -Seconds 2

  if (-not $script:ServerProcess.HasExited) {
    $script:ServerProcess.Kill()
  }

  $script:ServerProcess = $null
}

function Restart-Server {
  Stop-Server
  Start-Sleep -Milliseconds 800
  Start-Server
}

function Should-TrackFile([string]$Path) {
  if ([string]::IsNullOrWhiteSpace($Path)) { return $false }
  if ($Path -match "\\node_modules\\" -or $Path -match "\\\.next\\" -or $Path -match "\\\.git\\") {
    return $false
  }

  $extension = [System.IO.Path]::GetExtension($Path).TrimStart('.').ToLower()
  if (-not $extension) { return $false }

  return $WatchExtensions -contains $extension
}

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $ProjectPath
$watcher.Filter = '*.*'
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]'FileName, LastWrite, DirectoryName'
$watcher.EnableRaisingEvents = $true

$script:RegisterHandler = {
  param($EventArgs)

  $path = $EventArgs.FullPath
  if (-not (Should-TrackFile $path)) { return }

  $now = Get-Date
  if (($now - $script:LastTrigger).TotalSeconds -lt [Math]::Max(1, $DebounceSeconds)) {
    return
  }

  $script:LastTrigger = $now
  Write-Host "[$($EventArgs.ChangeType)] $path" -ForegroundColor Green
  Start-Sleep -Seconds [Math]::Max(1, $DebounceSeconds)
  Restart-Server
}

Register-ObjectEvent -InputObject $watcher -EventName Changed -SourceIdentifier 'DevWatcher.Changed' -Action $script:RegisterHandler | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Created -SourceIdentifier 'DevWatcher.Created' -Action $script:RegisterHandler | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Deleted -SourceIdentifier 'DevWatcher.Deleted' -Action $script:RegisterHandler | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Renamed -SourceIdentifier 'DevWatcher.Renamed' -Action $script:RegisterHandler | Out-Null

Register-EngineEvent -SourceIdentifier 'PowerShell.Exiting' -Action {
  Stop-Server
  $watcher.Dispose()
  Get-EventSubscriber -ErrorAction SilentlyContinue | Where-Object { $_.SourceIdentifier -like 'DevWatcher*' } | ForEach-Object { $_ | Unregister-Event }
} | Out-Null

Write-Host "Watching $ProjectPath" -ForegroundColor Magenta
Write-Host "Extensions: $($WatchExtensions -join ', ')" -ForegroundColor Magenta
Write-Host "Starting first server instance…" -ForegroundColor Magenta

Start-Server

try {
  while ($true) {
    Start-Sleep -Seconds 1
  }
} finally {
  Stop-Server
  $watcher.Dispose()
  Get-EventSubscriber -ErrorAction SilentlyContinue | Where-Object { $_.SourceIdentifier -like 'DevWatcher*' } | ForEach-Object { $_ | Unregister-Event }
}
