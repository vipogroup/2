'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { fetchAuthUser } from '@/lib/clientAuthCache';

// Context for site texts
const SiteTextsContext = createContext(null);

// Edit mode password
const EDIT_PASSWORD = '1000';

const CLIENT_CACHE_TTL_MS = 60 * 1000;
const SITE_TEXTS_CACHE_KEY = 'site_texts_all_cache_v1';

function readClientCache(cacheKey) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.expiresAt || parsed.expiresAt < Date.now()) {
      window.sessionStorage.removeItem(cacheKey);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

function writeClientCache(cacheKey, value, ttlMs = CLIENT_CACHE_TTL_MS) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(cacheKey, JSON.stringify({
      value,
      expiresAt: Date.now() + ttlMs,
    }));
  } catch {
    // Ignore cache write failures (private mode/full storage)
  }
}

// Default texts (fallback if API fails)
const DEFAULT_TEXTS = {
  // Hero Section
  HOME_HERO_TITLE: '🇮🇱 ביחד ננצח 🇮🇱\nנלחמים ביוקר המחייה',
  HOME_HERO_SUBTITLE: 'רכישה קבוצתית במחיר מפעל - ככה ננצח!',
  HOME_HERO_CTA_PRIMARY: 'צפו במוצרים',
  HOME_HERO_CTA_SECONDARY: 'איך זה עובד?',
  
  // Video Section
  HOME_VIDEO_CAPTION: 'מעבירים את השליטה בחזרה לעם ונלחמים ביוקר המחייה',
  
  // How It Works Section
  HOME_HOW_TITLE: 'איך זה עובד?',
  HOME_HOW_STEP_1_TITLE: 'בחירת מוצר',
  HOME_HOW_STEP_1_TEXT: 'בוחרים מוצרים במחיר מפעל מהמערכת שלנו עד 50% יותר זול ממחיר השוק',
  HOME_HOW_STEP_2_TITLE: 'הצטרפות לקבוצה',
  HOME_HOW_STEP_2_TEXT: 'מצטרפים לקבוצת הרכישה בתום ה-30 יום ההזמנה עוברת למפעל לייצור',
  HOME_HOW_STEP_3_TITLE: 'שיתוף',
  HOME_HOW_STEP_3_TEXT: 'משתפים את החברים ומשפחה כדי להגדיל את הקבוצה וגם מקבלים 10% עמלה על כל רכישה שהגיעה מהשיתוף שלכם',
  HOME_HOW_STEP_4_TITLE: 'המחיר יורד',
  HOME_HOW_STEP_4_TEXT: 'ככל שיותר חברים מצטרפים, המחיר יורד לכולם',
  HOME_HOW_STEP_5_TITLE: 'סגירת קבוצה',
  HOME_HOW_STEP_5_TEXT: 'בסיום ההרשמה מקבלים הודעה שמתחילים בייצור ועדכון על זמני הגעה',
  HOME_HOW_STEP_6_TITLE: 'תשלום ומשלוח',
  HOME_HOW_STEP_6_TEXT: 'עד 24 תשלומים ומשלוח עד הבית (יש איסוף עצמי)',
  
  // Trust Section
  HOME_TRUST_TITLE: 'שאנחנו מאוחדים אנחנו חזקים',
  HOME_TRUST_TEXT: 'מצטרפים ורוכשים ב-50% יותר זול ממחיר השוק בישראל ואם הצלחנו להיות מאוחדים וצרפנו חברים ומשפחה אז נקבל עוד הנחה רק ככה ננצח ביחד את יוקר המחייה',
  
  // Referral Section
  HOME_REFERRAL_TITLE: 'חבר מביא חבר',
  HOME_REFERRAL_SUBTITLE: 'שיתפת – הרווחת',
  HOME_REFERRAL_TEXT: 'קבלו תגמול כספי על כל רכישה שמתבצעת באמצעות קוד הקופון או שיתוף מוצר מהאזור האישי שלכם – ללא צורך לקנות בעצמכם 10% על כל רכישה',
  HOME_REFERRAL_BUTTON: 'משתפים חברים – ומרוויחים בלי לקנות',
  HOME_REFERRAL_CTA: 'פתחו קוד קופון אישי',
  
  // Target Audience Section
  HOME_TARGET_TITLE: 'למי זה מתאים',
  HOME_TARGET_1_TITLE: 'משפחות',
  HOME_TARGET_1_TEXT: 'חיסכון משמעותי במוצרים לבית ולמשפחה',
  HOME_TARGET_2_TITLE: 'עסקים קטנים',
  HOME_TARGET_2_TEXT: 'ציוד משרדי ומוצרים לעסק במחירים מוזלים',
  HOME_TARGET_3_TITLE: 'יזמים',
  HOME_TARGET_3_TEXT: 'הזדמנות לרכישת מוצרים איכותיים בעלות נמוכה',
  HOME_TARGET_4_TITLE: 'מוסדות',
  HOME_TARGET_4_TEXT: 'פתרונות רכש מרוכז למוסדות וארגונים',
  
  // FAQ Section
  HOME_FAQ_TITLE: 'שאלות נפוצות',
  HOME_FAQ_1_Q: 'האם יש התחייבות כספית?',
  HOME_FAQ_1_A: 'לא, אין שום התחייבות כספית. התשלום רק לאחר סגירת הקבוצה ורק אם אתם מעוניינים.',
  HOME_FAQ_2_Q: 'איך עובד "חבר מביא חבר"?',
  HOME_FAQ_2_A: 'כל משתמש מקבל קישור אישי. כאשר חבר מזמין דרך הקישור שלכם, אתם מקבלים תגמול כספי בהתאם לעסקה – ללא צורך לרכוש בעצמכם.',
  HOME_FAQ_3_Q: 'מה אם לא מצטרפים מספיק אנשים?',
  HOME_FAQ_3_A: 'נמשיך לחכות או נציע לכם לרכוש במחיר הנוכחי. אתם לא מחויבים לרכוש.',
  HOME_FAQ_4_Q: 'כיצד מתבצע המשלוח?',
  HOME_FAQ_4_A: 'משלוח ישירות לכתובת שלכם. זמן אספקה: 7-14 ימי עסקים. עלות כלולה במחיר.',
  HOME_FAQ_5_Q: 'האם יש אחריות על המוצרים?',
  HOME_FAQ_5_A: 'כן, כל המוצרים עם אחריות מלאה של היבואן הרשמי בישראל.',
  
  // Testimonials Section
  HOME_TESTIMONIALS_TITLE: 'לקוחות מספרים',
  HOME_TESTIMONIAL_1_TEXT: 'חסכתי 700 ₪ על מכונת כביסה!',
  HOME_TESTIMONIAL_1_AUTHOR: 'מיכל כהן',
  HOME_TESTIMONIAL_1_LOCATION: 'תל אביב',
  HOME_TESTIMONIAL_2_TEXT: 'קיבלתי 300 ₪ מהפניות. מדהים!',
  HOME_TESTIMONIAL_2_AUTHOR: 'יוסי לוי',
  HOME_TESTIMONIAL_2_LOCATION: 'חיפה',
  HOME_TESTIMONIAL_3_TEXT: 'חסכתי אלפי שקלים. שירות מעולה!',
  HOME_TESTIMONIAL_3_AUTHOR: 'דני אברהם',
  HOME_TESTIMONIAL_3_LOCATION: 'ירושלים',
  
  // About Section
  HOME_ABOUT_TITLE: 'מי אנחנו',
  HOME_ABOUT_TEXT: 'VIPO Group מובילה את תחום הרכישה הקבוצתית בישראל מאז 2018. אנו מחברים בין אלפי לקוחות פרטיים ועסקיים לספקים איכותיים בארץ ובעולם, מקצרים תהליכים ומוזילים עלויות בצורה חכמה, שקופה ומהירה – עד שהמוצר מגיע אליכם הביתה.',
  HOME_ABOUT_STAT_1: '+9,500',
  HOME_ABOUT_STAT_1_LABEL: 'לקוחות מרוצים',
  HOME_ABOUT_STAT_2: '2018',
  HOME_ABOUT_STAT_2_LABEL: 'שנת הקמה',
  HOME_ABOUT_STAT_3: 'ישראל + סין',
  HOME_ABOUT_STAT_3_LABEL: 'נוכחות בינלאומית',
  
  // Footer Section
  FOOTER_COMPANY_NAME: 'VIPO GROUP',
  FOOTER_TAGLINE: 'רכישה קבוצתית חכמה וחסכונית',
  FOOTER_PHONE: '053-375-2633',
  FOOTER_EMAIL: 'vipogroup1@gmail.com',
  FOOTER_ADDRESS: 'ז\'בוטינסקי 5, באר יעקב',
  FOOTER_HOURS: 'א׳-ה׳ 09:00-18:00',
  FOOTER_COPYRIGHT: '© 2025 VIPO GROUP | ע.מ. 036517548',
};

