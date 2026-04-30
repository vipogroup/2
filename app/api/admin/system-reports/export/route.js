import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';
import { ObjectId } from 'mongodb';

/**
 * GET /api/admin/system-reports/export
 * Export report in CSV or PDF format
 * 
 * Query params:
 * - reportId: ID of the report to export
 * - format: 'csv' or 'pdf'
 */
async function GETHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get('reportId');
    const format = searchParams.get('format') || 'csv';

    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    if (!['csv', 'pdf'].includes(format)) {
      return NextResponse.json({ error: 'format must be csv or pdf' }, { status: 400 });
    }

    const db = await getDb();
    const reportsCol = db.collection('systemreports');

    // Find the report
    let report;
    try {
      report = await reportsCol.findOne({ _id: new ObjectId(reportId) });
    } catch (e) {
      return NextResponse.json({ error: 'Invalid reportId format' }, { status: 400 });
    }

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Check if this report type supports export
    const exportableTypes = [
      'financial_payments',
      'orders_transactions',
      'financial_reconciliation',
      'go_live_readiness',
    ];

    if (!exportableTypes.includes(report.category) && !report.isEnterprise) {
      return NextResponse.json({ 
        error: 'This report type does not support export',
        supportedTypes: exportableTypes 
      }, { status: 400 });
    }

    if (format === 'csv') {
      const csvContent = generateCSV(report);
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${sanitizeFilename(report.title)}_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    if (format === 'pdf') {
      const pdfContent = generatePDFHTML(report);
      return new NextResponse(pdfContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${sanitizeFilename(report.title)}_${new Date().toISOString().split('T')[0]}.html"`,
          'X-PDF-Ready': 'true',
        },
      });
    }

  } catch (err) {
    console.error('EXPORT_REPORT_ERROR:', err);
    const status = err?.status || 500;
    return NextResponse.json({ error: 'Server error' }, { status });
  }
}

/**
 * POST /api/admin/system-reports/export
 * Generate export data for multiple reports or custom data
 */
