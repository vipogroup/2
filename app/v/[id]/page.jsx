import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/db';

import ReferralCookieSetter from './ReferralCookieSetter';
import VideoPlayer from './VideoPlayer';

export const dynamic = 'force-dynamic';

const FALLBACK_IMAGE = '/icons/512.png';
const FALLBACK_TITLE = 'תוכן וידאו מ-VIPO';
const FALLBACK_DESCRIPTION = 'צפו בסרטון מיוחד והצטרפו לרכישה קבוצתית עם קוד קופון ייחודי.';

function resolveRequestContext() {
  const hdrs = headers();
  const proto =
    hdrs.get('x-forwarded-proto') ||
    hdrs.get('x-forwarded-protocol') ||
    hdrs.get('x-url-scheme') ||
    'http';
  const host = hdrs.get('x-forwarded-host') || hdrs.get('host');

  const fallbackHost =
    process.env.PUBLIC_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_HOME_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3001';

  const originCandidate = host && host !== '0.0.0.0' && host !== '::1' ? `${proto}://${host}` : fallbackHost;
  const origin = originCandidate.replace(/\/$/, '');

  return {
    origin,
    isSecure: origin.startsWith('https://'),
    proto,
  };
}

function getVideoThumbnail(url) {
  if (!url) return null;
  if (url.includes('cloudinary.com') && url.includes('/video/upload/')) {
    return url
      .replace('/video/upload/', '/video/upload/so_0,w_1200,h_630,c_fill,f_jpg/')
      .replace(/\.(mp4|mov|avi|webm|mkv)$/i, '.jpg');
  }
  return null;
}

function extractParamValue(param) {
  if (!param) return '';
  if (Array.isArray(param)) {
    return param[0] ?? '';
  }
  return param;
}

function normalizeReferralCode(value) {
  if (!value) return '';
  const trimmed = value.toString().trim();
  // Remove trailing punctuation that might arrive from copy/paste in messaging apps
  const withoutTrailing = trimmed.replace(/[?&#/\\]+$/g, '');
  return withoutTrailing;
}

async function fetchMarketingAsset(id) {
  try {
    const db = await getDb();
    const objectId = new ObjectId(id);
    const doc = await db.collection('marketing_assets').findOne({ _id: objectId });
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      title: doc.title ?? FALLBACK_TITLE,
      type: doc.type ?? 'video',
      mediaUrl: doc.mediaUrl ?? '',
      thumbnailUrl: doc.thumbnailUrl ?? null,
      messageTemplate: doc.messageTemplate ?? '',
      createdAt: doc.createdAt ? new Date(doc.createdAt) : null,
    };
  } catch (error) {
    console.error('[VIDEO_PAGE] Failed to fetch marketing asset', error);
    return null;
  }
}

async function findAgentByCode(code) {
  if (!code) return null;
  try {
    const db = await getDb();
    const users = db.collection('users');

    let agent = await users.findOne({ couponCode: code, role: 'agent' });
    if (!agent) {
      agent = await users.findOne({ referralId: code, role: 'agent' });
    }
    if (!agent) {
      try {
        const objectId = new ObjectId(code);
        agent = await users.findOne({ _id: objectId, role: 'agent' });
      } catch {
        // ignore invalid ObjectId
      }
    }
    return agent;
  } catch (error) {
    console.error('[VIDEO_PAGE] Failed to resolve agent by code', error);
    return null;
  }
}

export async function generateMetadata({ params, searchParams }) {
  const { origin } = resolveRequestContext();
  const id = await params?.id;
  const rawRef = extractParamValue(searchParams?.ref);
  const ref = normalizeReferralCode(rawRef);

  // Skip DB calls during build
  const asset = null; // id ? await fetchMarketingAsset(id) : null;
  if (!asset) {
    return {
      title: FALLBACK_TITLE,
      description: FALLBACK_DESCRIPTION,
      openGraph: {
        title: FALLBACK_TITLE,
        description: FALLBACK_DESCRIPTION,
        images: [{ url: `${origin}${FALLBACK_IMAGE}` }],
      },
    };
  }

  const title = asset.title || FALLBACK_TITLE;
  const description = ref
    ? `השתמשו בקוד הקופון ${ref} לקבלת ההטבה.`
    : FALLBACK_DESCRIPTION;
  const thumbnail = asset.thumbnailUrl || getVideoThumbnail(asset.mediaUrl) || `${origin}${FALLBACK_IMAGE}`;
  const url = ref ? `${origin}/v/${asset.id}?ref=${encodeURIComponent(ref)}` : `${origin}/v/${asset.id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: asset.type === 'video' ? 'video.other' : 'website',
      images: [
        {
          url: thumbnail.startsWith('http') ? thumbnail : `${origin}${thumbnail}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      videos:
        asset.type === 'video' && asset.mediaUrl
          ? [
              {
                url: asset.mediaUrl,
              },
            ]
          : undefined,
    },
    twitter: {
      card: asset.type === 'video' ? 'player' : 'summary_large_image',
      title,
      description,
      images: [thumbnail.startsWith('http') ? thumbnail : `${origin}${thumbnail}`],
    },
  };
}

