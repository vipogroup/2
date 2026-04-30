import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { apiDebugLog } from '@/lib/apiDebugLog';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Kill processes on port 3001 and restart
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // Windows: Find and kill process on port 3001, then restart
      exec('powershell -Command "Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"', (err) => {
        if (err) apiDebugLog('No process on 3001 or already killed');
        
        // Wait a bit then start server
        setTimeout(() => {
          exec('npm run dev', { 
            cwd: process.cwd(),
            detached: true,
            stdio: 'ignore'
          });
        }, 1000);
      });
    } else {
      // Unix/Mac
      exec('lsof -ti:3001 | xargs kill -9 2>/dev/null || true', (err) => {
        setTimeout(() => {
          exec('npm run dev', { 
            cwd: process.cwd(),
            detached: true,
            stdio: 'ignore'
          });
        }, 1000);
      });
    }
    
    return NextResponse.json({ 
      ok: true, 
      message: 'Server restart initiated. Page will reload in 5 seconds.' 
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
