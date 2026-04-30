import Product from '@/models/Product';
import SocialPublishHistory from '@/models/SocialPublishHistory';
import { generateSocialCopy } from '@/lib/socialAgent/contentGenerator';
import {
  getPostInsights,
  publishFacebookPagePost,
  publishFacebookReel,
  publishInstagramBusinessPost,
  publishInstagramStory,
} from '@/lib/socialAgent/metaClient';

// Daily schedule slots (UTC hours, at most one activity per hour).
// Covers FB Page + IG Business throughout the day (no WhatsApp).
// ~IL daytime spread (UTC+2/3): tweak hours here if you want different peaks.
const DAILY_SLOTS_TEMPLATE = [
  { utcHour: 5,  kind: 'product',               format: 'post' },
  { utcHour: 8,  kind: 'product',               format: 'post' },
  { utcHour: 9,  kind: 'story',                 format: 'story' },
  { utcHour: 11, kind: 'product',               format: 'post' },
  { utcHour: 13, kind: 'product',               format: 'post' },
  { utcHour: 15, kind: 'product',               format: 'reel' },
  { utcHour: 17, kind: 'product',               format: 'post' },
  { utcHour: 18, kind: 'affiliate_recruitment', format: 'post' },
  { utcHour: 20, kind: 'product',               format: 'post' },
  { utcHour: 22, kind: 'product',               format: 'post' },
];

function getDailySlots(cfg) {
  const affRequested = Math.min(23, Math.max(0, Number(cfg.affiliatePostHourUtc) || 18));
  const used = new Set(
    DAILY_SLOTS_TEMPLATE.filter((s) => s.kind !== 'affiliate_recruitment').map((s) => s.utcHour),
  );
  let affH = affRequested;
  for (let i = 0; i < 24; i += 1) {
    if (!used.has(affH)) break;
    affH = (affH + 1) % 24;
  }
  return DAILY_SLOTS_TEMPLATE.map((s) =>
    s.kind === 'affiliate_recruitment' ? { ...s, utcHour: affH } : { ...s },
  );
}

function getScheduledSlotForNow(now, slots) {
  const h = now.getUTCHours();
  return slots.find((s) => s.utcHour === h) || null;
}

function pickProductMedia(product) {
  const imageUrl = product?.media?.images?.[0]?.url || '';
  const videoUrl = product?.media?.videoUrl || '';
  if (videoUrl) return { imageUrl, videoUrl, mediaType: 'video' };
  if (imageUrl) return { imageUrl, videoUrl: '', mediaType: 'image' };
  return { imageUrl: '', videoUrl: '', mediaType: 'none' };
}

async function countPostsTodayUtc() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  return SocialPublishHistory.countDocuments({
    status: { $in: ['published', 'pending_approval'] },
    createdAt: { $gte: start, $lte: end },
  });
}

async function wasSlotRunTodayUtc(utcHour, kind) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const found = await SocialPublishHistory.findOne({
    postKind: kind,
    scheduledSlotHour: utcHour,
    createdAt: { $gte: start },
  }).lean();
  return Boolean(found);
}

async function wasProductPublishedRecently(productId, platform, duplicateWindowDays) {
  const since = new Date(Date.now() - duplicateWindowDays * 24 * 60 * 60 * 1000);
  const found = await SocialPublishHistory.findOne({
    productId,
    platform,
    postKind: 'product',
    status: 'published',
    publishedAt: { $gte: since },
  })
    .sort({ publishedAt: -1 })
    .lean();
  return Boolean(found);
}