export default async function VideoSharePage({ params, searchParams }) {
  const id = await params?.id;
  const rawRef = extractParamValue(searchParams?.ref);
  const ref = normalizeReferralCode(rawRef);

  if (!id) {
    notFound();
  }

  const asset = await fetchMarketingAsset(id);
  if (!asset) {
    notFound();
  }

  const { origin } = resolveRequestContext();

  const agent = ref ? await findAgentByCode(ref) : null;
  const couponCode = normalizeReferralCode(ref || agent?.couponCode || agent?.referralId || '');
  const discountPercent = agent?.discountPercent ?? null;
  const agentTenantId = agent?.tenantId?.toString() || null;

  const thumbnail = asset.thumbnailUrl || getVideoThumbnail(asset.mediaUrl);
  const purchaseUrl = couponCode ? `/r/${encodeURIComponent(couponCode)}` : '/products';
  const shareUrl = `${origin}/v/${asset.id}${couponCode ? `?ref=${encodeURIComponent(couponCode)}` : ''}`;
  const hasVideo = asset.type === 'video' && asset.mediaUrl;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-sky-50 to-white">
      {couponCode ? <ReferralCookieSetter couponCode={couponCode} tenantId={agentTenantId} /> : null}
      <div className="max-w-5xl mx-auto px-4 py-10">
        <header className="text-center mb-10">
          <p className="text-sm text-cyan-600 font-semibold tracking-wide mb-2">VIPO</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            {asset.title || 'תוכן וידאו שיווקי'}
          </h1>
          {couponCode ? (
            <p className="text-lg text-slate-700">
              השתמשו בקוד הקופון <span className="font-semibold text-cyan-700">{couponCode}</span>
              {discountPercent ? ` לקבלת ${discountPercent}% הנחה` : ''}.
            </p>
          ) : (
            <p className="text-lg text-slate-700">צפו בסרטון והצטרפו לרכישה הקבוצתית.</p>
          )}
        </header>

        <section className="bg-white/90 backdrop-blur shadow-xl rounded-3xl overflow-hidden border border-slate-100">
          <div className="aspect-video bg-slate-900">
            {hasVideo ? (
              <VideoPlayer mediaUrl={asset.mediaUrl} poster={thumbnail ?? undefined} title={asset.title || ''} />
            ) : thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnail} alt={asset.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-xl">
                אין תצוגה זמינה
              </div>
            )}
          </div>

          <div className="px-6 py-8 space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">מידע חשוב</h2>
              <ul className="space-y-2 text-slate-700 text-sm leading-relaxed">
                {couponCode ? (
                  <li>קוד הקופון האישי שלך: <span className="font-semibold">{couponCode}</span></li>
                ) : null}
                <li>
                  לינק לשיתוף: <span className="font-mono text-xs break-all">{shareUrl}</span>
                </li>
                {hasVideo ? (
                  <li>
                    אם הווידאו אינו נטען, ניתן לפתוח אותו ישירות{' '}
                    <a
                      href={asset.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-cyan-700 underline"
                    >
                      בקישור הבא
                    </a>
                    .
                  </li>
                ) : null}
                {asset.createdAt ? (
                  <li>עודכן לאחרונה: {asset.createdAt.toLocaleDateString('he-IL')}</li>
                ) : null}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                href={purchaseUrl}
                className="inline-flex items-center justify-center px-6 py-3 rounded-full text-white font-semibold shadow-lg shadow-cyan-500/30"
                style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
              >
                לרכישה עם ההנחה
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center justify-center px-5 py-3 rounded-full text-cyan-700 font-semibold border border-cyan-200"
              >
                עיינו בכל המוצרים
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
