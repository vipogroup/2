# ביקורת מקצועית — VIPO Importer Architecture Plan

מסמך זה בוחן את `VIPO_IMPORTER_SYSTEM_ARCHITECTURE_PLAN.md` בלבד. אין כאן מימוש, שינוי קוד או deploy.

---

## 1. תקציר ביקורתי

‏האפיון **טוב ככיוון אסטרטגי וכמפת דרכים פאזית** — הוא מזהה נכון את פער הטיוטה, את נקודת הפרסום הקיימת (`upload`/`update`), ואת הסיכונים מהדוחות (מחיקה, סכימה, Studio מול Social).  
‏**אינו מספיק, כפי שהוא, כדי להתחיל פיתוח מלא של שכבת הייבוא** בלי השלמת אפיון תשתיתי: חסרים הגדרות מחייבות ל־**תור עבודה**, **אחסון קבצים**, **מודל עקביות publish** (idempotency, retry, גרסאות), **מדיניות SKU אחידה**, ו־**חוזה מדויק** בין `normalizedProduct` לבין מה ש־Mongoose והקטלוג באמת מקבלים היום.  
‏**ניתן להתחיל Phase 0** (ייצוב קיים) **מיד** — זה לא תלוי באפיון המלא של ה־Importer. **לא מומלץ** להתחיל Phase 1 (Draft System) עד שמעדכנים את האפיון סביב התורים, האחסון וה־schema contract, אחרת סביר שתיבנה שכבת DB שתידרש פריקה מחודשת.

---

## 2. נקודות חזקות באפיון

‏- **הפרדה עקרונית נכונה:** drafts ב־Mongo מול פרסום דרך API קיים — מפחית שכפול לוגיקת קטלוג ב־iframe.  
‏- **עקרונות חובה** (source trace, metadata למדיה, audit לפרסום, dryRun+confirm לפעולות הרסניות) — ברמה של חברה בינלאומית.  
‏- **זיהוי סיכונים מהמצב הקיים** (מחיקה, `GET /api/products`, DALL·E לא מחובר) משולב בתוכנית Phase 0 — נכון סדר עדיפויות.  
‏- **פיצול פאזות** עם Alibaba ו־SEO אחרונים — מציאותי ומפחית חשיפה משפטית/תפעולית.  
‏- **טבלאות DB ו־API רעיוניות** — נותנות בסיס לדיון במסמכי עבודה פנימיים.

---

## 3. חורים אדריכליים

‏**תור / workers:** נכתב “מומלץ worker בשלב מאוחר” בלי להגדיר **איפה רצים jobs** (Vercel serverless מוגבל בזמן; PDF גדול יכשל), איך **lease** למניעת כפל ריצה, ומה קורה ב־**crash באמצע שלב**. חסר: טכנולוגיה (BullMQ, Inngest, worker נפרד), SLA, dead-letter queue.

‏**אחסון קבצים:** “S3/Vercel blob” נזכר ב־PDF בלי **מדיניות גודל**, **הצפנה בדיסק**, **אזור גיאוגרפי**, **מחיקה אוטומטית** אחרי job, והאם הקובץ נשאר **PII** (שם ספק, מחירים) — חסר חוזה אבטחה.

‏**OCR:** נאמר “Tesseract או ענן” בלי קריטריון בחירה, עלות, שפה (עברית/סינית), ו־**fallback** כש־OCR נכשל. חסר SLA לאיכות מינימלית לפני draft.

‏**בקרת עלות AI:** “תקרה יומית” בלי **מי יממן** (tenant מול פלטפורמה), **מדידה** (טוקנים לפי job), **חסימה קשה** מול “אזהרה בלבד”, ואינטגרציה ל־**billing**.

‏**tenant isolation:** נכתב עקרון אך לא **מודל איום**: business_admin עם JWT מזויף, באג ב־query string, או שגיאת merge בקוד — חסר **test matrix** ו־**Row-Level Security** מעבר לבדיקת שורה בקוד.

‏**rollback:** “ביטול job לא מפרסם” לא מגדיר rollback אחרי **publish חלקי** (חלק מהמוצרים עלוו), או אחרי **syncProductUpsert** שכבר דחף החוצה — חסר **compensating transaction** או לפחות “manual rollback playbook”.

‏**idempotency:** אין מפתח idempotency ל־`publish` (למשל `draftId` + `publishAttemptId`) — סיכון כפול publish בלחיצה כפולה או retry רשת.

‏**publish retry:** לא מוגדר מתי מנסים שוב, exponential backoff, ומה עושים כש־`update` החזיר `notFound` לחלק מה־SKUs.

‏**schema versioning:** `schemaVersion` ב־AI מוזכר; לא מוגדר **גרסת payload לקטלוג** מול שינויי API — חסר **compat matrix** (גרסת Importer ↔ גרסת catalog-manager route).

‏**אסטרטגיית SKU:** “מומלץ SKU חובה” לא פותר **קונפליקט** בין ייבוא לבין `-GROUP`/`-SC`, **ייבוא מחדש** לאותו SKU, או **SKU שנוצר על ידי AI** מול קטלוג קיים.

