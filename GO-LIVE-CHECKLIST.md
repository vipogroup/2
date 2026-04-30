# 🚀 Go-Live Checklist - PayPlus & Priority Integration

## Pre-Launch (D-7)

### Environment Configuration
- [ ] **Production API Keys** - הזנת מפתחות PayPlus production
  ```env
  PAYPLUS_API_KEY=<production_key>
  PAYPLUS_SECRET=<production_secret>
  PAYPLUS_WEBHOOK_SECRET=<production_webhook_secret>
  PAYPLUS_BASE_URL=https://api.payplus.co.il
  ```

- [ ] **Priority Credentials** - הזנת פרטי חיבור לפריוריטי
  ```env
  PRIORITY_BASE_URL=<production_url>
  PRIORITY_CLIENT_ID=<production_id>
  PRIORITY_CLIENT_SECRET=<production_secret>
  PRIORITY_COMPANY_CODE=<company_code>
  ```

- [ ] **Alert Configuration** - הגדרת התראות
  ```env
  INTEGRATION_ALERT_EMAIL=<admin_email>
  INTEGRATION_ALERT_SLACK_WEBHOOK=<slack_webhook_url>
  ALERT_SMS_NUMBER=<phone_for_critical_alerts>
  ```

- [ ] **Cron Secret** - הגדרת סוד ל-cron jobs
  ```env
  CRON_SECRET=<random_secure_string>
  ```

### Webhook Registration
- [ ] רישום Webhook URL ב-PayPlus Dashboard
  ```
  URL: https://your-domain.com/api/payplus/webhook
  Events: payment.success, payment.failed, refund, chargeback
  ```

### Database
- [ ] הרצת סקריפט יצירת אינדקסים
  ```bash
  node scripts/createIndexes.js
  ```
- [ ] גיבוי מסד נתונים לפני העלייה
  ```bash
  npm run backup:full
  ```

### SSL & Security
- [ ] אישור SSL תקף לכל ה-endpoints
- [ ] בדיקת CORS configuration
- [ ] הפעלת IP Allowlist (אופציונלי)
  ```env
  PAYPLUS_IP_ALLOWLIST_ENABLED=true
  ```

### Cron Jobs
- [ ] הגדרת Cron Jobs בשרת/Vercel:
  - `POST /api/cron/release-commissions` - יומי 02:00
  - `POST /api/cron/generate-reconciliation` - יומי 06:00
  - `POST /api/cron/retry-failed-syncs` - כל שעה

### Monitoring
- [ ] הגדרת Uptime monitoring
- [ ] הגדרת Error tracking (Sentry/LogRocket)
- [ ] בדיקת חיבור Slack webhook

### Documentation & Training
- [ ] עדכון מדריך שימוש לצוות finance
- [ ] הכנת runbook לטיפול בתקלות
- [ ] הגדרת on-call rotation

---

## Launch Day (D-0)

### Smoke Test
- [ ] **בדיקת חיבור PayPlus**
  ```bash
  curl https://your-domain.com/api/admin/payplus/transactions
  ```

- [ ] **בדיקת חיבור Priority**
  ```bash
  curl https://your-domain.com/api/admin/priority/status
  ```

### Test Transaction (₪1)
- [ ] ביצוע עסקת בדיקה בסכום ₪1
- [ ] אימות קבלת Webhook
- [ ] אימות עדכון Order בסטטוס paid
- [ ] אימות חישוב עמלה נכון
- [ ] אימות יצירת מסמך בפריוריטי (אם מוגדר)

### Verification Checklist
| בדיקה | סטטוס |
|-------|--------|
| Webhook התקבל | ⬜ |
| Order עודכן ל-paid | ⬜ |
| PaymentEvent נוצר | ⬜ |
| עמלה חושבה נכון | ⬜ |
| Priority sync הופעל | ⬜ |
| אין שגיאות בלוג | ⬜ |

### Enable for All Users
- [ ] הסרת feature flags אם קיימים
- [ ] עדכון status page

### Monitor First Transactions
- [ ] מעקב אחר 10 העסקאות הראשונות
- [ ] בדיקת Finance Dashboard
- [ ] בדיקת דוח התאמות

---

## Post-Launch (D+1 to D+7)

### Daily Tasks
- [ ] **D+1**: בדיקת דוח התאמות יומי
- [ ] **D+2**: טיפול באי-התאמות אם קיימות
- [ ] **D+3**: בדיקת Dead Letter Queue
- [ ] **D+4**: בדיקת sync מול Priority
- [ ] **D+5**: Fine-tune alert thresholds
- [ ] **D+6**: בדיקת שחרור עמלות אוטומטי
- [ ] **D+7**: סיכום שבועי ותיעוד lessons learned

### Weekly Review
- [ ] סקירת מספר עסקאות vs שגיאות
- [ ] סקירת זמני sync ממוצעים
- [ ] סקירת בקשות משיכה
- [ ] סקירת דוחות reconciliation

---

## Rollback Plan

במקרה של תקלה קריטית:

### 1. Disable Webhook Processing
```env
PAYPLUS_WEBHOOK_ENABLED=false
```

### 2. Restore from Backup
```bash
# שחזור MongoDB
npm run restore:full

# שחזור קוד
git checkout backup/2026-01-02T20-29-18_pre-payplus-priority-upgrade
```

### 3. Notify Stakeholders
- [ ] עדכון צוות פיתוח
- [ ] עדכון צוות finance
- [ ] עדכון לקוחות אם נדרש

---

## Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| DevOps | - | - | - |
| Finance | - | - | - |
| PayPlus Support | - | - | support@payplus.co.il |
| Priority Support | - | - | - |

---

## Quick Commands

```bash
# בדיקת סטטוס שרת
npm run dev

# יצירת גיבוי
npm run backup:full

# הרצת indexes
node scripts/createIndexes.js

# בדיקת לוגים
tail -f logs/app.log

# שחזור מגיבוי
npm run restore:full
```

---

*נוצר ב-2 בינואר 2026 | VIPO Agent System*
