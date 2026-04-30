'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

const DEFAULT_TEMPLATE = `הזדמנות מיוחדת!

הצטרפו לרכישה קבוצתית ותיהנו ממחירים מטורפים!

לרכישה: {link}

קוד קופון להנחה: {coupon}

נלחמים ביוקר המחיה - ורוכשים ביחד!`;

function buildShareMessage(asset, { coupon, link, discountPercent }) {
  const template = (asset.messageTemplate ? asset.messageTemplate.trim() : '') || DEFAULT_TEMPLATE;

  let message = template
    .replaceAll('{coupon}', coupon || '')
    .replaceAll('{link}', link || '')
    .replaceAll('{discount}', discountPercent != null ? `${discountPercent}%` : '');

  const normalizedLink = typeof link === 'string' ? link.trim() : '';
  if (asset?.type === 'video' && normalizedLink && !message.includes(normalizedLink)) {
    const prefix = `לצפייה בסרטון: ${normalizedLink}`;
    message = `${prefix}\n\n${message.trim()}`;
  }

  return message;
}

// Generate video thumbnail from Cloudinary video URL
function getVideoThumbnail(videoUrl) {
  if (!videoUrl) return null;
  
  // Check if it's a Cloudinary URL
  if (videoUrl.includes('cloudinary.com') && videoUrl.includes('/video/upload/')) {
    // Transform video URL to thumbnail
    // From: .../video/upload/v123/file.mp4
    // To: .../video/upload/so_0,w_600,h_400,c_fill/v123/file.jpg
    return videoUrl
      .replace('/video/upload/', '/video/upload/so_0,w_600,h_400,c_fill,f_jpg/')
      .replace(/\.(mp4|mov|avi|webm|mkv)$/i, '.jpg');
  }
  
  return null;
}

