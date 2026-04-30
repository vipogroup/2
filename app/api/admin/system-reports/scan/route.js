import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';
import { ObjectId } from 'mongodb';
import { apiDebugLog } from '@/lib/apiDebugLog';

// Safe imports with fallbacks
let isPriorityConfigured = () => false;
let getPayPlusConfig = () => ({ isConfigured: false });

try {
  const priorityModule = require('@/lib/priority/client.js');
  if (priorityModule.isPriorityConfigured) isPriorityConfigured = priorityModule.isPriorityConfigured;
} catch (e) { apiDebugLog('Priority module not available'); }

try {
  const payplusModule = require('@/lib/payplus/config.js');
  if (payplusModule.getPayPlusConfig) getPayPlusConfig = payplusModule.getPayPlusConfig;
} catch (e) { apiDebugLog('PayPlus module not available'); }

// All scannable areas
const SCAN_AREAS = [
  'database', 'users', 'orders', 'products', 'transactions',
  'permissions', 'integrations', 'security', 'payment_data', 'system_keys'
];

// Report types that can be generated
const REPORT_TYPES = [
  'financial_payments',      // Financial & Payments Report
  'orders_transactions',     // Orders & Transactions Report
  'users_permissions',       // Users & Permissions Report
  'admin_audit_trail',       // Admin Actions / Audit Trail
  'integrations_webhooks',   // Integrations & Webhooks Report
  'data_integrity',          // Data Integrity & Consistency Report
  'security_access',         // Security & Access Report
  'system_health',           // System Health & Stability Report
];

// Enterprise Report types (new layer)
const ENTERPRISE_REPORT_TYPES = [
  'go_live_readiness',       // Go-Live Readiness Report (Critical)
  'financial_reconciliation', // Financial Reconciliation Report (Critical)
  'missing_keys_impact',     // Missing Keys Impact Report
  'risk_matrix',             // Risk Matrix Report
  'reports_reliability',     // Reports Reliability Status Report
];

/**
 * POST /api/admin/system-reports/scan
 * Run a full system scan
 */
async function POSTHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const { scope = 'full', areas = SCAN_AREAS, generateReports = true } = body;

    const db = await getDb();
    const scansCol = db.collection('systemscans');
    const reportsCol = db.collection('systemreports');
    const auditCol = db.collection('auditlogs');

    const now = new Date();
    const scanId = generateScanId();

    // Create scan record
    const scan = {
      scanId,
      initiatedBy: new ObjectId(admin.id),
      initiatedByName: admin.fullName || admin.email || 'Admin',
      scope,
      scannedAreas: areas,
      status: 'running',
      progress: { current: 0, total: areas.length + REPORT_TYPES.length, percentage: 0 },
      startedAt: now,
      results: { totalChecks: 0, passed: 0, failed: 0, warnings: 0, score: 0 },
      findings: {},
      generatedReports: [],
      version: '2.0',
      environment: process.env.NODE_ENV || 'development',
      createdAt: now,
      updatedAt: now,
    };

    await scansCol.insertOne(scan);

    // Log audit event
    await logAudit(auditCol, 'scan_started', admin, { scanId, scope, areas });

    // Run the scan with error handling for each area
    const findings = {};
    let totalChecks = 0, passed = 0, failed = 0, warnings = 0;
    let progressCurrent = 0;

    const safeRun = async (name, fn) => {
      try {
        const result = await fn();
        findings[name] = result;
        totalChecks += result.checks || 0;
        passed += result.passed || 0;
        failed += result.failed || 0;
        warnings += result.warnings || 0;
        progressCurrent++;
        return result;
      } catch (e) {
        console.error(`Scan ${name} failed:`, e.message);
        findings[name] = { checks: 1, passed: 0, failed: 1, warnings: 0, error: e.message };
        totalChecks++; failed++;
        return null;
      }
    };

    // Run all scans with error handling
    if (areas.includes('database')) await safeRun('database', () => scanDatabase(db));
    if (areas.includes('users')) await safeRun('users', () => scanUsers(db));
    if (areas.includes('orders')) await safeRun('orders', () => scanOrders(db));
    if (areas.includes('products')) await safeRun('products', () => scanProducts(db));
    if (areas.includes('transactions')) await safeRun('transactions', () => scanTransactions(db));
    if (areas.includes('permissions')) await safeRun('permissions', () => scanPermissions(db));
    if (areas.includes('integrations')) await safeRun('integrations', () => scanIntegrations());
    if (areas.includes('security')) await safeRun('security', () => scanSecurity());
    if (areas.includes('payment_data')) await safeRun('payment_data', () => scanPaymentData(db));

    // 10. System keys scan (sanitized) — env vars + Google Ads values stored in DB
    if (areas.includes('system_keys')) await safeRun('system_keys', () => scanSystemKeys(db));

    // Calculate score
    const score = totalChecks > 0 ? Math.round((passed / totalChecks) * 100) : 0;

    // Generate reports if requested
    const generatedReports = [];
    if (generateReports) {
      // Generate standard reports
      for (const reportType of REPORT_TYPES) {
        try {
          const report = await generateReport(reportType, findings, admin, scanId, db);
          const result = await reportsCol.insertOne(report);
          generatedReports.push({
            reportId: result.insertedId,
            reportType,
            generatedAt: new Date(),
          });
          progressCurrent++;
        } catch (err) {
          console.error(`Failed to generate ${reportType}:`, err);
        }
      }

      // Generate Enterprise reports (new layer)
      for (const reportType of ENTERPRISE_REPORT_TYPES) {
        try {
          const report = await generateEnterpriseReport(reportType, findings, admin, scanId, db);
          const result = await reportsCol.insertOne(report);
          generatedReports.push({
            reportId: result.insertedId,
            reportType,
            isEnterprise: true,
            generatedAt: new Date(),
          });
          progressCurrent++;
        } catch (err) {
          console.error(`Failed to generate enterprise ${reportType}:`, err);
        }
      }
    }

    // Update scan record
    const completedAt = new Date();
    await scansCol.updateOne(
      { scanId },
      {
        $set: {
          status: 'completed',
          completedAt,
          duration: completedAt - now,
          progress: { current: progressCurrent, total: scan.progress.total, percentage: 100 },
          results: { totalChecks, passed, failed, warnings, score },
          findings,
          generatedReports,
          updatedAt: completedAt,
        },
      }
    );

    // Log completion
    await logAudit(auditCol, 'scan_completed', admin, { scanId, score, reportsGenerated: generatedReports.length });

    // Get env vars analysis for response
    const envAnalysis = findings.system_keys?.missingVars || [];
    const scoreBreakdown = findings.system_keys?.scoreBreakdown || {};

    // Build issues log by category
    const issuesLog = buildIssuesLog(findings);

    return NextResponse.json({
      ok: true,
      scanId,
      status: 'completed',
      results: { totalChecks, passed, failed, warnings, score },
      reportsGenerated: generatedReports.length,
      duration: completedAt - now,
      envAnalysis: {
        missingVars: envAnalysis,
        scoreBreakdown,
        configured: findings.system_keys?.details?.filter(d => d.status === 'configured') || [],
      },
      issuesLog,
    });

  } catch (err) {
    console.error('SYSTEM_SCAN_ERROR:', err);
    return NextResponse.json({ error: 'Scan failed', details: err.message }, { status: 500 });
  }
}

/**
 * GET /api/admin/system-reports/scan
 * Get scan history
 */
