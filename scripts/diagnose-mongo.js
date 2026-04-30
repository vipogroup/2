#!/usr/bin/env node
/*
 * MongoDB connectivity diagnostics script.
 * Prints sanitized connection details and DNS lookup results
 * to help identify SRV/DNS/VPN issues.
 */

const dns = require('node:dns').promises;
const { URL } = require('node:url');

function extractHost(uri) {
  if (!uri) return null;
  try {
    const parsed = new URL(uri);
    return parsed.hostname || null;
  } catch (err) {
    return null;
  }
}

function maskUri(uri) {
  if (!uri) {
    return '(undefined)';
  }

  const host = extractHost(uri);
  if (!host) {
    return '(unparseable URI)';
  }
  return host;
}

async function run() {
  const nodeEnv = process.env.NODE_ENV || '(undefined)';
  const rawUri = process.env.MONGODB_URI;
  const host = extractHost(rawUri);
  const isSrv = typeof rawUri === 'string' && rawUri.startsWith('mongodb+srv://');

  console.log('Mongo Diagnostics');
  console.log('------------------');
  console.log('NODE_ENV:', nodeEnv);
  console.log('MONGODB_URI host:', maskUri(rawUri));
  console.log('Connection type:', isSrv ? 'mongodb+srv (SRV record)' : 'standard connection string');
  console.log('');

  if (!host) {
    console.log('❗ Could not determine MongoDB host from MONGODB_URI. Check that the URI is set correctly.');
    console.log('Diagnostics finished.');
    return;
  }

  let srvResult = { ok: false, error: null, records: [] };
  if (isSrv) {
    const srvName = `_mongodb._tcp.${host}`;
    try {
      const records = await dns.resolveSrv(srvName);
      srvResult = { ok: true, error: null, records };
      console.log(`SRV lookup (${srvName}): OK`);
      console.log(records);
    } catch (err) {
      srvResult = { ok: false, error: err, records: [] };
      console.log(`SRV lookup (${srvName}): FAILED (${err.code || err.message})`);
    }
    console.log('');
  }

  let lookupResult = { ok: false, error: null, address: null };
  try {
    const { address, family } = await dns.lookup(host);
    lookupResult = { ok: true, error: null, address: `${address} (IPv${family})` };
    console.log(`A/AAAA lookup (${host}): OK → ${lookupResult.address}`);
  } catch (err) {
    lookupResult = { ok: false, error: err, address: null };
    console.log(`A/AAAA lookup (${host}): FAILED (${err.code || err.message})`);
  }
  console.log('');

  console.log('Recommendations:');
  if (isSrv) {
    if (!srvResult.ok && srvResult.error && srvResult.error.code === 'ENOTFOUND') {
      console.log('- SRV lookup failed with ENOTFOUND. This usually indicates DNS/VPN issues.');
      console.log('- Ensure you are connected to the correct VPN or change DNS resolver (e.g., 1.1.1.1 or 8.8.8.8).');
    } else if (!srvResult.ok) {
      console.log('- SRV lookup failed. Investigate DNS/firewall settings or UDP 53 restrictions.');
    } else {
      console.log('- SRV lookup succeeded. MongoDB SRV records are reachable.');
    }
  } else {
    console.log('- SRV diagnostics skipped (non-SRV URI).');
  }

  if (!lookupResult.ok) {
    console.log('- DNS lookup for host failed. Check network connectivity or DNS configuration.');
  } else {
    console.log('- Hostname resolves correctly.');
  }

  console.log('');
  console.log('Diagnostics finished.');
}

run().finally(() => {
  process.exit(0);
});
