import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { requireAdminApi } from '@/lib/auth/server';
import SocialPublishHistory from '@/models/SocialPublishHistory';
import {
  publishFacebookPagePost,
  publishFacebookReel,
  publishInstagramBusinessPost,
  publishInstagramStory,
} from '@/lib/socialAgent/metaClient';
import { getSocialAgentConfig, validateSocialAgentConfig } from '@/lib/socialAgent/config';

async function doPublish(post, cfg) {
  const { platform, postKind, caption, imageUrl, videoUrl, mediaType } = post;
  const media = { imageUrl: imageUrl || '', videoUrl: videoUrl || '', mediaType: mediaType || 'none' };

  if (postKind === 'story' || (platform === 'instagram_business' && postKind === 'story')) {
    return publishInstagramStory({
      apiVersion: cfg.metaApiVersion,
      accessToken: cfg.metaAccessToken,
      igBusinessAccountId: cfg.instagramBusinessAccountId,
      imageUrl: media.imageUrl,
      videoUrl: media.videoUrl,
    });
  }
  if (platform === 'facebook_page' && media.videoUrl) {
    return publishFacebookReel({
      apiVersion: cfg.metaApiVersion,
      accessToken: cfg.metaAccessToken,
      pageId: cfg.metaPageId,
      videoUrl: media.videoUrl,
      description: caption,
    });
  }
  if (platform === 'facebook_page') {
    return publishFacebookPagePost({
      apiVersion: cfg.metaApiVersion,
      accessToken: cfg.metaAccessToken,
      pageId: cfg.metaPageId,
      message: caption,
      imageUrl: media.imageUrl,
    });
  }
  return publishInstagramBusinessPost({
    apiVersion: cfg.metaApiVersion,
    accessToken: cfg.metaAccessToken,
    igBusinessAccountId: cfg.instagramBusinessAccountId,
    caption,
    imageUrl: media.imageUrl,
    videoUrl: media.videoUrl,
  });
}

async function handlePatch(req, { params }) {
  const authError = await requireAdminApi(req);
  if (authError) return authError;

  await connectMongo();
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });
  }

  const post = await SocialPublishHistory.findById(id);
  if (!post) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  if (post.status !== 'pending_approval') {
    return NextResponse.json({ ok: false, error: 'not_pending' }, { status: 409 });
  }

  if (action === 'reject') {
    post.status = 'failed';
    post.errorMessage = body?.reason ? String(body.reason).slice(0, 500) : 'rejected_by_admin';
    await post.save();
    return NextResponse.json({ ok: true, status: 'rejected' });
  }

  // approve → publish now
  const cfg = getSocialAgentConfig();
  const cfgCheck = validateSocialAgentConfig(cfg);
  if (!cfgCheck.ok) {
    return NextResponse.json(
      { ok: false, error: 'missing_env', missing: cfgCheck.missing },
      { status: 400 },
    );
  }

  try {
    const result = await doPublish(post, cfg);
    post.status = 'published';
    post.metaPostId = result?.postId || '';
    post.metaContainerId = result?.containerId || '';
    post.publishedAt = new Date();
    post.rawMeta = result?.raw || null;
    post.approvalMode = false;
    await post.save();
    return NextResponse.json({ ok: true, status: 'published', postId: result?.postId || '' });
  } catch (error) {
    post.status = 'failed';
    post.errorMessage = String(error?.message || 'publish_failed').slice(0, 500);
    await post.save();
    return NextResponse.json({ ok: false, error: error?.message || 'publish_failed' }, { status: 500 });
  }
}

async function handleDelete(req, { params }) {
  const authError = await requireAdminApi(req);
  if (authError) return authError;

  await connectMongo();
  const { id } = params;
  const deleted = await SocialPublishHistory.findByIdAndDelete(id);
  if (!deleted) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export const PATCH = withErrorLogging(handlePatch);
export const DELETE = withErrorLogging(handleDelete);
