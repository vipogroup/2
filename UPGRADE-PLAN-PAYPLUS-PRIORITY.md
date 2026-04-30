# 🚀 תוכנית שדרוג מלאה - PayPlus & Priority Integration
## VIPO Agent System - World-Class Development Plan
### תאריך: 2 בינואר 2026

---

# הוראות ל-Cascade

**כשתפתח שיחה חדשה, העלה את הקובץ הזה ואמור:**
```
קרא את הקובץ הזה והתחל לעבוד על תוכנית השדרוג של PayPlus ו-Priority לפי מה שמופיע בו
```

---

# חלק א׳ – סטטוס נוכחי של המערכת

## טכנולוגיות קיימות
| שכבה | טכנולוגיה | סטטוס |
|------|-----------|--------|
| Frontend | Next.js 14, React, Tailwind CSS | ✔ |
| Backend | Next.js API Routes, Node.js | ✔ |
| Database | MongoDB Atlas | ✔ |
| Auth | JWT + Google OAuth | ✔ |
| Hosting | Vercel | ✔ |
| Payments | PayPlus (Redirect mode) | ⚠ חלקי |
| ERP | Priority | ❌ לא קיים |

## מודלים קיימים (15)
- User.js, Order.js, Transaction.js, WithdrawalRequest.js
- Product.js, Notification.js, ReferralLog.js, Sale.js
- AgentGoal.js, BonusRule.js, LevelRule.js
- GroupPurchase.js, Category.js, Catalog.js, Message.js

## API Endpoints קיימים (40+)
- Orders, PayPlus (חלקי), Commissions, Withdrawals
- Transactions, Reports, Users, Auth, System Status

## דפי Admin קיימים (18)
- agents, analytics, backups, commissions, dashboard
- marketing-assets, monitor, notifications, orders
- products, reports, security, settings, tasks
- transactions (חלקי), users, theme-selector

---

# חלק ב׳ – פערים שזוהו

## פערים ב-PayPlus (קריטי)
| פער | תיאור |
|-----|-------|
| Webhooks חלקיים | רק success/fail, חסר pending/refund/chargeback |
| Idempotency | אין מנגנון למניעת כפילויות |
| Payment Events Table | אין collection נפרד |
| Retry Policy | אין הגדרה מספרית |
| Error Mapping | אין טבלת תרגום שגיאות |
| Timeout Handling | אין טיפול ב-timeouts |
| Reconciliation | אין דוח התאמה |

## פערים ב-Priority (קריטי)
| פער | תיאור |
|-----|-------|
| אינטגרציה | לא קיימת כלל |
| Customer Sync | לקוחות לא מסונכרנים |
| Invoice/Receipt | אין יצירת מסמכים |
| Credit Notes | אין טיפול בזיכויים |
| SKU Mapping | אין מיפוי מוצרים |
| GL Accounts | אין הגדרת חשבונות |

## פערים במודלים
| פער | תיאור |
|-----|-------|
| Order | חסר priorityDocId, invoiceNumber |
| User | חסר priorityCustomerId, vatId |
| Product | חסר priorityItemCode |
| Payment Events | Collection לא קיים |
| Integration Sync Map | Collection לא קיים |

---

# חלק ג׳ – תוכנית השדרוג המלאה

## Phase 0: Foundation & Architecture (שבוע 1)

### 0.1 Data Architecture - יצירת Collections חדשים

