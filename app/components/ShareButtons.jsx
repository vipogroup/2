'use client';

import { useState } from 'react';
import { getProductPublicPath } from '@/lib/stainlessSeoCategories';

/**
 * ShareButtons - Unified sharing component for agents
 * Shows 3 main social networks + "More" button that expands to show all options
 * 
 * @param {Object} product - Product object with name, price, description, image
 * @param {string} couponCode - Agent's coupon code
 * @param {string} referralLink - Optional custom referral link
 * @param {Function} onShare - Optional callback after sharing
 */
export default function ShareButtons({ product, couponCode, referralLink, onShare }) {
  const [copied, setCopied] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const getProductShareUrl = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    if (referralLink) return referralLink;
    const productPath = getProductPublicPath(product);
    const refParam = couponCode ? `?ref=${encodeURIComponent(couponCode)}` : '';
    return `${baseUrl}${productPath}${refParam}`;
  };

  const buildShareText = () => {
    const price = product?.price?.toLocaleString('he-IL') || product?.price;
    const lines = [
      `*${product?.name}*`,
      '',
      product?.description ? product.description.substring(0, 100) : '',
      '',
      `מחיר: ₪${price}`,
    ];

    if (couponCode) {
      lines.push(`קוד קופון: ${couponCode}`);
    }

    const productUrl = getProductShareUrl();
    if (productUrl) {
      lines.push('', `לרכישה: ${productUrl}`);
    }

    return lines.filter(Boolean).join('\n');
  };

  // WhatsApp - sends link only for better preview with image
  const shareToWhatsApp = () => {
    const productUrl = getProductShareUrl();
    const price = product?.price?.toLocaleString('he-IL') || product?.price;
    const text = couponCode 
      ? `*${product?.name}*\nמחיר: ₪${price}\nקוד קופון: ${couponCode}\n\n${productUrl}`
      : `*${product?.name}*\nמחיר: ₪${price}\n\n${productUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
    onShare?.();
  };

  const shareToFacebook = () => {
    const shareUrl = getProductShareUrl();
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    onShare?.();
  };

  const shareToTelegram = () => {
    const text = buildShareText();
    const shareUrl = getProductShareUrl();
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank');
    onShare?.();
  };

  const shareToTwitter = () => {
    const price = product?.price?.toLocaleString('he-IL') || product?.price;
    const text = `${product?.name} - ₪${price}${couponCode ? ` | קוד קופון: ${couponCode}` : ''}`;
    const shareUrl = getProductShareUrl();
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    onShare?.();
  };

  const shareViaEmail = () => {
    const text = buildShareText().replace(/\*/g, '');
    const subject = `בדוק את ${product?.name}`;
    const body = `שלום,\n\n${text}\n\nבברכה`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    onShare?.();
  };

  const shareViaSMS = () => {
    const text = buildShareText().replace(/\*/g, '');
    const smsUrl = `sms:?body=${encodeURIComponent(text)}`;
    window.location.href = smsUrl;
    onShare?.();
  };

  const shareToViber = () => {
    const text = buildShareText();
    const shareUrl = getProductShareUrl();
    const viberUrl = `viber://forward?text=${encodeURIComponent(text + '\n' + shareUrl)}`;
    window.location.href = viberUrl;
    onShare?.();
  };

  const shareToInstagram = () => {
    // Instagram doesn't have direct share API, copy link instead
    copyLink();
    alert('הלינק הועתק! פתח את Instagram ושתף בסטורי או בהודעה');
  };

  const copyLink = async () => {
    try {
      const url = getProductShareUrl();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        prompt('העתק את הלינק:', url);
      }
    } catch (err) {
      prompt('העתק את הלינק:', getProductShareUrl());
    }
  };

  // Main 3 networks for Israel
  const mainNetworks = [
    {
      name: 'WhatsApp',
      onClick: shareToWhatsApp,
      bgColor: 'bg-green-500',
      icon: (
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      ),
    },
    {
      name: 'Facebook',
      onClick: shareToFacebook,
      bgColor: 'bg-blue-600',
      icon: (
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      name: 'Telegram',
      onClick: shareToTelegram,
      bgColor: 'bg-sky-500',
      icon: (
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
    },
  ];

  // Additional networks
  const moreNetworks = [
    {
      name: 'X',
      onClick: shareToTwitter,
      bgColor: 'bg-black',
      icon: (
        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
    },
    {
      name: 'אימייל',
      onClick: shareViaEmail,
      bgColor: '',
      bgStyle: { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' },
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'SMS',
      onClick: shareViaSMS,
      bgColor: 'bg-green-600',
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      name: 'Viber',
      onClick: shareToViber,
      bgColor: 'bg-cyan-600',
      icon: (
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.398.002C9.473.028 5.331.344 3.014 2.467 1.294 4.177.518 6.77.506 10.2l-.006.239v.242c.012 3.552.836 6.084 2.575 7.78 1.268 1.248 2.992 1.942 5.212 2.14-.002.457-.005.914-.007 1.372-.014 1.104.633 1.96 1.507 2.026.674.051 1.322-.31 1.745-.767l1.62-1.904c3.037-.025 5.388-.47 7.057-1.327 2.135-1.097 3.254-2.9 3.58-5.792.109-1.034.187-2.12.21-3.166v-.5c-.019-1.07-.09-2.187-.196-3.248-.318-2.836-1.397-4.625-3.484-5.755C18.586.467 15.935.038 12.347.004l-.95-.002zM11.398 2c3.405.035 5.637.419 6.988 1.14 1.598.842 2.46 2.198 2.726 4.548.1.984.168 2.04.185 3.058v.458c-.02.985-.094 2.018-.197 2.993-.277 2.463-1.163 3.818-2.893 4.707-1.428.733-3.538 1.126-6.322 1.156l-.346.005-.266.32-1.398 1.642c-.09.102-.174.16-.234.164-.114.008-.197-.09-.197-.365l.002-.515.009-1.763.004-.715-.713-.077c-1.894-.202-3.315-.761-4.333-1.758-1.384-1.35-2.062-3.529-2.072-6.67l.005-.223.001-.007c.01-2.907.642-5.103 2.063-6.516C6.152 2.348 9.612 2.023 11.398 2zm.613 3.28c-.12 0-.233.049-.316.134a.447.447 0 00-.128.32c.006.12.056.23.142.312.087.08.2.124.316.12 1.422.026 2.725.54 3.727 1.547.995 1.006 1.517 2.312 1.543 3.736a.45.45 0 00.134.312.436.436 0 00.317.126.449.449 0 00.316-.138.449.449 0 00.12-.321 6.472 6.472 0 00-1.892-4.544 6.461 6.461 0 00-4.537-1.904h-.242zm.04 1.655a.438.438 0 00-.308.134.455.455 0 00-.127.32.45.45 0 00.127.315.432.432 0 00.303.132c.9.029 1.734.371 2.383 1.024.647.652.988 1.487 1.02 2.39a.443.443 0 00.446.434h.012a.45.45 0 00.312-.138.446.446 0 00.12-.32 4.75 4.75 0 00-1.375-3.217 4.746 4.746 0 00-3.21-1.373.451.451 0 00-.303.1zm.049 1.69a.442.442 0 00-.305.133.452.452 0 00-.127.316.45.45 0 00.44.453c.357.028.69.175.95.435.26.26.406.595.434.952a.45.45 0 00.453.44.45.45 0 00.311-.138.446.446 0 00.12-.32 2.968 2.968 0 00-.854-1.873 2.967 2.967 0 00-1.873-.855.529.529 0 00-.16.011.473.473 0 00-.089.022.455.455 0 00-.3.424zm-3.06.84c-.198-.003-.399.07-.554.206l-.452.378c-.352.295-.54.734-.538 1.183.036 1.143.413 2.533 1.47 3.987 1.342 1.843 3.27 3.267 5.544 3.888.556.152 1.141.09 1.613-.233l.479-.33a.994.994 0 00.384-.55.99.99 0 00-.062-.671l-.672-1.404a.973.973 0 00-.59-.5.988.988 0 00-.768.077l-.568.317a.205.205 0 01-.18.014c-.56-.225-1.382-.73-1.963-1.317-.581-.588-1.076-1.422-1.303-1.994a.212.212 0 01.012-.185l.301-.534a.993.993 0 00.09-.77.984.984 0 00-.483-.6l-1.332-.724a.983.983 0 00-.428-.138z"/>
        </svg>
      ),
    },
    {
      name: 'Instagram',
      onClick: shareToInstagram,
      bgColor: '',
      bgStyle: { background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' },
      icon: (
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
    },
    {
      name: copied ? 'הועתק!' : 'העתק לינק',
      onClick: copyLink,
      bgColor: copied ? 'bg-green-500' : 'bg-gray-300',
      icon: copied ? (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 4px 20px rgba(8, 145, 178, 0.1)' }}>
      <h3 className="font-bold text-gray-900 mb-4 text-center">שתף לרשתות חברתיות</h3>
      
      {/* Main 3 Networks */}
      <div className="flex justify-center gap-6 mb-4">
        {mainNetworks.map((network) => (
          <button
            key={network.name}
            onClick={network.onClick}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-all hover:scale-105"
          >
            <div 
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${network.bgColor}`}
              style={network.bgStyle}
            >
              {network.icon}
            </div>
            <span className="text-xs font-medium text-gray-700">{network.name}</span>
          </button>
        ))}
      </div>

      {/* More Networks Button */}
      <button
        onClick={() => setShowMore(!showMore)}
        className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-gray-200 text-gray-600 font-medium text-sm hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
      >
        <span>{showMore ? 'פחות רשתות' : 'עוד רשתות...'}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${showMore ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Additional Networks (Expandable) */}
      {showMore && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-4">
            {moreNetworks.map((network) => (
              <button
                key={network.name}
                onClick={network.onClick}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-all hover:scale-105"
              >
                <div 
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${network.bgColor}`}
                  style={network.bgStyle}
                >
                  {network.icon}
                </div>
                <span className="text-xs font-medium text-gray-700">{network.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Coupon Code Display */}
      {couponCode && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div 
            className="p-3 rounded-xl text-center"
            style={{ 
              background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.08) 0%, rgba(8, 145, 178, 0.08) 100%)', 
              border: '1px solid rgba(8, 145, 178, 0.2)' 
            }}
          >
            <p className="text-xs text-gray-600 mb-1">קוד הקופון שלך כלול בכל שיתוף:</p>
            <p className="font-bold text-lg" style={{ color: '#1e3a8a' }}>{couponCode}</p>
          </div>
        </div>
      )}
    </div>
  );
}
