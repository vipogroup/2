/**
 * Script to save integration report to the system
 * Run with: node scripts/saveIntegrationReport.js
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const INTEGRATION_REPORT_CONTENT = `
# 📋 דוח טכני מלא - אינטגרציות VIPO
## Priority ERP + PayPlus

---

## 🏗️ מבנה הקבצים

\`\`\`
lib/
├── priority/
│   ├── config.js           # הגדרות Priority
│   ├── client.js           # לקוח API ל-Priority
│   ├── syncService.js      # סנכרון לקוחות/הזמנות
│   └── agentPayoutService.js  # תשלום עמלות לסוכנים
│
├── payplus/
│   ├── config.js           # הגדרות PayPlus
│   └── client.js           # לקוח API ל-PayPlus
│
app/api/
├── payplus/
│   └── webhook/route.js    # Webhook handler
│
└── admin/
    └── withdrawals/
        └── [id]/route.js   # API תשלום לסוכנים
\`\`\`

---

## 🔑 משתני סביבה נדרשים

### PayPlus
\`\`\`env
PAYPLUS_ENV=sandbox
PAYPLUS_API_KEY=
PAYPLUS_SECRET=
PAYPLUS_WEBHOOK_SECRET=
PAYPLUS_BASE_URL=https://restapiv2.payplus.co.il/api
PAYPLUS_CALLBACK_URL=
PAYPLUS_MOCK_ENABLED=false
PAYPLUS_TIMEOUT_MS=30000
PAYPLUS_RETRY_ATTEMPTS=3
PAYPLUS_RETRY_DELAYS=10000,30000,60000
\`\`\`

### Priority ERP
\`\`\`env
PRIORITY_ENV=sandbox
PRIORITY_BASE_URL=
PRIORITY_CLIENT_ID=
PRIORITY_CLIENT_SECRET=
PRIORITY_COMPANY_CODE=
PRIORITY_TIMEOUT_MS=45000
PRIORITY_INVOICE_SERIES=
PRIORITY_RECEIPT_SERIES=
PRIORITY_CREDIT_NOTE_SERIES=
\`\`\`

---

## 📡 PayPlus - פונקציות קיימות

### אימות (Authentication)
- API Key + Secret ב-Headers
- אימות חתימת Webhook עם crypto.timingSafeEqual

### תשלומים
| פונקציה | תיאור |
|---------|--------|
| createPaymentSession() | יצירת סשן תשלום |
| getPaymentStatus() | בדיקת סטטוס תשלום |
| verifyWebhookSignature() | אימות webhook |

### Webhook Events
- payment.success → עדכון הזמנה כ-paid
- payment.failed → רישום כישלון
- refund.success → עדכון כ-refunded
- chargeback → התראה למנהל

### Webhook Handler מתקדם
- **Idempotency** - מניעת עיבוד כפול
- **Dead Letter Queue** - ניסיונות חוזרים
- **Retry Mechanism** - עד 3 ניסיונות

---

## 🏢 Priority ERP - פונקציות קיימות

### אימות (Authentication)
OAuth 2.0 Client Credentials Flow

### לקוחות (CUSTOMERS)
| פונקציה | OData Endpoint | תיאור |
|---------|---------------|--------|
| findCustomer() | GET /CUSTOMERS | חיפוש לקוח |
| createCustomer() | POST /CUSTOMERS | יצירת לקוח |
| updateCustomer() | PATCH /CUSTOMERS | עדכון לקוח |

### הזמנות מכירה (ORDERS)
| פונקציה | OData Endpoint | תיאור |
|---------|---------------|--------|
| createSalesOrder() | POST /ORDERS | יצירת הזמנה |
| getSalesOrder() | GET /ORDERS | קבלת הזמנה |

### חשבוניות (AINVOICES)
| פונקציה | OData Endpoint | תיאור |
|---------|---------------|--------|
| createInvoice() | POST /AINVOICES | יצירת חשבונית מס |

### קבלות (RECEIPTS)
| פונקציה | OData Endpoint | תיאור |
|---------|---------------|--------|
| createReceipt() | POST /RECEIPTS | יצירת קבלה |

### זיכויים (CINVOICES)
| פונקציה | OData Endpoint | תיאור |
|---------|---------------|--------|
| createCreditNote() | POST /CINVOICES | יצירת זיכוי |

### ספקים (SUPPLIERS) - לתשלום עמלות
| פונקציה | OData Endpoint | תיאור |
|---------|---------------|--------|
| findSupplier() | GET /SUPPLIERS | חיפוש ספק |
| createSupplier() | POST /SUPPLIERS | יצירת ספק |
| updateSupplier() | PATCH /SUPPLIERS | עדכון ספק |
| getSupplierBalance() | GET /SUPPLIERS | יתרת ספק |

### תשלומים לספקים (FNCTRANS)
| פונקציה | OData Endpoint | תיאור |
|---------|---------------|--------|
| createSupplierPayment() | POST /FNCTRANS | יצירת תשלום |
| getSupplierPayment() | GET /FNCTRANS | סטטוס תשלום |

### מוצרים (LOGPART)
| פונקציה | OData Endpoint | תיאור |
|---------|---------------|--------|
| getProduct() | GET /LOGPART | קבלת מוצר |
| syncProducts() | GET /LOGPART | סנכרון מוצרים |

---

## 🔄 תהליכי סנכרון

### תהליך תשלום (PayPlus → Priority)
1. לקוח משלם ב-PayPlus
2. Webhook מתקבל
3. אימות חתימה + idempotency
4. עדכון Order ל-paid
5. סנכרון לקוח ל-Priority
6. יצירת הזמנה + חשבונית
7. עדכון IntegrationSyncMap

### תהליך תשלום עמלות לסוכנים
1. סוכן מבקש משיכה
2. מנהל מאשר
3. לחיצה על "Priority"
4. סנכרון סוכן כספק
5. יצירת מסמך FNCTRANS
6. מחלקת כספים מאשרת
7. סימון כהושלם

---

## 📊 מודלים במסד נתונים

### IntegrationSyncMap
- orderId
- payplusTransactionId, payplusSessionId, payplusSyncStatus
- priorityCustomerId, priorityOrderId, priorityInvoiceId
- prioritySyncStatus, lastSyncAttempt, retryCount, errorLog

### PaymentEvent
- eventId (idempotency key)
- orderId, transactionId, eventType
- status: pending/processed/failed/dead_letter
- retryCount, retryHistory

### WithdrawalRequest
- userId, amount, status
- priorityPaymentDocId
- bankDetails snapshot

### User (שדות סוכן)
- prioritySupplierId
- commissionBalance, commissionOnHold
- bankDetails

---

## 📍 קודי אמצעי תשלום

| קוד | תיאור |
|-----|-------|
| CC | כרטיס אשראי |
| BIT | ביט |
| PP | PayPal |
| BT | העברה בנקאית |
| CASH | מזומן |
| CHK | צ'ק |

---

## ⚙️ חשבונות GL

| קטגוריה | חשבון | ברירת מחדל |
|---------|--------|------------|
| מכירות מוצרים | SALES.PRODUCTS | 4100 |
| מכירות שירותים | SALES.SERVICES | 4200 |
| משלוחים | SALES.SHIPPING | 4300 |
| עמלות סוכנים | EXPENSES.AGENT_COMMISSION | 6200 |
| זיכויים | EXPENSES.REFUNDS | 6300 |
| חוב לסוכנים | LIABILITIES.AGENT_PAYABLE | 2200 |

---

## 🧪 בדיקת חיבור

\`\`\`javascript
// Priority
const priority = getPriorityClient();
const result = await priority.testConnection();

// PayPlus
const config = getPayPlusConfig();
console.log(config.isConfigured);
\`\`\`

---

## 📝 הערות למטמיע

1. Priority OData - כל הקריאות הן OData v4
2. אימות OAuth - הטוקן נשמר ב-cache
3. Retry - מנגנון retry עם backoff
4. Timeout - 45 שניות ל-Priority
5. סנכרון ספק - אוטומטי בבקשת משיכה ראשונה
6. Idempotency - webhooks נבדקים לכפילויות

---

**מסמך זה מעודכן ליום: ${new Date().toLocaleDateString('he-IL')}**
`;

async function saveReport() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in environment');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const reportsCol = db.collection('systemreports');
    
    const now = new Date();
    const report = {
      title: 'דוח טכני - אינטגרציות Priority ERP + PayPlus',
      type: 'integration',
      category: 'priority_payplus',
      summary: 'דוח טכני מלא על אינטגרציות המערכת עם Priority ERP ו-PayPlus כולל פונקציות, API endpoints, ותהליכי עבודה.',
      content: INTEGRATION_REPORT_CONTENT,
      contentHtml: '',
      tags: ['priority', 'payplus', 'integration', 'technical', 'api'],
      version: '1.0',
      status: 'published',
      stats: {
        totalChecks: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        score: 0,
      },
      createdBy: null,
      createdByName: 'System',
      attachments: [],
      createdAt: now,
      updatedAt: now,
    };

    const result = await reportsCol.insertOne(report);
    console.log('Report saved successfully!');
    console.log('Report ID:', result.insertedId.toString());
    
  } catch (err) {
    console.error('Error saving report:', err);
  } finally {
    await client.close();
  }
}

saveReport();
