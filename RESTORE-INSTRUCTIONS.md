# 🔄 הוראות שחזור מגיבוי - VIPO System

## תאריך גיבוי: 2 בינואר 2026
## שם גיבוי: `pre-payplus-priority-upgrade`

---

## 📋 מה לומר ל-Cascade כדי לשחזר

### אופציה 1: בקשה פשוטה
```
שחזר את המערכת לגיבוי pre-payplus-priority-upgrade מתאריך 2 בינואר 2026
```

### אופציה 2: בקשה מפורטת
```
אני רוצה לשחזר את המערכת לנקודה שלפני השדרוג של PayPlus ו-Priority.
הגיבוי נמצא ב:
- Git Tag: backup/2026-01-02T20-29-18_pre-payplus-priority-upgrade
- MongoDB: backups/database/mongo-2026-01-02T20-29-36-855Z/
```

---

## 🛠️ פקודות שחזור ידניות

### שחזור MongoDB:
```bash
npm run restore:db
```
או:
```bash
npm run restore:full
```

### שחזור קוד (Git):
```bash
git checkout backup/2026-01-02T20-29-18_pre-payplus-priority-upgrade
```

### שחזור מלא עם סקריפט:
```powershell
cd backups/full/2026-01-02T20-29-18_pre-payplus-priority-upgrade
.\restore.ps1
```

---

## 📁 מיקומי הגיבוי

| סוג | מיקום |
|-----|-------|
| MongoDB | `backups/database/mongo-2026-01-02T20-29-36-855Z/` |
| Full Backup | `backups/full/2026-01-02T20-29-18_pre-payplus-priority-upgrade/` |
| Git Tag | `backup/2026-01-02T20-29-18_pre-payplus-priority-upgrade` |
| GitHub Remote | ✅ Tag נדחף ל-GitHub |

---

## 📊 תוכן הגיבוי

### MongoDB Collections:
- `users` - 24 משתמשים
- `products` - 25 מוצרים  
- `orders` - 31 הזמנות
- `notifications` - 51 התראות
- `settings` - הגדרות מערכת
- ועוד...

### קבצי קונפיגורציה:
- `package.json`
- `vercel.json`
- `tailwind.config.js`
- `middleware.js`

---

## ⚠️ חשוב לזכור

1. **לפני שחזור** - תמיד עשה גיבוי חדש של המצב הנוכחי
2. **שחזור MongoDB** - יחליף את כל הנתונים הקיימים
3. **שחזור Git** - יעביר אותך ל-detached HEAD state
4. **לחזור ל-main** - הרץ `git checkout main`

---

## 🔗 קישורים שימושיים

- GitHub Repository: https://github.com/vipogroup/3
- Tag ב-GitHub: `backup/2026-01-02T20-29-18_pre-payplus-priority-upgrade`

---

*קובץ זה נוצר אוטומטית ב-2 בינואר 2026*
