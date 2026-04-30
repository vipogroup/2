import Link from 'next/link';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.vipo-group.com').trim();

export const metadata = {
  title: 'תנאי שימוש באתר VIPO - רכישות, תשלומים ותוכנית סוכנים',
  description: 'תנאי השימוש באתר VIPO: רישום, רכישות, תשלומים, תוכנית סוכנים, קניין רוחני והגבלת אחריות.',
  alternates: {
    canonical: `${SITE_URL}/terms`,
  },
  openGraph: {
    title: 'תנאי שימוש באתר VIPO - רכישות, תשלומים ותוכנית סוכנים',
    description: 'תנאי השימוש הרשמיים של VIPO לשימוש באתר ובשירותים הדיגיטליים.',
    url: `${SITE_URL}/terms`,
    type: 'article',
    locale: 'he_IL',
  },
  twitter: {
    card: 'summary',
    title: 'תנאי שימוש באתר VIPO - רכישות, תשלומים ותוכנית סוכנים',
    description: 'תנאי השימוש הרשמיים של VIPO לשימוש באתר ובשירותים הדיגיטליים.',
  },
};

export default function TermsPage() {

  return (
    <div className="min-h-screen" style={{ background: '#f8f9fa' }}>
      {/* Hero Header */}
      <div 
        className="relative pt-12 pb-20 px-4"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
      >
        <div className="max-w-4xl mx-auto text-center text-white">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            תנאי שימוש
          </h1>
          <p className="text-white/80">
            עודכן לאחרונה: ינואר 2026
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
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>1. הקדמה</h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                ברוכים הבאים ל-VIPO. תנאי שימוש אלה (&quot;התנאים&quot;) מסדירים את השימוש שלך באתר ובשירותים שלנו. 
                בשימוש באתר, אתה מסכים לתנאים אלה במלואם. אם אינך מסכים לתנאים אלה, אנא הימנע משימוש באתר.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>2. הגדרות</h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                <strong>&quot;האתר&quot;</strong> - אתר האינטרנט של VIPO וכל השירותים הדיגיטליים הקשורים אליו. <strong>&quot;משתמש&quot;</strong> - כל אדם הגולש או משתמש באתר, כולל לקוחות וסוכנים. <strong>&quot;סוכן&quot;</strong> - משתמש שנרשם כשותף שיווקי ומקבל עמלות על הפניות. <strong>&quot;מוצרים&quot;</strong> - כל המוצרים והשירותים המוצעים למכירה באתר.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>3. רישום וחשבון משתמש</h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                כדי לבצע רכישות או להשתמש בשירותים מסוימים, ייתכן שתידרש ליצור חשבון. אתה מתחייב לספק מידע מדויק ועדכני בעת הרישום, לשמור על סודיות פרטי ההתחברות שלך, להודיע לנו מיידית על כל שימוש לא מורשה בחשבונך, ולא להעביר את חשבונך לצד שלישי ללא אישורנו.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>4. רכישות ותשלומים</h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                בעת ביצוע רכישה באתר, המחירים המוצגים כוללים מע&quot;מ אלא אם צוין אחרת. התשלום מתבצע באמצעות אמצעי התשלום המאושרים באתר, וההזמנה תאושר רק לאחר קבלת אישור תשלום. אנו שומרים לעצמנו את הזכות לבטל הזמנות במקרים חריגים.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>5. משלוחים והחזרות</h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                זמני אספקה משוערים יצוינו בעת ההזמנה. ניתן לבטל הזמנה תוך 14 ימים מיום קבלת המוצר, כאשר המוצר חייב להיות באריזתו המקורית ובמצב תקין. החזר כספי יינתן באותו אמצעי התשלום בו בוצעה הרכישה.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>6. תוכנית הסוכנים</h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                סוכנים הנרשמים לתוכנית השותפים מסכימים לתנאים הבאים: העמלות יחושבו לפי המדיניות העדכנית המפורסמת באתר, תשלום עמלות יתבצע בהתאם ללוח הזמנים שנקבע, אין לעשות שימוש בשיטות שיווק פוגעניות או מטעות, ואנו שומרים לעצמנו את הזכות לסיים שותפות בכל עת.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>7. קניין רוחני</h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                כל התכנים באתר, כולל טקסטים, תמונות, לוגואים ועיצובים, הם רכושה הבלעדי של VIPO או של בעלי הרישיון שלה. 
                אין להעתיק, להפיץ או לעשות שימוש מסחרי בתכנים ללא אישור מראש ובכתב.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>8. הגבלת אחריות</h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                האתר והשירותים מסופקים &quot;כמות שהם&quot; (AS IS). אנו לא נישא באחריות לנזקים עקיפים, 
                מיוחדים או תוצאתיים הנובעים משימוש באתר, במידה המרבית המותרת על פי חוק.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>9. שינויים בתנאים</h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                אנו שומרים לעצמנו את הזכות לעדכן תנאים אלה מעת לעת. שינויים מהותיים יפורסמו באתר, 
                והמשך השימוש באתר לאחר פרסום השינויים מהווה הסכמה לתנאים המעודכנים.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>10. יצירת קשר</h2>
              <p className="about-intro" style={{ fontSize: '1rem', marginBottom: '0' }}>
                לשאלות או הבהרות בנוגע לתנאי השימוש, ניתן לפנות אלינו באמצעות עמוד יצירת הקשר באתר.
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
