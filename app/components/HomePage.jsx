'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import FeaturedCarousel from './FeaturedCarousel';
import { useSiteTexts } from '@/lib/useSiteTexts';
import EditableTextField from './EditableTextField';

function HomePageContent() {
  const { getText, editMode, canEdit, enableEditMode, disableEditMode } = useSiteTexts();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [referralPanelOpen, setReferralPanelOpen] = useState(false);
  const [copyTooltipVisible, setCopyTooltipVisible] = useState(false);
  const magneticBtnRef = useRef(null);
  const productsContainerRef = useRef(null);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showAgentBanner, setShowAgentBanner] = useState(false);

  // Fetch featured products from database
  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const res = await fetch('/api/products?featured=true&marketplace=true');
        if (res.ok) {
          const data = await res.json();
          const products = data.products || data;
          if (Array.isArray(products) && products.length > 0) {
            setFeaturedProducts(products.slice(0, 10));
          }
        }
      } catch (error) {
        console.error('Error fetching featured products:', error);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchFeaturedProducts();
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Check if user is customer (show agent banner)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    // Show banner only for logged-in customers (not agents)
    if (token && role === 'customer') {
      setShowAgentBanner(true);
    }
  }, []);

  // Auto-rotate products carousel - always running, never stops
  useEffect(() => {
    if (featuredProducts.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentProductIndex(prev => (prev + 1) % featuredProducts.length);
    }, 1800); // 1.8 seconds like original
    
    return () => clearInterval(interval);
  }, [featuredProducts.length]);

  // Calculate container offset to center current card
  useEffect(() => {
    const container = productsContainerRef.current;
    if (!container || featuredProducts.length === 0) return;
    
    const cards = container.querySelectorAll('.product-card');
    if (cards.length === 0) return;
    
    const centerCard = cards[currentProductIndex];
    if (!centerCard) return;
    
    const containerRect = container.parentElement?.getBoundingClientRect();
    const cardRect = centerCard.getBoundingClientRect();
    if (!containerRect) return;
    
    const containerCenter = containerRect.width / 2;
    const cardCenter = cardRect.left - containerRect.left + cardRect.width / 2;
    const offset = containerCenter - cardCenter;
    
    container.style.transform = `translateX(${offset}px)`;
  }, [currentProductIndex, featuredProducts]);

  // Get card class based on position relative to current index
  const getCardClass = (index) => {
    const total = featuredProducts.length;
    if (total === 0) return '';
    
    if (index === currentProductIndex) return 'center';
    
    const next = (currentProductIndex + 1) % total;
    const prev = (currentProductIndex - 1 + total) % total;
    
    if (index === next || index === prev) return 'side';
    return 'far';
  };

  // Scroll animation for reveal-on-scroll elements
  useEffect(() => {
    const animateOnScroll = () => {
      const elements = document.querySelectorAll('.reveal-on-scroll');
      const screenPosition = window.innerHeight * 0.8;
      elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        if (elementTop < screenPosition) {
          element.classList.add('fade-in');
        }
      });
    };
    window.addEventListener('scroll', animateOnScroll);
    animateOnScroll(); // Initial check
    return () => window.removeEventListener('scroll', animateOnScroll);
  }, []);

  // 3D Tilt effect for audience cards
  useEffect(() => {
    const cards = document.querySelectorAll('.audience-card');
    const handleMouseMove = function(e) {
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 10;
      const rotateY = (centerX - x) / 10;
      this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
    };
    const handleMouseLeave = function() {
      this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
    };
    cards.forEach(card => {
      card.addEventListener('mousemove', handleMouseMove);
      card.addEventListener('mouseleave', handleMouseLeave);
    });
    return () => {
      cards.forEach(card => {
        card.removeEventListener('mousemove', handleMouseMove);
        card.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, []);

  // Counter animation for stats
  useEffect(() => {
    const animateCounter = (element, target, duration = 2000) => {
      const start = 0;
      const increment = target / (duration / 16);
      let current = start;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          element.textContent = target.toLocaleString('he-IL');
          clearInterval(timer);
        } else {
          element.textContent = Math.floor(current).toLocaleString('he-IL');
        }
      }, 16);
    };

    const statNumbers = document.querySelectorAll('.stat-number');
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
          entry.target.classList.add('counted', 'counting');
          const text = entry.target.textContent.replace(/[^0-9]/g, '');
          const target = parseInt(text);
          if (!isNaN(target)) {
            animateCounter(entry.target, target);
          }
        }
      });
    }, { threshold: 0.5 });

    statNumbers.forEach(stat => statsObserver.observe(stat));
    return () => statNumbers.forEach(stat => statsObserver.unobserve(stat));
  }, []);

  // Set referral meter demo data
  useEffect(() => {
    const friendsCount = document.getElementById('friends-count');
    const earnings = document.getElementById('earnings');
    const meterProgress = document.querySelector('.meter-progress');
    if (friendsCount && earnings && meterProgress) {
      const demoFriends = 3;
      const demoEarnings = demoFriends * 150;
      const progressPercent = Math.min((demoFriends / 10) * 100, 100);
      friendsCount.textContent = demoFriends;
      earnings.textContent = demoEarnings;
      meterProgress.style.width = progressPercent + '%';
    }
  }, []);

  // Magnetic button effect
  const handleMagneticMove = (e) => {
    const btn = magneticBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
  };
  const handleMagneticLeave = () => {
    const btn = magneticBtnRef.current;
    if (btn) btn.style.transform = 'translate(0, 0)';
  };

  // Scroll arrow click handler
  const handleScrollArrowClick = () => {
    const videoSection = document.getElementById('video-section');
    if (videoSection) {
      window.scrollTo({ top: videoSection.offsetTop - 80, behavior: 'smooth' });
    }
  };

  // Copy referral code
  const handleCopyCode = () => {
    window.open('/register', '_blank');
    setCopyTooltipVisible(true);
    setTimeout(() => setCopyTooltipVisible(false), 2000);
  };

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  // Handle edit mode password submission
  const handlePasswordSubmit = () => {
    const success = enableEditMode(passwordInput);
    if (success) {
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  // Format price helper
  const formatPrice = (price) => {
    return `₪${Number(price).toLocaleString('he-IL')}`;
  };

  // Calculate discount text
  const getDiscountText = (product) => {
    if (product.originalPrice && product.originalPrice > product.price) {
      const savings = product.originalPrice - product.price;
      return `חיסכון של עד ₪${savings.toLocaleString('he-IL')}`;
    }
    return 'מבצע מיוחד';
  };

  const steps = [
    { icon: 'cart', title: getText('HOME_HOW_STEP_1_TITLE', 'בחירת מוצר'), desc: getText('HOME_HOW_STEP_1_TEXT', 'בוחרים מוצרים במחיר מפעל מהמערכת שלנו עד 50% יותר זול ממחיר השוק') },
    { icon: 'users', title: getText('HOME_HOW_STEP_2_TITLE', 'הצטרפות לקבוצה'), desc: getText('HOME_HOW_STEP_2_TEXT', 'מצטרפים לקבוצת הרכישה בתום ה-30 יום ההזמנה עוברת למפעל לייצור') },
    { icon: 'share', title: getText('HOME_HOW_STEP_3_TITLE', 'שיתוף'), desc: getText('HOME_HOW_STEP_3_TEXT', 'משתפים את החברים ומשפחה כדי להגדיל את הקבוצה וגם מקבלים 10% עמלה על כל רכישה שהגיעה מהשיתוף שלכם') },
    { icon: 'arrowDown', title: getText('HOME_HOW_STEP_4_TITLE', 'המחיר יורד'), desc: getText('HOME_HOW_STEP_4_TEXT', 'ככל שיותר חברים מצטרפים, המחיר יורד לכולם') },
    { icon: 'check', title: getText('HOME_HOW_STEP_5_TITLE', 'סגירת קבוצה'), desc: getText('HOME_HOW_STEP_5_TEXT', 'בסיום ההרשמה מקבלים הודעה שמתחילים בייצור ועדכון על זמני הגעה') },
    { icon: 'truck', title: getText('HOME_HOW_STEP_6_TITLE', 'תשלום ומשלוח'), desc: getText('HOME_HOW_STEP_6_TEXT', 'עד 24 תשלומים ומשלוח עד הבית (יש איסוף עצמי)') },
  ];

  const faqs = [
    { q: getText('HOME_FAQ_1_Q', 'האם יש התחייבות כספית?'), a: getText('HOME_FAQ_1_A', 'לא, אין שום התחייבות כספית. התשלום רק לאחר סגירת הקבוצה ורק אם אתם מעוניינים.') },
    { q: getText('HOME_FAQ_2_Q', 'איך עובד "חבר מביא חבר"?'), a: getText('HOME_FAQ_2_A', 'כל משתמש מקבל קישור אישי. כאשר חבר מזמין דרך הקישור שלכם, אתם מקבלים תגמול כספי בהתאם לעסקה – ללא צורך לרכוש בעצמכם.') },
    { q: getText('HOME_FAQ_3_Q', 'מה אם לא מצטרפים מספיק אנשים?'), a: getText('HOME_FAQ_3_A', 'נמשיך לחכות או נציע לכם לרכוש במחיר הנוכחי. אתם לא מחויבים לרכוש.') },
    { q: getText('HOME_FAQ_4_Q', 'כיצד מתבצע המשלוח?'), a: getText('HOME_FAQ_4_A', 'משלוח ישירות לכתובת שלכם. זמן אספקה: 7-14 ימי עסקים. עלות כלולה במחיר.') },
    { q: getText('HOME_FAQ_5_Q', 'האם יש אחריות על המוצרים?'), a: getText('HOME_FAQ_5_A', 'כן, כל המוצרים עם אחריות מלאה של היבואן הרשמי בישראל.') },
  ];

  const testimonials = [
    { text: getText('HOME_TESTIMONIAL_1_TEXT', 'חסכתי 700 ₪ על מכונת כביסה!'), author: getText('HOME_TESTIMONIAL_1_AUTHOR', 'מיכל כהן'), location: getText('HOME_TESTIMONIAL_1_LOCATION', 'תל אביב') },
    { text: getText('HOME_TESTIMONIAL_2_TEXT', 'קיבלתי 300 ₪ מהפניות. מדהים!'), author: getText('HOME_TESTIMONIAL_2_AUTHOR', 'יוסי לוי'), location: getText('HOME_TESTIMONIAL_2_LOCATION', 'חיפה') },
    { text: getText('HOME_TESTIMONIAL_3_TEXT', 'חסכתי אלפי שקלים. שירות מעולה!'), author: getText('HOME_TESTIMONIAL_3_AUTHOR', 'דני אברהם'), location: getText('HOME_TESTIMONIAL_3_LOCATION', 'ירושלים') },
  ];

  const audiences = [
    { icon: 'home', title: getText('HOME_TARGET_1_TITLE', 'משפחות'), desc: getText('HOME_TARGET_1_TEXT', 'חיסכון משמעותי במוצרים לבית ולמשפחה') },
    { icon: 'store', title: getText('HOME_TARGET_2_TITLE', 'עסקים קטנים'), desc: getText('HOME_TARGET_2_TEXT', 'ציוד משרדי ומוצרים לעסק במחירים מוזלים') },
    { icon: 'lightbulb', title: getText('HOME_TARGET_3_TITLE', 'יזמים'), desc: getText('HOME_TARGET_3_TEXT', 'הזדמנות לרכישת מוצרים איכותיים בעלות נמוכה') },
    { icon: 'building', title: getText('HOME_TARGET_4_TITLE', 'מוסדות'), desc: getText('HOME_TARGET_4_TEXT', 'פתרונות רכש מרוכז למוסדות וארגונים') },
  ];

  // SVG icons for sections
  const svgIcons = {
    home: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>,
    store: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/></svg>,
    lightbulb: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>,
    building: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>,
    shield: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>,
    cart: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>,
    users: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>,
    share: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>,
    arrowDown: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z"/></svg>,
    check: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>,
    truck: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>,
    ticket: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M22 10V6c0-1.11-.9-2-2-2H4c-1.1 0-1.99.89-1.99 2v4c1.1 0 1.99.9 1.99 2s-.89 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2zm-2-1.46c-1.19.69-2 1.99-2 3.46s.81 2.77 2 3.46V18H4v-2.54c1.19-.69 2-1.99 2-3.46 0-1.48-.8-2.77-1.99-3.46L4 6h16v2.54z"/></svg>,
    whatsapp: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
    chevronDown: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>,
    copy: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>,
  };

  return (
    <div className="home-page" dir="rtl">
      {/* Override hero overlay opacity + mobile text position */}
      <style jsx global>{`
        .hero::before {
          background: linear-gradient(
            to bottom,
            rgba(13, 60, 97, 0.8) 0%,
            rgba(13, 60, 97, 0.75) 16.67%,
            rgba(13, 60, 97, 0.7) 33.33%,
            rgba(13, 60, 97, 0.65) 50%,
            rgba(13, 60, 97, 0.6) 66.67%,
            rgba(13, 60, 97, 0.55) 83.33%,
            rgba(13, 60, 97, 0.5) 100%
          ) !important;
        }
        
        @media (max-width: 768px) {
          .hero-content {
            margin-top: -60px !important;
            padding-top: 60px !important;
          }
        }
        
        .cta-buttons {
          flex-direction: row !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 15px !important;
        }
      `}</style>
      {/* Hero Section */}
      <section id="main-content" className="hero reveal-on-scroll">
        <div className="container">
          <div className="hero-content">
            <h1><span className="word">🇮🇱</span> <EditableTextField textKey="HOME_HERO_TITLE_MAIN" fallback="ביחד ננצח" as="span" className="word" /> <span className="word">🇮🇱</span><br/><EditableTextField textKey="HOME_HERO_TITLE_SUB" fallback="נלחמים ביוקר המחייה" as="span" className="word" style={{fontSize: '0.55em'}} /></h1>
            <EditableTextField 
              textKey="HOME_HERO_SUBTITLE" 
              fallback="רכישה קבוצתית במחיר מפעל - ככה ננצח!"
              as="p"
              className="hero-subtitle"
            />
            <div className="cta-buttons">
              <Link 
                href="/" 
                className="btn btn-primary magnetic"
                ref={magneticBtnRef}
                onMouseMove={handleMagneticMove}
                onMouseLeave={handleMagneticLeave}
              >
                <EditableTextField textKey="HOME_HERO_CTA_PRIMARY" fallback="צפו במוצרים" as="span" />
              </Link>
              <a 
                href="#video-section" 
                className="btn btn-secondary"
                onClick={(e) => {
                  e.preventDefault();
                  const videoSection = document.getElementById('video-section');
                  if (videoSection) {
                    const offset = 60;
                    const top = videoSection.getBoundingClientRect().top + window.pageYOffset - offset;
                    window.scrollTo({ top, behavior: 'smooth' });
                  }
                }}
              ><EditableTextField textKey="HOME_HERO_CTA_SECONDARY" fallback="איך זה עובד?" as="span" /></a>
            </div>
          </div>
        </div>
        
        {/* Hot Products Slider - New Carousel */}
        <div className="home-featured-carousel">
          <FeaturedCarousel />
        </div>
      </section>

      {/* Video Section */}
      <section id="video-section" className="video-section reveal-on-scroll">
        <div className="container">
          <div className="video-container" aria-label="סרטון הסבר על רכישה קבוצתית">
            <div className="video-embed">
              <video width="100%" height="auto" controls preload="metadata" poster="/home/images/1.jpg">
                <source src="/home/mp4/explainer.mp4" type="video/mp4" />
                הדפדפן שלך לא תומך בתגית וידאו.
              </video>
            </div>
            <EditableTextField 
              textKey="HOME_VIDEO_CAPTION" 
              fallback="מעבירים את השליטה בחזרה לעם ונלחמים ביוקר המחייה"
              as="p"
              className="video-caption"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works reveal-on-scroll">
        <div className="container">
          <EditableTextField 
            textKey="HOME_HOW_TITLE" 
            fallback="איך זה עובד?"
            as="h2"
            className="section-title"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          />
          <div className="steps-container">
            {[1,2,3,4,5,6].map((num, index) => {
              const icons = ['cart', 'users', 'share', 'arrowDown', 'check', 'truck'];
              const fallbackTitles = ['בחירת מוצר', 'הצטרפות לקבוצה', 'שיתוף', 'המחיר יורד', 'סגירת קבוצה', 'תשלום ומשלוח'];
              const fallbackDescs = [
                'בוחרים מוצרים במחיר מפעל מהמערכת שלנו עד 50% יותר זול ממחיר השוק',
                'מצטרפים לקבוצת הרכישה בתום ה-30 יום ההזמנה עוברת למפעל לייצור',
                'משתפים את החברים ומשפחה כדי להגדיל את הקבוצה וגם מקבלים 10% עמלה על כל רכישה שהגיעה מהשיתוף שלכם',
                'ככל שיותר חברים מצטרפים, המחיר יורד לכולם',
                'בסיום ההרשמה מקבלים הודעה שמתחילים בייצור ועדכון על זמני הגעה',
                'עד 24 תשלומים ומשלוח עד הבית (יש איסוף עצמי)'
              ];
              return (
                <div className="step reveal-on-scroll" key={index}>
                  <div className={`step-icon ${index === 0 ? 'floating-icon' : ''}`}>
                    <span style={{color: 'white'}}>{svgIcons[icons[index]]}</span>
                  </div>
                  <div className="step-content">
                    <EditableTextField textKey={`HOME_HOW_STEP_${num}_TITLE`} fallback={fallbackTitles[index]} as="h3" />
                    <EditableTextField textKey={`HOME_HOW_STEP_${num}_TEXT`} fallback={fallbackDescs[index]} as="p" multiline />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* No Commitment Section */}
      <section id="no-commitment" className="no-commitment reveal-on-scroll">
        <div className="container">
          <div className="info-box reveal-on-scroll delay-1">
            <div className="info-icon">
              <span style={{color: '#ffffff'}}>{svgIcons.shield}</span>
            </div>
            <EditableTextField 
              textKey="HOME_TRUST_TITLE" 
              fallback="שאנחנו מאוחדים אנחנו חזקים"
              as="h2"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            />
            <EditableTextField 
              textKey="HOME_TRUST_TEXT" 
              fallback="מצטרפים ורוכשים ב-50% יותר זול ממחיר השוק בישראל ואם הצלחנו להיות מאוחדים וצרפנו חברים ומשפחה אז נקבל עוד הנחה רק ככה ננצח ביחד את יוקר המחייה"
              as="p"
              multiline
            />
          </div>
        </div>
      </section>

      {/* Referral Section */}
      <section id="referral" className="referral reveal-on-scroll">
        <div className="container">
          <EditableTextField 
            textKey="HOME_REFERRAL_TITLE" 
            fallback="חבר מביא חבר"
            as="h2"
            className="section-title"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          />
          <div className="referral-content">
            <div className="referral-info">
              <EditableTextField 
                textKey="HOME_REFERRAL_SUBTITLE" 
                fallback="שיתפת – הרווחת"
                as="h3"
              />
              <EditableTextField 
                textKey="HOME_REFERRAL_TEXT" 
                fallback="קבלו תגמול כספי על כל רכישה שמתבצעת באמצעות קוד הקופון או שיתוף מוצר מהאזור האישי שלכם – ללא צורך לקנות בעצמכם 10% על כל רכישה"
                as="p"
                multiline
              />
            </div>
            <button 
              type="button"
              className="btn referral-info-toggle"
              onClick={() => setReferralPanelOpen(!referralPanelOpen)}
              aria-expanded={referralPanelOpen}
            >
              <EditableTextField textKey="HOME_REFERRAL_BUTTON" fallback="משתפים חברים – ומרוויחים בלי לקנות" as="span" />
            </button>
            <div className={`referral-info-panel ${referralPanelOpen ? 'open' : ''}`}>
              <EditableTextField textKey="HOME_REFERRAL_PANEL_TITLE" fallback="איך מרוויחים כסף בלי לרכוש בעצמכם?" as="h4" />
              <ol className="referral-steps">
                <li><EditableTextField textKey="HOME_REFERRAL_STEP_1" fallback="נרשמים בחינם משתפים מוצר בלחיצת כפתור ישירות לווצאפ או לכל רשת חברתית ובכל פעם שחבר ירכוש דרך השיתוף שלך החשבון שלך יזוכה ב-10% מערך העסקה שיתפת הרווחת" as="span" multiline /></li>
                <li><EditableTextField textKey="HOME_REFERRAL_STEP_2" fallback="שולחים בקשה למימוש העמלות והכסף נשלח לחשבון בנק שלך" as="span" /></li>
              </ol>
              <hr className="referral-divider" />
              <EditableTextField textKey="HOME_REFERRAL_SUMMARY" fallback="אין התחייבות אין צורך לקנות פשוט רק לשתף" as="p" className="referral-summary" />
              <EditableTextField textKey="HOME_REFERRAL_MOTTO" fallback="רק ביחד נתאחד ונחזיר את השליטה לעם זאת לא שיטה זאת תנועה של עם אחד" as="p" className="referral-motto" style={{fontWeight: 'bold', marginTop: '10px'}} />
              <Link href="/register" className="btn btn-primary referral-panel-cta"><EditableTextField textKey="HOME_REFERRAL_CTA" fallback="פתחו קוד קופון אישי" as="span" /></Link>
            </div>
            <div className="referral-link-box">
              <EditableTextField textKey="HOME_REFERRAL_LABEL" fallback="קבל קוד קופון אישי:" as="label" htmlFor="referral-link" />
              <div className="copy-link-container">
                <input type="text" id="referral-link" value="VIPO-123456" readOnly />
                <button className="btn btn-copy" aria-label="העתק קוד קופון אישי" onClick={handleCopyCode}>
                  {svgIcons.copy}
                </button>
              </div>
              <div className={`copy-tooltip ${copyTooltipVisible ? 'show' : ''}`}>לחצו כדי להעתיק את הקוד</div>
            </div>
            <div className="referral-meter">
              <div className="meter-info">
                <span id="friends-count">0</span> חברים
                <span className="separator">|</span>
                <span id="earnings">0</span> ₪
              </div>
              <div className="meter-bar">
                <div className="meter-progress" style={{width: '0%'}}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Target Audience Section */}
      <section id="target-audience" className="target-audience reveal-on-scroll">
        <div className="container">
          <EditableTextField 
            textKey="HOME_TARGET_TITLE" 
            fallback="למי זה מתאים"
            as="h2"
            className="section-title"
            style={{ color: '#ffffff', textShadow: '2px 2px 8px rgba(0, 0, 0, 0.7)' }}
          />
          <div className="audience-grid">
            {[1,2,3,4].map((num, index) => {
              const icons = ['home', 'store', 'lightbulb', 'building'];
              const fallbackTitles = ['משפחות', 'עסקים קטנים', 'יזמים', 'מוסדות'];
              const fallbackDescs = [
                'חיסכון משמעותי במוצרים לבית ולמשפחה',
                'ציוד משרדי ומוצרים לעסק במחירים מוזלים',
                'הזדמנות לרכישת מוצרים איכותיים בעלות נמוכה',
                'פתרונות רכש מרוכז למוסדות וארגונים'
              ];
              return (
                <div className="audience-card reveal-on-scroll" key={index}>
                  <div className="audience-icon">
                    <span style={{color: '#1e3a8a'}}>{svgIcons[icons[index]]}</span>
                  </div>
                  <EditableTextField textKey={`HOME_TARGET_${num}_TITLE`} fallback={fallbackTitles[index]} as="h3" />
                  <EditableTextField textKey={`HOME_TARGET_${num}_TEXT`} fallback={fallbackDescs[index]} as="p" className="audience-description" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq reveal-on-scroll">
        <div className="container">
          <EditableTextField 
            textKey="HOME_FAQ_TITLE" 
            fallback="שאלות נפוצות"
            as="h2"
            className="section-title"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          />
          <div className="faq-timeline">
            {[1,2,3,4,5].map((num, index) => {
              const fallbackQuestions = [
                'האם יש התחייבות כספית?',
                'איך עובד "חבר מביא חבר"?',
                'מה אם לא מצטרפים מספיק אנשים?',
                'כיצד מתבצע המשלוח?',
                'האם יש אחריות על המוצרים?'
              ];
              const fallbackAnswers = [
                'לא, אין שום התחייבות כספית. התשלום רק לאחר סגירת הקבוצה ורק אם אתם מעוניינים.',
                'כל משתמש מקבל קישור אישי. כאשר חבר מזמין דרך הקישור שלכם, אתם מקבלים תגמול כספי בהתאם לעסקה – ללא צורך לרכוש בעצמכם.',
                'נמשיך לחכות או נציע לכם לרכוש במחיר הנוכחי. אתם לא מחויבים לרכוש.',
                'משלוח ישירות לכתובת שלכם. זמן אספקה: 7-14 ימי עסקים. עלות כלולה במחיר.',
                'כן, כל המוצרים עם אחריות מלאה של היבואן הרשמי בישראל.'
              ];
              return (
                <div className="faq-item reveal-on-scroll" key={index}>
                  <div className="faq-number">{String(index + 1).padStart(2, '0')}</div>
                  <div className="faq-card">
                    <button className="faq-question" onClick={() => toggleFaq(index)}>
                      <EditableTextField textKey={`HOME_FAQ_${num}_Q`} fallback={fallbackQuestions[index]} as="span" />
                      <svg className={`w-4 h-4 transition-transform ${activeFaq === index ? 'rotated' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <div className={`faq-answer ${activeFaq === index ? 'open' : ''}`}>
                      <EditableTextField textKey={`HOME_FAQ_${num}_A`} fallback={fallbackAnswers[index]} as="p" multiline />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="testimonials">
        <div className="container">
          <EditableTextField 
            textKey="HOME_TESTIMONIALS_TITLE" 
            fallback="לקוחות מספרים"
            as="h2"
            className="section-title"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          />
          <div className="testimonials-slider-wrapper">
            <div className="testimonials-slider">
              {[1,2,3].map((num, index) => {
                const fallbackTexts = ['חסכתי 700 ₪ על מכונת כביסה!', 'קיבלתי 300 ₪ מהפניות. מדהים!', 'חסכתי אלפי שקלים. שירות מעולה!'];
                const fallbackAuthors = ['מיכל כהן', 'יוסי לוי', 'דני אברהם'];
                const fallbackLocations = ['תל אביב', 'חיפה', 'ירושלים'];
                return (
                  <div className={`testimonial-slide ${activeTestimonial === index ? 'active' : ''}`} key={index}>
                    <div className="testimonial-compact">
                      <div className="testimonial-avatar">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                      <div className="testimonial-content">
                        <div className="rating">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className="w-4 h-4" fill="#fbbf24" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                          ))}
                        </div>
                        <p className="testimonial-text">&ldquo;<EditableTextField textKey={`HOME_TESTIMONIAL_${num}_TEXT`} fallback={fallbackTexts[index]} as="span" />&rdquo;</p>
                        <div className="testimonial-author">
                          <strong><EditableTextField textKey={`HOME_TESTIMONIAL_${num}_AUTHOR`} fallback={fallbackAuthors[index]} as="span" /></strong> • <EditableTextField textKey={`HOME_TESTIMONIAL_${num}_LOCATION`} fallback={fallbackLocations[index]} as="span" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="testimonial-dots">
              {[0,1,2].map((index) => (
                <span 
                  className={`testimonial-dot ${activeTestimonial === index ? 'active' : ''}`} 
                  onClick={() => setActiveTestimonial(index)}
                  key={index}
                ></span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Agent Banner - Only for logged-in customers */}
      {showAgentBanner && (
        <section className="agent-banner reveal-on-scroll" style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
          padding: '40px 20px',
          textAlign: 'center',
          color: 'white'
        }}>
          <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '15px', fontWeight: 'bold' }}>
              כל יום אתה משתף - למה לא להרוויח מזה?
            </h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '20px', opacity: 0.9 }}>
              החברים שלך קונים בכל מקרה. שתף מוצר אחד ברשתות החברתיות וקבל 10% מכל רכישה!
            </p>
            <Link 
              href="/join" 
              style={{
                display: 'inline-block',
                padding: '14px 32px',
                background: 'white',
                color: '#1e3a8a',
                fontWeight: 'bold',
                borderRadius: '50px',
                textDecoration: 'none',
                fontSize: '1.1rem',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              הפוך לסוכן עכשיו - חינם!
            </Link>
            <p style={{ fontSize: '0.9rem', marginTop: '15px', opacity: 0.8 }}>
              אלפי משתמשים כבר מרוויחים - אל תפספס!
            </p>
          </div>
        </section>
      )}

      {/* About VIPO Section */}
      <section id="about-vipo" className="about-vipo">
        <div className="container">
          <EditableTextField 
            textKey="HOME_ABOUT_TITLE" 
            fallback="מי אנחנו"
            as="h2"
            className="section-title"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          />
          <div className="about-content">
            <EditableTextField 
              textKey="HOME_ABOUT_TEXT" 
              fallback="VIPO Group מובילה את תחום הרכישה הקבוצתית בישראל מאז 2018. אנו מחברים בין אלפי לקוחות פרטיים ועסקיים לספקים איכותיים בארץ ובעולם, מקצרים תהליכים ומוזילים עלויות בצורה חכמה, שקופה ומהירה – עד שהמוצר מגיע אליכם הביתה."
              as="p"
              className="about-intro"
              multiline
            />

            <div className="about-stats">
              <div className="stat-item">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11l2 2 4-4" /></svg>
                <div>
                  <EditableTextField textKey="HOME_ABOUT_STAT_1" fallback="+9,500" as="span" className="stat-number" />
                  <EditableTextField textKey="HOME_ABOUT_STAT_1_LABEL" fallback="לקוחות מרוצים" as="span" className="stat-label" />
                </div>
              </div>
              <div className="stat-item">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <div>
                  <EditableTextField textKey="HOME_ABOUT_STAT_2" fallback="2018" as="span" className="stat-number" />
                  <EditableTextField textKey="HOME_ABOUT_STAT_2_LABEL" fallback="שנת הקמה" as="span" className="stat-label" />
                </div>
              </div>
              <div className="stat-item">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                  <EditableTextField textKey="HOME_ABOUT_STAT_3" fallback="ישראל + סין" as="span" className="stat-number" style={{whiteSpace: 'nowrap'}} />
                  <EditableTextField textKey="HOME_ABOUT_STAT_3_LABEL" fallback="נוכחות בינלאומית" as="span" className="stat-label" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="wave-divider">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
            <defs>
              <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{stopColor:'#1e3a8a', stopOpacity:1}} />
                <stop offset="100%" style={{stopColor:'#0891b2', stopOpacity:1}} />
              </linearGradient>
            </defs>
            <path d="M0,0 C150,80 350,0 600,40 C850,80 1050,0 1200,40 L1200,120 L0,120 Z" fill="url(#waveGradient)"></path>
          </svg>
        </div>
      </section>

      {/* Footer & Contact Section */}
      <footer id="contact" className="footer">
        <div className="container">
          <div className="footer-brand-section" style={{textAlign: 'center', marginBottom: '30px'}}>
            <EditableTextField 
              textKey="FOOTER_COMPANY_NAME" 
              fallback="VIPO GROUP"
              as="h2"
              className="footer-brand"
            />
            <EditableTextField 
              textKey="FOOTER_TAGLINE" 
              fallback="רכישה קבוצתית חכמה וחסכונית"
              as="p"
              className="footer-tagline"
            />
          </div>
          
          <div className="footer-main" style={{display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '30px'}}>
            {/* יצירת קשר - ימין */}
            <div className="footer-contact" style={{flex: '1', minWidth: '200px'}}>
              <EditableTextField textKey="FOOTER_CONTACT_TITLE" fallback="יצירת קשר" as="h3" style={{color: 'white', fontSize: '1.1rem', marginBottom: '15px', fontWeight: '700'}} />
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                <div className="footer-contact-item">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  <EditableTextField textKey="FOOTER_PHONE" fallback="053-375-2633" as="span" />
                </div>
                <div className="footer-contact-item">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  <EditableTextField textKey="FOOTER_EMAIL" fallback="vipogroup1@gmail.com" as="span" />
                </div>
                <div className="footer-contact-item">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <EditableTextField textKey="FOOTER_ADDRESS" fallback="ז'בוטינסקי 5, באר יעקב" as="span" />
                </div>
                <div className="footer-contact-item">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <EditableTextField textKey="FOOTER_HOURS" fallback="א׳-ה׳ 09:00-18:00" as="span" />
                </div>
              </div>
            </div>
            
            {/* קישורי ניווט - שמאל */}
            <div className="footer-nav" style={{flex: '1', minWidth: '200px'}}>
              <EditableTextField textKey="FOOTER_NAV_TITLE" fallback="ניווט מהיר" as="h3" style={{color: 'white', fontSize: '1.1rem', marginBottom: '15px', fontWeight: '700'}} />
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                <a href="/" style={{color: 'rgba(255,255,255,0.85)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px'}}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> <EditableTextField textKey="FOOTER_NAV_HOME" fallback="דף הבית" as="span" /></a>
                <a href="/" style={{color: 'rgba(255,255,255,0.85)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px'}}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg> <EditableTextField textKey="FOOTER_NAV_SHOP" fallback="חנות" as="span" /></a>
                <a href="#how-it-works" style={{color: 'rgba(255,255,255,0.85)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px'}}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> <EditableTextField textKey="FOOTER_NAV_HOW" fallback="איך זה עובד" as="span" /></a>
                <a href="#faq" style={{color: 'rgba(255,255,255,0.85)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px'}}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> <EditableTextField textKey="FOOTER_NAV_FAQ" fallback="שאלות נפוצות" as="span" /></a>
                <a href="#about-vipo" style={{color: 'rgba(255,255,255,0.85)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px'}}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> <EditableTextField textKey="FOOTER_NAV_ABOUT" fallback="מי אנחנו" as="span" /></a>
              </div>
            </div>
          </div>
          
          <div className="footer-social" style={{textAlign: 'center', margin: '30px 0'}}>
            <a href="#" aria-label="פייסבוק"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg></a>
            <a href="https://www.instagram.com/vipoconnect?igsh=MWdpdTZlbTMxMnNxcw%3D%3D&utm_source=qr" target="_blank" aria-label="אינסטגרם"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg></a>
            <a href="#" aria-label="טוויטר"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg></a>
            <a href="#" aria-label="לינקדאין"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg></a>
          </div>
          
          <div className="footer-bottom">
            <EditableTextField textKey="FOOTER_COPYRIGHT" fallback="© 2025 VIPO GROUP | ע.מ. 036517548" as="p" />
            <div className="footer-links">
              <a href="/terms"><EditableTextField textKey="FOOTER_LINK_TERMS" fallback="תנאי שימוש" as="span" /></a>
              <a href="/privacy"><EditableTextField textKey="FOOTER_LINK_PRIVACY" fallback="מדיניות פרטיות" as="span" /></a>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Button */}
      <a href="https://chat.whatsapp.com/KP5UIdBHiKdGmOdyWeJySa?mode=ac_t" className="whatsapp-button" aria-label="צור קשר בוואטסאפ" target="_blank">
        <span style={{color: 'white'}}>{svgIcons.whatsapp}</span>
      </a>

      {/* Edit Mode Button - visible to all, password-protected */}
      {(
        <button
          onClick={() => editMode ? disableEditMode() : setShowPasswordModal(true)}
          className="fixed bottom-20 left-4 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105"
          style={{
            background: editMode 
              ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' 
              : 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
            color: 'white',
            fontWeight: '600',
          }}
        >
          {editMode ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              סיום עריכה
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              מצב עריכה
            </>
          )}
        </button>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
            setShowPasswordModal(false);
            setPasswordInput('');
            setPasswordError(false);
          }}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#1e3a8a' }}>כניסה למצב עריכה</h3>
              <button 
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordInput('');
                  setPasswordError(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-all"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">הזן סיסמה כדי לערוך טקסטים בדף הבית</p>
            
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              placeholder="סיסמה"
              className={`w-full px-4 py-3 border-2 rounded-lg text-lg ${
                passwordError ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              autoFocus
            />
            
            {passwordError && (
              <p className="text-red-500 text-sm mt-2">סיסמה שגויה</p>
            )}
            
            <button
              onClick={handlePasswordSubmit}
              className="w-full mt-4 px-4 py-3 rounded-lg text-white font-medium transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              כניסה
            </button>
          </div>
        </div>
      )}

      {/* Edit Mode Indicator */}
      {editMode && (
        <div 
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', color: 'white' }}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            מצב עריכה פעיל - לחץ על טקסט לעריכה
          </span>
        </div>
      )}
    </div>
  );
}

// Main export - uses global SiteTextsProvider from layout
export default function HomePage() {
  return <HomePageContent />;
}