async function POSTHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const { type, format = 'csv', dateRange } = body;

    const db = await getDb();

    if (type === 'financial_summary') {
      const data = await generateFinancialSummaryExport(db, dateRange);
      if (format === 'csv') {
        return new NextResponse(data.csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="financial_summary_${new Date().toISOString().split('T')[0]}.csv"`,
          },
        });
      }
      return NextResponse.json({ ok: true, data });
    }

    if (type === 'orders_summary') {
      const data = await generateOrdersSummaryExport(db, dateRange);
      if (format === 'csv') {
        return new NextResponse(data.csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="orders_summary_${new Date().toISOString().split('T')[0]}.csv"`,
          },
        });
      }
      return NextResponse.json({ ok: true, data });
    }

    if (type === 'reconciliation') {
      const data = await generateReconciliationExport(db, dateRange);
      if (format === 'csv') {
        return new NextResponse(data.csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="reconciliation_${new Date().toISOString().split('T')[0]}.csv"`,
          },
        });
      }
      return NextResponse.json({ ok: true, data });
    }

    return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });

  } catch (err) {
    console.error('EXPORT_POST_ERROR:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Helper functions

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9\u0590-\u05FF\s-]/g, '').replace(/\s+/g, '_').substring(0, 50);
}

function generateCSV(report) {
  const lines = [];
  
  // Header
  lines.push(`"Report Title","${report.title}"`);
  lines.push(`"Generated","${new Date(report.createdAt).toISOString()}"`);
  lines.push(`"Type","${report.type}"`);
  lines.push(`"Category","${report.category}"`);
  lines.push(`"Summary","${report.summary}"`);
  lines.push('');

  // Stats
  if (report.stats) {
    lines.push('"Statistics"');
    lines.push(`"Total Checks","${report.stats.totalChecks || 0}"`);
    lines.push(`"Passed","${report.stats.passed || 0}"`);
    lines.push(`"Failed","${report.stats.failed || 0}"`);
    lines.push(`"Warnings","${report.stats.warnings || 0}"`);
    lines.push(`"Score","${report.stats.score || 0}%"`);
    lines.push('');
  }

  // Decision data (for enterprise reports)
  if (report.decision) {
    lines.push('"Decision Data"');
    for (const [key, value] of Object.entries(report.decision)) {
      if (typeof value === 'object') {
        lines.push(`"${key}","${JSON.stringify(value).replace(/"/g, '""')}"`);
      } else {
        lines.push(`"${key}","${value}"`);
      }
    }
    lines.push('');
  }

  // Parse markdown tables from content
  const tableMatches = report.content?.match(/\|[^\n]+\|[\n\r]+\|[-:\s|]+\|[\n\r]+((?:\|[^\n]+\|[\n\r]*)+)/g);
  if (tableMatches) {
    for (const table of tableMatches) {
      const tableLines = table.split('\n').filter(l => l.trim() && !l.match(/^[\s|:-]+$/));
      for (const line of tableLines) {
        const cells = line.split('|').filter(c => c.trim()).map(c => c.trim().replace(/"/g, '""'));
        lines.push(cells.map(c => `"${c}"`).join(','));
      }
      lines.push('');
    }
  }

  return '\ufeff' + lines.join('\n'); // BOM for Excel UTF-8 support
}

function generatePDFHTML(report) {
  const htmlContent = report.content
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
    });

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm;
      background: white;
      color: #333;
      line-height: 1.6;
    }
    h1 { color: #1a56db; border-bottom: 2px solid #1a56db; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 24px; }
    h3 { color: #4b5563; }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 16px 0; 
      font-size: 14px;
    }
    th, td { 
      border: 1px solid #d1d5db; 
      padding: 8px 12px; 
      text-align: right; 
    }
    th { background: #f3f4f6; font-weight: 600; }
    tr:nth-child(even) { background: #f9fafb; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e5e7eb;
    }
    .meta { color: #6b7280; font-size: 12px; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      margin: 20px 0;
    }
    .stat-box {
      background: #f3f4f6;
      padding: 12px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-value { font-size: 24px; font-weight: bold; color: #1a56db; }
    .stat-label { font-size: 12px; color: #6b7280; }
    .pass { color: #059669; }
    .fail { color: #dc2626; }
    .warn { color: #d97706; }
    @media print {
      body { padding: 10mm; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 style="margin: 0; border: none; padding: 0;">${report.title}</h1>
      <div class="meta">
        נוצר: ${new Date(report.createdAt).toLocaleString('he-IL')} | 
        קטגוריה: ${report.category} | 
        יוצר: ${report.createdByName || 'Admin'}
      </div>
    </div>
  </div>

  ${report.stats ? `
  <div class="stats-grid">
    <div class="stat-box">
      <div class="stat-value">${report.stats.totalChecks || 0}</div>
      <div class="stat-label">סה"כ בדיקות</div>
    </div>
    <div class="stat-box">
      <div class="stat-value pass">${report.stats.passed || 0}</div>
      <div class="stat-label">עברו</div>
    </div>
    <div class="stat-box">
      <div class="stat-value fail">${report.stats.failed || 0}</div>
      <div class="stat-label">נכשלו</div>
    </div>
    <div class="stat-box">
      <div class="stat-value warn">${report.stats.warnings || 0}</div>
      <div class="stat-label">אזהרות</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${report.stats.score || 0}%</div>
      <div class="stat-label">ציון</div>
    </div>
  </div>
  ` : ''}

  <div class="content">
    ${htmlContent}
  </div>

  <div class="no-print" style="margin-top: 40px; text-align: center;">
    <button onclick="window.print()" style="
      background: #1a56db;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
    ">
      הדפס / שמור כ-PDF
    </button>
  </div>

  <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
    VIPO System Reports &copy; ${new Date().getFullYear()} | Report ID: ${report.reportId || report._id}
  </footer>
</body>
</html>`;
}

async function generateFinancialSummaryExport(db, dateRange) {
  const ordersCol = db.collection('orders');
  const txCol = db.collection('transactions');
  const withdrawalsCol = db.collection('withdrawalrequests');

  const dateFilter = {};
  if (dateRange?.from) dateFilter.$gte = new Date(dateRange.from);
  if (dateRange?.to) dateFilter.$lte = new Date(dateRange.to);
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  const orderMatch = { status: { $in: ['paid', 'completed'] } };
  if (hasDateFilter) orderMatch.createdAt = dateFilter;

  const [orders, transactions, withdrawals] = await Promise.all([
    ordersCol.find(orderMatch).toArray(),
    txCol.find(hasDateFilter ? { createdAt: dateFilter } : {}).toArray(),
    withdrawalsCol.find(hasDateFilter ? { createdAt: dateFilter } : {}).toArray(),
  ]);

  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalTransactions = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + (w.amount || 0), 0);
  const completedWithdrawals = withdrawals.filter(w => w.status === 'completed').reduce((sum, w) => sum + (w.amount || 0), 0);

  const lines = [
    '\ufeff"Financial Summary Export"',
    `"Date Range","${dateRange?.from || 'All'} - ${dateRange?.to || 'All'}"`,
    `"Generated","${new Date().toISOString()}"`,
    '',
    '"Metric","Amount (₪)"',
    `"Total Revenue","${totalRevenue}"`,
    `"Total Transactions","${totalTransactions}"`,
    `"Pending Withdrawals","${pendingWithdrawals}"`,
    `"Completed Withdrawals","${completedWithdrawals}"`,
    '',
    '"Orders Detail"',
    '"Order ID","Status","Amount","Date"',
    ...orders.map(o => `"${o._id}","${o.status}","${o.totalAmount || 0}","${new Date(o.createdAt).toISOString()}"`),
  ];

  return {
    csv: lines.join('\n'),
    summary: { totalRevenue, totalTransactions, pendingWithdrawals, completedWithdrawals, ordersCount: orders.length },
  };
}

async function generateOrdersSummaryExport(db, dateRange) {
  const ordersCol = db.collection('orders');

  const dateFilter = {};
  if (dateRange?.from) dateFilter.$gte = new Date(dateRange.from);
  if (dateRange?.to) dateFilter.$lte = new Date(dateRange.to);
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  const match = hasDateFilter ? { createdAt: dateFilter } : {};
  const orders = await ordersCol.find(match).sort({ createdAt: -1 }).toArray();

  const byStatus = {};
  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
  }

  const lines = [
    '\ufeff"Orders Summary Export"',
    `"Date Range","${dateRange?.from || 'All'} - ${dateRange?.to || 'All'}"`,
    `"Generated","${new Date().toISOString()}"`,
    '',
    '"Status Summary"',
    '"Status","Count"',
    ...Object.entries(byStatus).map(([status, count]) => `"${status}","${count}"`),
    '',
    '"Orders Detail"',
    '"Order ID","Status","Amount","Customer","Agent","Date"',
    ...orders.map(o => `"${o._id}","${o.status}","${o.totalAmount || 0}","${o.customerEmail || o.userId || ''}","${o.agentId || ''}","${new Date(o.createdAt).toISOString()}"`),
  ];

  return {
    csv: lines.join('\n'),
    summary: { totalOrders: orders.length, byStatus },
  };
}

async function generateReconciliationExport(db, dateRange) {
  const ordersCol = db.collection('orders');
  const txCol = db.collection('transactions');

  const dateFilter = {};
  if (dateRange?.from) dateFilter.$gte = new Date(dateRange.from);
  if (dateRange?.to) dateFilter.$lte = new Date(dateRange.to);
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  const orderMatch = { status: { $in: ['paid', 'completed'] } };
  if (hasDateFilter) orderMatch.createdAt = dateFilter;

  const [orders, transactions] = await Promise.all([
    ordersCol.find(orderMatch).toArray(),
    txCol.find(hasDateFilter ? { createdAt: dateFilter } : {}).toArray(),
  ]);

  const reconciliationRows = [];
  const orderMap = new Map(orders.map(o => [o._id.toString(), o]));
  const txMap = new Map();
  
  for (const tx of transactions) {
    if (tx.orderId) {
      txMap.set(tx.orderId.toString(), tx);
    }
  }

  // Match orders with transactions
  for (const order of orders) {
    const orderId = order._id.toString();
    const tx = txMap.get(orderId);
    const status = tx 
      ? (Math.abs((tx.amount || 0) - (order.totalAmount || 0)) < 0.01 ? 'MATCHED' : 'MISMATCH')
      : 'MISSING_TX';
    
    reconciliationRows.push({
      orderId,
      orderAmount: order.totalAmount || 0,
      txAmount: tx?.amount || 0,
      diff: Math.abs((order.totalAmount || 0) - (tx?.amount || 0)),
      status,
      orderDate: order.createdAt,
      txDate: tx?.createdAt,
    });
  }

  // Find orphan transactions
  for (const tx of transactions) {
    if (tx.orderId && !orderMap.has(tx.orderId.toString())) {
      reconciliationRows.push({
        orderId: tx.orderId.toString(),
        orderAmount: 0,
        txAmount: tx.amount || 0,
        diff: tx.amount || 0,
        status: 'ORPHAN_TX',
        orderDate: null,
        txDate: tx.createdAt,
      });
    }
  }

  const matched = reconciliationRows.filter(r => r.status === 'MATCHED').length;
  const mismatched = reconciliationRows.filter(r => r.status === 'MISMATCH').length;
  const missingTx = reconciliationRows.filter(r => r.status === 'MISSING_TX').length;
  const orphanTx = reconciliationRows.filter(r => r.status === 'ORPHAN_TX').length;

  const lines = [
    '\ufeff"Financial Reconciliation Export"',
    `"Date Range","${dateRange?.from || 'All'} - ${dateRange?.to || 'All'}"`,
    `"Generated","${new Date().toISOString()}"`,
    '',
    '"Summary"',
    '"Status","Count"',
    `"Matched","${matched}"`,
    `"Mismatched","${mismatched}"`,
    `"Missing Transaction","${missingTx}"`,
    `"Orphan Transaction","${orphanTx}"`,
    '',
    '"Reconciliation Detail"',
    '"Order ID","Order Amount","Transaction Amount","Difference","Status","Order Date","Transaction Date"',
    ...reconciliationRows.map(r => 
      `"${r.orderId}","${r.orderAmount}","${r.txAmount}","${r.diff.toFixed(2)}","${r.status}","${r.orderDate ? new Date(r.orderDate).toISOString() : ''}","${r.txDate ? new Date(r.txDate).toISOString() : ''}"`
    ),
  ];

  return {
    csv: lines.join('\n'),
    summary: { matched, mismatched, missingTx, orphanTx, total: reconciliationRows.length },
  };
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
