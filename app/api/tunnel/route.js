import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuthApi } from '@/lib/auth/server';
import { spawn } from 'child_process';

// Store tunnel URL in memory (will reset on server restart)
let tunnelUrl = null;
let tunnelProcess = null;

async function GETHandler(req) {
  try {
    // Verify admin user
    const user = await requireAuthApi(req);
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      tunnelUrl: tunnelUrl,
      isActive: !!tunnelUrl,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function POSTHandler(req) {
  try {
    // Verify admin user
    const user = await requireAuthApi(req);
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, port = 3001 } = await req.json();

    if (action === 'start') {
      // If already running, return existing URL
      if (tunnelUrl && tunnelProcess) {
        return NextResponse.json({
          ok: true,
          tunnelUrl: tunnelUrl,
          message: 'Tunnel already running',
        });
      }

      // Use Cloudflare Tunnel (no password page!)
      return new Promise((resolve) => {
        try {
          tunnelProcess = spawn('npx', ['cloudflared', 'tunnel', '--url', `http://localhost:${port}`], {
            shell: true,
            detached: false,
          });

          let output = '';
          const timeout = setTimeout(() => {
            resolve(NextResponse.json({
              ok: false,
              error: 'Timeout - נסה שוב',
            }, { status: 500 }));
          }, 30000);

          tunnelProcess.stderr.on('data', (data) => {
            output += data.toString();
            // Look for the tunnel URL
            const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
            if (urlMatch && !tunnelUrl) {
              tunnelUrl = urlMatch[0];
              clearTimeout(timeout);
              resolve(NextResponse.json({
                ok: true,
                tunnelUrl: tunnelUrl,
                message: 'Tunnel started successfully',
              }));
            }
          });

          tunnelProcess.on('error', (err) => {
            clearTimeout(timeout);
            tunnelProcess = null;
            tunnelUrl = null;
            resolve(NextResponse.json({
              ok: false,
              error: `Failed to start tunnel: ${err.message}`,
            }, { status: 500 }));
          });

          tunnelProcess.on('close', () => {
            tunnelProcess = null;
            tunnelUrl = null;
          });

        } catch (err) {
          resolve(NextResponse.json({
            ok: false,
            error: err.message,
          }, { status: 500 }));
        }
      });
    } else if (action === 'stop') {
      if (tunnelProcess) {
        try {
          tunnelProcess.kill();
        } catch (e) {
          // ignore
        }
        tunnelUrl = null;
        tunnelProcess = null;
      }
      return NextResponse.json({
        ok: true,
        message: 'Tunnel stopped',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Tunnel error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to create tunnel',
    }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
