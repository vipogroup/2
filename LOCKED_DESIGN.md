# VIPO — LOCKED DESIGN

מסמך זה מכיל החלטות DESIGN "נעולות". כל שינוי במסמך זה דורש אישור מפורש.

---

## Media SSOT (LOCKED)

Media SSOT enforced — legacy removed (P0.8)

Legacy media fields physically removed (P2)

## 6) Agent Commissions & Withdrawals Governance (Per-Tenant Separation)

### Decision (LOCKED)

נבחר מודל **Option 2 — Hybrid (Business-Verify + Platform-Approve)**.

המשמעות:

- **Business Admin (Tenant)** מבצע **Viewing + Verify בלבד** (אימות/המלצה/ערעור).
- **Platform Owner / Super Admin** הוא **הגורם היחיד** שמאשר ומשלים payouts בפועל (Approve/Complete/Paid).
- **Agent** רואה ומנהל עמלות/יתרות/משיכות **בהפרדה מלאה לפי tenant**.

---

### Roles & Authority (LOCKED)

#### Agent

- **Viewing**: רואה עמלות, יתרות, והיסטוריית משיכות **מופרדות לפי tenant**.
- **Withdrawal Requests**: מגיש `WithdrawalRequest` **לכל tenant בנפרד**.
- **Restrictions**:
  - לא יכול להגיש בקשה "מעורבת" (multi-tenant) או לשייך בקשה ללא `tenantId`.
  - לא מבצע פעולות payout (Approve/Complete/Paid) בשום צורה.

#### Business Admin (Tenant)

- **Viewing**:
  - צפייה בעמלות/הזמנות/בקשות משיכה של אותו tenant בלבד.
  - צפייה בסטטוסים ובמפת הסיבות (למשל: pending/available/on-hold/disputed) ברמת tenant.
- **Verify / Recommend / Dispute בלבד**:
  - יכול לבצע אימות או המלצה ("verified" / "recommended") לעמלות או לבקשות משיכה.
  - יכול לפתוח ערעור/דיספיוט ("disputed") מול בקשה/עמלה עם הסבר.
- **Explicitly Forbidden (LOCKED)**:
  - **NO approve payout**.
  - **NO complete payout**.
  - **NO mark as paid**.
  - **NO שימוש ב-`/api/admin` endpoints לפעולות תשלום** (כל פעולה כספית/תשלום נשארת platform-controlled בלבד).

#### Platform Owner / Super Admin

- **Sole payout authority (LOCKED)**:
  - הסמכות הבלעדית לבצע: Approve / Complete / Paid (payout execution).
  - אחריות כספית וחשבונאית מלאה.
- **Visibility**:
  - יכולת צפייה מלאה ומבודדת לפי tenant (כולל דוחות רוחביים לצרכי בקרה), תוך שמירה על fact שהחשבונאות נשארת tenant-scoped.

---

### Invariants (LOCKED)

- **Tenant mandatory on withdrawals**:
  - כל `WithdrawalRequest` **חייב** לכלול `tenantId`.
  - בקשה ללא `tenantId` אינה תקפה (invalid by design).
- **Eligibility requires strict attribution**:
  - כל Commission/Order חייב שיוך **`agentId` + `tenantId`** כדי להיחשב לזכאות.
  - הזמנות/עמלות ללא `tenantId` או ללא `agentId` אינן נספרות לזכאות משיכה.
- **Platform-controlled payouts**:
  - ביצוע payout בפועל **תמיד** נשלט ע"י Platform Owner / Super Admin בלבד.
  - Business Admin לעולם לא מבצע פעולת תשלום/שחרור כספי.
- **No cross-tenant mixing**:
  - אין ערבוב עמלות/יתרות/משיכות בין חנויות.
  - יתרה/זמינות משיכה מחושבת ומוצגת **פר-tenant** בלבד.

---

### Acceptance Criteria (Design)

- **Agent dashboard separation**:
  - סוכן רואה יתרות/עמלות לפי חנות בנפרד (A/B/C) עם בחירה ברורה של tenant context.
- **Per-tenant withdrawals**:
  - סוכן יכול להגיש בקשת משיכה לכל חנות בנפרד, כאשר `tenantId` הוא שדה חובה.
- **Business admin limitation**:
  - מנהל עסק יכול רק לאמת/להמליץ/לערער, ולא לבצע approve/complete/paid בשום מצב.
- **Platform admin control**:
  - מנהל ראשי (Platform Owner / Super Admin) רואה הפרדה מלאה לפי חנות ויכול לאשר/להשלים payouts.
- **Buyer experience**:
  - לקונה מוצגת חוויית “עסקים נפרדים” (branding/tenant context) ברמת UI/Presentation.
  - **ללא שינוי SSOT / Payments**: תשלומים ונקודת האמת הכספית נשארים מרכזיים ומנוהלים ע"י הפלטפורמה.