‏**מיפוי ספקים:** `supplier_sources` ו־`mapping_templates` — לא מוגדר **גרסון** של תבנית, **מיגרציה** כשהספק משנה PDF, ו־**בדיקת regression** אוטומטית.

‏**בעלות על מדיה (ownership):** metadata כן; חסר **רישיון שימוש** (רישיון ספק, Alibaba), **watermark removal** אסור, ו־**שמירת ראיה** ל־URL מקור לצורך DMCA.

‏**audit retention:** טווחים מוצעים (90/180 יום) בלי **דרישות משפטיות** (GDPR, חשבוניות), **חתימה על לוגים**, וגישת **super_admin למחיקת audit** (מסוכן).

‏**משפטי / ToS:** מוזכר ל־Alibaba; חסר **מדיניות גלובלית** ל־crawl, שמירת robots, ו־**data residency** לתוכן שמור מהאתר.

---

## 4. סתירות או אזורים לא ברורים

‏| אזור א׳ | אזור ב׳ | הסתירה / העמימות |
|---------|---------|-------------------|
| Catalog Manager (iframe) | Import Center (React חדש) | שני מקורות אמת UX לעד מתי? מי “מנצח” על מחירון — localStorage או DB? |
| localStorage (מדיה, גיבוי) | `import_media_staging` | האם מייבאים מדיה מה־iframe ל־staging או בונים מסלול נפרד לגמרי? חסר גשר מפורש. |
| `models/Product.js` מצומצם | payload עשיר ב־upload | Publish Service מניח “אובייקט תואם לקטלוג” — בפועל Mongoose עלול לזרוק שדות או להפוך שקט לבאג; האפיון לא סוגר את הפער. |
| Import drafts | publish דרך upload/update | upload יוצר `status: published` (לפי דוח קטלוג) — סותר את רוח “טיוטה עד אישור” אם לא מוגדר ש־Publish Service קורא רק ל־update או שינוי סטטוס בשרת. |
| Image Studio (Desktop, CORS פתוח) | Import media generate | מי מאמת שתמונה שנוצרה ב־Studio שייכת ל־`draftId` הנכון? חסר חוזה אבטחה בין שני מערכות. |
| Social Agent (`mediaAssets`) | Importer | שני מסלולי AI לתמונה — האם מתאחדים ל־connector אחד או מתחרים על אותו מפתח OpenAI בלי מכסה? |

---

## 5. סיכונים שלא קיבלו מספיק טיפול באפיון

| סיכון | חומרה | למה זה מסוכן | מה חסר באפיון | המלצה לתיקון באפיון |
|--------|--------|---------------|----------------|---------------------|
| כשל publish חלקי + sync חיצוני | גבוהה | מוצגים בחנות חלק מהמוצרים; sync כבר דחף נתונים לא עקביים | מצב “published_partial”, תכנית rollback/sync הפוך | הגדרת מכונת מצבים ו־SAGA או תיעוד ידני |
| race בין שני אדמינים על אותו draft | בינונית | כפול publish / overwrite | optimistic locking (`version`/`etag`) | שדה `lockVersion` + 409 Conflict |
| חשיפת `import_logs` עם payloadDigest לא מספיק | בינונית | דליפת מבנה עסקי | מה נכלל ב־digest, מיסוך שדות רגישים | פורמט לוג מפורט + PII policy |
| התקפת העלאת PDF זדונית | גבוהה | DoS, malware | סף גודל, סריקה, sandbox | מגבלות וספק סריקה |
| prompt injection ל־AI Normalization | גבוהה | פקודות בתוך PDF | הפרדת תוכן מפקודות, allowlist שדות | מפרט אבטחת prompt |
| Studio CORS `*` + token | גבוהה | XSS באתר אחר לא אמור לגנוב token — אבל מודל איום לא נכתב | מדיניות Origin לעתיד, rotation | תכנון CORS הדרגתי |
| עלות AI לא צפויה בלילה | בינונית | חיוב אלפי דולר | תקרה קשיחה + kill switch | ENV ומדיניות תפעול |
| אי־התאמת templateKey בין tenants | בינונית | publish נכשל בשקט חלקי | ולידציה לפני publish | בדיקת template לפי tenant |
| שגיאת auth (`requireAdmin` מול `requireAdminApi`) | גבוהה | חורים בגישה או חסימה שגויה | סגירת חוזה auth אחיד | מסמך IAM נפרד |

---

## 6. מה חייב להיכנס ל־Phase 0

‏Phase 0 כפי שכתוב **נכון בכיוון אך לא מספיק מפורט**. חובה להוסיף **לפני** מערכת הטיוטות:

‏1) **מסמך “Catalog Publish Contract”** — רשימת שדות מינימלית/אופציונלית ש־`upload`/`update` באמת מקבלים ונשמרים (מול Mongo בפועל), כולל `tenantId` כ־ObjectId/string.  
‏2) **תיקון מוכח של מחיקת מוצרים** — יישור UI↔API (dryRun שני שלבים או שינוי ברירת מחדל) + בדיקות אוטומטיות.  
‏3) **Endpoint או התנהגות מוגדרת לסנכרון מוצרים לפי tenant** — לא “אולי נתקן GET”.  
‏4) **סגירת פער auth** — מי נכנס ל־standalone, איך `super_admin` עובר `requireAdmin` אם רלוונטי, ואימות ש־`requireAdminApi` קיים ועקבי במאגר.  
‏5) **החלטה על מחיר fallback** (`12345`) — האם נאסר, נדרש אזהרה, או נחסם publish.  
‏6) **תכנון ראשוני לאחסון** (גם אם ריק: “לא נתמך ב־Phase 0”) — כדי שלא יבנו jobs שמניחים S3 שלא קיים.  
‏7) **חיבור או הסרה מודעת של `resolveSocialPublishMedia`** — כדי שלא יבנו Importer שמניח תמונות אוטומטיות שכבר “קיימות” בקוד מת.

**מסקנה:** Phase 0 צריך להתרחב מ־“תיקוני באגים” ל־**“ייצוב חוזה פרסום + אבטחה + auth”** — אחרת Phase 1 יבנה על חול.

---

## 7. מה חייב להיכנס ל־Phase 1

‏האפיון מגדיר collections אך **לא סוגר את Phase 1** ברמת מוצר:

‏**שדות חובה (הצעה לחידוד באפיון):**  
‏- `product_import_drafts`: `tenantId`, `schemaVersion`, `normalizedProduct`, `status`, `createdBy`, `updatedAt`, `sourceTrace` (מינימום `sourceType`, `sourceHash` או `uri`), `lockVersion`.  
‏- `product_import_jobs`: `idempotencyKey` (אופציונלי אך מומלץ), `tenantId`, `stateMachine` מפורש (לא רק `status` טקסטואלי).

‏**APIs חסרים באפיון ל־Phase 1:**  
‏- `POST /api/import/jobs/:id/cancel` עם semantics (מה קורה לטיוטות שנוצרו).  
‏- `GET /api/import/drafts/:id` לפרט מלא (הטבלה מזכירה רק רשימה).  
‏- Webhook או polling ל־**סטטוס job ארוך** — אם אין worker, איך הלקוח יודע שהסתיים?

‏**ולידציות:** גבול גודל ל־`rawExtract`, איסור שמירת PDF שלם ב־Mongo — רק pointer.  
‏**הרשאות:** האם `business_admin` רשא ליצור job או רק לערוך draft — האפיון כותב “אם מאושר במדיניות” בלי להגדיר את המדיניות.  
‏**Audit:** איזה אירועים ב־Phase 1 חובה (יצירת draft, שינוי שדה מחיר, ניסיון publish שנחסם) — רשימה סגורה.

**מסקנה:** Phase 1 דורש **מפרט API שלם + מכונת מצבים + מדיניות הרשאות כתובה** לפני כתיבת קוד.

---

## 8. שאלות חובה לפני פיתוח

‏1) איזה **runtime** מריץ extraction ארוך (Vercel בלבד מול worker)?  
‏2) איפה **קבצי PDF** חיים ולכמה זמן, ובאיזה **encryption**?  
‏3) מה **חוזה ה־JSON** של `normalizedProduct` (גרסה, שדות, דוגמאות) מול דוגמת payload אמיתית מ־Catalog upload היום?  
‏4) האם **publish** מייצר תמיד מוצר `published` או נדרש מצב `draft` ב־`products` (דורש שינוי בשרת)?  
‏5) מי **בעלים על עלות AI** — הפלטפורמה או ה־tenant, ואיך חוסמים?  
‏6) האם **SKU** גלובלי ל־tenant או ל־מערכת כולה?  
‏7) מה מדיניות **CORS** ל־Studio בעתיד כשמחברים generate?  
‏8) האם **syncProductUpsert** חייב להישאר חלק מ־publish או אופציונלי לפי סביבה?  
‏9) מה **SLA** לזמן מקסימלי ל־job ומה קורה כשעוברים אותו?  
‏10) האם נדרש **ייעוץ משפטי חתום** לפני crawl לאתרי ספקים?

---

## 9. המלצה סופית

‏**אפשר ורצוי להתחיל Phase 0 מיד** — הוא מצמצם סיכון production ואינו תלוי באפיון המורחב של ה־Importer.  
‏**לא להתחיל Phase 1 (Draft System)** עד שמעודכן האפיון עם: תור/אחסון, חוזה publish/schema, idempotency+retry, ומפרט API מלא ל־Phase 1 — אחרת סביר שתיווצר חוב טכנית שתעלה יותר מתיקון Phase 0.  
‏**עדכון האפיון** צריך להיות **מסמך supplement** (לא חובה לערוך את התוכנית המקורית אם מעדיפים גרסה 1.1) לפני Sprint ראשון של DB חדשה.

---

זהו דוח ביקורת אפיון בלבד. לא בוצעו שינויי קוד, לא בוצע deploy, ולא שונו נתוני מערכת.