async function GETHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    const { searchParams } = new URL(req.url);
    
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const status = searchParams.get('status');

    const db = await getDb();
    const scansCol = db.collection('systemscans');

    const query = {};
    if (status) query.status = status;

    const [scans, total] = await Promise.all([
      scansCol.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .project({ findings: 0 }) // Exclude large findings object
        .toArray(),
      scansCol.countDocuments(query),
    ]);

    return NextResponse.json({
      ok: true,
      scans,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });

  } catch (err) {
    console.error('GET_SCANS_ERROR:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Helper functions

function generateScanId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `SCAN-${ts}-${rand}`.toUpperCase();
}

async function logAudit(col, action, admin, details) {
  try {
    await col.insertOne({
      action,
      category: 'system_reports',
      actorId: new ObjectId(admin.id),
      actorName: admin.fullName || admin.email,
      details,
      ip: '',
      createdAt: new Date(),
    });
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}

// Build issues log by category from findings
function buildIssuesLog(findings) {
  const issues = {
    database: { title: '[DB] מסד נתונים', icon: '[DB]', items: [], severity: 'ok' },
    users: { title: '[USERS] משתמשים והרשאות', icon: '[USERS]', items: [], severity: 'ok' },
    orders: { title: '[CART] הזמנות', icon: '[CART]', items: [], severity: 'ok' },
    products: { title: '[PKG] מוצרים', icon: '[PKG]', items: [], severity: 'ok' },
    payments: { title: '[CARD] תשלומים', icon: '[CARD]', items: [], severity: 'ok' },
    integrations: { title: '[LINK] אינטגרציות', icon: '[LINK]', items: [], severity: 'ok' },
    security: { title: '[LOCK] אבטחה', icon: '[LOCK]', items: [], severity: 'ok' },
    envVars: { title: '[GEAR] משתני סביבה', icon: '[GEAR]', items: [], severity: 'ok' },
  };

  // Database issues
  if (findings.database?.failed > 0) {
    issues.database.severity = 'error';
    const missingCols = findings.database?.details?.filter(d => d.status === 'missing') || [];
    missingCols.forEach(d => {
      issues.database.items.push({ message: `Collection חסר: ${d.check}`, severity: 'error', fix: `יש ליצור את ה-collection ${d.check.replace('Collection ', '')}` });
    });
  }
  if (findings.database?.warnings > 0) {
    if (issues.database.severity !== 'error') issues.database.severity = 'warning';
    issues.database.items.push({ message: 'חסרים אינדקסים מומלצים', severity: 'warning', fix: 'הוסף אינדקסים לשדות נפוצים בשאילתות' });
  }

  // Users issues
  if (findings.users?.failed > 0) {
    issues.users.severity = 'error';
    if (findings.users?.details?.admins === 0) {
      issues.users.items.push({ message: 'אין משתמש Admin במערכת', severity: 'error', fix: 'צור משתמש Admin דרך /api/seed/init או סקריפט' });
    }
  }
  if (findings.users?.details?.noRole > 0) {
    if (issues.users.severity !== 'error') issues.users.severity = 'warning';
    issues.users.items.push({ message: `${findings.users.details.noRole} משתמשים ללא תפקיד מוגדר`, severity: 'warning', fix: 'הגדר role לכל המשתמשים (customer/agent/admin)' });
  }

  // Orders issues
  if (findings.orders?.failed > 0 || findings.orders?.details?.orphaned > 0) {
    issues.orders.severity = findings.orders?.failed > 0 ? 'error' : 'warning';
    if (findings.orders?.details?.orphaned > 0) {
      issues.orders.items.push({ message: `${findings.orders.details.orphaned} הזמנות יתומות (ללא משתמש)`, severity: 'warning', fix: 'בדוק ותקן הזמנות עם userId לא תקין' });
    }
    if (findings.orders?.details?.noStatus > 0) {
      issues.orders.items.push({ message: `${findings.orders.details.noStatus} הזמנות ללא סטטוס`, severity: 'warning', fix: 'הגדר סטטוס לכל ההזמנות' });
    }
    if (findings.orders?.details?.oldPending > 0) {
      issues.orders.items.push({ message: `${findings.orders.details.oldPending} הזמנות ממתינות מעל 7 ימים`, severity: 'warning', fix: 'טפל בהזמנות תקועות בסטטוס pending' });
    }
  }

  // Products issues
  if (findings.products?.failed > 0 || findings.products?.warnings > 0) {
    issues.products.severity = findings.products?.failed > 0 ? 'error' : 'warning';
    if (findings.products?.details?.noPrice > 0) {
      issues.products.items.push({ message: `${findings.products.details.noPrice} מוצרים ללא מחיר`, severity: 'error', fix: 'הגדר מחיר לכל המוצרים' });
    }
    if (findings.products?.details?.noStock > 0) {
      issues.products.items.push({ message: `${findings.products.details.noStock} מוצרים ללא מלאי מוגדר`, severity: 'warning', fix: 'הגדר מלאי לכל המוצרים' });
    }
    if (findings.products?.details?.inactive > 0) {
      issues.products.items.push({ message: `${findings.products.details.inactive} מוצרים לא פעילים`, severity: 'info', fix: 'בדוק אם יש להפעיל מוצרים' });
    }
  }

  // Payment issues
  if (findings.payment_data?.failed > 0 || findings.payment_data?.warnings > 0) {
    issues.payments.severity = findings.payment_data?.failed > 0 ? 'error' : 'warning';
    if (findings.payment_data?.details?.failedPayments > 0) {
      issues.payments.items.push({ message: `${findings.payment_data.details.failedPayments} תשלומים נכשלו`, severity: 'warning', fix: 'בדוק לוגים של PayPlus לסיבת הכשל' });
    }
    if (findings.payment_data?.details?.ordersWithPayment === 0 && findings.orders?.details?.total > 0) {
      issues.payments.items.push({ message: 'אין הזמנות עם תשלום מחובר', severity: 'warning', fix: 'ודא שתשלומים נרשמים כראוי' });
    }
  }

  // Integrations issues
  if (findings.integrations?.failed > 0 || findings.integrations?.warnings > 0) {
    issues.integrations.severity = findings.integrations?.failed > 0 ? 'error' : 'warning';
    if (!findings.integrations?.details?.payplus?.configured) {
      issues.integrations.items.push({ message: 'PayPlus לא מוגדר', severity: 'error', fix: 'הגדר PAYPLUS_API_KEY, PAYPLUS_SECRET, PAYPLUS_BASE_URL' });
    } else if (!findings.integrations?.details?.payplus?.healthy) {
      issues.integrations.items.push({ message: 'בעיית תקשורת עם PayPlus', severity: 'warning', fix: 'בדוק את מפתחות ה-API והחיבור לשרת' });
    }
    if (!findings.integrations?.details?.priority?.configured) {
      issues.integrations.items.push({ message: 'Priority ERP לא מוגדר', severity: 'warning', fix: 'הגדר PRIORITY_BASE_URL, PRIORITY_CLIENT_ID, PRIORITY_CLIENT_SECRET, PRIORITY_COMPANY_CODE' });
    } else if (!findings.integrations?.details?.priority?.healthy) {
      issues.integrations.items.push({ message: 'בעיית תקשורת עם Priority', severity: 'warning', fix: 'בדוק את פרטי ההתחברות והחיבור לשרת' });
    }
  }

  // Security issues
  if (findings.security?.failed > 0 || findings.security?.warnings > 0) {
    issues.security.severity = findings.security?.failed > 0 ? 'error' : 'warning';
    if (!process.env.JWT_SECRET) {
      issues.security.items.push({ message: 'JWT_SECRET לא מוגדר', severity: 'error', fix: 'הוסף JWT_SECRET ל-.env (מינימום 32 תווים)' });
    } else if (process.env.JWT_SECRET.length < 32) {
      issues.security.items.push({ message: 'JWT_SECRET חלש מדי', severity: 'warning', fix: 'השתמש במפתח של לפחות 32 תווים' });
    }
    if (!process.env.NEXTAUTH_SECRET) {
      issues.security.items.push({ message: 'NEXTAUTH_SECRET לא מוגדר', severity: 'error', fix: 'הוסף NEXTAUTH_SECRET ל-.env' });
    }
    if (process.env.NODE_ENV !== 'production') {
      issues.security.items.push({ message: 'המערכת לא בסביבת production', severity: 'info', fix: 'הגדר NODE_ENV=production בייצור' });
    }
  }

  // Environment variables issues
  const missingVars = findings.system_keys?.missingVars || [];
  if (missingVars.length > 0) {
    const criticalMissing = missingVars.filter(v => v.priority === 'critical');
    const highMissing = missingVars.filter(v => v.priority === 'high');
    const mediumMissing = missingVars.filter(v => v.priority === 'medium');
    
    if (criticalMissing.length > 0) {
      issues.envVars.severity = 'error';
      criticalMissing.forEach(v => {
        issues.envVars.items.push({ message: `${v.key} - ${v.description}`, severity: 'error', fix: `הוסף ${v.key} לקובץ .env`, category: v.category });
      });
    }
    if (highMissing.length > 0) {
      if (issues.envVars.severity !== 'error') issues.envVars.severity = 'warning';
      highMissing.forEach(v => {
        issues.envVars.items.push({ message: `${v.key} - ${v.description}`, severity: 'warning', fix: `הוסף ${v.key} לקובץ .env`, category: v.category });
      });
    }
    if (mediumMissing.length > 0) {
      if (issues.envVars.severity === 'ok') issues.envVars.severity = 'info';
      mediumMissing.forEach(v => {
        issues.envVars.items.push({ message: `${v.key} - ${v.description}`, severity: 'info', fix: `הוסף ${v.key} לקובץ .env (אופציונלי)`, category: v.category });
      });
    }
  }

  // Calculate totals
  const totalErrors = Object.values(issues).reduce((sum, cat) => sum + cat.items.filter(i => i.severity === 'error').length, 0);
  const totalWarnings = Object.values(issues).reduce((sum, cat) => sum + cat.items.filter(i => i.severity === 'warning').length, 0);
  const totalInfo = Object.values(issues).reduce((sum, cat) => sum + cat.items.filter(i => i.severity === 'info').length, 0);

  return {
    categories: issues,
    summary: {
      totalErrors,
      totalWarnings,
      totalInfo,
      totalIssues: totalErrors + totalWarnings + totalInfo,
    },
  };
}

// Scan functions (read-only)

async function scanDatabase(db) {
  const checks = 5;
  let passed = 0, failed = 0, warnings = 0;
  const details = [];

  // Check collections exist
  const collections = await db.listCollections().toArray();
  const colNames = collections.map(c => c.name);
  const required = ['users', 'orders', 'products'];
  
  for (const col of required) {
    if (colNames.includes(col)) {
      passed++;
      details.push({ check: `Collection ${col}`, status: 'ok' });
    } else {
      failed++;
      details.push({ check: `Collection ${col}`, status: 'missing' });
    }
  }

  // Check DB stats
  try {
    const stats = await db.stats();
    details.push({ check: 'DB Stats', status: 'ok', data: { collections: stats.collections, objects: stats.objects } });
    passed++;
  } catch (e) {
    failed++;
  }

  // Check indexes
  try {
    const userIndexes = await db.collection('users').indexes();
    if (userIndexes.length > 1) passed++; else warnings++;
    details.push({ check: 'User indexes', count: userIndexes.length });
  } catch (e) {
    warnings++;
  }

  return { checks, passed, failed, warnings, details };
}

async function scanUsers(db) {
  const usersCol = db.collection('users');
  const totalUsers = await usersCol.countDocuments();
  const admins = await usersCol.countDocuments({ role: 'admin' });
  const agents = await usersCol.countDocuments({ role: 'agent' });
  const customers = await usersCol.countDocuments({ role: { $in: ['customer', null] } });
  const noRole = await usersCol.countDocuments({ role: { $exists: false } });

  let passed = 3, failed = 0, warnings = 0;
  if (admins === 0) { failed++; passed--; }
  if (noRole > 0) { warnings++; }

  return {
    checks: 4,
    passed,
    failed,
    warnings,
    details: { totalUsers, admins, agents, customers, noRole },
  };
}

async function scanOrders(db) {
  const ordersCol = db.collection('orders');
  const total = await ordersCol.countDocuments();
  const paid = await ordersCol.countDocuments({ status: 'paid' });
  const pending = await ordersCol.countDocuments({ status: 'pending' });
  const completed = await ordersCol.countDocuments({ status: 'completed' });
  const cancelled = await ordersCol.countDocuments({ status: 'cancelled' });

  // Check for orphaned orders (no user)
  const orphaned = await ordersCol.countDocuments({ userId: { $exists: false } });

  let passed = 3, failed = 0, warnings = 0;
  if (orphaned > 0) { warnings++; }

  return {
    checks: 4,
    passed,
    failed,
    warnings,
    details: { total, paid, pending, completed, cancelled, orphaned },
  };
}

async function scanProducts(db) {
  const productsCol = db.collection('products');
  const total = await productsCol.countDocuments();
  const active = await productsCol.countDocuments({ status: 'active' });
  const outOfStock = await productsCol.countDocuments({ stock: { $lte: 0 } });
  const noPrice = await productsCol.countDocuments({ price: { $exists: false } });

  let passed = 2, failed = 0, warnings = 0;
  if (noPrice > 0) { warnings++; }
  if (outOfStock > 10) { warnings++; }

  return {
    checks: 3,
    passed,
    failed,
    warnings,
    details: { total, active, outOfStock, noPrice },
  };
}

async function scanTransactions(db) {
  const txCol = db.collection('transactions');
  const total = await txCol.countDocuments();
  const completed = await txCol.countDocuments({ status: 'completed' });
  const pending = await txCol.countDocuments({ status: 'pending' });
  const failed = await txCol.countDocuments({ status: 'failed' });

  return {
    checks: 2,
    passed: 2,
    failed: 0,
    warnings: failed > 10 ? 1 : 0,
    details: { total, completed, pending, failed },
  };
}

async function scanPermissions(db) {
  const usersCol = db.collection('users');
  const admins = await usersCol.find({ role: 'admin' }).project({ email: 1, permissions: 1, fullName: 1 }).toArray();
  
  let passed = 1, failed = 0, warnings = 0;
  if (admins.length === 0) { failed++; passed--; }
  if (admins.length > 10) { warnings++; }

  return {
    checks: 2,
    passed,
    failed,
    warnings,
    details: { adminCount: admins.length, admins: admins.map(a => ({ name: a.fullName || a.email, hasPermissions: !!a.permissions })) },
  };
}

async function scanIntegrations() {
  let priorityConfigured = false;
  let payplusConfigured = false;
  
  try {
    priorityConfigured = isPriorityConfigured();
  } catch (e) { apiDebugLog('Priority check failed:', e.message); }
  
  try {
    const payplusConfig = getPayPlusConfig();
    payplusConfigured = payplusConfig?.isConfigured || false;
  } catch (e) { apiDebugLog('PayPlus check failed:', e.message); }

  let passed = 0, failed = 0, warnings = 0;
  if (priorityConfigured) passed++; else warnings++;
  if (payplusConfigured) passed++; else warnings++;

  return {
    checks: 2,
    passed,
    failed,
    warnings,
    details: {
      priority: { configured: priorityConfigured, status: priorityConfigured ? 'active' : 'not_configured' },
      payplus: { configured: payplusConfigured, status: payplusConfigured ? 'active' : 'not_configured' },
    },
  };
}

async function scanSecurity() {
  const checks = [];
  let passed = 0, failed = 0, warnings = 0;

  // Check critical env vars (without exposing values)
  const criticalVars = ['JWT_SECRET', 'MONGODB_URI', 'NEXTAUTH_SECRET'];
  for (const v of criticalVars) {
    if (process.env[v] && process.env[v].length >= 10) {
      passed++;
      checks.push({ var: v, status: 'set', strength: process.env[v].length >= 32 ? 'strong' : 'weak' });
    } else {
      failed++;
      checks.push({ var: v, status: 'missing_or_weak' });
    }
  }

  // Check production mode
  if (process.env.NODE_ENV === 'production') {
    passed++;
    checks.push({ var: 'NODE_ENV', status: 'production' });
  } else {
    warnings++;
    checks.push({ var: 'NODE_ENV', status: process.env.NODE_ENV || 'not_set' });
  }

  return {
    checks: criticalVars.length + 1,
    passed,
    failed,
    warnings,
    details: checks,
  };
}

async function scanPaymentData(db) {
  const ordersCol = db.collection('orders');
  const eventsCol = db.collection('paymentevents');

  const ordersWithPayment = await ordersCol.countDocuments({ paymentMethod: { $exists: true } });
  const paymentEvents = await eventsCol.countDocuments();
  const failedPayments = await eventsCol.countDocuments({ status: 'failed' });

  let passed = 2, failed = 0, warnings = 0;
  if (failedPayments > 10) warnings++;

  return {
    checks: 3,
    passed,
    failed,
    warnings,
    details: { ordersWithPayment, paymentEvents, failedPayments },
  };
}

async function scanSystemKeys(db) {
  // Define all env vars with weights (percentage contribution to score)
  const envVarsConfig = [
    // Security - Critical
    { key: 'JWT_SECRET', weight: 8, category: 'security', priority: 'critical', description: 'מפתח הצפנת JWT לאימות משתמשים' },
    { key: 'NEXTAUTH_SECRET', weight: 8, category: 'security', priority: 'critical', description: 'מפתח NextAuth לאבטחת סשנים' },
    
    // Database - Critical
    { key: 'MONGODB_URI', weight: 8, category: 'database', priority: 'critical', description: 'כתובת חיבור למסד הנתונים' },
    
    // PayPlus Payments - High
    { key: 'PAYPLUS_API_KEY', weight: 6, category: 'payments', priority: 'high', description: 'מפתח API של PayPlus לתשלומים' },
    { key: 'PAYPLUS_SECRET', weight: 6, category: 'payments', priority: 'high', description: 'סוד PayPlus לאימות בקשות' },
    { key: 'PAYPLUS_WEBHOOK_SECRET', weight: 4, category: 'payments', priority: 'medium', description: 'מפתח וובהוק PayPlus לעדכוני תשלום' },
    { key: 'PAYPLUS_BASE_URL', weight: 4, category: 'payments', priority: 'high', description: 'כתובת שרת PayPlus (sandbox/production)' },
    { key: 'PAYPLUS_CALLBACK_URL', weight: 2, category: 'payments', priority: 'medium', description: 'כתובת callback לאחר תשלום' },
    
    // Priority ERP Integration - High
    { key: 'PRIORITY_BASE_URL', weight: 4, category: 'integrations', priority: 'high', description: 'כתובת שרת Priority ERP' },
    { key: 'PRIORITY_CLIENT_ID', weight: 4, category: 'integrations', priority: 'high', description: 'מזהה לקוח Priority ERP' },
    { key: 'PRIORITY_CLIENT_SECRET', weight: 4, category: 'integrations', priority: 'high', description: 'סוד Priority ERP' },
    { key: 'PRIORITY_COMPANY_CODE', weight: 3, category: 'integrations', priority: 'high', description: 'קוד חברה ב-Priority' },
    { key: 'PRIORITY_ENV', weight: 2, category: 'integrations', priority: 'medium', description: 'סביבת Priority (sandbox/production)' },
    
    // Cloudinary - Medium
    { key: 'CLOUDINARY_CLOUD_NAME', weight: 3, category: 'media', priority: 'medium', description: 'שם ענן Cloudinary להעלאת תמונות' },
    { key: 'CLOUDINARY_API_KEY', weight: 3, category: 'media', priority: 'medium', description: 'מפתח API של Cloudinary' },
    { key: 'CLOUDINARY_API_SECRET', weight: 3, category: 'media', priority: 'medium', description: 'סוד Cloudinary' },
    
    // Communications - Medium
    { key: 'TWILIO_ACCOUNT_SID', weight: 2, category: 'communications', priority: 'medium', description: 'מזהה חשבון Twilio ל-SMS' },
    { key: 'TWILIO_AUTH_TOKEN', weight: 2, category: 'communications', priority: 'medium', description: 'טוקן Twilio לאימות' },
    { key: 'TWILIO_PHONE_NUMBER', weight: 2, category: 'communications', priority: 'medium', description: 'מספר טלפון Twilio לשליחת SMS' },
    
    // Email - Medium
    { key: 'EMAIL_SERVER_HOST', weight: 2, category: 'email', priority: 'medium', description: 'שרת SMTP לשליחת מיילים' },
    { key: 'EMAIL_SERVER_PORT', weight: 1, category: 'email', priority: 'low', description: 'פורט שרת SMTP' },
    { key: 'EMAIL_SERVER_USER', weight: 2, category: 'email', priority: 'medium', description: 'שם משתמש SMTP' },
    { key: 'EMAIL_SERVER_PASSWORD', weight: 2, category: 'email', priority: 'medium', description: 'סיסמת SMTP' },
    { key: 'EMAIL_FROM', weight: 1, category: 'email', priority: 'low', description: 'כתובת מייל שולח' },
    
    // Web Push - Low
    { key: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY', weight: 1, category: 'notifications', priority: 'low', description: 'מפתח VAPID ציבורי לPush notifications' },
    { key: 'VAPID_PRIVATE_KEY', weight: 1, category: 'notifications', priority: 'low', description: 'מפתח VAPID פרטי' },
    
    // Config - Medium
    { key: 'NEXT_PUBLIC_SITE_URL', weight: 2, category: 'config', priority: 'medium', description: 'כתובת URL של האתר' },
    { key: 'NODE_ENV', weight: 2, category: 'config', priority: 'medium', description: 'סביבת ריצה (production/development)' },

    // Google Ads API (optional) — same sources as runtime: Vercel env OR Integrations (MongoDB)
    { key: 'GOOGLE_ADS_CLIENT_ID', weight: 2, category: 'integrations', priority: 'medium', description: 'Google Ads OAuth Client ID' },
    { key: 'GOOGLE_ADS_CLIENT_SECRET', weight: 2, category: 'integrations', priority: 'medium', description: 'Google Ads OAuth Client Secret' },
    { key: 'GOOGLE_ADS_DEVELOPER_TOKEN', weight: 2, category: 'integrations', priority: 'medium', description: 'Google Ads Developer Token (API Center)' },
  ];

  let adsCfg = { clientId: '', clientSecret: '', developerToken: '' };
  if (db) {
    try {
      const { getGoogleAdsConfig } = await import('@/lib/googleAdsService');
      adsCfg = await getGoogleAdsConfig(db);
    } catch (e) {
      console.warn('scanSystemKeys: Google Ads config unavailable', e?.message);
    }
  }

  const results = [];
  const missingVars = [];
  let passed = 0, failed = 0, warnings = 0;
  let totalWeight = envVarsConfig.reduce((sum, v) => sum + v.weight, 0);
  let earnedWeight = 0;

  for (const varConfig of envVarsConfig) {
    let exists = !!process.env[varConfig.key];
    if (varConfig.key === 'GOOGLE_ADS_CLIENT_ID') {
      exists = exists || Boolean(String(adsCfg.clientId || '').trim());
    } else if (varConfig.key === 'GOOGLE_ADS_CLIENT_SECRET') {
      exists = exists || Boolean(String(adsCfg.clientSecret || '').trim());
    } else if (varConfig.key === 'GOOGLE_ADS_DEVELOPER_TOKEN') {
      exists = exists || Boolean(String(adsCfg.developerToken || '').trim());
    }
    const value = process.env[varConfig.key];
    const length = value?.length || 0;
    
    const varResult = {
      key: varConfig.key,
      status: exists ? 'configured' : 'missing',
      weight: varConfig.weight,
      category: varConfig.category,
      priority: varConfig.priority,
      description: varConfig.description,
      potentialGain: exists ? 0 : varConfig.weight,
    };

    if (exists) {
      passed++;
      earnedWeight += varConfig.weight;
      if (length > 0) {
        varResult.strength = length >= 32 ? 'strong' : length >= 16 ? 'medium' : 'weak';
      } else {
        varResult.strength = 'medium';
        varResult.source = 'database';
      }
    } else {
      missingVars.push({
        key: varConfig.key,
        weight: varConfig.weight,
        percentageGain: Math.round((varConfig.weight / totalWeight) * 100),
        category: varConfig.category,
        priority: varConfig.priority,
        description: varConfig.description,
      });
      
      if (varConfig.priority === 'critical') {
        failed++;
      } else {
        warnings++;
      }
    }

    results.push(varResult);
  }

  const currentScore = Math.round((earnedWeight / totalWeight) * 100);
  const potentialScore = 100;

  return {
    checks: envVarsConfig.length,
    passed,
    failed,
    warnings,
    details: results,
    missingVars,
    scoreBreakdown: {
      current: currentScore,
      potential: potentialScore,
      earnedWeight,
      totalWeight,
      missingWeight: totalWeight - earnedWeight,
    },
  };
}

// Report generation

async function generateReport(reportType, findings, admin, scanId, db) {
  const now = new Date();
  const reportId = `RPT-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase();

  const reportGenerators = {
    financial_payments: () => generateFinancialReport(findings, db),
    orders_transactions: () => generateOrdersReport(findings, db),
    users_permissions: () => generateUsersReport(findings, db),
    admin_audit_trail: () => generateAuditTrailReport(db),
    integrations_webhooks: () => generateIntegrationsReport(findings),
    data_integrity: () => generateDataIntegrityReport(findings),
    security_access: () => generateSecurityReport(findings),
    system_health: () => generateHealthReport(findings),
  };

  const generator = reportGenerators[reportType];
  if (!generator) throw new Error(`Unknown report type: ${reportType}`);

  const { title, content, summary, tags, stats } = await generator();

  return {
    reportId,
    scanId,
    title,
    type: mapReportType(reportType),
    category: reportType,
    summary,
    content,
    contentHtml: '',
    tags,
    version: '2.0',
    status: 'published',
    stats: stats || { totalChecks: 0, passed: 0, failed: 0, warnings: 0, score: 0 },
    dataSource: 'system_scan',
    createdBy: new ObjectId(admin.id),
    createdByName: admin.fullName || admin.email || 'Admin',
    attachments: [],
    createdAt: now,
    updatedAt: now,
  };
}

function mapReportType(reportType) {
  const map = {
    financial_payments: 'audit',
    orders_transactions: 'audit',
    users_permissions: 'security',
    admin_audit_trail: 'audit',
    integrations_webhooks: 'integration',
    data_integrity: 'performance',
    security_access: 'security',
    system_health: 'performance',
  };
  return map[reportType] || 'custom';
}

async function generateFinancialReport(findings, db) {
  const ordersCol = db.collection('orders');
  const txCol = db.collection('transactions');
  const withdrawalsCol = db.collection('withdrawalrequests');

  const totalRevenue = await ordersCol.aggregate([
    { $match: { status: { $in: ['paid', 'completed'] } } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]).toArray();

  const pendingWithdrawals = await withdrawalsCol.aggregate([
    { $match: { status: 'pending' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]).toArray();

  const content = `# [$] Financial & Payments Report

**Generated:** ${new Date().toISOString()}

## Revenue Summary
- Total Revenue: ₪${(totalRevenue[0]?.total || 0).toLocaleString()}
- Payment Events: ${findings.payment_data?.details?.paymentEvents || 0}
- Failed Payments: ${findings.payment_data?.details?.failedPayments || 0}

## Withdrawals
- Pending Amount: ₪${(pendingWithdrawals[0]?.total || 0).toLocaleString()}

## Payment Methods
- Orders with payment: ${findings.payment_data?.details?.ordersWithPayment || 0}
`;

  return {
    title: 'Financial & Payments Report',
    content,
    summary: `Revenue: ₪${(totalRevenue[0]?.total || 0).toLocaleString()}`,
    tags: ['financial', 'payments', 'revenue'],
    stats: findings.payment_data,
  };
}

async function generateOrdersReport(findings, db) {
  const o = findings.orders?.details || {};
  const content = `# [CART] Orders & Transactions Report

**Generated:** ${new Date().toISOString()}

## Orders Summary
| Status | Count |
|--------|-------|
| Total | ${o.total || 0} |
| Paid | ${o.paid || 0} |
| Pending | ${o.pending || 0} |
| Completed | ${o.completed || 0} |
| Cancelled | ${o.cancelled || 0} |

## Data Quality
- Orphaned Orders: ${o.orphaned || 0}

## Transactions
- Total: ${findings.transactions?.details?.total || 0}
- Completed: ${findings.transactions?.details?.completed || 0}
- Failed: ${findings.transactions?.details?.failed || 0}
`;

  return {
    title: 'Orders & Transactions Report',
    content,
    summary: `${o.total || 0} orders, ${o.paid || 0} paid`,
    tags: ['orders', 'transactions'],
    stats: findings.orders,
  };
}

async function generateUsersReport(findings, db) {
  const u = findings.users?.details || {};
  const p = findings.permissions?.details || {};
  
  const content = `# [USERS] Users & Permissions Report

**Generated:** ${new Date().toISOString()}

## User Statistics
| Role | Count |
|------|-------|
| Total | ${u.totalUsers || 0} |
| Admins | ${u.admins || 0} |
| Agents | ${u.agents || 0} |
| Customers | ${u.customers || 0} |

## Data Quality
- Users without role: ${u.noRole || 0}

## Admin Permissions
${(p.admins || []).map(a => `- ${a.name}: ${a.hasPermissions ? '[OK]' : '[WARN]'}`).join('\n') || 'No admins found'}
`;

  return {
    title: 'Users & Permissions Report',
    content,
    summary: `${u.totalUsers || 0} users, ${u.admins || 0} admins`,
    tags: ['users', 'permissions', 'roles'],
    stats: findings.users,
  };
}

async function generateAuditTrailReport(db) {
  const auditCol = db.collection('auditlogs');
  const recentLogs = await auditCol.find({})
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

  const content = `# [LIST] Admin Actions & Audit Trail

**Generated:** ${new Date().toISOString()}

## Recent Actions
${recentLogs.map(l => `| ${new Date(l.createdAt).toLocaleString('he-IL')} | ${l.actorName || 'System'} | ${l.action} |`).join('\n') || 'No audit logs found'}

## Summary
- Total logged actions: ${recentLogs.length}
`;

  return {
    title: 'Admin Actions & Audit Trail',
    content,
    summary: `${recentLogs.length} recent actions`,
    tags: ['audit', 'admin', 'trail'],
  };
}

async function generateIntegrationsReport(findings) {
  const i = findings.integrations?.details || {};
  
  const content = `# [LINK] Integrations & Webhooks Report

**Generated:** ${new Date().toISOString()}

## Integration Status
| Integration | Status | Configured |
|-------------|--------|------------|
| Priority ERP | ${i.priority?.status || 'unknown'} | ${i.priority?.configured ? '[OK]' : '[X]'} |
| PayPlus | ${i.payplus?.status || 'unknown'} | ${i.payplus?.configured ? '[OK]' : '[X]'} |

## Recommendations
${!i.priority?.configured ? '- Configure Priority ERP for full ERP sync\n' : ''}
${!i.payplus?.configured ? '- Configure PayPlus for payment processing\n' : ''}
${i.priority?.configured && i.payplus?.configured ? '[OK] All integrations configured' : ''}
`;

  return {
    title: 'Integrations & Webhooks Report',
    content,
    summary: `Priority: ${i.priority?.configured ? '[OK]' : '[X]'} | PayPlus: ${i.payplus?.configured ? '[OK]' : '[X]'}`,
    tags: ['integrations', 'webhooks', 'priority', 'payplus'],
    stats: findings.integrations,
  };
}

async function generateDataIntegrityReport(findings) {
  const orphanedOrders = findings.orders?.details?.orphaned || 0;
  const noRoleUsers = findings.users?.details?.noRole || 0;
  const noPriceProducts = findings.products?.details?.noPrice || 0;

  const issues = [];
  if (orphanedOrders > 0) issues.push(`${orphanedOrders} orphaned orders`);
  if (noRoleUsers > 0) issues.push(`${noRoleUsers} users without role`);
  if (noPriceProducts > 0) issues.push(`${noPriceProducts} products without price`);

  const content = `# [SEARCH] Data Integrity & Consistency Report

**Generated:** ${new Date().toISOString()}

## Integrity Checks
| Check | Status | Issues |
|-------|--------|--------|
| Orphaned Orders | ${orphanedOrders === 0 ? '[OK]' : '[WARN]'} | ${orphanedOrders} |
| Users without Role | ${noRoleUsers === 0 ? '[OK]' : '[WARN]'} | ${noRoleUsers} |
| Products without Price | ${noPriceProducts === 0 ? '[OK]' : '[WARN]'} | ${noPriceProducts} |

## Summary
${issues.length === 0 ? '[OK] No data integrity issues found' : `[WARN] Found ${issues.length} issues:\n${issues.map(i => `- ${i}`).join('\n')}`}
`;

  return {
    title: 'Data Integrity & Consistency Report',
    content,
    summary: issues.length === 0 ? 'No issues' : `${issues.length} issues found`,
    tags: ['integrity', 'consistency', 'data'],
  };
}

async function generateSecurityReport(findings) {
  const s = findings.security?.details || [];
  const k = findings.system_keys?.details || [];

  const content = `# [LOCK] Security & Access Report

**Generated:** ${new Date().toISOString()}

## Environment Security
${s.map(c => `| ${c.var} | ${c.status === 'set' || c.status === 'production' ? '[OK]' : '[X]'} | ${c.strength || c.status} |`).join('\n')}

## System Keys Status
| Key | Status |
|-----|--------|
${k.map(key => `| ${key.key} | ${key.status === 'configured' ? '[OK]' : '[WARN]'} |`).join('\n')}

## Score
- Security checks passed: ${findings.security?.passed || 0}/${findings.security?.checks || 0}
`;

  return {
    title: 'Security & Access Report',
    content,
    summary: `${findings.security?.passed || 0}/${findings.security?.checks || 0} checks passed`,
    tags: ['security', 'access', 'environment'],
    stats: findings.security,
  };
}

async function generateHealthReport(findings) {
  const db = findings.database || {};
  const mem = process.memoryUsage();
  const heapMB = Math.round(mem.heapUsed / 1024 / 1024);
  const uptimeH = Math.floor(process.uptime() / 3600);

  const totalChecks = Object.values(findings).reduce((sum, f) => sum + (f.checks || 0), 0);
  const totalPassed = Object.values(findings).reduce((sum, f) => sum + (f.passed || 0), 0);
  const score = totalChecks > 0 ? Math.round((totalPassed / totalChecks) * 100) : 0;

  const content = `# ⚡ System Health & Stability Report

**Generated:** ${new Date().toISOString()}

## System Metrics
| Metric | Value |
|--------|-------|
| Memory Usage | ${heapMB}MB |
| Uptime | ${uptimeH} hours |
| Environment | ${process.env.NODE_ENV || 'development'} |

## Database Health
- Collections checked: ${db.passed || 0}/${db.checks || 0}

## Overall Health Score
**${score}%** (${totalPassed}/${totalChecks} checks passed)

## Status
${score >= 80 ? '[OK] System is healthy' : score >= 50 ? '[WARN] System needs attention' : '[X] Critical issues detected'}
`;

  return {
    title: 'System Health & Stability Report',
    content,
    summary: `Health Score: ${score}%`,
    tags: ['health', 'stability', 'performance'],
    stats: { totalChecks, passed: totalPassed, failed: totalChecks - totalPassed, warnings: 0, score },
  };
}

// ============================================
// ENTERPRISE REPORTS LAYER
// ============================================

async function generateEnterpriseReport(reportType, findings, admin, scanId, db) {
  const now = new Date();
  const reportId = `ENT-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase();

  const enterpriseGenerators = {
    go_live_readiness: () => generateGoLiveReadinessReport(findings, db),
    financial_reconciliation: () => generateFinancialReconciliationReport(findings, db),
    missing_keys_impact: () => generateMissingKeysImpactReport(findings),
    risk_matrix: () => generateRiskMatrixReport(findings),
    reports_reliability: () => generateReportsReliabilityReport(findings),
  };

  const generator = enterpriseGenerators[reportType];
  if (!generator) throw new Error(`Unknown enterprise report type: ${reportType}`);

  const { title, content, summary, tags, stats, decision } = await generator();

  return {
    reportId,
    scanId,
    title,
    type: mapEnterpriseReportType(reportType),
    category: reportType,
    isEnterprise: true,
    summary,
    content,
    contentHtml: '',
    tags,
    version: '1.0',
    status: 'published',
    stats: stats || { totalChecks: 0, passed: 0, failed: 0, warnings: 0, score: 0 },
    decision: decision || null,
    dataSource: 'enterprise_analysis',
    createdBy: new ObjectId(admin.id),
    createdByName: admin.fullName || admin.email || 'Admin',
    attachments: [],
    createdAt: now,
    updatedAt: now,
  };
}

function mapEnterpriseReportType(reportType) {
  const map = {
    go_live_readiness: 'executive',
    financial_reconciliation: 'financial',
    missing_keys_impact: 'operational',
    risk_matrix: 'risk',
    reports_reliability: 'meta',
  };
  return map[reportType] || 'enterprise';
}

// 1. Go-Live Readiness Report (Critical)
async function generateGoLiveReadinessReport(findings, db) {
  const blockers = [];
  let readyForProduction = true;

  // Calculate scores from findings
  const financialScore = findings.payment_data?.passed && findings.payment_data?.checks 
    ? Math.round((findings.payment_data.passed / findings.payment_data.checks) * 100) 
    : 0;
  const securityScore = findings.security?.passed && findings.security?.checks 
    ? Math.round((findings.security.passed / findings.security.checks) * 100) 
    : 0;
  const dataIntegrityScore = findings.orders?.passed && findings.orders?.checks 
    ? Math.round((findings.orders.passed / findings.orders.checks) * 100) 
    : 50;
  const integrationsScore = findings.integrations?.passed && findings.integrations?.checks 
    ? Math.round((findings.integrations.passed / findings.integrations.checks) * 100) 
    : 0;
  const healthScore = findings.database?.passed && findings.database?.checks 
    ? Math.round((findings.database.passed / findings.database.checks) * 100) 
    : 50;

  // Check blocking conditions
  if (financialScore < 80) {
    blockers.push({ type: 'FINANCIAL', message: `Financial score ${financialScore}% < 80% threshold`, severity: 'critical' });
    readyForProduction = false;
  }

  if (securityScore < 90) {
    blockers.push({ type: 'SECURITY', message: `Security score ${securityScore}% < 90% threshold`, severity: 'critical' });
    readyForProduction = false;
  }

  // Check missing payment keys
  const paymentKeysRequired = ['PAYPLUS_API_KEY', 'PAYPLUS_SECRET'];
  const missingPaymentKeys = paymentKeysRequired.filter(k => !process.env[k]);
  if (missingPaymentKeys.length > 0) {
    blockers.push({ type: 'PAYMENT_KEYS', message: `Missing payment keys: ${missingPaymentKeys.join(', ')}`, severity: 'critical' });
    readyForProduction = false;
  }

  // Check integrations
  if (!findings.integrations?.details?.payplus?.configured) {
    blockers.push({ type: 'INTEGRATION', message: 'PayPlus not configured', severity: 'critical' });
    readyForProduction = false;
  }

  // Check data integrity issues
  if (findings.orders?.details?.orphaned > 0) {
    blockers.push({ type: 'DATA_INTEGRITY', message: `${findings.orders.details.orphaned} orphaned orders found`, severity: 'warning' });
  }

  const overallScore = Math.round((financialScore + securityScore + dataIntegrityScore + integrationsScore + healthScore) / 5);

  const content = `# [GO] Go-Live Readiness Report

**Generated:** ${new Date().toISOString()}
**Scan ID:** ${findings.scanId || 'N/A'}

---

## [STATS] EXECUTIVE DECISION

| Status | Value |
|--------|-------|
| **READY_FOR_PRODUCTION** | ${readyForProduction ? '[OK] YES' : '[X] NO'} |
| **Overall Score** | ${overallScore}% |
| **Blockers Count** | ${blockers.filter(b => b.severity === 'critical').length} critical, ${blockers.filter(b => b.severity === 'warning').length} warnings |

---

## [SEARCH] Score Breakdown

| Area | Score | Threshold | Status |
|------|-------|-----------|--------|
| Financial | ${financialScore}% | ≥80% | ${financialScore >= 80 ? '[OK] PASS' : '[X] BLOCK'} |
| Security | ${securityScore}% | ≥90% | ${securityScore >= 90 ? '[OK] PASS' : '[X] BLOCK'} |
| Data Integrity | ${dataIntegrityScore}% | - | ${dataIntegrityScore >= 70 ? '[OK] OK' : '[WARN] WARN'} |
| Integrations | ${integrationsScore}% | - | ${integrationsScore >= 50 ? '[OK] OK' : '[WARN] WARN'} |
| System Health | ${healthScore}% | - | ${healthScore >= 70 ? '[OK] OK' : '[WARN] WARN'} |

---

## 🚫 Blockers

${blockers.length === 0 ? '[OK] No blockers found - system is ready for production!' : blockers.map(b => `| ${b.severity === 'critical' ? '🔴' : '🟡'} ${b.type} | ${b.message} |`).join('\n')}

---

## [OK] Checklist

- [${financialScore >= 80 ? 'x' : ' '}] Financial systems operational (≥80%)
- [${securityScore >= 90 ? 'x' : ' '}] Security requirements met (≥90%)
- [${missingPaymentKeys.length === 0 ? 'x' : ' '}] Payment keys configured
- [${findings.integrations?.details?.payplus?.configured ? 'x' : ' '}] PayPlus integration active
- [${findings.integrations?.details?.priority?.configured ? 'x' : ' '}] Priority ERP integration (optional)
- [${findings.orders?.details?.orphaned === 0 ? 'x' : ' '}] No orphaned orders

---

## [LIST] Recommendation

${readyForProduction 
  ? '**[OK] APPROVED FOR GO-LIVE** - All critical requirements are met. The system is ready for production deployment.'
  : `**[X] NOT READY FOR GO-LIVE** - Please resolve the following ${blockers.filter(b => b.severity === 'critical').length} critical blocker(s) before proceeding.`}
`;

  return {
    title: 'Go-Live Readiness Report',
    content,
    summary: readyForProduction ? '[OK] READY FOR PRODUCTION' : `[X] ${blockers.filter(b => b.severity === 'critical').length} BLOCKERS`,
    tags: ['go-live', 'executive', 'critical', 'production', 'decision'],
    stats: { 
      totalChecks: 5, 
      passed: [financialScore >= 80, securityScore >= 90, missingPaymentKeys.length === 0, findings.integrations?.details?.payplus?.configured, findings.orders?.details?.orphaned === 0].filter(Boolean).length,
      failed: blockers.filter(b => b.severity === 'critical').length,
      warnings: blockers.filter(b => b.severity === 'warning').length,
      score: overallScore 
    },
    decision: {
      readyForProduction,
      blockers,
      scores: { financial: financialScore, security: securityScore, dataIntegrity: dataIntegrityScore, integrations: integrationsScore, health: healthScore },
    },
  };
}

// 2. Financial Reconciliation Report (Critical)
async function generateFinancialReconciliationReport(findings, db) {
  const ordersCol = db.collection('orders');
  const txCol = db.collection('transactions');
  const eventsCol = db.collection('paymentevents');

  // Get all paid orders
  const paidOrders = await ordersCol.find({ status: { $in: ['paid', 'completed'] } }).toArray();
  
  // Get all transactions
  const transactions = await txCol.find({}).toArray();
  
  // Get payment events
  const paymentEvents = await eventsCol.find({}).toArray();

  // Build reconciliation data
  const issues = [];
  let orphanPayments = 0;
  let missingTransactions = 0;
  let mismatchedAmounts = 0;
  let totalOrdersAmount = 0;
  let totalTransactionsAmount = 0;

  // Check for orphan payments (transactions without orders)
  const orderIds = new Set(paidOrders.map(o => o._id.toString()));
  for (const tx of transactions) {
    if (tx.orderId && !orderIds.has(tx.orderId.toString())) {
      orphanPayments++;
      issues.push({ type: 'ORPHAN_PAYMENT', txId: tx._id.toString(), message: `Transaction ${tx._id} has no matching order` });
    }
    totalTransactionsAmount += tx.amount || 0;
  }

  // Check for orders without transactions
  const txOrderIds = new Set(transactions.map(tx => tx.orderId?.toString()).filter(Boolean));
  for (const order of paidOrders) {
    totalOrdersAmount += order.totalAmount || 0;
    if (!txOrderIds.has(order._id.toString()) && !order.paymentTransactionId) {
      missingTransactions++;
      issues.push({ type: 'MISSING_TX', orderId: order._id.toString(), message: `Order ${order._id} has no transaction record` });
    }
  }

  // Check for amount mismatches
  for (const order of paidOrders) {
    const matchingTx = transactions.find(tx => tx.orderId?.toString() === order._id.toString());
    if (matchingTx && Math.abs((matchingTx.amount || 0) - (order.totalAmount || 0)) > 0.01) {
      mismatchedAmounts++;
      issues.push({ 
        type: 'AMOUNT_MISMATCH', 
        orderId: order._id.toString(), 
        orderAmount: order.totalAmount,
        txAmount: matchingTx.amount,
        diff: Math.abs((matchingTx.amount || 0) - (order.totalAmount || 0))
      });
    }
  }

  const reconciled = issues.length === 0;
  const discrepancy = Math.abs(totalOrdersAmount - totalTransactionsAmount);

  const content = `# [$] Financial Reconciliation Report

**Generated:** ${new Date().toISOString()}

---

## [STATS] Reconciliation Summary

| Metric | Value |
|--------|-------|
| **Status** | ${reconciled ? '[OK] RECONCILED' : '[WARN] DISCREPANCIES FOUND'} |
| **Total Orders** | ${paidOrders.length} |
| **Total Transactions** | ${transactions.length} |
| **Payment Events** | ${paymentEvents.length} |

---

## [$] Financial Totals

| Source | Amount |
|--------|--------|
| Orders Total | ₪${totalOrdersAmount.toLocaleString()} |
| Transactions Total | ₪${totalTransactionsAmount.toLocaleString()} |
| **Discrepancy** | ₪${discrepancy.toLocaleString()} |

---

## [SEARCH] Issues Found

| Category | Count | Severity |
|----------|-------|----------|
| Orphan Payments | ${orphanPayments} | ${orphanPayments > 0 ? '🔴 High' : '[OK] None'} |
| Missing Transactions | ${missingTransactions} | ${missingTransactions > 0 ? '🔴 High' : '[OK] None'} |
| Mismatched Amounts | ${mismatchedAmounts} | ${mismatchedAmounts > 0 ? '🟡 Medium' : '[OK] None'} |

---

## [LIST] Issue Details

${issues.length === 0 ? '[OK] No reconciliation issues found!' : issues.slice(0, 20).map(i => `- **${i.type}**: ${i.message}${i.diff ? ` (Diff: ₪${i.diff.toFixed(2)})` : ''}`).join('\n')}
${issues.length > 20 ? `\n... and ${issues.length - 20} more issues` : ''}

---

## [UP] Recommendation

${reconciled 
  ? '[OK] All financial records are reconciled. No action required.'
  : `[WARN] Found ${issues.length} reconciliation issue(s). Review and resolve before financial reporting.`}
`;

  return {
    title: 'Financial Reconciliation Report',
    content,
    summary: reconciled ? '[OK] RECONCILED' : `[WARN] ${issues.length} issues found`,
    tags: ['financial', 'reconciliation', 'critical', 'payments', 'audit'],
    stats: { 
      totalChecks: paidOrders.length + transactions.length, 
      passed: paidOrders.length + transactions.length - issues.length, 
      failed: issues.length, 
      warnings: 0, 
      score: issues.length === 0 ? 100 : Math.max(0, 100 - (issues.length * 5))
    },
    decision: {
      reconciled,
      orphanPayments,
      missingTransactions,
      mismatchedAmounts,
      discrepancy,
      issuesCount: issues.length,
    },
  };
}

// 3. Missing Keys Impact Report
async function generateMissingKeysImpactReport(findings) {
  const missingKeys = findings.system_keys?.missingVars || [];
  
  // Define impact mapping - aligned with scanSystemKeys
  const keyImpactMap = {
    // Security - Critical
    'JWT_SECRET': {
      affectedFlows: ['User Authentication', 'Session Management', 'API Security'],
      affectedReports: ['Security & Access Report', 'Users & Permissions Report'],
      severity: 'critical',
    },
    'NEXTAUTH_SECRET': {
      affectedFlows: ['OAuth Login', 'Session Encryption'],
      affectedReports: ['Security & Access Report'],
      severity: 'critical',
    },
    // Database - Critical
    'MONGODB_URI': {
      affectedFlows: ['All Database Operations', 'Data Storage', 'User Management'],
      affectedReports: ['All Reports'],
      severity: 'critical',
    },
    // PayPlus - High/Critical
    'PAYPLUS_API_KEY': {
      affectedFlows: ['Payment Processing', 'Checkout', 'Refunds'],
      affectedReports: ['Financial & Payments Report', 'Financial Reconciliation'],
      severity: 'critical',
    },
    'PAYPLUS_SECRET': {
      affectedFlows: ['Payment Authentication', 'Secure Transactions'],
      affectedReports: ['Financial & Payments Report'],
      severity: 'critical',
    },
    'PAYPLUS_WEBHOOK_SECRET': {
      affectedFlows: ['Payment Webhooks', 'Order Status Updates'],
      affectedReports: ['Orders & Transactions Report'],
      severity: 'high',
    },
    'PAYPLUS_BASE_URL': {
      affectedFlows: ['Payment API Connection', 'Checkout Process'],
      affectedReports: ['Financial & Payments Report', 'Integrations Report'],
      severity: 'critical',
    },
    'PAYPLUS_CALLBACK_URL': {
      affectedFlows: ['Payment Completion Redirect', 'Order Confirmation'],
      affectedReports: ['Orders & Transactions Report'],
      severity: 'medium',
    },
    // Priority ERP - High
    'PRIORITY_BASE_URL': {
      affectedFlows: ['ERP Connection', 'All Priority Operations'],
      affectedReports: ['Integrations & Webhooks Report'],
      severity: 'high',
    },
    'PRIORITY_CLIENT_ID': {
      affectedFlows: ['ERP Sync', 'Invoice Generation', 'Customer Sync'],
      affectedReports: ['Integrations & Webhooks Report'],
      severity: 'high',
    },
    'PRIORITY_CLIENT_SECRET': {
      affectedFlows: ['ERP Authentication', 'Priority API Access'],
      affectedReports: ['Integrations & Webhooks Report'],
      severity: 'high',
    },
    'PRIORITY_COMPANY_CODE': {
      affectedFlows: ['Company Selection', 'Document Creation'],
      affectedReports: ['Integrations & Webhooks Report'],
      severity: 'high',
    },
    'PRIORITY_ENV': {
      affectedFlows: ['Environment Selection (sandbox/production)'],
      affectedReports: ['Integrations & Webhooks Report'],
      severity: 'medium',
    },
    // Cloudinary - Medium
    'CLOUDINARY_CLOUD_NAME': {
      affectedFlows: ['Image Upload', 'Product Images', 'User Avatars'],
      affectedReports: ['Data Integrity Report'],
      severity: 'medium',
    },
    'CLOUDINARY_API_KEY': {
      affectedFlows: ['Image Upload Authentication'],
      affectedReports: ['Data Integrity Report'],
      severity: 'medium',
    },
    'CLOUDINARY_API_SECRET': {
      affectedFlows: ['Secure Image Operations'],
      affectedReports: ['Data Integrity Report'],
      severity: 'medium',
    },
    // Communications - Medium
    'TWILIO_ACCOUNT_SID': {
      affectedFlows: ['SMS Notifications', 'OTP Verification'],
      affectedReports: ['System Health Report'],
      severity: 'medium',
    },
    'TWILIO_AUTH_TOKEN': {
      affectedFlows: ['SMS Authentication'],
      affectedReports: ['System Health Report'],
      severity: 'medium',
    },
    'TWILIO_PHONE_NUMBER': {
      affectedFlows: ['SMS Sending'],
      affectedReports: ['System Health Report'],
      severity: 'medium',
    },
    // Email - Medium
    'EMAIL_SERVER_HOST': {
      affectedFlows: ['Email Sending', 'Password Reset', 'Notifications'],
      affectedReports: ['System Health Report'],
      severity: 'medium',
    },
    'EMAIL_SERVER_PORT': {
      affectedFlows: ['SMTP Connection'],
      affectedReports: [],
      severity: 'low',
    },
    'EMAIL_SERVER_USER': {
      affectedFlows: ['SMTP Authentication'],
      affectedReports: ['System Health Report'],
      severity: 'medium',
    },
    'EMAIL_SERVER_PASSWORD': {
      affectedFlows: ['SMTP Authentication'],
      affectedReports: ['System Health Report'],
      severity: 'medium',
    },
    'EMAIL_FROM': {
      affectedFlows: ['Email Sender Address'],
      affectedReports: [],
      severity: 'low',
    },
    // Web Push - Low
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY': {
      affectedFlows: ['Push Notifications'],
      affectedReports: [],
      severity: 'low',
    },
    'VAPID_PRIVATE_KEY': {
      affectedFlows: ['Push Notification Authentication'],
      affectedReports: [],
      severity: 'low',
    },
    // Config - Medium
    'NEXT_PUBLIC_SITE_URL': {
      affectedFlows: ['Email Links', 'Callback URLs', 'Agent Share Links'],
      affectedReports: ['System Health Report'],
      severity: 'medium',
    },
    'NODE_ENV': {
      affectedFlows: ['Environment Detection', 'Debug Mode', 'Error Handling'],
      affectedReports: ['Security & Access Report'],
      severity: 'medium',
    },
    'GOOGLE_ADS_CLIENT_ID': {
      affectedFlows: ['Google Ads OAuth', 'Campaign sync'],
      affectedReports: ['Integrations & Webhooks Report'],
      severity: 'medium',
    },
    'GOOGLE_ADS_CLIENT_SECRET': {
      affectedFlows: ['Google Ads OAuth token exchange'],
      affectedReports: ['Integrations & Webhooks Report'],
      severity: 'medium',
    },
    'GOOGLE_ADS_DEVELOPER_TOKEN': {
      affectedFlows: ['Google Ads API queries'],
      affectedReports: ['Integrations & Webhooks Report'],
      severity: 'medium',
    },
  };

  const impacts = missingKeys.map(mk => ({
    key: mk.key,
    ...keyImpactMap[mk.key] || { affectedFlows: ['Unknown'], affectedReports: ['Unknown'], severity: 'unknown' },
    weight: mk.weight,
    percentageGain: mk.percentageGain,
  }));

  const criticalCount = impacts.filter(i => i.severity === 'critical').length;
  const highCount = impacts.filter(i => i.severity === 'high').length;
  const mediumCount = impacts.filter(i => i.severity === 'medium').length;
  const lowCount = impacts.filter(i => i.severity === 'low').length;

  // Calculate affected flows and reports
  const allAffectedFlows = [...new Set(impacts.flatMap(i => i.affectedFlows))];
  const allAffectedReports = [...new Set(impacts.flatMap(i => i.affectedReports))];

  const content = `# 🔑 Missing Keys Impact Report

**Generated:** ${new Date().toISOString()}

---

## [STATS] Summary

| Metric | Value |
|--------|-------|
| **Missing Keys** | ${missingKeys.length} |
| **Critical** | ${criticalCount} |
| **High** | ${highCount} |
| **Medium** | ${mediumCount} |
| **Low** | ${lowCount} |

---

## 🚨 Impact by Severity

### Critical (System Breaking)
${impacts.filter(i => i.severity === 'critical').map(i => `- **${i.key}**: Affects ${i.affectedFlows.join(', ')}`).join('\n') || '[OK] None'}

### High (Feature Breaking)
${impacts.filter(i => i.severity === 'high').map(i => `- **${i.key}**: Affects ${i.affectedFlows.join(', ')}`).join('\n') || '[OK] None'}

### Medium (Degraded Functionality)
${impacts.filter(i => i.severity === 'medium').map(i => `- **${i.key}**: Affects ${i.affectedFlows.join(', ')}`).join('\n') || '[OK] None'}

### Low (Minor Impact)
${impacts.filter(i => i.severity === 'low').map(i => `- **${i.key}**: Affects ${i.affectedFlows.join(', ')}`).join('\n') || '[OK] None'}

---

## [PIN] Affected Business Flows

${allAffectedFlows.length > 0 ? allAffectedFlows.map(f => `- ${f}`).join('\n') : '[OK] No flows affected'}

---

## [LIST] Affected Reports

${allAffectedReports.length > 0 ? allAffectedReports.map(r => `- ${r}`).join('\n') : '[OK] No reports affected'}

---

## [TARGET] Prioritized Action Plan

${impacts.sort((a, b) => {
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, unknown: 4 };
  return severityOrder[a.severity] - severityOrder[b.severity];
}).map((i, idx) => `${idx + 1}. Configure **${i.key}** (${i.severity}) - +${i.percentageGain || 0}% system score`).join('\n') || '[OK] All keys configured'}
`;

  return {
    title: 'Missing Keys Impact Report',
    content,
    summary: `${missingKeys.length} missing keys (${criticalCount} critical)`,
    tags: ['keys', 'environment', 'impact', 'operational'],
    stats: { 
      totalChecks: Object.keys(keyImpactMap).length, 
      passed: Object.keys(keyImpactMap).length - missingKeys.length, 
      failed: criticalCount + highCount, 
      warnings: mediumCount + lowCount, 
      score: Math.round(((Object.keys(keyImpactMap).length - missingKeys.length) / Object.keys(keyImpactMap).length) * 100)
    },
  };
}

// 4. Risk Matrix Report
async function generateRiskMatrixReport(findings) {
  const risks = [];

  // Technical Risks
  const dbScore = findings.database?.passed && findings.database?.checks 
    ? Math.round((findings.database.passed / findings.database.checks) * 100) : 50;
  risks.push({
    category: 'technical',
    name: 'Database Stability',
    score: dbScore,
    level: dbScore >= 80 ? 'low' : dbScore >= 50 ? 'medium' : 'high',
    description: `Database health at ${dbScore}%`,
  });

  const healthScore = findings.system_keys?.scoreBreakdown?.current || 50;
  risks.push({
    category: 'technical',
    name: 'System Configuration',
    score: healthScore,
    level: healthScore >= 80 ? 'low' : healthScore >= 50 ? 'medium' : 'high',
    description: `Environment configuration at ${healthScore}%`,
  });

  // Financial Risks
  const paymentConfigured = findings.integrations?.details?.payplus?.configured;
  risks.push({
    category: 'financial',
    name: 'Payment Processing',
    score: paymentConfigured ? 100 : 0,
    level: paymentConfigured ? 'low' : 'high',
    description: paymentConfigured ? 'PayPlus configured' : 'PayPlus not configured - cannot process payments',
  });

  const failedPayments = findings.payment_data?.details?.failedPayments || 0;
  risks.push({
    category: 'financial',
    name: 'Payment Failures',
    score: failedPayments === 0 ? 100 : failedPayments < 5 ? 70 : failedPayments < 20 ? 40 : 10,
    level: failedPayments === 0 ? 'low' : failedPayments < 5 ? 'medium' : 'high',
    description: `${failedPayments} failed payment(s) recorded`,
  });

  // Security Risks
  const securityScore = findings.security?.passed && findings.security?.checks 
    ? Math.round((findings.security.passed / findings.security.checks) * 100) : 0;
  risks.push({
    category: 'security',
    name: 'Environment Security',
    score: securityScore,
    level: securityScore >= 90 ? 'low' : securityScore >= 70 ? 'medium' : 'high',
    description: `Security checks: ${findings.security?.passed || 0}/${findings.security?.checks || 0} passed`,
  });

  const missingCriticalKeys = (findings.system_keys?.missingVars || []).filter(v => v.priority === 'critical').length;
  risks.push({
    category: 'security',
    name: 'Critical Keys',
    score: missingCriticalKeys === 0 ? 100 : missingCriticalKeys === 1 ? 50 : 0,
    level: missingCriticalKeys === 0 ? 'low' : 'high',
    description: `${missingCriticalKeys} critical key(s) missing`,
  });

  // Operational Risks
  const orphanedOrders = findings.orders?.details?.orphaned || 0;
  risks.push({
    category: 'operational',
    name: 'Data Integrity',
    score: orphanedOrders === 0 ? 100 : orphanedOrders < 5 ? 70 : 30,
    level: orphanedOrders === 0 ? 'low' : orphanedOrders < 5 ? 'medium' : 'high',
    description: `${orphanedOrders} orphaned order(s)`,
  });

  const priorityConfigured = findings.integrations?.details?.priority?.configured;
  risks.push({
    category: 'operational',
    name: 'ERP Integration',
    score: priorityConfigured ? 100 : 50,
    level: priorityConfigured ? 'low' : 'medium',
    description: priorityConfigured ? 'Priority ERP connected' : 'Priority ERP not configured',
  });

  // Calculate category averages
  const categories = ['technical', 'financial', 'security', 'operational'];
  const categoryScores = {};
  for (const cat of categories) {
    const catRisks = risks.filter(r => r.category === cat);
    categoryScores[cat] = Math.round(catRisks.reduce((sum, r) => sum + r.score, 0) / catRisks.length);
  }

  const overallScore = Math.round(Object.values(categoryScores).reduce((a, b) => a + b, 0) / 4);
  const highRisks = risks.filter(r => r.level === 'high').length;
  const mediumRisks = risks.filter(r => r.level === 'medium').length;

  const content = `# [WARN] Risk Matrix Report

**Generated:** ${new Date().toISOString()}

---

## [STATS] Risk Overview

| Overall Score | High Risks | Medium Risks | Low Risks |
|---------------|------------|--------------|-----------|
| **${overallScore}%** | 🔴 ${highRisks} | 🟡 ${mediumRisks} | 🟢 ${risks.length - highRisks - mediumRisks} |

---

## [UP] Category Breakdown

| Category | Score | Level |
|----------|-------|-------|
| Technical | ${categoryScores.technical}% | ${categoryScores.technical >= 80 ? '🟢 Low' : categoryScores.technical >= 50 ? '🟡 Medium' : '🔴 High'} |
| Financial | ${categoryScores.financial}% | ${categoryScores.financial >= 80 ? '🟢 Low' : categoryScores.financial >= 50 ? '🟡 Medium' : '🔴 High'} |
| Security | ${categoryScores.security}% | ${categoryScores.security >= 80 ? '🟢 Low' : categoryScores.security >= 50 ? '🟡 Medium' : '🔴 High'} |
| Operational | ${categoryScores.operational}% | ${categoryScores.operational >= 80 ? '🟢 Low' : categoryScores.operational >= 50 ? '🟡 Medium' : '🔴 High'} |

---

## 🔴 High Risks

${risks.filter(r => r.level === 'high').map(r => `| ${r.category.toUpperCase()} | ${r.name} | ${r.description} |`).join('\n') || '[OK] No high risks identified'}

---

## 🟡 Medium Risks

${risks.filter(r => r.level === 'medium').map(r => `| ${r.category.toUpperCase()} | ${r.name} | ${r.description} |`).join('\n') || '[OK] No medium risks identified'}

---

## 🟢 Low Risks

${risks.filter(r => r.level === 'low').map(r => `| ${r.category.toUpperCase()} | ${r.name} | ${r.description} |`).join('\n') || 'None'}

---

## [LIST] Risk Matrix

\`\`\`
         │ Low Impact │ Med Impact │ High Impact
─────────┼────────────┼────────────┼────────────
High Prob│     🟡     │     🔴     │     🔴
Med Prob │     🟢     │     🟡     │     🔴
Low Prob │     🟢     │     🟢     │     🟡
\`\`\`

**Current Position:** ${overallScore >= 80 ? '🟢 Low Risk Zone' : overallScore >= 50 ? '🟡 Medium Risk Zone' : '🔴 High Risk Zone'}
`;

  return {
    title: 'Risk Matrix Report',
    content,
    summary: `Score: ${overallScore}% | ${highRisks} high, ${mediumRisks} medium risks`,
    tags: ['risk', 'matrix', 'analysis', 'executive'],
    stats: { 
      totalChecks: risks.length, 
      passed: risks.filter(r => r.level === 'low').length, 
      failed: highRisks, 
      warnings: mediumRisks, 
      score: overallScore 
    },
    decision: {
      overallScore,
      categoryScores,
      highRisks,
      mediumRisks,
      risks,
    },
  };
}

// 5. Reports Reliability Status Report
async function generateReportsReliabilityReport(findings) {
  // Define all reports and their dependencies
  const reportsDependencies = [
    {
      name: 'Financial & Payments Report',
      category: 'financial_payments',
      dependencies: {
        keys: ['PAYPLUS_API_KEY', 'PAYPLUS_SECRET'],
        integrations: ['payplus'],
        dataChecks: ['payment_data'],
      },
    },
    {
      name: 'Orders & Transactions Report',
      category: 'orders_transactions',
      dependencies: {
        keys: [],
        integrations: [],
        dataChecks: ['orders', 'transactions'],
      },
    },
    {
      name: 'Users & Permissions Report',
      category: 'users_permissions',
      dependencies: {
        keys: ['JWT_SECRET', 'NEXTAUTH_SECRET'],
        integrations: [],
        dataChecks: ['users', 'permissions'],
      },
    },
    {
      name: 'Admin Actions & Audit Trail',
      category: 'admin_audit_trail',
      dependencies: {
        keys: [],
        integrations: [],
        dataChecks: [],
      },
    },
    {
      name: 'Integrations & Webhooks Report',
      category: 'integrations_webhooks',
      dependencies: {
        keys: ['PRIORITY_CLIENT_ID', 'PAYPLUS_API_KEY'],
        integrations: ['priority', 'payplus'],
        dataChecks: ['integrations'],
      },
    },
    {
      name: 'Data Integrity & Consistency Report',
      category: 'data_integrity',
      dependencies: {
        keys: [],
        integrations: [],
        dataChecks: ['orders', 'users', 'products'],
      },
    },
    {
      name: 'Security & Access Report',
      category: 'security_access',
      dependencies: {
        keys: ['JWT_SECRET', 'NEXTAUTH_SECRET', 'MONGODB_URI'],
        integrations: [],
        dataChecks: ['security', 'system_keys'],
      },
    },
    {
      name: 'System Health & Stability Report',
      category: 'system_health',
      dependencies: {
        keys: ['MONGODB_URI'],
        integrations: [],
        dataChecks: ['database'],
      },
    },
    {
      name: 'Go-Live Readiness Report',
      category: 'go_live_readiness',
      dependencies: {
        keys: ['PAYPLUS_API_KEY', 'PAYPLUS_SECRET', 'JWT_SECRET'],
        integrations: ['payplus'],
        dataChecks: ['payment_data', 'security', 'orders', 'integrations'],
      },
    },
    {
      name: 'Financial Reconciliation Report',
      category: 'financial_reconciliation',
      dependencies: {
        keys: ['PAYPLUS_API_KEY'],
        integrations: ['payplus'],
        dataChecks: ['orders', 'transactions', 'payment_data'],
      },
    },
  ];

  // Check which keys are configured
  const configuredKeys = (findings.system_keys?.details || [])
    .filter(k => k.status === 'configured')
    .map(k => k.key);

  // Check which integrations are active
  const activeIntegrations = [];
  if (findings.integrations?.details?.priority?.configured) activeIntegrations.push('priority');
  if (findings.integrations?.details?.payplus?.configured) activeIntegrations.push('payplus');

  // Check data integrity
  const dataChecksPassed = Object.keys(findings).filter(k => 
    findings[k]?.failed === 0 || findings[k]?.passed === findings[k]?.checks
  );

  // Evaluate each report
  const reportStatuses = reportsDependencies.map(report => {
    const missingKeys = report.dependencies.keys.filter(k => !configuredKeys.includes(k));
    const missingIntegrations = report.dependencies.integrations.filter(i => !activeIntegrations.includes(i));
    const failedDataChecks = report.dependencies.dataChecks.filter(dc => 
      findings[dc]?.failed > 0
    );

    let status = 'reliable';
    let issues = [];

    if (missingKeys.length > 0) {
      issues.push(`Missing keys: ${missingKeys.join(', ')}`);
      status = missingKeys.some(k => ['JWT_SECRET', 'MONGODB_URI', 'PAYPLUS_API_KEY'].includes(k)) 
        ? 'unreliable' : 'partially_reliable';
    }

    if (missingIntegrations.length > 0 && report.dependencies.integrations.length > 0) {
      issues.push(`Missing integrations: ${missingIntegrations.join(', ')}`);
      if (status !== 'unreliable') status = 'partially_reliable';
    }

    if (failedDataChecks.length > 0) {
      issues.push(`Data issues in: ${failedDataChecks.join(', ')}`);
      if (status !== 'unreliable') status = 'partially_reliable';
    }

    return {
      name: report.name,
      category: report.category,
      status,
      issues,
      missingKeys,
      missingIntegrations,
      failedDataChecks,
    };
  });

  const reliable = reportStatuses.filter(r => r.status === 'reliable').length;
  const partiallyReliable = reportStatuses.filter(r => r.status === 'partially_reliable').length;
  const unreliable = reportStatuses.filter(r => r.status === 'unreliable').length;

  const content = `# [STATS] Reports Reliability Status Report

**Generated:** ${new Date().toISOString()}

---

## [UP] Summary

| Status | Count |
|--------|-------|
| [OK] Reliable | ${reliable} |
| [WARN] Partially Reliable | ${partiallyReliable} |
| [X] Unreliable | ${unreliable} |

---

## [LIST] Report Status Matrix

| Report | Status | Issues |
|--------|--------|--------|
${reportStatuses.map(r => `| ${r.name} | ${r.status === 'reliable' ? '[OK]' : r.status === 'partially_reliable' ? '[WARN]' : '[X]'} ${r.status} | ${r.issues.length > 0 ? r.issues.join('; ') : '-'} |`).join('\n')}

---

## [OK] Reliable Reports

${reportStatuses.filter(r => r.status === 'reliable').map(r => `- ${r.name}`).join('\n') || 'None'}

---

## [WARN] Partially Reliable Reports

${reportStatuses.filter(r => r.status === 'partially_reliable').map(r => `- **${r.name}**\n  - ${r.issues.join('\n  - ')}`).join('\n\n') || 'None'}

---

## [X] Unreliable Reports

${reportStatuses.filter(r => r.status === 'unreliable').map(r => `- **${r.name}**\n  - ${r.issues.join('\n  - ')}`).join('\n\n') || 'None'}

---

## [FIX] Dependencies Status

### Configured Keys (${configuredKeys.length})
${configuredKeys.map(k => `- [OK] ${k}`).join('\n') || '- None'}

### Active Integrations (${activeIntegrations.length})
${activeIntegrations.map(i => `- [OK] ${i}`).join('\n') || '- None'}

---

## [LIST] Recommendation

${unreliable === 0 && partiallyReliable === 0 
  ? '[OK] All reports are fully reliable. Data can be trusted for executive decisions.'
  : unreliable > 0 
    ? `[X] ${unreliable} report(s) are unreliable. Configure missing dependencies before using these reports.`
    : `[WARN] ${partiallyReliable} report(s) have partial reliability. Review issues before relying on data.`}
`;

  return {
    title: 'Reports Reliability Status Report',
    content,
    summary: `${reliable} reliable, ${partiallyReliable} partial, ${unreliable} unreliable`,
    tags: ['reliability', 'meta', 'reports', 'status'],
    stats: { 
      totalChecks: reportStatuses.length, 
      passed: reliable, 
      failed: unreliable, 
      warnings: partiallyReliable, 
      score: Math.round((reliable / reportStatuses.length) * 100) 
    },
    decision: {
      reliable,
      partiallyReliable,
      unreliable,
      reportStatuses,
    },
  };
}

export const POST = withErrorLogging(POSTHandler);
export const GET = withErrorLogging(GETHandler);
