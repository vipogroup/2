'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import {
  Wallet,
  Link2,
  BarChart3,
  Users,
  Share2,
  QrCode,
  TrendingUp,
  Gift,
  CheckCircle,
  ArrowLeft,
  Star,
  Clock,
  CreditCard,
  Smartphone,
  Globe,
  Shield,
  Zap,
  Target,
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

export default function AgentAboutPage() {
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

  const steps = [
    { num: '1', title: 'הרשמה חינם', desc: 'פתיחת חשבון סוכן תוך דקות', icon: Users },
    { num: '2', title: 'קבלת קוד קופון', desc: 'קוד ייחודי נוצר אוטומטית', icon: Gift },
    { num: '3', title: 'שיתוף עם לקוחות', desc: 'שתף בקלות בכל הפלטפורמות', icon: Share2 },
    { num: '4', title: 'הרווח עמלות', desc: 'עד 12% על כל מכירה', icon: Wallet },
  ];

  const benefits = [
    { icon: Wallet, title: 'עמלות גבוהות', desc: 'עד 12% עמלה על כל מכירה שמגיעה דרכך' },
    { icon: BarChart3, title: 'דשבורד מתקדם', desc: 'מעקב מכירות וסטטיסטיקות בזמן אמת' },
    { icon: Link2, title: 'קישורים אישיים', desc: 'קישור ייחודי לכל מוצר לשיתוף קל' },
    { icon: QrCode, title: 'QR קוד אישי', desc: 'קוד QR ייחודי לשיווק אופליין' },
    { icon: Users, title: 'מספר עסקים', desc: 'עבוד עם כמה עסקים במקביל' },
    { icon: CreditCard, title: 'משיכה קלה', desc: 'העבר עמלות ישירות לחשבון הבנק' },
  ];

  const features = [
    { icon: Smartphone, text: 'ממשק מותאם למובייל' },
    { icon: Clock, text: 'התראות בזמן אמת' },
    { icon: Shield, text: 'מערכת מאובטחת' },
    { icon: Globe, text: 'גישה מכל מקום' },
  ];

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: colors.light }}>
      {/* Hero Section */}
      <section className="relative pt-8 pb-16 sm:pt-12 sm:pb-20 px-4 sm:px-6" style={{ background: gradient }}>
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 animate-float" />
        <div className="absolute top-1/2 -left-6 w-24 h-24 rounded-full bg-white/10 animate-float delay-300" />
        
        <div className="relative max-w-4xl mx-auto text-center text-white">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-white/20 flex items-center justify-center opacity-0-start animate-scaleIn">
            <Star className="w-8 h-8" />
          </div>
          
          <h1 className="text-2xl sm:text-4xl font-bold mb-4 opacity-0-start animate-fadeInUp delay-100">
            הפוך לשותף VIPO
          </h1>
          
          <p className="text-base sm:text-lg leading-relaxed mb-6 max-w-2xl mx-auto opacity-0-start animate-fadeInUp delay-200">
            הצטרף לרשת השותפים שלנו והתחל להרוויח עמלות על כל מכירה.
            <br className="hidden sm:block" />
            ללא השקעה, ללא סיכון - רק רווחים.
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-8 sm:gap-12 mb-6 opacity-0-start animate-fadeInUp delay-300">
            {[
              { value: '12%', label: 'עמלה מקסימלית' },
              { value: '0₪', label: 'עלות הצטרפות' },
              { value: '24/7', label: 'גישה לדשבורד' },
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold">{stat.value}</div>
                <div className="text-xs sm:text-sm opacity-80">{stat.label}</div>
              </div>
            ))}
          </div>

          <Link
            href="/register?role=agent"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white font-bold rounded-xl text-sm sm:text-base transition-all hover:shadow-lg hover:-translate-y-1 opacity-0-start animate-fadeInUp delay-400"
            style={{ color: colors.primary }}
          >
            הצטרף עכשיו - בחינם
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

      {/* How It Works */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: colors.primary }}>
              איך זה עובד?
            </h2>
            <div className="w-16 h-1 mx-auto rounded-full" style={{ background: gradient }} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {steps.map((step, idx) => (
              <div key={idx} className="text-center">
                <div 
                  className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 rounded-xl flex items-center justify-center text-white transition-transform hover:scale-105"
                  style={{ background: gradient }}
                >
                  <step.icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div 
                  className="w-6 h-6 mx-auto -mt-5 mb-2 rounded-full bg-white flex items-center justify-center text-xs font-bold border-2"
                  style={{ borderColor: colors.secondary, color: colors.secondary }}
                >
                  {step.num}
                </div>
                <h3 className="font-bold text-sm sm:text-base mb-1" style={{ color: colors.primary }}>
                  {step.title}
                </h3>
                <p className="text-xs" style={{ color: colors.textLight }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-10 sm:py-14 px-4 sm:px-6" style={{ backgroundColor: colors.light }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: colors.primary }}>
              למה להיות סוכן VIPO?
            </h2>
            <div className="w-16 h-1 mx-auto rounded-full" style={{ background: gradient }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map((benefit, idx) => (
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
                  <benefit.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm sm:text-base mb-1" style={{ color: colors.primary }}>
                  {benefit.title}
                </h3>
                <p className="text-xs sm:text-sm" style={{ color: colors.textLight }}>
                  {benefit.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Strip */}
      <section className="py-8 px-4 sm:px-6" style={{ background: gradient }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 text-white">
                <feature.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commission Info */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: colors.primary }}>
              מערכת העמלות
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
            <div className="space-y-4">
              {[
                { label: 'עמלה על כל מכירה', value: 'עד 12%' },
                { label: 'זמן המתנה להעברה', value: '30 יום' },
                { label: 'מינימום למשיכה', value: 'ללא הגבלה' },
                { label: 'העברה לחשבון בנק', value: 'ישירה' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: '#e5e7eb' }}>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" style={{ color: colors.success }} />
                    <span className="text-sm sm:text-base" style={{ color: colors.text }}>{item.label}</span>
                  </div>
                  <span className="font-bold text-sm sm:text-base" style={{ color: colors.primary }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-12 sm:py-16 px-4 sm:px-6" style={{ background: gradient }}>
        <div className="absolute top-0 left-0 right-0 rotate-180">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full h-auto">
            <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="white"/>
          </svg>
        </div>
        
        <div className="relative max-w-2xl mx-auto text-center text-white">
          <Zap className="w-10 h-10 mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold mb-3">
            מוכן להתחיל להרוויח?
          </h2>
          <p className="text-sm sm:text-base mb-6 opacity-90">
            הצטרף עכשיו לאלפי סוכנים שכבר מרוויחים עם VIPO
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register?role=agent"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white font-bold rounded-xl text-sm transition-all hover:shadow-lg hover:-translate-y-1"
              style={{ color: colors.primary }}
            >
              הרשמה בחינם
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Link
              href="/agent"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/20 font-bold rounded-xl text-sm text-white transition-all hover:bg-white/30"
            >
              לדשבורד שלי
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
