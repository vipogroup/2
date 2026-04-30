import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { requireAuthApi } from '@/lib/auth/server';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';

/**
 * Export orders to CSV for business dashboard
 * GET /api/business/orders/export?from=2026-01-01&to=2026-01-31
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
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const status = searchParams.get('status');

    const db = await getDb();
    const ordersCol = db.collection('orders');

    // Build filter
    const filter = {};
    
    // Multi-Tenant: Filter by tenant
    if (user.role === 'business_admin' && user.tenantId) {
      filter.tenantId = new ObjectId(user.tenantId);
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
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Fetch orders
    const orders = await ordersCol
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(10000) // Max 10k orders per export
      .toArray();

    // Generate CSV
    const csvRows = [];
    
    // Headers in Hebrew
    const headers = [
      'תאריך',
      'מזהה הזמנה',
      'מק"ט',
      'שם מוצר',
      'כמות',
      'מחיר יחידה',
      'סה"כ שורה',
      'שם לקוח',
      'טלפון',
      'אימייל',
      'כתובת',
      'עיר',
      'מיקוד',
      'סוג אספקה',
      'אמצעי תשלום',
      'הנחה',
      'סה"כ הזמנה',
      'סטטוס',
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
        pending: 'ממתין',
        paid: 'שולם',
        processing: 'בטיפול',
        shipped: 'נשלח',
        delivered: 'נמסר',
        completed: 'הושלם',
        cancelled: 'בוטל',
        refunded: 'הוחזר',
      };
      return statusMap[status] || status;
    };

    const getDeliveryMethodText = (method) => {
      const methodMap = {
        pickup: 'איסוף עצמי',
        shipping: 'משלוח',
      };
      return methodMap[method] || method || '';
    };

    const getPaymentMethodText = (method) => {
      const methodMap = {
        credit_card: 'כרטיס אשראי',
        paypal: 'PayPal',
        bank_transfer: 'העברה בנקאית',
        bit: 'ביט',
        cash: 'מזומן',
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

    // Process each order
    for (const order of orders) {
      const customer = order.customer || {};
      const items = order.items || [];
      
      // If order has multiple items, create a row for each item
      if (items.length > 0) {
        for (const item of items) {
          const row = [
            escapeCSV(formatDate(order.createdAt)),
            escapeCSV(order._id.toString().slice(-8).toUpperCase()),
            escapeCSV(item.sku || ''),
            escapeCSV(item.name || ''),
            escapeCSV(item.quantity || 1),
            escapeCSV(item.unitPrice || 0),
            escapeCSV(item.totalPrice || (item.unitPrice * (item.quantity || 1))),
            escapeCSV(customer.fullName || order.customerName || ''),
            escapeCSV(customer.phone || order.customerPhone || ''),
            escapeCSV(customer.email || order.customerEmail || ''),
            escapeCSV(customer.address || ''),
            escapeCSV(customer.city || ''),
            escapeCSV(customer.zipCode || ''),
            escapeCSV(getDeliveryMethodText(order.deliveryMethod)),
            escapeCSV(getPaymentMethodText(order.paymentMethod)),
            escapeCSV(order.discountAmount || 0),
            escapeCSV(order.totalAmount || 0),
            escapeCSV(getStatusText(order.status)),
          ];
          csvRows.push(row.join(','));
        }
      } else {
        // Order with no items (edge case)
        const row = [
          escapeCSV(formatDate(order.createdAt)),
          escapeCSV(order._id.toString().slice(-8).toUpperCase()),
          '',
          '',
          '',
          '',
          '',
          escapeCSV(customer.fullName || order.customerName || ''),
          escapeCSV(customer.phone || order.customerPhone || ''),
          escapeCSV(customer.email || order.customerEmail || ''),
          escapeCSV(customer.address || ''),
          escapeCSV(customer.city || ''),
          escapeCSV(customer.zipCode || ''),
          escapeCSV(getDeliveryMethodText(order.deliveryMethod)),
          escapeCSV(getPaymentMethodText(order.paymentMethod)),
          escapeCSV(order.discountAmount || 0),
          escapeCSV(order.totalAmount || 0),
          escapeCSV(getStatusText(order.status)),
        ];
        csvRows.push(row.join(','));
      }
    }

    // Create CSV content with UTF-8 BOM for Excel Hebrew support
    const BOM = '\uFEFF';
    const csvContent = BOM + csvRows.join('\n');

    // Generate filename with date range
    const now = new Date();
    const filename = `orders-export-${now.toISOString().split('T')[0]}.csv`;

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('ORDERS_EXPORT_ERROR:', err);
    const status = err?.status || 500;
    const message =
      status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Server error';
    return NextResponse.json({ error: message }, { status });
  }
}

export const GET = withErrorLogging(GETHandler);
