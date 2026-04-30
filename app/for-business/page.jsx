'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import {
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Bell,
  CreditCard,
  Palette,
  Globe,
  Headphones,
  Shield,
  Zap,
  CheckCircle,
  ArrowLeft,
  Building2,
  TrendingUp,
  MessageSquare,
  Settings,
  Smartphone,
  Cloud,
  Lock,
  RefreshCw,
  Gift,
} from 'lucide-react';

// צבעי המערכת לפי הכללים
const colors = {
  primary: '#1e3a8a',
  secondary: '#0891b2',
  text: '#2c3e50',
  textLight: '#4b5563',
  light: '#f8f9fa',
  success: '#16a34a',
};

const gradient = `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`;

export default function ForBusinessPage() {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      html, body { 
        overflow-x: hidden !important; 
        max-width: 100vw !important;
      }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }
      .animate-fadeInUp { animation: fadeInUp 0.6s ease-out forwards; }
      .animate-scaleIn { animation: scaleIn 0.5s ease-out forwards; }
      .animate-float { animation: float 4s ease-in-out infinite; }
      .delay-100 { animation-delay: 0.1s; }
      .delay-200 { animation-delay: 0.2s; }
      .delay-300 { animation-delay: 0.3s; }
      .delay-400 { animation-delay: 0.4s; }
      .opacity-0-start { opacity: 0; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const mainFeatures = [
    { icon: Package, title: 'ניהול מוצרים', desc: 'הוספה, עריכה וניהול קטלוג מוצרים מתקדם' },
    { icon: ShoppingCart, title: 'ניהול הזמנות', desc: 'מעקב הזמנות בזמן אמת עם סטטוסים' },
    { icon: Users, title: 'מערכת סוכנים', desc: 'גיוס סוכנים ומעקב עמלות אוטומטי' },
    { icon: BarChart3, title: 'דוחות ואנליטיקס', desc: 'נתונים ותובנות לקבלת החלטות' },
    { icon: Bell, title: 'התראות Push', desc: 'שליחת התראות ללקוחות וסוכנים' },
    { icon: MessageSquare, title: 'CRM מובנה', desc: 'ניהול לקוחות והודעות WhatsApp' },
  ];

  const integrations = [
    { icon: CreditCard, title: 'PayPlus', desc: 'סליקת אשראי מאובטחת' },
    { icon: Cloud, title: 'Priority ERP', desc: 'סנכרון מלא עם מערכת ERP' },
    { icon: MessageSquare, title: 'WhatsApp Business', desc: 'תקשורת ישירה עם לקוחות' },
  ];

  const benefits = [
    { icon: Zap, text: 'התקנה מיידית' },
    { icon: Lock, text: 'מאובטח ומוגן' },
    { icon: Smartphone, text: 'מותאם למובייל' },
    { icon: RefreshCw, text: 'עדכונים אוטומטיים' },
    { icon: Headphones, text: 'תמיכה מלאה' },
    { icon: Globe, text: 'נגיש מכל מקום' },
  ];

  const includedFeatures = [
    'ניהול מוצרים ללא הגבלה',
    'מערכת סוכנים מלאה',
    'דוחות מכירות מפורטים',
    'התראות Push ללקוחות',
    'CRM וניהול לידים',
    'אינטגרציה עם PayPlus',
    'עיצוב מותאם אישית',
    'תמיכה טכנית מלאה',
  ];

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: colors.light }}>
      {/* Hero Section */}
      <section className="relative pt-8 pb-16 sm:pt-12 sm:pb-20 px-4 sm:px-6" style={{ background: gradient }}>
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 animate-float" />
        <div className="absolute top-1/2 -left-6 w-24 h-24 rounded-full bg-white/10 animate-float delay-300" />
        
        <div className="relative max-w-4xl mx-auto text-center text-white">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-white/20 flex items-center justify-center opacity-0-start animate-scaleIn">
            <Building2 className="w-8 h-8" />
          </div>
          
          <h1 className="text-2xl sm:text-4xl font-bold mb-4 opacity-0-start animate-fadeInUp delay-100">
            מערכת VIPO לעסקים
          </h1>
          
          <p className="text-base sm:text-lg leading-relaxed mb-6 max-w-2xl mx-auto opacity-0-start animate-fadeInUp delay-200">
            פלטפורמה מתקדמת לניהול העסק הדיגיטלי שלכם.
            <br className="hidden sm:block" />
            מוצרים, הזמנות, סוכנים, CRM - הכל במקום אחד.
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-8 sm:gap-12 mb-6 opacity-0-start animate-fadeInUp delay-300">
            {[
              { value: '100%', label: 'בחינם' },
              { value: '24/7', label: 'זמינות' },
              { value: '0', label: 'עמלות נסתרות' },
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold">{stat.value}</div>
                <div className="text-xs sm:text-sm opacity-80">{stat.label}</div>
              </div>
            ))}
          </div>

          <Link
            href="/register-business"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white font-bold rounded-xl text-sm sm:text-base transition-all hover:shadow-lg hover:-translate-y-1 opacity-0-start animate-fadeInUp delay-400"
            style={{ color: colors.primary }}
          >
            התחל עכשיו - בחינם
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" className="w-full h-auto">
            <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: colors.primary }}>
              מה כלול במערכת?
            </h2>
            <div className="w-16 h-1 mx-auto rounded-full" style={{ background: gradient }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mainFeatures.map((feature, idx) => (
              <div 
                key={idx}
                className="bg-white rounded-xl p-5 transition-all hover:shadow-lg hover:-translate-y-1"
                style={{ 
                  border: '2px solid transparent',
                  backgroundImage: `linear-gradient(white, white), ${gradient}`,
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box'
                }}
              >
                <div 
                  className="w-11 h-11 rounded-lg flex items-center justify-center text-white mb-3"
                  style={{ background: gradient }}
                >
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm sm:text-base mb-1" style={{ color: colors.primary }}>
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm" style={{ color: colors.textLight }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-10 sm:py-14 px-4 sm:px-6" style={{ backgroundColor: colors.light }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: colors.primary }}>
              אינטגרציות מתקדמות
            </h2>
            <div className="w-16 h-1 mx-auto rounded-full" style={{ background: gradient }} />
            <p className="text-sm mt-3" style={{ color: colors.textLight }}>
              התחברו למערכות שאתם כבר משתמשים בהן
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {integrations.map((item, idx) => (
              <div 
                key={idx}
                className="bg-white rounded-xl p-6 text-center transition-all hover:shadow-lg"
              >
                <div 
                  className="w-14 h-14 mx-auto rounded-xl flex items-center justify-center text-white mb-4"
                  style={{ background: gradient }}
                >
                  <item.icon className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-base mb-1" style={{ color: colors.primary }}>
                  {item.title}
                </h3>
                <p className="text-sm" style={{ color: colors.textLight }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Strip */}
      <section className="py-8 px-4 sm:px-6" style={{ background: gradient }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-center gap-2 text-white">
                <benefit.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing / What's Included */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: colors.primary }}>
              הכל כלול - בחינם
            </h2>
            <div className="w-16 h-1 mx-auto rounded-full" style={{ background: gradient }} />
          </div>

          <div 
            className="rounded-2xl p-6 sm:p-8"
            style={{ 
              border: '2px solid transparent',
              backgroundImage: `linear-gradient(white, white), ${gradient}`,
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box'
            }}
          >
            <div className="text-center mb-6">
              <div className="text-4xl sm:text-5xl font-bold mb-1" style={{ color: colors.primary }}>
                0₪
              </div>
              <div className="text-sm" style={{ color: colors.textLight }}>לחודש - לתמיד</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {includedFeatures.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: colors.success }} />
                  <span className="text-sm" style={{ color: colors.text }}>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Agent System Highlight */}
      <section className="py-10 sm:py-14 px-4 sm:px-6" style={{ backgroundColor: colors.light }}>
        <div className="max-w-4xl mx-auto">
          <div 
            className="rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6"
            style={{ background: gradient }}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Users className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <div className="text-white text-center sm:text-right flex-1">
              <h3 className="text-lg sm:text-xl font-bold mb-2">מערכת סוכנים מובנית</h3>
              <p className="text-sm sm:text-base opacity-90 mb-4">
                גייסו סוכני מכירות, תנו להם קודי קופון ייחודיים, ועקבו אחרי העמלות שלהם אוטומטית.
                הכל מנוהל במערכת אחת.
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-4">
                {[
                  { icon: Gift, text: 'קופונים אוטומטיים' },
                  { icon: TrendingUp, text: 'מעקב ביצועים' },
                  { icon: CreditCard, text: 'תשלום עמלות' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-white/80">
                    <item.icon className="w-4 h-4" />
                    <span className="text-xs">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-12 sm:py-16 px-4 sm:px-6" style={{ background: gradient }}>
        <div className="absolute top-0 left-0 right-0 rotate-180">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full h-auto">
            <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill={colors.light}/>
          </svg>
        </div>
        
        <div className="relative max-w-2xl mx-auto text-center text-white">
          <Zap className="w-10 h-10 mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold mb-3">
            מוכנים להתחיל?
          </h2>
          <p className="text-sm sm:text-base mb-6 opacity-90">
            הצטרפו לעסקים שכבר מנהלים את המכירות שלהם עם VIPO
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register-business"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white font-bold rounded-xl text-sm transition-all hover:shadow-lg hover:-translate-y-1"
              style={{ color: colors.primary }}
            >
              פתיחת חשבון בחינם
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/20 font-bold rounded-xl text-sm text-white transition-all hover:bg-white/30"
            >
              כבר יש לי חשבון
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
