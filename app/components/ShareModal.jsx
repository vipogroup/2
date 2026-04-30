'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { getPrimaryImageSrc } from '@/app/lib/mediaSSOT';
import { getProductPublicPath } from '@/lib/stainlessSeoCategories';

// ===== SVG Icons =====
const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);
const ProductIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);
const StoreIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);
const MarketplaceIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);
const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);
const LinkIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);
const ShareNodeIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);
const QRIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
  </svg>
);

// ===== Social Network SVG Icons =====
const WhatsAppSvg = () => (
  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);
const FacebookSvg = () => (
  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);
const TelegramSvg = () => (
  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);
const TwitterSvg = () => (
  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const EmailSvg = () => (
  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const SmsSvg = () => (
  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);
const ViberSvg = () => (
  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
    <path d="M11.398.002C9.473.028 5.331.344 3.014 2.467 1.294 4.177.518 6.77.506 10.2v.481c.012 3.552.836 6.084 2.575 7.78 1.268 1.248 2.992 1.942 5.212 2.14l-.007 1.372c-.014 1.104.633 1.96 1.507 2.026.674.051 1.322-.31 1.745-.767l1.62-1.904c3.037-.025 5.388-.47 7.057-1.327 2.135-1.097 3.254-2.9 3.58-5.792.109-1.034.187-2.12.21-3.166v-.5c-.019-1.07-.09-2.187-.196-3.248-.318-2.836-1.397-4.625-3.484-5.755C18.586.467 15.935.038 12.347.004l-.95-.002z" />
  </svg>
);
const InstagramSvg = () => (
  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);
const LinkedInSvg = () => (
  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);
const PinterestSvg = () => (
  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z" />
  </svg>
);
const RedditSvg = () => (
  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
  </svg>
);
const TikTokSvg = () => (
  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

/**
 * ShareModal - מודאל שיתוף חכם עם שני שלבים
 * שלב 1: בחירת מה לשתף (מוצר / חנות / כל המרקטפלייס)
 * שלב 2: בחירת איך לשתף (רשתות חברתיות)
 * 
 * @param {boolean} isOpen - האם המודאל פתוח
 * @param {Function} onClose - פונקציה לסגירת המודאל
 * @param {Object} product - המוצר שנבחר לשיתוף
 * @param {Array} tenants - רשימת החנויות/עסקים
 * @param {Object} user - פרטי המשתמש (כולל couponCode, role)
 */
export default function ShareModal({ isOpen, onClose, product, tenants = [], user }) {
  const [step, setStep] = useState(1); // 1 = what to share, 2 = how to share
  const [shareTarget, setShareTarget] = useState(null); // 'product' | 'store' | 'marketplace'
  const [selectedStore, setSelectedStore] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const modalRef = useRef(null);

  const couponCode = user?.couponCode || '';
  const isAgent = user?.role === 'agent' || user?.role === 'admin';

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setShareTarget(null);
      setSelectedStore(null);
      setCopied(false);
      setShowQR(false);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  // ===== URL Builders =====
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const refParam = couponCode ? `?ref=${encodeURIComponent(couponCode)}` : '';

  const getShareUrl = () => {
    if (shareTarget === 'product' && product) {
      const productPath = getProductPublicPath(product);
      return `${baseUrl}${productPath}${refParam}`;
    }
    if (shareTarget === 'store' && selectedStore) {
      return `${baseUrl}/store/${selectedStore.slug}${refParam}`;
    }
    // marketplace
    return `${baseUrl}/${refParam ? refParam : ''}`;
  };

  const getShareTitle = () => {
    if (shareTarget === 'product' && product) return product.name;
    if (shareTarget === 'store' && selectedStore) return selectedStore.name;
    return 'VIPO Marketplace';
  };

  const getShareText = () => {
    const lines = [];
    
    if (shareTarget === 'product' && product) {
      const price = product.price?.toLocaleString('he-IL') || product.price;
      lines.push(`*${product.name}*`);
      if (product.description) lines.push(product.description.substring(0, 120));
      lines.push('', `מחיר: ₪${price}`);
    } else if (shareTarget === 'store' && selectedStore) {
      lines.push(`*${selectedStore.name}*`);
      lines.push('', 'בואו לגלות מוצרים מדהימים!');
    } else {
      lines.push('*VIPO Marketplace*');
      lines.push('', 'מוצרים מעולים במחירים מיוחדים!');
    }

    if (couponCode) {
      lines.push('', `קוד קופון להנחה: ${couponCode}`);
    }

    lines.push('', getShareUrl());
    return lines.join('\n');
  };

  // ===== Share Functions =====
  const shareToWhatsApp = () => {
    const text = getShareText();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`, '_blank', 'width=600,height=400');
  };

  const shareToTelegram = () => {
    const text = getShareText();
    window.open(`https://t.me/share/url?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareToTwitter = () => {
    const title = getShareTitle();
    const text = couponCode ? `${title} | קוד קופון: ${couponCode}` : title;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(getShareUrl())}`, '_blank', 'width=600,height=400');
  };

  const shareViaEmail = () => {
    const text = getShareText().replace(/\*/g, '');
    const subject = `בדוק את ${getShareTitle()}`;
    const body = `שלום,\n\n${text}\n\nבברכה`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const shareViaSMS = () => {
    const text = getShareText().replace(/\*/g, '');
    window.location.href = `sms:?body=${encodeURIComponent(text)}`;
  };

  const shareToViber = () => {
    const text = getShareText();
    window.location.href = `viber://forward?text=${encodeURIComponent(text + '\n' + getShareUrl())}`;
  };

  const shareToInstagram = () => {
    copyLink();
    alert('הלינק הועתק! פתח את Instagram ושתף בסטורי או בהודעה');
  };

  const shareToLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl())}`, '_blank', 'width=600,height=400');
  };

  const shareToPinterest = () => {
    const imageUrl = product ? getPrimaryImageSrc(product) : '';
    const desc = getShareTitle();
    window.open(`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(getShareUrl())}&media=${encodeURIComponent(imageUrl || '')}&description=${encodeURIComponent(desc)}`, '_blank', 'width=600,height=400');
  };

  const shareToReddit = () => {
    window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(getShareUrl())}&title=${encodeURIComponent(getShareTitle())}`, '_blank', 'width=600,height=400');
  };

  const shareToTikTok = () => {
    copyLink();
    alert('הלינק הועתק! פתח את TikTok והדבק בביו או בהודעה');
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: getShareTitle(),
          text: getShareText().replace(/\*/g, ''),
          url: getShareUrl(),
        });
      } catch (err) {
        if (err?.name !== 'AbortError') copyLink();
      }
    } else {
      copyLink();
    }
  };

  const copyLink = async () => {
    try {
      const url = getShareUrl();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        window.prompt('העתק את הלינק:', url);
      }
    } catch {
      window.prompt('העתק את הלינק:', getShareUrl());
    }
  };

  const generateQR = () => {
    setShowQR(!showQR);
  };

  // ===== Select target and go to step 2 =====
  const selectTarget = (target, store = null) => {
    setShareTarget(target);
    setSelectedStore(store);
    setStep(2);
  };

  // ===== Networks Config =====
  const mainNetworks = [
    { name: 'WhatsApp', onClick: shareToWhatsApp, bg: '#25D366', icon: <WhatsAppSvg /> },
    { name: 'Facebook', onClick: shareToFacebook, bg: '#1877F2', icon: <FacebookSvg /> },
    { name: 'Telegram', onClick: shareToTelegram, bg: '#0088cc', icon: <TelegramSvg /> },
  ];

  const moreNetworks = [
    { name: 'X', onClick: shareToTwitter, bg: '#000000', icon: <TwitterSvg /> },
    { name: 'Instagram', onClick: shareToInstagram, bg: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', icon: <InstagramSvg /> },
    { name: 'LinkedIn', onClick: shareToLinkedIn, bg: '#0A66C2', icon: <LinkedInSvg /> },
    { name: 'Pinterest', onClick: shareToPinterest, bg: '#E60023', icon: <PinterestSvg /> },
    { name: 'Reddit', onClick: shareToReddit, bg: '#FF4500', icon: <RedditSvg /> },
    { name: 'TikTok', onClick: shareToTikTok, bg: '#000000', icon: <TikTokSvg /> },
    { name: 'SMS', onClick: shareViaSMS, bg: '#16a34a', icon: <SmsSvg /> },
    { name: 'Viber', onClick: shareToViber, bg: '#7360f2', icon: <ViberSvg /> },
    { name: 'אימייל', onClick: shareViaEmail, bg: 'linear-gradient(135deg, #1e3a8a, #0891b2)', icon: <EmailSvg /> },
  ];

  const utilityActions = [
    { name: copied ? 'הועתק!' : 'העתק לינק', onClick: copyLink, bg: copied ? '#16a34a' : '#6b7280', icon: copied ? <CheckIcon /> : <LinkIcon /> },
    { name: 'QR Code', onClick: generateQR, bg: '#1e3a8a', icon: <QRIcon /> },
    { name: 'שתף מהמכשיר', onClick: nativeShare, bg: 'linear-gradient(135deg, #1e3a8a, #0891b2)', icon: <ShareNodeIcon /> },
  ];

  const productImage = product ? getPrimaryImageSrc(product) : null;
  const productTenant = product?.tenant;

  // ===== RENDER =====
  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
      onClick={handleBackdropClick}
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div 
        ref={modalRef}
        className="bg-white w-full sm:w-[480px] sm:max-h-[85vh] max-h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col animate-slide-up"
        style={{ boxShadow: '0 -4px 40px rgba(0,0,0,0.15)' }}
        dir="rtl"
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
        >
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button 
                onClick={() => setStep(1)} 
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <BackIcon />
              </button>
            )}
            <h2 className="text-white font-bold text-lg">
              {step === 1 ? 'מה לשתף?' : 'בחר אמצעי שיתוף'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors text-white"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-5">

          {/* ===== STEP 1: What to share ===== */}
          {step === 1 && (
            <div className="flex flex-col gap-3">

              {/* Option 1: Share this product */}
              {product && (
                <button
                  onClick={() => selectTarget('product')}
                  className="flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-cyan-400 hover:shadow-md transition-all text-right w-full group"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 relative">
                    {productImage ? (
                      <Image src={productImage} alt={product.name} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400"><ProductIcon /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 text-sm group-hover:text-cyan-700 transition-colors">שתף מוצר זה</div>
                    <div className="text-xs text-gray-500 truncate">{product.name}</div>
                    {product.price && (
                      <div className="text-xs font-semibold mt-0.5" style={{ color: '#0891b2' }}>
                        ₪{product.price.toLocaleString('he-IL')}
                      </div>
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #1e3a8a, #0891b2)' }}>
                    <svg className="w-4 h-4 text-white rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </div>
                </button>
              )}

              {/* Option 2: Share a specific store */}
              {tenants.length > 0 && (
                <div className="rounded-2xl border-2 border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 flex items-center gap-3 bg-gray-50">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a, #0891b2)' }}>
                      <StoreIcon />
                    </div>
                    <span className="font-bold text-gray-900 text-sm">שתף חנות ספציפית</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {tenants.map((tenant) => (
                      <button
                        key={tenant._id}
                        onClick={() => selectTarget('store', tenant)}
                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-cyan-50 transition-colors text-right border-t border-gray-50"
                      >
                        {tenant.logo ? (
                          <Image src={tenant.logo} alt={tenant.name} width={32} height={32} className="rounded-full shrink-0" unoptimized />
                        ) : (
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                            style={{ background: tenant.primaryColor || '#1e3a8a' }}
                          >
                            {tenant.name?.[0]}
                          </div>
                        )}
                        <span className="text-sm text-gray-700 font-medium flex-1 truncate">{tenant.name}</span>
                        <svg className="w-4 h-4 text-gray-400 rotate-180 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Option 3: Share the whole marketplace */}
              <button
                onClick={() => selectTarget('marketplace')}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-cyan-400 hover:shadow-md transition-all text-right w-full group"
              >
                <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.1), rgba(8,145,178,0.1))' }}>
                  <MarketplaceIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 text-sm group-hover:text-cyan-700 transition-colors">שתף את כל המרקטפלייס</div>
                  <div className="text-xs text-gray-500">כל המוצרים מכל החנויות</div>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #1e3a8a, #0891b2)' }}>
                  <svg className="w-4 h-4 text-white rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </div>
              </button>

              {/* Coupon code display for agents */}
              {isAgent && couponCode && (
                <div 
                  className="mt-2 p-3 rounded-xl text-center"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(30,58,138,0.06), rgba(8,145,178,0.06))',
                    border: '1px solid rgba(8,145,178,0.15)'
                  }}
                >
                  <p className="text-xs text-gray-500 mb-1">קוד הקופון שלך יצורף אוטומטית לכל שיתוף</p>
                  <p className="font-bold text-base" style={{ color: '#1e3a8a' }}>{couponCode}</p>
                </div>
              )}
            </div>
          )}

          {/* ===== STEP 2: How to share ===== */}
          {step === 2 && (
            <div className="flex flex-col gap-5">

              {/* Selected target summary */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                {shareTarget === 'product' && product && (
                  <>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
                      {productImage ? (
                        <Image src={productImage} alt={product.name} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400"><ProductIcon /></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-gray-500">משתף מוצר</div>
                      <div className="text-sm font-semibold text-gray-900 truncate">{product.name}</div>
                    </div>
                  </>
                )}
                {shareTarget === 'store' && selectedStore && (
                  <>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{ background: selectedStore.primaryColor || '#1e3a8a' }}>
                      {selectedStore.logo ? (
                        <Image src={selectedStore.logo} alt={selectedStore.name} width={40} height={40} className="rounded-full" unoptimized />
                      ) : selectedStore.name?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-gray-500">משתף חנות</div>
                      <div className="text-sm font-semibold text-gray-900 truncate">{selectedStore.name}</div>
                    </div>
                  </>
                )}
                {shareTarget === 'marketplace' && (
                  <>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #1e3a8a, #0891b2)' }}>
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-gray-500">משתף</div>
                      <div className="text-sm font-semibold text-gray-900">כל המרקטפלייס</div>
                    </div>
                  </>
                )}
              </div>

              {/* Main 3 networks */}
              <div>
                <p className="text-xs text-gray-500 font-medium mb-3">רשתות מובילות</p>
                <div className="flex justify-center gap-5">
                  {mainNetworks.map((net) => (
                    <button
                      key={net.name}
                      onClick={net.onClick}
                      className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition-all hover:scale-105 active:scale-95"
                    >
                      <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg" style={{ background: net.bg }}>
                        {net.icon}
                      </div>
                      <span className="text-xs font-medium text-gray-700">{net.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* More networks */}
              <div>
                <p className="text-xs text-gray-500 font-medium mb-3">עוד רשתות</p>
                <div className="grid grid-cols-4 gap-3">
                  {moreNetworks.map((net) => (
                    <button
                      key={net.name}
                      onClick={net.onClick}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50 transition-all hover:scale-105 active:scale-95"
                    >
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center shadow-md"
                        style={{ background: net.bg }}
                      >
                        {net.icon}
                      </div>
                      <span className="text-[10px] font-medium text-gray-600">{net.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Utility: Copy link, QR, Native share */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-center gap-4">
                  {utilityActions.map((action) => (
                    <button
                      key={action.name}
                      onClick={action.onClick}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50 transition-all hover:scale-105 active:scale-95"
                    >
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center shadow-md text-white"
                        style={{ background: action.bg }}
                      >
                        {action.icon}
                      </div>
                      <span className="text-[10px] font-medium text-gray-600 whitespace-nowrap">{action.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* QR Code */}
              {showQR && (
                <div className="border-t border-gray-100 pt-4 flex flex-col items-center gap-3">
                  <p className="text-sm text-gray-600 font-medium">סרוק את הקוד</p>
                  <div className="bg-white p-4 rounded-2xl shadow-inner border border-gray-200">
                    {/* QR via Google Charts API */}
                    <Image
                      src={`https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(getShareUrl())}&choe=UTF-8`}
                      alt="QR Code"
                      width={200}
                      height={200}
                      className="rounded-lg"
                      unoptimized
                    />
                  </div>
                  <p className="text-xs text-gray-400 text-center max-w-[250px]">
                    שמור את הקוד או שתף אותו כתמונה לשיווק פיזי
                  </p>
                </div>
              )}

              {/* Coupon reminder for agents */}
              {isAgent && couponCode && (
                <div 
                  className="p-3 rounded-xl text-center"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(30,58,138,0.06), rgba(8,145,178,0.06))',
                    border: '1px solid rgba(8,145,178,0.15)'
                  }}
                >
                  <p className="text-xs text-gray-500 mb-1">קוד הקופון שלך מצורף לכל שיתוף</p>
                  <p className="font-bold text-base" style={{ color: '#1e3a8a' }}>{couponCode}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Animation Style */}
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
