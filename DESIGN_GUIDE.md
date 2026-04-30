# 🎨 VIPO Design Guide - מדריך עיצוב המערכת

> **מסמך זה מגדיר את כללי העיצוב של מערכת VIPO. יש לעקוב אחריו בכל דף או רכיב חדש.**

---

## 📋 תוכן עניינים

1. [צבעים](#-צבעים)
2. [כללי ברזל](#-כללי-ברזל)
3. [שימוש בקומפוננטות](#-שימוש-בקומפוננטות)
4. [דוגמאות קוד](#-דוגמאות-קוד)
5. [רספונסיביות](#-רספונסיביות)

---

## 🎨 צבעים

### הגרדיאנט הראשי (כחול-טורקיז)

```css
background: linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)
```

| צבע | קוד HEX | שימוש |
|-----|---------|-------|
| כחול כהה | `#1e3a8a` | צבע התחלתי |
| טורקיז | `#0891b2` | צבע סיום |

### צבעי סטטוס

| צבע | קוד | שימוש מותר |
|-----|-----|------------|
| ירוק `#16a34a` | אינדיקציות הצלחה בלבד | ❌ לא לכפתורים! |
| אדום `#dc2626` | מחיקה ושגיאות בלבד | ✅ כפתור מחיקה |
| כתום `#f59e0b` | התראות | |
| כחול `#3b82f6` | מידע | |

---

## 🚫 כללי ברזל

### 1. אין אימוג'ים לעולם!
```jsx
// ❌ אסור
<button>🛒 הוסף לסל</button>

// ✅ נכון - SVG או טקסט בלבד
<button>
  <CartIcon className="w-5 h-5" />
  הוסף לסל
</button>
```

### 2. כפתורים רק בגרדיאנט כחול-טורקיז
```jsx
// ❌ אסור - ירוק
<button className="bg-green-600">שמור</button>

// ✅ נכון
<Button>שמור</Button>
```

### 3. אדום רק למחיקה/שגיאה
```jsx
// ❌ אסור
<button className="bg-red-600">שלח</button>

// ✅ נכון
<Button variant="danger">מחק</Button>
```

---

## 🧩 שימוש בקומפוננטות

### ייבוא
```jsx
import { Button, Card, PageHeader, KPICard, KPIGrid } from '@/components/ui';
import theme from '@/lib/theme';
```

### Button - כפתור
```jsx
// ראשי
<Button>שמור</Button>

// משני
<Button variant="secondary">ביטול</Button>

// מחיקה
<Button variant="danger">מחק</Button>

// בטעינה
<Button loading>שומר...</Button>

// קטן
<Button size="small">פרטים</Button>

// רוחב מלא
<Button fullWidth>שלח</Button>
```

### Card - כרטיס
```jsx
// רגיל
<Card>
  <CardHeader title="כותרת" subtitle="תיאור" />
  <CardContent>תוכן</CardContent>
  <CardFooter>פעולות</CardFooter>
</Card>

// עם מסגרת גרדיאנט
<Card variant="bordered">תוכן</Card>

// אינטראקטיבי (עם hover)
<Card variant="interactive" onClick={handleClick}>
  תוכן
</Card>
```

### PageHeader - כותרת עמוד
```jsx
<PageHeader 
  title="ניהול משתמשים"
  subtitle="צפה וערוך משתמשים במערכת"
  backHref="/admin"
  actions={
    <Button>הוסף משתמש</Button>
  }
/>
```

### KPICard - כרטיס סטטיסטיקה
```jsx
<KPIGrid columns={4}>
  <KPICard 
    title="סה״כ משתמשים" 
    value={150} 
    color="blue"
  />
  <KPICard 
    title="הכנסות" 
    value="₪15,000" 
    color="green"
    trend={{ value: '+15%', positive: true }}
  />
  <KPICard 
    title="ממתינים" 
    value={5} 
    color="yellow"
  />
  <KPICard 
    title="שגיאות" 
    value={2} 
    color="red"
  />
</KPIGrid>
```

### PageContainer - מיכל עמוד
```jsx
<PageContainer>
  <PageHeader title="כותרת" />
  <PageSection title="סקשן 1">
    תוכן...
  </PageSection>
</PageContainer>
```

---

## 📝 דוגמאות קוד

### דף ניהול טיפוסי
```jsx
'use client';

import { Button, Card, PageHeader, PageContainer, KPICard, KPIGrid } from '@/components/ui';

export default function AdminPage() {
  return (
    <PageContainer>
      {/* כותרת */}
      <PageHeader 
        title="ניהול משתמשים"
        backHref="/admin"
        actions={<Button>הוסף משתמש</Button>}
      />
      
      {/* סטטיסטיקות */}
      <KPIGrid>
        <KPICard title="משתמשים" value={150} color="blue" />
        <KPICard title="פעילים" value={120} color="green" />
        <KPICard title="ממתינים" value={30} color="yellow" />
      </KPIGrid>
      
      {/* תוכן */}
      <Card>
        {/* טבלה או רשימה */}
      </Card>
    </PageContainer>
  );
}
```

### שימוש ב-theme ישירות
```jsx
import theme, { gradients, colors } from '@/lib/theme';

// גרדיאנט לאלמנט מותאם
<div style={{ background: gradients.primary }}>
  תוכן
</div>

// צבע ספציפי
<span style={{ color: colors.primary.blue }}>
  טקסט
</span>

// סגנון טקסט גרדיאנט
<h1 style={theme.getGradientTextStyle()}>
  כותרת
</h1>
```

---

## 📱 רספונסיביות

### Breakpoints
| שם | גודל | שימוש |
|----|------|-------|
| `sm` | 640px | מובייל גדול |
| `md` | 768px | טאבלט |
| `lg` | 1024px | מחשב נייד |
| `xl` | 1280px | מחשב שולחני |

### גריד רספונסיבי
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {/* פריטים */}
</div>
```

### טבלה → כרטיסים במובייל
- בדסקטופ: הצג טבלה רגילה
- במובייל: הפוך לכרטיסים

---

## ✅ צ'קליסט לפני PR

- [ ] אין אימוג'ים בקוד
- [ ] כפתורים בגרדיאנט כחול-טורקיז
- [ ] אדום רק למחיקה
- [ ] ירוק רק לאינדיקציות (לא כפתורים)
- [ ] רספונסיבי לכל המסכים
- [ ] משתמש בקומפוננטות UI
- [ ] טקסט בעברית עם RTL

---

## 📁 מבנה קבצים

```
lib/
  └── theme.js              # הגדרות עיצוב מרכזיות

components/ui/
  ├── index.js              # ייצוא מרכזי
  ├── Button.jsx            # כפתורים
  ├── Card.jsx              # כרטיסים
  ├── PageHeader.jsx        # כותרות עמוד
  └── KPICard.jsx           # כרטיסי KPI
```

---

**עודכן לאחרונה:** ינואר 2026
