import Link from 'next/link';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.vipo-group.com').trim();

export const metadata = {
  title: 'מדיניות פרטיות | VIPO',
  description: 'מדיניות הפרטיות של VIPO: פירוט איסוף מידע, שימושים, אבטחה, זכויות משתמש ושמירת נתונים.',
  alternates: {
    canonical: `${SITE_URL}/privacy`,
  },
  openGraph: {
    title: 'מדיניות פרטיות | VIPO',
    description: 'מידע מלא על פרטיות, עוגיות, אבטחת מידע וזכויות המשתמש באתר VIPO.',
    url: `${SITE_URL}/privacy`,
    type: 'article',
    locale: 'he_IL',
  },
  twitter: {
    card: 'summary',
    title: 'מדיניות פרטיות | VIPO',
    description: 'מידע מלא על פרטיות, עוגיות, אבטחת מידע וזכויות המשתמש באתר VIPO.',
  },
};

export default function PrivacyPage() {

  return (
    <div className="min-h-screen" style={{ background: '#f8f9fa' }}>
      {/* Hero Header */}
      <div 
        className="relative pt-12 pb-20 px-4"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
      >
        <div className="max-w-4xl mx-auto text-center text-white">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            מדיניות פרטיות
          </h1>
          <p className="text-white/80">
            עודכן לאחרונה: אפריל 2026
          </p>
        </div>
        
        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full h-auto">
            <path d="M0 60V30C240 10 480 0 720 10C960 20 1200 40 1440 30V60H0Z" fill="#f8f9fa"/>
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div 
          className="bg-white rounded-2xl p-8 md:p-12"
          style={{
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            boxShadow: '0 4px 20px rgba(8, 145, 178, 0.15)',
          }}
        >
          {/* Content */}
          <div className="about-content text-right" dir="rtl">
            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>1. מבוא</h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                ב-VIPO אנו מחויבים להגן על פרטיותך. מדיניות פרטיות זו מסבירה כיצד אנו אוספים, משתמשים, שומרים ומגנים על המידע האישי שלך בעת השימוש באתר ובשירותים שלנו.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>2. מידע שאנו אוספים</h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                אנו עשויים לאסוף מידע שאתה מספק לנו כגון שם מלא, כתובת דוא&quot;ל, מספר טלפון, כתובת למשלוח, פרטי תשלום ותכתובות עם שירות לקוחות. בנוסף, נאסף מידע אוטומטי כגון כתובת IP, סוג הדפדפן, דפים שנצפו ומידע על הזמנות.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>3. כיצד אנו משתמשים במידע</h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                אנו משתמשים במידע שנאסף לעיבוד הזמנות ומשלוחים, ניהול חשבון המשתמש, תקשורת בנוגע להזמנות, שיפור חווית המשתמש, שליחת עדכונים ומבצעים (בהסכמתך), חישוב עמלות לסוכנים, מניעת הונאות ועמידה בדרישות חוקיות.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>4. שיתוף מידע</h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                אנו לא מוכרים את המידע האישי שלך. אנו עשויים לשתף מידע עם ספקי שירותים כגון חברות משלוחים ומעבדי תשלומים, שותפים עסקיים במידה הנדרשת, ורשויות חוק כאשר נדרש על פי חוק.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>5. אבטחת מידע</h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                אנו נוקטים באמצעי אבטחה מתקדמים להגנה על המידע שלך, כולל הצפנת SSL לכל התקשורת באתר, אחסון מאובטח של נתונים, הגבלת גישה לעובדים מורשים בלבד וניטור שוטף לאיתור פעילות חשודה.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>6. עוגיות (Cookies) ומדידת קמפיינים</h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
                האתר משתמש בעוגיות לשמירת העדפות המשתמש, זיהוי משתמשים מחוברים, ניתוח תנועה ושיפור האתר והתאמה אישית של תוכן. ניתן לשלוט בהגדרות העוגיות דרך הדפדפן שלך.
              </p>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                <strong>מדידת מקורות הגעה (קמפיינים):</strong> כאשר אתה מגיע מקישור פרסומי, בכתובת האתר עשויים להופיע פרמטרים טכניים (למשל מזהי קמפיין או מקור הגעה). אחסון מידע שיווקי זה בדפדפן (כולל עוגייה ראשונה לתקופה מוגבלת) מתבצע רק לאחר שאישרת את השימוש בעוגיות בבאנר המוצג באתר. בעת ביצוע הזמנה, נשמר במערכת סיכום טכני של מקור ההגעה (לצורכי ניתוח פנימי ושיפור השירות), בהתאם לשדות שסופקו — ללא שימוש לצורך פרופיל רגיש מעבר לנדרש להפעלת החנות.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>7. הזכויות שלך</h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                על פי חוק הגנת הפרטיות, יש לך זכות לעיין במידע שאנו שומרים עליך, לבקש תיקון מידע שגוי, לבקש מחיקת המידע שלך, להתנגד לשימוש במידע לצרכי שיווק ולבקש העברת המידע לשירות אחר. לממש את זכויותיך, פנה אלינו דרך עמוד יצירת הקשר.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>8. שמירת מידע</h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                אנו שומרים את המידע שלך כל עוד חשבונך פעיל או כנדרש לספק לך שירותים. לאחר מכן, המידע יישמר לתקופה סבירה לצרכים משפטיים, חשבונאיים או עסקיים לגיטימיים.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>9. ילדים</h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                האתר לא מיועד לילדים מתחת לגיל 18. אנו לא אוספים ביודעין מידע אישי מילדים. אם נודע לנו שאספנו מידע מילד, נמחק אותו באופן מיידי.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>10. שינויים במדיניות</h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                אנו עשויים לעדכן מדיניות זו מעת לעת. שינויים מהותיים יפורסמו באתר, ותאריך העדכון האחרון יצוין בראש המסמך. המשך השימוש באתר מהווה הסכמה למדיניות המעודכנת.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>11. יצירת קשר</h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                לשאלות או בקשות בנוגע לפרטיות, ניתן לפנות אלינו באמצעות עמוד יצירת הקשר באתר. נשתדל להשיב לכל פנייה תוך זמן סביר.
              </p>
            </section>
          </div>

          {/* Back Link */}
          <div className="mt-10 pt-6 border-t border-gray-200 text-center">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 font-medium transition-all hover:scale-105"
              style={{ color: '#0891b2' }}
            >
              <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              חזרה לדף הבית
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
