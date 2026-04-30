import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { requireAuthApi } from '@/lib/auth/server';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';

/**
 * Export commissions report to CSV for business dashboard
 * GET /api/business/commissions/export?agentId=xxx&from=2026-01-01&to=2026-01-31
 */
async function GETHandler(req) {
  try {
    const user = await requireAuthApi(req);
    
    // Only business_admin can export
    if (user.role !== 'business_admin' && user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    if (!user.tenantId && user.role === 'business_admin') {
      return NextResponse.json({ error: 'No tenant assigned' }, { status: 400 });
    }

    const identifier = buildRateLimitKey(req, user.id);
    const rateLimit = rateLimiters.admin(req, identifier);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const status = searchParams.get('status');

    const db = await getDb();
    const ordersCol = db.collection('orders');
    const usersCol = db.collection('users');

    // Build filter for orders with commissions
    const filter = {
      commissionAmount: { $gt: 0 },
      refAgentId: { $ne: null },
    };
    
    // Multi-Tenant: Filter by tenant
    if (user.role === 'business_admin' && user.tenantId) {
      filter.tenantId = new ObjectId(user.tenantId);
    }

    // Agent filter
    if (agentId && ObjectId.isValid(agentId)) {
      filter.refAgentId = new ObjectId(agentId);
    }

    // Date filter
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        filter.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    // Status filter
    if (status) {
      filter.commissionStatus = status;
    }

    // Fetch orders with commissions
    const orders = await ordersCol
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(10000)
      .toArray();

    // Get unique agent IDs
    const agentIds = [...new Set(orders.map(o => o.refAgentId?.toString()).filter(Boolean))];
    
    // Fetch agent details
    const agents = agentIds.length > 0
      ? await usersCol.find({
          _id: { $in: agentIds.map(id => new ObjectId(id)) }
        }).project({
          fullName: 1,
          phone: 1,
          email: 1,
          couponCode: 1,
          commissionPercent: 1,
          vatId: 1,
          companyName: 1,
          bankDetails: 1,
          preferredPayoutMethod: 1,
          paypalEmail: 1,
        }).toArray()
      : [];

    const agentMap = new Map(agents.map(a => [a._id.toString(), a]));

    // Generate CSV
    const csvRows = [];
    
    // Headers in Hebrew
    const headers = [
      'תאריך הזמנה',
      'מזהה הזמנה',
      'שם סוכן',
      'טלפון סוכן',
      'אימייל סוכן',
      'קוד קופון',
      'ת.ז/ח.פ סוכן',
      'שם מוצר',
      'סכום הזמנה',
      'אחוז עמלה',
      'סכום עמלה',
      'סטטוס עמלה',
      'תאריך שחרור',
      'שם לקוח',
      'טלפון לקוח',
      'שיטת תשלום מועדפת',
      'פרטי בנק',
    ];
    csvRows.push(headers.join(','));

    // Helper functions
    const formatDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      return new Intl.DateTimeFormat('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    };

    const getStatusText = (status) => {
      const statusMap = {
        pending: 'ממתין לשחרור',
        available: 'זמין למשיכה',
        claimed: 'נמשך',
        cancelled: 'בוטל',
      };
      return statusMap[status] || status || '';
    };

    const getPayoutMethodText = (method) => {
      const methodMap = {
        bank_transfer: 'העברה בנקאית',
        paypal: 'PayPal',
        check: 'צ\'ק',
      };
      return methodMap[method] || method || '';
    };

    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const formatBankDetails = (bankDetails) => {
      if (!bankDetails) return '';
      const parts = [];
      if (bankDetails.bankName) parts.push(bankDetails.bankName);
      if (bankDetails.branchNumber) parts.push(`סניף ${bankDetails.branchNumber}`);
      if (bankDetails.accountNumber) parts.push(`חשבון ${bankDetails.accountNumber}`);
      if (bankDetails.accountName) parts.push(`ע"ש ${bankDetails.accountName}`);
      return parts.join(' | ');
    };

    // Process each order
    for (const order of orders) {
      const agent = agentMap.get(order.refAgentId?.toString()) || {};
      const customer = order.customer || {};
      const items = order.items || [];
      const productNames = items.map(i => i.name).join(', ');

      const row = [
        escapeCSV(formatDate(order.createdAt)),
        escapeCSV(order._id.toString().slice(-8).toUpperCase()),
        escapeCSV(agent.fullName || ''),
        escapeCSV(agent.phone || ''),
        escapeCSV(agent.email || ''),
        escapeCSV(agent.couponCode || ''),
        escapeCSV(agent.vatId || ''),
        escapeCSV(productNames),
        escapeCSV(order.totalAmount || 0),
        escapeCSV((order.commissionPercent || agent.commissionPercent || 0) + '%'),
        escapeCSV(order.commissionAmount || 0),
        escapeCSV(getStatusText(order.commissionStatus)),
        escapeCSV(formatDate(order.commissionAvailableAt)),
        escapeCSV(customer.fullName || order.customerName || ''),
        escapeCSV(customer.phone || order.customerPhone || ''),
        escapeCSV(getPayoutMethodText(agent.preferredPayoutMethod)),
        escapeCSV(formatBankDetails(agent.bankDetails)),
      ];
      csvRows.push(row.join(','));
    }

    // Create CSV content with UTF-8 BOM for Excel Hebrew support
    const BOM = '\uFEFF';
    const csvContent = BOM + csvRows.join('\n');

    // Generate filename
    const now = new Date();
    const filename = `commissions-export-${now.toISOString().split('T')[0]}.csv`;

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('COMMISSIONS_EXPORT_ERROR:', err);
    const status = err?.status || 500;
    const message =
      status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Server error';
    return NextResponse.json({ error: message }, { status });
  }
}

export const GET = withErrorLogging(GETHandler);
