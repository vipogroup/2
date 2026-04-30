'use client';

import { usePathname } from 'next/navigation';
import { useSiteTexts } from '@/lib/useSiteTexts';
import EditableTextField from './EditableTextField';

export default function GlobalFooter() {
  const { getText } = useSiteTexts();
  const pathname = usePathname();
  
  // Check pages where footer should NOT appear
  const isAdminPage = pathname?.startsWith('/admin');
  const isHomePage = pathname === '/';
  const isRegisterBusinessPage = pathname === '/register-business';
  const isLoginPage = pathname === '/login';
  const isRegisterPage = pathname === '/register';
  
  const shouldHide = isAdminPage || isHomePage || isRegisterBusinessPage || isLoginPage || isRegisterPage;
  
  // Don't render on excluded pages
  if (shouldHide) {
    return null;
  }

  return (
    <>
      {/* Scoped footer styles */}
      <style jsx global>{`
        .gf-outer {
          background: linear-gradient(135deg, #1e3a8a 0%, #0f4c75 50%, #0891b2 100%);
        }
        .gf-wave-top {
          margin: 0;
          line-height: 0;
          overflow: hidden;
        }
        .gf-wave-top svg {
          display: block;
          width: 100%;
          height: 50px;
        }
        .gf-footer-wrap {
          color: white;
          padding: 0;
          margin: 0;
          border-top: none;
        }
        .gf-footer-inner {
          max-width: 700px;
          margin: 0 auto;
          padding: 24px 20px 80px;
          text-align: center;
        }
        .gf-brand {
          font-size: 1.5rem;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: white;
          margin: 0 0 2px;
        }
        .gf-tagline {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.7);
          margin: 0 0 16px;
        }
        .gf-divider {
          width: 50px;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          margin: 0 auto 16px;
        }
        .gf-columns {
          display: flex;
          justify-content: center;
          gap: 40px;
          flex-wrap: wrap;
          text-align: right;
          direction: rtl;
          margin-bottom: 16px;
        }
        .gf-col {
          min-width: 150px;
          flex: 1;
        }
        .gf-col-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: white;
          margin-bottom: 10px;
        }
        .gf-col-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .gf-contact-row {
          display: flex;
          align-items: center;
          gap: 7px;
          color: rgba(255,255,255,0.8);
          font-size: 0.82rem;
          transition: color 0.2s;
        }
        .gf-contact-row:hover {
          color: white;
        }
        .gf-contact-row svg {
          width: 15px;
          height: 15px;
          flex-shrink: 0;
          opacity: 0.7;
        }
        .gf-nav-link {
          display: flex;
          align-items: center;
          gap: 7px;
          color: rgba(255,255,255,0.8);
          text-decoration: none;
          font-size: 0.82rem;
          transition: color 0.2s, transform 0.2s;
        }
        .gf-nav-link:hover {
          color: white;
          transform: translateX(-3px);
        }
        .gf-nav-link svg {
          width: 13px;
          height: 13px;
          flex-shrink: 0;
          opacity: 0.6;
        }
        .gf-social {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin: 14px 0;
        }
        .gf-social a {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.8);
          transition: all 0.3s ease;
        }
        .gf-social a:hover {
          background: rgba(255,255,255,0.2);
          color: white;
          transform: translateY(-2px);
        }
        .gf-social a svg {
          width: 15px;
          height: 15px;
        }
        .gf-bottom {
          border-top: 1px solid rgba(255,255,255,0.1);
          padding: 12px 0 0;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.5);
        }
        .gf-bottom a {
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          transition: color 0.2s;
        }
        .gf-bottom a:hover {
          color: rgba(255,255,255,0.8);
        }
        .gf-bottom-links {
          display: flex;
          gap: 14px;
        }
        @media (max-width: 768px) {
          .gf-wave-top svg {
            height: 30px;
          }
          .gf-footer-inner {
            padding: 18px 16px 80px;
          }
          .gf-brand {
            font-size: 1.2rem;
          }
          .gf-tagline {
            font-size: 0.75rem;
            margin-bottom: 12px;
          }
          .gf-columns {
            gap: 20px;
          }
          .gf-col {
            min-width: 120px;
          }
          .gf-col-title {
            font-size: 0.82rem;
            margin-bottom: 8px;
          }
          .gf-contact-row, .gf-nav-link {
            font-size: 0.75rem;
          }
          .gf-bottom {
            flex-direction: column;
            gap: 4px;
            font-size: 0.7rem;
          }
        }
      `}</style>

      {/* ═══ Single gradient wrapper for wave + footer ═══ */}
      <div className="gf-outer">
        {/* Wave Transition */}
        <div className="gf-wave-top">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
            <path d="M0,0 L1440,0 L1440,20 C1380,40 1260,0 1080,30 C900,60 720,0 540,40 C360,80 180,20 0,60 Z" fill="#f9fafb" />
          </svg>
        </div>

        {/* Footer */}
        <footer className="gf-footer-wrap" id="contact">
        <div className="gf-footer-inner">
          {/* Brand */}
          <EditableTextField textKey="FOOTER_COMPANY_NAME" fallback="VIPO GROUP" as="h2" className="gf-brand" />
          <EditableTextField textKey="FOOTER_TAGLINE" fallback="רכישה קבוצתית חכמה וחסכונית" as="p" className="gf-tagline" />

          <div className="gf-divider" />

          {/* Two Columns */}
          <div className="gf-columns">
            {/* Contact */}
            <div className="gf-col">
              <div className="gf-col-title">יצירת קשר</div>
              <div className="gf-col-items">
                <div className="gf-contact-row">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  <EditableTextField textKey="FOOTER_PHONE" fallback="053-375-2633" as="span" />
                </div>
                <div className="gf-contact-row">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  <EditableTextField textKey="FOOTER_EMAIL" fallback="vipogroup1@gmail.com" as="span" />
                </div>
                <div className="gf-contact-row">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <EditableTextField textKey="FOOTER_ADDRESS" fallback="ז'בוטינסקי 5, באר יעקב" as="span" />
                </div>
                <div className="gf-contact-row">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <EditableTextField textKey="FOOTER_HOURS" fallback="א׳-ה׳ 09:00-18:00" as="span" />
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="gf-col">
              <div className="gf-col-title">ניווט מהיר</div>
              <div className="gf-col-items">
                <a href="/" className="gf-nav-link"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> דף הבית</a>
                <a href="/products" className="gf-nav-link"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg> חנות</a>
                <a href="/#how-it-works" className="gf-nav-link"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> איך זה עובד</a>
                <a href="/#faq" className="gf-nav-link"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> שאלות נפוצות</a>
                <a href="/#about-vipo" className="gf-nav-link"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> מי אנחנו</a>
              </div>
            </div>
          </div>

          {/* Social */}
          <div className="gf-social">
            <a href="#" aria-label="פייסבוק"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg></a>
            <a href="https://www.instagram.com/vipoconnect?igsh=MWdpdTZlbTMxMnNxcw%3D%3D&utm_source=qr" target="_blank" aria-label="אינסטגרם"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg></a>
            <a href="#" aria-label="טוויטר"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg></a>
            <a href="#" aria-label="לינקדאין"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg></a>
          </div>

          {/* Bottom */}
          <div className="gf-bottom">
            <EditableTextField textKey="FOOTER_COPYRIGHT" fallback="© 2025 VIPO GROUP | ע.מ. 036517548" as="span" />
            <div className="gf-bottom-links">
              <a href="/terms">תנאי שימוש</a>
              <a href="/privacy">מדיניות פרטיות</a>
              <a href="/returns-policy">מדיניות החזרות</a>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </>
  );
}