async function selectNextProduct(duplicateWindowDays) {
  const products = await Product.find({
    status: 'published',
    $or: [{ stockCount: { $gt: 0 } }, { purchaseType: 'group' }, { type: 'group' }],
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  for (const product of products) {
    const recentlyFb = await wasProductPublishedRecently(
      product._id,
      'facebook_page',
      duplicateWindowDays,
    );
    const recentlyIg = await wasProductPublishedRecently(
      product._id,
      'instagram_business',
      duplicateWindowDays,
    );
    if (!recentlyFb && !recentlyIg) {
      return product;
    }
  }
  return null;
}

async function createHistoryEntry(base) {
  return SocialPublishHistory.create({
    ...base,
    scheduledFor: new Date(),
  });
}

async function publishOne({ cfg, platform, postKind, format, caption, storyText, hashtags, cta, media, product, slotHour }) {
  if (platform === 'facebook_page' && !cfg.metaPageId) {
    return { platform, format, status: 'skipped', reason: 'no_page_id' };
  }
  const fullCaption = [caption, hashtags.join(' '), cta].filter(Boolean).join('\n\n').trim();
  const common = {
    productId: product?._id || null,
    productName: product?.name || '',
    postKind,
    platform,
    caption: fullCaption,
    hashtags,
    cta,
    imageUrl: media.imageUrl,
    videoUrl: media.videoUrl,
    mediaType: media.mediaType,
    approvalMode: cfg.approvalMode,
    scheduledSlotHour: slotHour,
  };

  if (cfg.approvalMode) {
    await createHistoryEntry({ ...common, status: 'pending_approval' });
    return { platform, format, status: 'pending_approval' };
  }

  try {
    let metaResult = null;

    if (format === 'story') {
      metaResult = await publishInstagramStory({
        apiVersion: cfg.metaApiVersion,
        accessToken: cfg.metaAccessToken,
        igBusinessAccountId: cfg.instagramBusinessAccountId,
        imageUrl: media.imageUrl,
        videoUrl: media.videoUrl,
      });
    } else if (format === 'reel' && platform === 'instagram_business' && media.videoUrl) {
      metaResult = await publishInstagramBusinessPost({
        apiVersion: cfg.metaApiVersion,
        accessToken: cfg.metaAccessToken,
        igBusinessAccountId: cfg.instagramBusinessAccountId,
        caption: fullCaption,
        videoUrl: media.videoUrl,
      });
    } else if (format === 'reel' && platform === 'facebook_page' && media.videoUrl) {
      metaResult = await publishFacebookReel({
        apiVersion: cfg.metaApiVersion,
        accessToken: cfg.metaAccessToken,
        pageId: cfg.metaPageId,
        videoUrl: media.videoUrl,
        description: fullCaption,
      });
    } else if (platform === 'facebook_page') {
      metaResult = await publishFacebookPagePost({
        apiVersion: cfg.metaApiVersion,
        accessToken: cfg.metaAccessToken,
        pageId: cfg.metaPageId,
        message: fullCaption,
        imageUrl: media.imageUrl,
      });
    } else {
      metaResult = await publishInstagramBusinessPost({
        apiVersion: cfg.metaApiVersion,
        accessToken: cfg.metaAccessToken,
        igBusinessAccountId: cfg.instagramBusinessAccountId,
        caption: fullCaption,
        imageUrl: media.imageUrl,
        videoUrl: media.videoUrl,
      });
    }

    await createHistoryEntry({
      ...common,
      status: 'published',
      metaPostId: metaResult?.postId || '',
      metaContainerId: metaResult?.containerId || '',
      publishedAt: new Date(),
      rawMeta: metaResult?.raw || null,
    });
    return { platform, format, status: 'published', postId: metaResult?.postId || '' };
  } catch (error) {
    await createHistoryEntry({
      ...common,
      status: 'failed',
      errorMessage: String(error?.message || 'publish_failed').slice(0, 500),
    });
    return { platform, format, status: 'failed', error: error?.message || 'publish_failed' };
  }
}

export async function runSocialPublisherCycle({ cfg, now = new Date() }) {
  const outcomes = [];
  if (!cfg.enabled) {
    return { ok: true, skipped: true, reason: 'social_agent_disabled', outcomes };
  }

  const dailySlots = getDailySlots(cfg);

  const postsToday = await countPostsTodayUtc();
  if (postsToday >= cfg.maxPostsPerDay) {
    return { ok: true, skipped: true, reason: 'max_posts_per_day_reached', outcomes };
  }

  const slot = getScheduledSlotForNow(now, dailySlots);
  if (!slot) {
    return { ok: true, skipped: true, reason: 'no_scheduled_slot_this_hour', outcomes };
  }

  const alreadyRan = await wasSlotRunTodayUtc(slot.utcHour, slot.kind);
  if (alreadyRan) {
    return { ok: true, skipped: true, reason: 'slot_already_ran_today', outcomes };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.PUBLIC_URL || 'https://vipo.co.il';

  if (slot.kind === 'story') {
    const product = await selectNextProduct(cfg.duplicateWindowDays);
    const copy = await generateSocialCopy({
      openAiApiKey: cfg.openAiApiKey,
      kind: 'story',
      product,
      siteUrl,
    });
    const media = product ? pickProductMedia(product) : { imageUrl: '', videoUrl: '', mediaType: 'none' };
    outcomes.push(
      await publishOne({
        cfg,
        platform: 'instagram_business',
        postKind: 'story',
        format: 'story',
        caption: copy.storyText,
        storyText: copy.storyText,
        hashtags: copy.hashtags,
        cta: copy.cta,
        media,
        product,
        slotHour: slot.utcHour,
      }),
    );
    return { ok: true, outcomes };
  }

  if (slot.kind === 'affiliate_recruitment') {
    const copy = await generateSocialCopy({
      openAiApiKey: cfg.openAiApiKey,
      kind: 'affiliate_recruitment',
      siteUrl,
    });
    const media = { imageUrl: '', videoUrl: '', mediaType: 'none' };
    outcomes.push(
      await publishOne({
        cfg,
        platform: 'facebook_page',
        postKind: 'affiliate_recruitment',
        format: 'post',
        caption: copy.facebookPost,
        storyText: copy.storyText,
        hashtags: copy.hashtags,
        cta: copy.cta,
        media,
        product: null,
        slotHour: slot.utcHour,
      }),
    );
    outcomes.push(
      await publishOne({
        cfg,
        platform: 'instagram_business',
        postKind: 'affiliate_recruitment',
        format: 'post',
        caption: copy.instagramCaption,
        storyText: copy.storyText,
        hashtags: copy.hashtags,
        cta: copy.cta,
        media,
        product: null,
        slotHour: slot.utcHour,
      }),
    );
    return { ok: true, outcomes };
  }

  // product post or reel
  const product = await selectNextProduct(cfg.duplicateWindowDays);
  if (!product) {
    return { ok: true, skipped: true, reason: 'no_eligible_product', outcomes };
  }
  const copy = await generateSocialCopy({
    openAiApiKey: cfg.openAiApiKey,
    kind: 'product',
    product,
    siteUrl,
  });
  const media = pickProductMedia(product);
  const format = slot.format === 'reel' && media.videoUrl ? 'reel' : 'post';

  outcomes.push(
    await publishOne({
      cfg,
      platform: 'facebook_page',
      postKind: 'product',
      format,
      caption: copy.facebookPost,
      storyText: copy.storyText,
      hashtags: copy.hashtags,
      cta: copy.cta,
      media,
      product,
      slotHour: slot.utcHour,
    }),
  );
  outcomes.push(
    await publishOne({
      cfg,
      platform: 'instagram_business',
      postKind: 'product',
      format,
      caption: copy.instagramCaption,
      storyText: copy.storyText,
      hashtags: copy.hashtags,
      cta: copy.cta,
      media,
      product,
      slotHour: slot.utcHour,
    }),
  );

  return { ok: true, outcomes };
}

export async function syncSocialAnalytics({ cfg }) {
  const rows = await SocialPublishHistory.find({
    status: 'published',
    metaPostId: { $exists: true, $ne: '' },
  })
    .sort({ publishedAt: -1 })
    .limit(100)
    .lean();

  const results = [];
  for (const row of rows) {
    try {
      const metrics = await getPostInsights({
        apiVersion: cfg.metaApiVersion,
        accessToken: cfg.metaAccessToken,
        postId: row.metaPostId,
        platform: row.platform,
      });
      if (!metrics) continue;
      await SocialPublishHistory.updateOne(
        { _id: row._id },
        {
          $set: {
            analytics: {
              impressions: metrics.impressions,
              reach: metrics.reach,
              engagement: metrics.engagement,
              clicks: metrics.clicks,
              syncedAt: new Date(),
            },
          },
        },
      );
      results.push({ id: String(row._id), synced: true });
    } catch (error) {
      results.push({ id: String(row._id), synced: false, error: error?.message || 'sync_failed' });
    }
  }
  return { ok: true, results };
}

export async function buildWeeklySummary() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await SocialPublishHistory.find({ createdAt: { $gte: since } }).lean();
  const published = rows.filter((r) => r.status === 'published').length;
  const failed = rows.filter((r) => r.status === 'failed').length;
  const pending = rows.filter((r) => r.status === 'pending_approval').length;
  const impressions = rows.reduce((s, r) => s + Number(r?.analytics?.impressions || 0), 0);
  const reach = rows.reduce((s, r) => s + Number(r?.analytics?.reach || 0), 0);
  const engagement = rows.reduce((s, r) => s + Number(r?.analytics?.engagement || 0), 0);
  const clicks = rows.reduce((s, r) => s + Number(r?.analytics?.clicks || 0), 0);
  return { published, failed, pending, impressions, reach, engagement, clicks };
}
