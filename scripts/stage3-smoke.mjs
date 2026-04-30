#!/usr/bin/env node
import crypto from 'crypto';

const base = process.env.PUBLIC_URL || 'http://localhost:3001';
const results = [];

function logResult(key, passed, details) {
  results.push({ key, passed, details });
}

function parseCookie(header = '') {
  if (!header) return '';
  const [cookie] = header.split(';');
  return cookie || '';
}

async function request(path, { method = 'GET', body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;

  const res = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  }).catch((err) => ({ error: String(err) }));

  if (!res || res.error) {
    return { ok: false, status: 0, json: null, text: res?.error || 'fetch failed', headers: {} };
  }

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}

  const headerMap = Object.fromEntries(res.headers.entries());
  return { ok: res.ok, status: res.status, json, text, headers: headerMap };
}

function randomPhone() {
  return '05' + Math.floor(10000000 + Math.random() * 89999999).toString();
}

function randomName(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

(async () => {
  try {
    const adminPhone = randomPhone();
    const adminPwd = 'A' + crypto.randomUUID().slice(0, 8) + '!';

    const regAdmin = await request('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: randomName('Admin Smoke'),
        phone: adminPhone,
        role: 'admin',
        password: adminPwd,
      },
    });
    logResult('auth.registerAdmin', regAdmin.status === 201, `status=${regAdmin.status}`);

    const loginAdmin = await request('/api/auth/login', {
      method: 'POST',
      body: { identifier: adminPhone, password: adminPwd },
    });
    const adminCookie = parseCookie(loginAdmin.headers['set-cookie']);
    logResult(
      'auth.loginAdmin',
      loginAdmin.status === 200 && adminCookie.includes('token='),
      `status=${loginAdmin.status}`,
    );

    const dashboard = await request('/api/admin/dashboard', { cookie: adminCookie });
    logResult('admin.dashboard', dashboard.status === 200, `status=${dashboard.status}`);

    const agentPhone = randomPhone();
    const agentPwd = 'A' + crypto.randomUUID().slice(0, 8) + '!';

    const regAgent = await request('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: randomName('Agent Smoke'),
        phone: agentPhone,
        role: 'agent',
        password: agentPwd,
      },
    });
    logResult('auth.registerAgent', regAgent.status === 201, `status=${regAgent.status}`);

    const loginAgent = await request('/api/auth/login', {
      method: 'POST',
      body: { identifier: agentPhone, password: agentPwd },
    });
    const agentCookie = parseCookie(loginAgent.headers['set-cookie']);
    logResult(
      'auth.loginAgent',
      loginAgent.status === 200 && agentCookie.includes('token='),
      `status=${loginAgent.status}`,
    );

    const createOrder = await request('/api/orders', {
      method: 'POST',
      cookie: agentCookie,
      body: {
        items: [
          {
            productId: 'smoke-prod',
            name: 'Smoke Product',
            quantity: 1,
            unitPrice: 100,
          },
        ],
        totals: {
          discountPercent: 0,
          discountAmount: 0,
        },
        customerName: 'Smoke Customer',
        customerPhone: '0533752633',
      },
    });
    logResult('orders.create', createOrder.status === 201, `status=${createOrder.status}`);

    const listOrders = await request('/api/orders', { cookie: agentCookie });
    logResult('orders.list', listOrders.status === 200, `status=${listOrders.status}`);

    const withdrawalsList = await request('/api/withdrawals', { cookie: agentCookie });
    logResult('withdrawals.list', withdrawalsList.status === 200, `status=${withdrawalsList.status}`);

    console.log(JSON.stringify({ ok: true, base, results }, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: err.message }));
    process.exit(1);
  }
})();
