import { getCloudinary } from '@/lib/cloudinary';

function hasCloudinary() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

export function isCloudinaryConfigured() {
  return hasCloudinary();
}

/**
 * מעלה תמונה מ-URL זמני/ציבורי ל-Cloudinary כדי ש-Meta יוכלו למשוך את הקובץ ביציבות.
 */
export async function mirrorImageUrlToCloudinary(sourceUrl) {
  if (!sourceUrl || !hasCloudinary()) {
    throw new Error('cloudinary_not_configured_or_missing_source');
  }
  const cloudinary = getCloudinary();
  const result = await cloudinary.uploader.upload(sourceUrl, {
    folder: 'vipo-social-agent',
    resource_type: 'image',
    unique_filename: true,
    overwrite: false,
  });
  return result?.secure_url || '';
}

/**
 * תמונת מוצר שיווקית (DALL·E) — השראה מהשם/תיאור, לא צילום מדויק של המוצר.
 */
export async function generateProductHeroImageUrl({ openAiApiKey, product }) {
  const name = String(product?.name || 'מוצר').slice(0, 120);
  const desc = String(product?.description || '').replace(/\s+/g, ' ').trim().slice(0, 350);
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: [
        'Professional e-commerce hero image, clean neutral studio background, soft lighting,',
        'no text or logos on the image, no watermarks, photorealistic product-style shot.',
        'Concept loosely inspired by this catalog item (do not depict real trademarked packaging):',
        name + '.',
        desc ? `Mood/context: ${desc}.` : '',
        'Israeli marketplace VIPO — modern, trustworthy retail aesthetic.',
      ]
        .filter(Boolean)
        .join(' '),
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'url',
    }),
  });
  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload?.error?.message || 'openai_image_generation_failed');
  }
  const url = payload?.data?.[0]?.url;
  if (!url) throw new Error('openai_image_missing_url');
  return url;
}

export async function generateAffiliatePromoImageUrl({ openAiApiKey, siteUrl }) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: [
        'Bold social media graphic for affiliate partner recruitment, abstract geometric shapes,',
        'green and teal gradient hints, no text on image, no logos, professional B2B marketing vibe.',
        'Israeli tech marketplace theme, trustworthy and energetic.',
        `Context only (do not render as text on image): ${String(siteUrl).slice(0, 80)}.`,
      ].join(' '),
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'url',
    }),
  });
  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload?.error?.message || 'openai_image_generation_failed');
  }
  const url = payload?.data?.[0]?.url;
  if (!url) throw new Error('openai_image_missing_url');
  return url;
}

/**
 * מסנכרן מדיה לפוסט: מוצר → תמונת ברירת מחדל → יצירת AI + Cloudinary (אם הופעל).
 * קוראים פעמיים (IG ואז FB) כדי שתמונה שנוצרה ל-IG תשמש גם ל-FB.
 */
export async function resolveSocialPublishMedia({
  cfg,
  product,
  format,
  platform,
  postKind,
  baseMedia,
}) {
  let imageUrl = baseMedia?.imageUrl || '';
  let videoUrl = baseMedia?.videoUrl || '';
  let mediaType = baseMedia?.mediaType || 'none';

  if (videoUrl) {
    return { imageUrl, videoUrl, mediaType: 'video' };
  }

  const defaultUrl = cfg.defaultShareImageUrl || '';
  if (!imageUrl && defaultUrl) {
    imageUrl = defaultUrl;
    mediaType = 'image';
  }

  const igNeedsImage =
    platform === 'instagram_business' &&
    !videoUrl &&
    !imageUrl &&
    (format === 'story' || format === 'post');

  const fbProductWantsImage =
    platform === 'facebook_page' &&
    format === 'post' &&
    postKind === 'product' &&
    !imageUrl;

  const canGen = cfg.generateImages && cfg.openAiApiKey && hasCloudinary();

  const tryGenerate = async () => {
    if (!canGen || imageUrl) return;
    if (product && (igNeedsImage || fbProductWantsImage)) {
      const tempUrl = await generateProductHeroImageUrl({
        openAiApiKey: cfg.openAiApiKey,
        product,
      });
      imageUrl = await mirrorImageUrlToCloudinary(tempUrl);
      mediaType = 'image';
      return;
    }
    if (!product && postKind === 'affiliate_recruitment' && igNeedsImage) {
      const siteUrl =
        process.env.NEXT_PUBLIC_BASE_URL || process.env.PUBLIC_URL || 'https://vipo.co.il';
      const tempUrl = await generateAffiliatePromoImageUrl({
        openAiApiKey: cfg.openAiApiKey,
        siteUrl,
      });
      imageUrl = await mirrorImageUrlToCloudinary(tempUrl);
      mediaType = 'image';
    }
  };

  try {
    await tryGenerate();
  } catch {
    /* נשאר בלי תמונה — Meta עלולים לדחות פוסט IG ללא מדיה */
  }

  if (!imageUrl && defaultUrl) {
    imageUrl = defaultUrl;
    mediaType = 'image';
  }

  if (videoUrl) {
    return { imageUrl, videoUrl, mediaType: 'video' };
  }
  if (imageUrl) {
    return { imageUrl, videoUrl: '', mediaType: 'image' };
  }
  return { imageUrl: '', videoUrl: '', mediaType: 'none' };
}
