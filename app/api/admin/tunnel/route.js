import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuthApi } from '@/lib/auth/server';
import { spawn } from 'child_process';

// Store tunnel process globally
let tunnelProcess = null;
let currentTunnelUrl = null;

async function GETHandler(req) {
  try {
    const user = await requireAuthApi(req);
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      ok: true,
      active: tunnelProcess !== null,
      url: currentTunnelUrl,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

async function POSTHandler(req) {
  try {
    const user = await requireAuthApi(req);
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // If tunnel already running, return current URL
    if (tunnelProcess && currentTunnelUrl) {
      return NextResponse.json({
        ok: true,
        url: currentTunnelUrl,
        message: 'Tunnel already running',
      });
    }

    // Start cloudflared tunnel
    return new Promise((resolve) => {
      try {
        tunnelProcess = spawn('npx', ['cloudflared', 'tunnel', '--url', 'http://localhost:3001'], {
          shell: true,
          detached: false,
        });

        let output = '';
        const timeout = setTimeout(() => {
          resolve(NextResponse.json({
            ok: false,
            error: 'Timeout waiting for tunnel URL',
          }, { status: 500 }));
        }, 30000);

        tunnelProcess.stderr.on('data', (data) => {
          output += data.toString();
          // Look for the tunnel URL in the output
          const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
          if (urlMatch && !currentTunnelUrl) {
            currentTunnelUrl = urlMatch[0];
            clearTimeout(timeout);
            resolve(NextResponse.json({
              ok: true,
              url: currentTunnelUrl,
              message: 'Tunnel created successfully',
            }));
          }
        });

        tunnelProcess.on('error', (err) => {
          clearTimeout(timeout);
          tunnelProcess = null;
          currentTunnelUrl = null;
          resolve(NextResponse.json({
            ok: false,
            error: `Failed to start tunnel: ${err.message}`,
          }, { status: 500 }));
        });

        tunnelProcess.on('close', () => {
          tunnelProcess = null;
          currentTunnelUrl = null;
        });

      } catch (err) {
        resolve(NextResponse.json({
          ok: false,
          error: err.message,
        }, { status: 500 }));
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

async function DELETEHandler(req) {
  try {
    const user = await requireAuthApi(req);
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    if (tunnelProcess) {
      tunnelProcess.kill();
      tunnelProcess = null;
      currentTunnelUrl = null;
    }

    return NextResponse.json({
      ok: true,
      message: 'Tunnel stopped',
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
export const DELETE = withErrorLogging(DELETEHandler);