export default function AgentMarketingLibrary({
  agentName,
  referralLink,
  couponCode,
  discountPercent,
  commissionPercent,
  assets,
  baseUrl,
}) {
  const [copyStatus, setCopyStatus] = useState(null);
  const [selectedAssetId, setSelectedAssetId] = useState(assets?.[0]?.id || null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  const selectedAsset = useMemo(() => assets?.find((asset) => asset.id === selectedAssetId) || assets?.[0] || null, [
    assets,
    selectedAssetId,
  ]);

  const normalizedBaseUrl = useMemo(() => {
    if (typeof baseUrl === 'string' && baseUrl.trim()) {
      return baseUrl.replace(/\/$/, '');
    }
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  }, [baseUrl]);

  const shareLink = useMemo(() => {
    if (!selectedAsset) {
      return referralLink || '';
    }

    if (selectedAsset.type === 'video' && normalizedBaseUrl) {
      const videoUrl = `${normalizedBaseUrl}/v/${selectedAsset.id}`;
      return couponCode ? `${videoUrl}?ref=${encodeURIComponent(couponCode)}` : videoUrl;
    }

    return referralLink || '';
  }, [couponCode, normalizedBaseUrl, referralLink, selectedAsset]);

  const sharePayload = useMemo(
    () => ({
      coupon: couponCode || '',
      link: shareLink,
      discountPercent: discountPercent ?? 0,
    }),
    [couponCode, discountPercent, shareLink],
  );

  async function handleCopyText(text) {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopyStatus('text');
        setTimeout(() => setCopyStatus(null), 2000);
      } else {
        throw new Error('clipboard unavailable');
      }
    } catch (error) {
      console.error('copy failed', error);
      setCopyStatus('error');
    }
  }

  async function handleCopyLink() {
    if (!shareLink) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareLink);
        setCopyStatus('link');
        setTimeout(() => setCopyStatus(null), 2000);
      } else {
        throw new Error('clipboard unavailable');
      }
    } catch (error) {
      console.error('copy link failed', error);
      setCopyStatus('error');
    }
  }

  function handleDownloadMedia(asset) {
    if (!asset?.mediaUrl) return;
    const link = document.createElement('a');
    link.href = asset.mediaUrl;
    link.download = asset.title || 'marketing_asset';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const preview = selectedAsset ? buildShareMessage(selectedAsset, sharePayload) : '';

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/agent" className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="חזרה לדשבורד">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <h1
              className="text-3xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              תוכן שיווקי מוכן לשיתוף
            </h1>
          </div>
          <p className="text-gray-600 text-sm">
            שלום {agentName || 'סוכן'}! כאן תמצא ספריית תוכן להעלאה לרשתות החברתיות. כל שיתוף משתמש באופן
            אוטומטי בלינק ובקופון שלך.
          </p>
        </header>

        <section
          className="rounded-xl mb-6 p-4 sm:p-5"
          style={{
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            boxShadow: '0 4px 20px rgba(8, 145, 178, 0.12)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#1e3a8a' }}>
                פרטי שיתוף שלך
              </h2>
              <p className="text-sm text-gray-600">
                כל הודעה שנעתיק עבורך תכלול את הלינק האישי ואת קוד הקופון {couponCode || ''} לקבלת {discountPercent ?? 0}%
                הנחה.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => handleCopyLink()}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
              >
                {copyStatus === 'link' ? '[v] הלינק הועתק' : 'העתק לינק לשיתוף'}
              </button>
              <a
                href={shareLink || referralLink || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white text-center"
                style={{ background: 'linear-gradient(135deg, #0891b2 0%, #1e3a8a 100%)' }}
              >
                פתח לינק
              </a>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <aside className="lg:col-span-1">
            <div className="space-y-3">
              {assets?.map((asset) => {
                const createdLabel = asset.createdAt ? new Date(asset.createdAt).toLocaleDateString('he-IL') : '';
                return (
                <button
                  key={asset.id}
                  onClick={() => setSelectedAssetId(asset.id)}
                  className={`w-full text-right p-4 rounded-xl border-2 transition-all ${
                    selectedAssetId === asset.id ? 'border-transparent text-white shadow-lg' : 'border-gray-200'
                  }`}
                  style={
                    selectedAssetId === asset.id
                      ? {
                          background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                        }
                      : {
                          backgroundColor: '#ffffff',
                        }
                  }
                >
                  <p className="text-sm font-semibold mb-1">{asset.title}</p>
                  <p className="text-xs opacity-75">
                    {asset.type === 'video' ? 'וידאו' : 'תמונה'}{createdLabel ? ` · ${createdLabel}` : ''}
                  </p>
                </button>
                );
              })}
            </div>
          </aside>

          <section className="lg:col-span-2">
            {selectedAsset ? (
              <div
                className="rounded-xl p-5"
                style={{
                  border: '2px solid transparent',
                  backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                  boxShadow: '0 8px 24px rgba(8, 145, 178, 0.18)',
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    {/* Video/Image Preview - Clickable for video */}
                    <a 
                      href={selectedAsset.type === 'video' ? selectedAsset.mediaUrl : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block rounded-xl overflow-hidden bg-black aspect-video mb-3 relative ${selectedAsset.type === 'video' ? 'cursor-pointer group' : ''}`}
                      onClick={(e) => selectedAsset.type !== 'video' && e.preventDefault()}
                    >
                      {selectedAsset.type === 'video' ? (
                        <>
                          {/* Video thumbnail from Cloudinary */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getVideoThumbnail(selectedAsset.mediaUrl) || selectedAsset.mediaUrl}
                            alt={selectedAsset.title}
                            className="w-full h-full object-cover pointer-events-none"
                            onError={(e) => {
                              // Fallback to video element if thumbnail fails
                              e.target.style.display = 'none';
                            }}
                          />
                          {/* Play overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-all">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 mr-[-4px]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          </div>
                          <p className="absolute bottom-2 left-0 right-0 text-center text-white text-xs sm:text-sm font-medium drop-shadow-lg">
                            לחץ לצפייה בסרטון
                          </p>
                        </>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={selectedAsset.mediaUrl}
                          alt={selectedAsset.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </a>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {selectedAsset.type === 'video' && (
                        <a
                          href={selectedAsset.mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white text-center flex items-center justify-center gap-2"
                          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                          צפה בסרטון
                        </a>
                      )}
                      <button
                        onClick={() => handleDownloadMedia(selectedAsset)}
                        className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #0891b2 0%, #1e3a8a 100%)' }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        הורד קובץ
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div>
                      <h3 className="text-xl font-bold mb-2" style={{ color: '#1e3a8a' }}>
                        טקסט לשיתוף
                      </h3>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 h-48 overflow-y-auto text-sm leading-relaxed">
                        {preview.split('\n').map((line, index) => (
                          <p key={index}>{line}</p>
                        ))}
                      </div>
                    </div>

                    {/* Copy Text Button */}
                    <button
                      onClick={() => handleCopyText(preview)}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold text-white mb-3"
                      style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                    >
                      {copyStatus === 'text' ? '[v] הטקסט הועתק' : 'העתק טקסט לשיתוף'}
                    </button>

                    {/* Social Share Buttons */}
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">שתף ברשתות החברתיות:</p>
                      <div className="grid grid-cols-4 gap-2">
                        {/* WhatsApp */}
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(preview)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center p-3 rounded-lg transition-all hover:scale-105"
                          style={{ backgroundColor: '#25D366' }}
                        >
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          <span className="text-white text-xs mt-1">WhatsApp</span>
                        </a>

                        {/* Telegram */}
                        <a
                          href={`https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(preview)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center p-3 rounded-lg transition-all hover:scale-105"
                          style={{ backgroundColor: '#0088cc' }}
                        >
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                          </svg>
                          <span className="text-white text-xs mt-1">Telegram</span>
                        </a>

                        {/* Facebook */}
                        <a
                          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}&quote=${encodeURIComponent(preview)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center p-3 rounded-lg transition-all hover:scale-105"
                          style={{ backgroundColor: '#1877F2' }}
                        >
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          <span className="text-white text-xs mt-1">Facebook</span>
                        </a>

                        {/* Twitter/X */}
                        <a
                          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(preview)}&url=${encodeURIComponent(shareLink)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center p-3 rounded-lg transition-all hover:scale-105"
                          style={{ backgroundColor: '#000000' }}
                        >
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                          <span className="text-white text-xs mt-1">X</span>
                        </a>

                        {/* LinkedIn */}
                        <a
                          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center p-3 rounded-lg transition-all hover:scale-105"
                          style={{ backgroundColor: '#0A66C2' }}
                        >
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          <span className="text-white text-xs mt-1">LinkedIn</span>
                        </a>

                        {/* Email */}
                        <a
                          href={`mailto:?subject=${encodeURIComponent('הזדמנות מיוחדת ב-VIPO!')}&body=${encodeURIComponent(preview)}`}
                          className="flex flex-col items-center justify-center p-3 rounded-lg transition-all hover:scale-105"
                          style={{ backgroundColor: '#EA4335' }}
                        >
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="text-white text-xs mt-1">אימייל</span>
                        </a>

                        {/* SMS */}
                        <a
                          href={`sms:?body=${encodeURIComponent(preview)}`}
                          className="flex flex-col items-center justify-center p-3 rounded-lg transition-all hover:scale-105"
                          style={{ backgroundColor: '#34B7F1' }}
                        >
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span className="text-white text-xs mt-1">SMS</span>
                        </a>

                        {/* Copy Link */}
                        <button
                          onClick={() => handleCopyLink()}
                          className="flex flex-col items-center justify-center p-3 rounded-lg transition-all hover:scale-105"
                          style={{ backgroundColor: '#6B7280' }}
                        >
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <span className="text-white text-xs mt-1">{copyStatus === 'link' ? '[v] הועתק' : 'העתק לינק'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-300 p-10 text-center text-gray-500">
                טרם הועלו תכנים שיווקיים.
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Video Modal */}
      {videoModalOpen && selectedAsset?.type === 'video' && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setVideoModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setVideoModalOpen(false)}
              className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-all"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Video Player */}
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              key={selectedAsset.id}
              src={selectedAsset.mediaUrl}
              poster={getVideoThumbnail(selectedAsset.mediaUrl)}
              controls
              autoPlay
              playsInline
              webkit-playsinline="true"
              preload="auto"
              className="w-full aspect-video bg-black"
              style={{ maxHeight: '80vh' }}
            >
              <source src={selectedAsset.mediaUrl} type="video/mp4" />
              הדפדפן שלך לא תומך בנגן וידאו
            </video>
            
            {/* Video title */}
            <div className="p-4 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0 pointer-events-none">
              <h3 className="text-white font-semibold text-lg">{selectedAsset.title}</h3>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