#### payment_events collection
```javascript
{
  _id: ObjectId,
  eventId: String,           // Idempotency key
  orderId: ObjectId,
  transactionId: String,     // PayPlus txId
  type: 'initiated' | 'pending' | 'success' | 'failed' | 'refund' | 'partial_refund' | 'chargeback',
  amount: Number,
  currency: String,
  paymentMethod: String,
  cardLast4: String,
  rawPayload: Object,
  signature: String,
  signatureValid: Boolean,
  processedAt: Date,
  retryCount: Number,
  status: 'pending' | 'processed' | 'failed' | 'ignored',
  errorMessage: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### integration_sync_map collection
```javascript
{
  _id: ObjectId,
  orderId: ObjectId,
  payplusTransactionId: String,
  payplusSessionId: String,
  priorityCustomerId: String,
  prioritySalesOrderId: String,
  priorityInvoiceId: String,
  priorityReceiptId: String,
  priorityCreditNoteId: String,
  syncStatus: 'pending' | 'synced' | 'partial' | 'failed',
  lastSyncAttempt: Date,
  lastSyncSuccess: Date,
  errorLog: [{ date: Date, error: String }],
  createdAt: Date,
  updatedAt: Date
}
```

#### priority_products collection (SKU mapping)
```javascript
{
  _id: ObjectId,
  productId: ObjectId,
  priorityItemCode: String,
  priorityItemName: String,
  vatType: 'standard' | 'exempt' | 'reduced',
  vatRate: Number,
  glAccountSales: String,
  glAccountVAT: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### 0.2 Policy Documents
- Source of Truth Policy: PayPlus=תשלומים, Priority=מסמכים, Site=Orders
- Commission Policy: Hold periods, approval workflow
- Reconciliation Policy: Daily, weekly, monthly
- Error Handling Policy: Escalation matrix

### 0.3 Environment Configuration
```env
# PayPlus
PAYPLUS_ENV=sandbox|production
PAYPLUS_API_KEY=
PAYPLUS_SECRET=
PAYPLUS_WEBHOOK_SECRET=
PAYPLUS_BASE_URL=
PAYPLUS_TIMEOUT_MS=30000
PAYPLUS_RETRY_ATTEMPTS=3
PAYPLUS_RETRY_DELAYS=10000,30000,60000

# Priority
PRIORITY_ENV=sandbox|production
PRIORITY_BASE_URL=
PRIORITY_CLIENT_ID=
PRIORITY_CLIENT_SECRET=
PRIORITY_TIMEOUT_MS=45000
PRIORITY_COMPANY_CODE=
PRIORITY_INVOICE_SERIES=
PRIORITY_RECEIPT_SERIES=

# Integration
INTEGRATION_DEAD_LETTER_ENABLED=true
INTEGRATION_ALERT_EMAIL=
INTEGRATION_ALERT_SLACK_WEBHOOK=
```

---

## Phase 1: PayPlus Enhancement (שבועות 2-3)

### 1.1 Webhook Handler - שכתוב מלא
**קובץ:** `app/api/payplus/webhook/route.js`

Events נתמכים:
- payment_initiated → Log + Status update
- payment_pending → Log + Notify customer
- payment_success → Log + Trigger Priority sync + Commission calc
- payment_failed → Log + Notify customer + Admin alert
- refund_full → Log + Cancel commission + Priority credit note
- refund_partial → Log + Adjust commission + Priority partial credit
- chargeback → Log + Cancel commission + Priority reversal + Admin alert

### 1.2 Idempotency Implementation
```javascript
async function processWebhook(payload, signature) {
  const eventId = payload.eventId || generateEventHash(payload);
  
  const existing = await paymentEvents.findOne({ eventId });
  if (existing?.status === 'processed') {
    return { ok: true, message: 'Already processed' };
  }
  
  const lock = await acquireLock(`payment:${eventId}`, 30000);
  try {
    // Process...
    await paymentEvents.updateOne(
      { eventId },
      { $set: { status: 'processed', processedAt: new Date() } }
    );
  } finally {
    await releaseLock(lock);
  }
}
```

### 1.3 Retry & Dead Letter Queue
```javascript
const RETRY_CONFIG = {
  maxAttempts: 3,
  delays: [10000, 30000, 60000],
  deadLetterCollection: 'dead_letter_queue',
  alertOnDeadLetter: true
};
```

### 1.4 Error Codes Mapping
```javascript
const PAYPLUS_ERROR_MAP = {
  'PP001': { code: 'CARD_DECLINED', message: 'הכרטיס נדחה', action: 'retry_different_card' },
  'PP002': { code: 'INSUFFICIENT_FUNDS', message: 'אין יתרה מספיקה', action: 'retry_later' },
  'PP003': { code: 'EXPIRED_CARD', message: 'תוקף הכרטיס פג', action: 'update_card' },
  'PP004': { code: '3DS_FAILED', message: 'אימות נכשל', action: 'retry' },
  'PP005': { code: 'TIMEOUT', message: 'תקלה זמנית', action: 'auto_retry' },
  'PP100': { code: 'SUCCESS', message: 'התשלום התקבל', action: 'proceed' },
  'PP200': { code: 'REFUND_SUCCESS', message: 'הזיכוי בוצע', action: 'notify' },
};
```

### 1.5 New API Endpoints
```
GET  /api/admin/payplus/transactions
GET  /api/admin/payplus/transactions/:id
POST /api/admin/payplus/transactions/:id/retry
GET  /api/admin/payplus/reconciliation
POST /api/admin/payplus/reconciliation/close
GET  /api/admin/payplus/dead-letter
POST /api/admin/payplus/dead-letter/:id/retry
```

---

## Phase 2: Commission System Upgrade (שבועות 4-5)

### 2.1 Commission Lifecycle
```
Order Created → Commission Pending
     ↓
Payment Success → Commission Confirmed (Hold starts)
     ↓
Hold Period Complete → Commission Available
     ↓
Agent Requests Withdrawal → Commission Claimed
     ↓
Admin Approves & Pays → Commission Paid

Exceptions:
- Partial Refund → Commission Reduced proportionally
- Full Refund → Commission Cancelled
- Chargeback → Commission Cancelled + Agent notified
```

### 2.2 Enhanced Commission Calculation
```javascript
async function calculateCommission(order, agent) {
  const rules = await getCommissionRules(agent, order);
  
  let commission = {
    baseAmount: 0,
    bonusAmount: 0,
    totalAmount: 0,
    holdDays: rules.holdDays,
    availableAt: null,
    breakdown: []
  };
  
  for (const item of order.items) {
    const itemCommission = item.price * (rules.percentage / 100);
    commission.baseAmount += itemCommission;
    commission.breakdown.push({
      productId: item.productId,
      productName: item.name,
      price: item.price,
      rate: rules.percentage,
      amount: itemCommission
    });
  }
  
  const bonuses = await evaluateBonusRules(agent, order);
  commission.bonusAmount = bonuses.total;
  commission.totalAmount = commission.baseAmount + commission.bonusAmount;
  commission.availableAt = addDays(new Date(), commission.holdDays);
  
  return commission;
}
```

### 2.3 Withdrawal Workflow Enhancement
```javascript
const WITHDRAWAL_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  REJECTED: 'rejected'
};

// New fields for WithdrawalRequest
{
  bankDetails: {
    bankName: String,
    branchNumber: String,
    accountNumber: String,
    accountName: String
  },
  paymentMethod: 'bank_transfer' | 'paypal' | 'check',
  paymentReference: String,
  priorityPaymentDocId: String,
  reviewedBy: ObjectId,
  reviewedAt: Date,
  reviewNotes: String,
  paidBy: ObjectId,
  paidAt: Date,
  paymentProof: String
}
```

### 2.4 Scheduled Jobs (Cron)
```javascript
// Daily at 02:00 - Release available commissions
// Daily at 06:00 - Generate reconciliation report
// Hourly - Retry failed syncs
```

---

## Phase 3: Priority Integration (שבועות 6-10)

### 3.1 Priority Client Library
**קובץ חדש:** `lib/priority/client.js`

```javascript
class PriorityClient {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.companyCode = config.companyCode;
    this.auth = new PriorityAuth(config);
    this.timeout = config.timeout || 45000;
    this.retries = config.retries || 3;
  }
  
  async findCustomer(query) { }
  async createCustomer(data) { }
  async updateCustomer(id, data) { }
  async createSalesOrder(data) { }
  async getSalesOrder(id) { }
  async createInvoice(data) { }
  async createReceipt(data) { }
  async createCreditNote(data) { }
  async getProduct(itemCode) { }
  async syncProducts() { }
}
```

### 3.2 Customer Synchronization
```javascript
async function syncCustomerToPriority(user, order) {
  const priority = getPriorityClient();
  
  let priorityCustomer = await priority.findCustomer({
    email: user.email,
    phone: user.phone,
    vatId: user.vatId
  });
  
  if (!priorityCustomer) {
    priorityCustomer = await priority.createCustomer({
      name: user.fullName,
      email: user.email,
      phone: user.phone,
      vatId: user.vatId || null,
      address: order.customer?.address || user.shippingAddress,
      city: order.customer?.city || user.shippingCity,
      zipCode: order.customer?.zipCode || user.shippingZipCode,
      country: 'IL'
    });
    
    await db.users.updateOne(
      { _id: user._id },
      { $set: { priorityCustomerId: priorityCustomer.id } }
    );
  }
  
  return priorityCustomer;
}
```

### 3.3 Document Creation Flow
```javascript
async function createPriorityDocuments(order, paymentEvent) {
  const priority = getPriorityClient();
  const syncMap = await getOrCreateSyncMap(order._id);
  
  try {
    // 1. Ensure customer exists
    const customer = await syncCustomerToPriority(order.createdBy, order);
    syncMap.priorityCustomerId = customer.id;
    
    // 2. Create Sales Order
    if (!syncMap.prioritySalesOrderId) {
      const salesOrder = await priority.createSalesOrder({
        customerId: customer.id,
        orderDate: order.createdAt,
        externalRef: order._id.toString(),
        lines: await mapOrderLinesToPriority(order.items),
        totals: {
          subtotal: order.totals.subtotal,
          discount: order.totals.discountAmount,
          vat: order.totals.vatAmount || 0,
          total: order.totalAmount
        }
      });
      syncMap.prioritySalesOrderId = salesOrder.id;
    }
    
    // 3. Create Invoice/Receipt on payment success
    // 4. Create Credit Note on refund
    
    syncMap.syncStatus = 'synced';
    syncMap.lastSyncSuccess = new Date();
    
  } catch (error) {
    syncMap.syncStatus = 'failed';
    syncMap.errorLog.push({ date: new Date(), error: error.message });
    throw error;
  } finally {
    await saveSyncMap(syncMap);
  }
}
```

### 3.4 Accounting Codes
```javascript
const GL_ACCOUNTS = {
  SALES: {
    PRODUCTS: '4100',
    SERVICES: '4200',
    SHIPPING: '4300'
  },
  VAT: {
    STANDARD: '4500',
    REDUCED: '4501',
    EXEMPT: '4502'
  },
  EXPENSES: {
    AGENT_COMMISSION: '6200',
    REFUNDS: '6300',
    CHARGEBACKS: '6400'
  },
  LIABILITIES: {
    AGENT_PAYABLE: '2200',
    CUSTOMER_PREPAYMENT: '2300'
  }
};
```

### 3.5 New API Endpoints for Priority
```
GET  /api/admin/priority/status
POST /api/admin/priority/test-connection
GET  /api/admin/priority/customers
GET  /api/admin/priority/documents
POST /api/admin/priority/sync/:orderId
GET  /api/admin/priority/products
PUT  /api/admin/priority/products/:id
GET  /api/admin/priority/reconciliation
```

---

## Phase 4: Finance Dashboard (שבועות 11-12)

### מבנה הדשבורד
```
כספים ודוחות
├── 📊 סקירה כללית (KPIs)
├── 💳 עסקאות PayPlus
├── 📄 מסמכי Priority
├── 👥 עמלות סוכנים
├── 💸 בקשות משיכה
├── ⚠️ חריגות
├── 🔄 התאמות (Reconciliation)
├── 📈 דוחות מתקדמים
└── ⚙️ הגדרות
```

### כפתורים וממשקים חדשים
| כפתור | מה מציג |
|--------|---------|
| סקירה כללית | KPIs: הכנסות, עמלות, משיכות, חריגות |
| עסקאות PayPlus | כל הסליקות, סטטוס, raw payload, retry |
| מסמכי Priority | חשבוניות/קבלות/זיכויים, קישור לפריוריטי |
| עמלות סוכנים | סיכום לפי סוכן, פירוט, עריכת שחרור |
| בקשות משיכה | תור, אישור/דחייה, סימון "שולם" |
| חריגות | Webhook חסר, סכום לא תואם, sync נכשל |
| התאמות | דוח reconciliation, סגירת פערים |
| PayPlus סליקה | סטטוס חיבור, בדיקה, הגדרות |
| Priority ERP | סטטוס sync, retry |

---

## Phase 5: Hardening & Go-Live (שבועות 13-14)

### 5.1 Security Checklist
- [ ] SSL/TLS on all endpoints
- [ ] Webhook signature validation
- [ ] IP allowlist for PayPlus
- [ ] Rate limiting
- [ ] Secrets rotation procedure
- [ ] Audit logging
- [ ] PCI-DSS compliance review

### 5.2 Monitoring & Alerts
```javascript
const ALERT_RULES = [
  { name: 'webhook_missing', severity: 'critical', channels: ['slack', 'email', 'sms'] },
  { name: 'priority_sync_failed', severity: 'high', channels: ['slack', 'email'] },
  { name: 'amount_mismatch', severity: 'critical', channels: ['slack', 'email'] },
  { name: 'chargeback_received', severity: 'critical', channels: ['slack', 'email', 'sms'] },
  { name: 'high_pending_withdrawals', severity: 'medium', channels: ['email'] }
];
```

### 5.3 Go-Live Checklist
**Pre-Launch (D-7):**
- [ ] Production API keys configured
- [ ] Webhook URLs registered
- [ ] Priority production credentials
- [ ] SSL certificates valid
- [ ] All indexes created
- [ ] Cron jobs scheduled
- [ ] Backup/restore tested
- [ ] Monitoring configured
- [ ] On-call rotation set
- [ ] Runbook documented
- [ ] Finance team trained

**Launch Day (D-0):**
- [ ] Final smoke test
- [ ] Test transaction (₪1)
- [ ] Verify webhook received
- [ ] Verify Priority document created
- [ ] Verify commission calculated
- [ ] Enable for all users
- [ ] Monitor first 10 transactions

**Post-Launch (D+1 to D+7):**
- [ ] Daily reconciliation review
- [ ] Address mismatches
- [ ] Fine-tune alerts
- [ ] Document lessons learned

---

# חלק ד׳ – לוח זמנים

| שלב | משך | תוכן |
|-----|-----|------|
| Phase 0 | שבוע 1 | Foundation & Architecture |
| Phase 1 | שבועות 2-3 | PayPlus Enhancement |
| Phase 2 | שבועות 4-5 | Commission System |
| Phase 3 | שבועות 6-10 | Priority Integration |
| Phase 4 | שבועות 11-12 | Finance Dashboard |
| Phase 5 | שבועות 13-14 | Hardening & Go-Live |

**סה"כ: 14 שבועות (~3.5 חודשים)**

---

# חלק ה׳ – גיבוי

## גיבוי נוכחי (לפני השדרוג)
- **Git Tag:** `backup/2026-01-02T20-29-18_pre-payplus-priority-upgrade`
- **MongoDB:** `backups/database/mongo-2026-01-02T20-29-36-855Z/`
- **Full Backup:** `backups/full/2026-01-02T20-29-18_pre-payplus-priority-upgrade/`

## פקודות שחזור
```bash
# שחזור MongoDB
npm run restore:full

# שחזור קוד
git checkout backup/2026-01-02T20-29-18_pre-payplus-priority-upgrade
```

---

# הפעולה הסופית לחיבור

לאחר השלמת כל השלבים:

1. **הזנת Production Credentials:**
```env
PAYPLUS_API_KEY=<production_key>
PAYPLUS_SECRET=<production_secret>
PAYPLUS_WEBHOOK_SECRET=<production_webhook_secret>
PAYPLUS_BASE_URL=https://api.payplus.co.il

PRIORITY_CLIENT_ID=<production_id>
PRIORITY_CLIENT_SECRET=<production_secret>
PRIORITY_BASE_URL=https://priority.company.com
```

2. **רישום Webhook URL:**
```
https://your-domain.com/api/payplus/webhook
```

3. **בדיקת עסקה (₪1):**
- אימות Webhook התקבל ✔
- אימות מסמך נוצר בפריוריטי ✔
- אימות עמלה חושבה ✔

4. **הפעלה מלאה**

---

*נוצר ב-2 בינואר 2026 | VIPO Agent System*