// Provider component
export function SiteTextsProvider({ children, page = 'home' }) {
  const [texts, setTexts] = useState(DEFAULT_TEXTS);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Check if user can edit (admin or business_admin)
  useEffect(() => {
    let ignore = false;

    const checkEditPermission = async () => {
      try {
        const user = await fetchAuthUser({ ttlMs: CLIENT_CACHE_TTL_MS });
        if (!ignore) {
          const role = user?.role || null;
          setUserRole(role);
          setCanEdit(role === 'admin' || role === 'business_admin');
        }
      } catch (e) {
        // Not logged in or error
        if (!ignore) {
          setUserRole(null);
          setCanEdit(false);
        }
      }
    };

    checkEditPermission();

    return () => {
      ignore = true;
    };
  }, []);

  // Fetch texts from API
  useEffect(() => {
    const fetchTexts = async () => {
      const cachedTexts = readClientCache(SITE_TEXTS_CACHE_KEY);
      if (cachedTexts) {
        setTexts(cachedTexts);
        setLoading(false);
        return;
      }

      try {
        // Fetch all texts (not just page-specific) to get global footer texts too
        const res = await fetch(`/api/site-texts/all`);
        const data = await res.json();
        
        if (data.success && data.texts) {
          const textMap = { ...DEFAULT_TEXTS };
          data.texts.forEach(text => {
            if (text.value) {
              textMap[text.textId] = text.value;
            }
          });
          setTexts(textMap);
          writeClientCache(SITE_TEXTS_CACHE_KEY, textMap);
        }
      } catch (error) {
        console.error('Error fetching site texts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTexts();
  }, [page]);

  // Enable edit mode with password
  const enableEditMode = useCallback((password) => {
    if (password === EDIT_PASSWORD) {
      setEditMode(true);
      setCanEdit(true);
      return true;
    }
    return false;
  }, []);

  // Disable edit mode
  const disableEditMode = useCallback(() => {
    setEditMode(false);
  }, []);

  // Update a single text
  const updateText = useCallback(async (textId, newValue) => {
    try {
      const res = await fetch('/api/site-texts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textId, value: newValue }),
      });

      if (res.ok) {
        setTexts(prev => ({ ...prev, [textId]: newValue }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating text:', error);
      return false;
    }
  }, []);

  return (
    <SiteTextsContext.Provider value={{ 
      texts, 
      loading, 
      editMode, 
      canEdit, 
      userRole,
      enableEditMode, 
      disableEditMode, 
      updateText 
    }}>
      {children}
    </SiteTextsContext.Provider>
  );
}

// Hook to use site texts
export function useSiteTexts() {
  const context = useContext(SiteTextsContext);
  if (!context) {
    // Return default texts if used outside provider
    return { 
      texts: DEFAULT_TEXTS, 
      loading: false, 
      editMode: false,
      canEdit: false,
      userRole: null,
      enableEditMode: () => false,
      disableEditMode: () => {},
      updateText: async () => false,
      getText: (id) => DEFAULT_TEXTS[id] || '' 
    };
  }
  
  const getText = (textId, fallback = '') => {
    return context.texts[textId] || fallback;
  };
  
  return { ...context, getText };
}

// Standalone function to get texts (for server components or one-time fetch)
export async function getSiteTexts(page = 'home') {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
    const res = await fetch(`${baseUrl}/api/site-texts?page=${page}`, {
      next: { revalidate: 300 },
    });
    const data = await res.json();
    
    if (data.success && data.sections) {
      const textMap = { ...DEFAULT_TEXTS };
      data.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.value) {
            textMap[field.textId] = field.value;
          }
        });
      });
      return textMap;
    }
  } catch (error) {
    console.error('Error fetching site texts:', error);
  }
  
  return DEFAULT_TEXTS;
}

export { DEFAULT_TEXTS };
