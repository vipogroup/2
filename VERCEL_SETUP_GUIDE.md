# 🚀 מדריך עדכון משתני סביבה ב-Vercel

**תאריך:** 15 דצמבר 2025  
**פרויקט:** vipo-agents-test  
**Project ID:** prj_Aocg6a8hm9XdyjiZhofFmF2dCdRz

---

## 📋 סיכום מצב נוכחי

### ✅ מה שכבר מוגדר:
- MongoDB URI + DB
- JWT Secrets
- Public URLs
- PayPlus Demo Mode

### ❌ מה שחסר ונוסף עכשיו:
- SMTP (Gmail) - לשליחת מיילים
- Admin Credentials - ליצירת מנהל אוטומטית

---

## 🔧 שלב 1: כניסה ל-Vercel Dashboard

1. **פתח דפדפן וגש ל:**
   ```
   https://vercel.com/vipos-projects-0154d019/vipo-agents-test/settings/environment-variables
   ```

2. **התחבר עם החשבון שלך** (אם נדרש)

---

## 📝 שלב 2: הוספת משתני סביבה

**לחץ על "Add New" ועבור כל משתנה להלן:**

### 1️⃣ SMTP_HOST
```
Key: SMTP_HOST
Value: smtp.gmail.com
Environment: Production, Preview, Development (בחר את כולם)
```
לחץ **Save**

### 2️⃣ SMTP_PORT
```
Key: SMTP_PORT
Value: 587
Environment: Production, Preview, Development
```
לחץ **Save**

### 3️⃣ SMTP_USER
```
Key: SMTP_USER
Value: vipogroup1@gmail.com
Environment: Production, Preview, Development
```
לחץ **Save**

### 4️⃣ SMTP_PASS
```
Key: SMTP_PASS
Value: rllitkaIxayfhgir
Environment: Production, Preview, Development
```
לחץ **Save**

### 5️⃣ EMAIL_FROM
```
Key: EMAIL_FROM
Value: VIPO <vipogroup1@gmail.com>
Environment: Production, Preview, Development
```
לחץ **Save**

### 6️⃣ ADMIN_EMAIL
```
Key: ADMIN_EMAIL
Value: m0587009938@gmail.com
Environment: Production, Preview, Development
```
לחץ **Save**

### 7️⃣ ADMIN_PASSWORD
```
Key: ADMIN_PASSWORD
Value: 12345678
Environment: Production, Preview, Development
```
לחץ **Save**

---

## 🔄 שלב 3: Redeploy

לאחר הוספת כל המשתנים:

1. **חזור לעמוד הראשי של הפרויקט:**
   ```
   https://vercel.com/vipos-projects-0154d019/vipo-agents-test
   ```

2. **לחץ על הכרטיסייה "Deployments"**

3. **מצא את ה-deployment האחרון**

4. **לחץ על שלוש הנקודות (⋮) → "Redeploy"**

5. **אשר את ה-Redeploy**

---

## ✅ שלב 4: אימות

לאחר ה-Redeploy (לוקח כ-2-3 דקות):

### בדוק שהמערכת עובדת:

1. **פתח את האתר:**
   ```
   https://vipo-agents-test.vercel.app
   ```

2. **נסה להתחבר כ-Admin:**
   - Email: `m0587009938@gmail.com`
   - Password: `12345678`

3. **בדוק שליחת מייל:**
   - נסה "שכחתי סיסמה"
   - צריך להגיע מייל מ-`vipogroup1@gmail.com`

---

## 📊 רשימת משתנים מלאה ב-Vercel

לאחר השלמת כל השלבים, אלו המשתנים שצריכים להיות מוגדרים:

| משתנה | ערך | סטטוס |
|-------|-----|-------|
| MONGODB_URI | mongodb+srv://... | ✅ היה |
| MONGODB_DB | vipo | ✅ היה |
| JWT_SECRET | H8a3F2lP9qR7sW4xT5uV6bY2mN1kC0L | ✅ היה |
| NEXTAUTH_SECRET | Q2w9eR6tY8uI4oP7aS3dF1gH5jK0lZ8 | ✅ היה |
| NEXT_PUBLIC_MANAGER_WHATSAPP | 972533752633 | ✅ היה |
| NEXT_PUBLIC_HOME_URL | https://vipogroup.github.io/HOME/ | ✅ היה |
| NEXT_PUBLIC_PAYPLUS_FORCE_DEMO | true | ✅ היה |
| SMTP_HOST | smtp.gmail.com | 🆕 חדש |
| SMTP_PORT | 587 | 🆕 חדש |
| SMTP_USER | vipogroup1@gmail.com | 🆕 חדש |
| SMTP_PASS | rllitkaIxayfhgir | 🆕 חדש |
| EMAIL_FROM | VIPO <vipogroup1@gmail.com> | 🆕 חדש |
| ADMIN_EMAIL | m0587009938@gmail.com | 🆕 חדש |
| ADMIN_PASSWORD | 12345678 | 🆕 חדש |

**סה"כ: 14 משתנים**

---

## 🎯 מה זה נותן לנו?

### לפני העדכון:
- ❌ אין שליחת מיילים
- ❌ אין יצירת Admin אוטומטית
- ⚠️ חלק מהפונקציות לא עובדות

### אחרי העדכון:
- ✅ שליחת מיילים עובדת (שחזור סיסמה, התראות)
- ✅ Admin נוצר אוטומטית בהרצה ראשונה
- ✅ כל הפונקציות עובדות מלא

---

## 🔐 אבטחה

**חשוב:**
- ✅ כל המשתנים מוגדרים ב-Vercel Dashboard (מאובטח)
- ✅ הקובץ `.env.production.upload` לא עולה ל-Git
- ✅ רק אתה יכול לגשת למשתני הסביבה ב-Vercel

---

## 🆘 פתרון בעיות

### בעיה: "המשתנים לא נשמרו"
**פתרון:** ודא שבחרת את כל ה-Environments (Production, Preview, Development)

### בעיה: "השינויים לא נכנסו לתוקף"
**פתרון:** חייב לעשות Redeploy אחרי הוספת משתנים

### בעיה: "מיילים לא נשלחים"
**פתרון:** 
1. בדוק ש-SMTP_PASS נכון
2. ודא שהחשבון Gmail מאפשר "Less secure apps" או יש App Password

---

## 📞 תמיכה

אם יש בעיה:
1. בדוק את ה-Logs ב-Vercel Dashboard
2. חפש שגיאות הקשורות ל-SMTP או Auth
3. ודא שכל 14 המשתנים מוגדרים

---

**✅ סיימת? המערכת אמורה לעבוד מלא עכשיו! 🎉**
