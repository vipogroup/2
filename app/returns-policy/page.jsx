import Link from 'next/link';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.vipo-group.com').trim();

export const metadata = {
  title: 'מדיניות ביטולים והחזרות | VIPO',
  description:
    'מדיניות ביטול עסקה, החזרת מוצרים, אחריות והחזר כספי בחנות VIPO — בהתאם לחוק הגנת הצרכן בישראל.',
  alternates: {
    canonical: `${SITE_URL}/returns-policy`,
  },
  openGraph: {
    title: 'מדיניות ביטולים והחזרות | VIPO',
    description: 'תנאי ביטול הזמנה, החזרת מוצר וזכאות להחזר כספי.',
    url: `${SITE_URL}/returns-policy`,
    type: 'article',
    locale: 'he_IL',
  },
  twitter: {
    card: 'summary',
    title: 'מדיניות ביטולים והחזרות | VIPO',
    description: 'תנאי ביטול הזמנה, החזרת מוצר וזכאות להחזר כספי.',
  },
};

export default function ReturnsPolicyPage() {
  return (
    <div className="min-h-screen" style={{ background: '#f8f9fa' }}>
      <div
        className="relative pt-12 pb-20 px-4"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
      >
        <div className="max-w-4xl mx-auto text-center text-white">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">מדיניות ביטולים והחזרות</h1>
          <p className="text-white/80">עודכן לאחרונה: אפריל 2026</p>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full h-auto">
            <path d="M0 60V30C240 10 480 0 720 10C960 20 1200 40 1440 30V60H0Z" fill="#f8f9fa" />
          </svg>
        </div>
      </div>

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
          <div className="about-content text-right" dir="rtl">
            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
                1. מבוא
              </h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                מסמך זה מסביר את תנאי ביטול עסקה, החזרת מוצר וקבלת החזר כספי בעת רכישה באתר ובשירותי VIPO.
                הנהלים נועדו לשקף את עקרונות חוק הגנת הצרכן, התשמ&quot;א–1981, והוראותיו העדכניות בנוגע לעסקאות
                מרחוק ולמכירה סיטונית וקמעונית, ככל שהן חלות על הרכישה ממכם.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
                2. זכות ביטול עסקה (עסקה מרחוק)
              </h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                רוכש פרטי רשאי לבטל עסקה שנעשתה בתקשורת מרחוק (כגון באתר האינטרנט) בתוך 14 יום מיום קבלת המוצר
                או מיום קבלת מסמך המידע בדבר העסקה — לפי המאוחר, ובכפוף לחריגים הקבועים בחוק ובמדיניות זו.
                יש להגיש את בקשת הביטול בכתב (למשל דרך עמוד יצירת הקשר או בדוא&quot;ל) ולציין מספר הזמנה ופרטי
                זיהוי.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
                3. תנאי החזרת מוצר
              </h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                מוצר המוחזר לביטול או להחזרה יש לשלוח באריזתו המקורית, ללא שימוש שלא לצורך בדיקה סבירה, עם כל
                האביזרים, התוויות והמסמכים שסופקו עם המשלוח. שמירה על תקינות המוצר חיונית לעיבוד הבקשה. במקרה של
                נזק שנגרם עקב שימוש חורג או היעדר אריזה הולמת, ייתכן שהחזר יופחת או יסורב — בהתאם לממצאי הבדיקה.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
                4. אחריות לפגמים
              </h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                מוצר שנמסר עם פגם ייצור או אי-התאמה מהותית לפרסום — יטופל לפי דין ובהתאם לתנאי האחריות המפורטים
                במפרט המוצר. יש לדווח על כך בהקדם לאחר הגילוי, ולצרף תמונות או מסמכים לפי הצורך. טיפול עשוי
                לכלול תיקון, החלפה או זיכוי — לפי העניין והמצב.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
                5. החזר כספי
              </h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                לאחר אישור זכאות להחזר, יבוצע זיכוי באותו אמצעי תשלום שבו בוצעה העסקה, ככל שניתן מבחינה טכנית,
                ולא יאוחר מהמועדים הקבועים בחוק. ייתכנו עיכובים קצרים בגביית חברת האשראי או הבנק. דמי משלוח
                בהתאם לחוק ולמדיניות המחירים שפרסמנו בעת הרכישה.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
                6. יוצאים מהכלל
              </h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                ייתכן שמוצרים שיוצרו בהתאמה אישית, שנפתחו מאריזה סגורה של תוכנה או של מוצר שאינו ניתן להחזרה
                מטעמי היגיינה, או שסופקו במפורש כחריג בחוק — לא יהיו זכים לביטול באותם תנאים. במקרה כזה יצוין
                בעת הרכישה, ככל שנדרש.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
                7. יצירת קשר
              </h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                לבקשות ביטול, החזרה או שאלות בנוגע למדיניות זו, ניתן לפנות דרך{' '}
                <Link href="/contact" className="underline font-medium" style={{ color: '#0891b2' }}>
                  עמוד יצירת הקשר
                </Link>
                . נשתדל להשיב ולטפל בכל פנייה בזמן סביר.
              </p>
            </section>
          </div>

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
