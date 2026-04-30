function getGraphBase(apiVersion) {
  return `https://graph.facebook.com/${apiVersion}`;
}

async function graphRequest(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok || data?.error) {
    const msg = data?.error?.message || `meta_request_failed_${res.status}`;
    const err = new Error(msg);
    err.metaError = data?.error || data;
    throw err;
  }
  return data;
}

export async function publishFacebookPagePost({
  apiVersion,
  accessToken,
  pageId,
  message,
  imageUrl = '',
}) {
  const base = getGraphBase(apiVersion);
  const endpoint = imageUrl ? `${base}/${pageId}/photos` : `${base}/${pageId}/feed`;
  const body = new URLSearchParams({
    access_token: accessToken,
    message,
  });
  if (imageUrl) {
    body.set('url', imageUrl);
    body.set('published', 'true');
  }
  const data = await graphRequest(endpoint, { method: 'POST', body });
  return {
    postId: data?.post_id || data?.id || '',
    raw: data,
  };
}

export async function publishInstagramBusinessPost({
  apiVersion,
  accessToken,
  igBusinessAccountId,
  caption,
  imageUrl = '',
  videoUrl = '',
}) {
  const base = getGraphBase(apiVersion);
  const createEndpoint = `${base}/${igBusinessAccountId}/media`;
  const publishEndpoint = `${base}/${igBusinessAccountId}/media_publish`;
  const body = new URLSearchParams({
    access_token: accessToken,
    caption,
  });
  if (videoUrl) {
    body.set('media_type', 'REELS');
    body.set('video_url', videoUrl);
  } else {
    body.set('image_url', imageUrl);
  }
  const created = await graphRequest(createEndpoint, { method: 'POST', body });
  const containerId = created?.id;
  if (!containerId) {
    throw new Error('instagram_container_not_created');
  }

  const publishBody = new URLSearchParams({
    access_token: accessToken,
    creation_id: containerId,
  });
  const published = await graphRequest(publishEndpoint, { method: 'POST', body: publishBody });
  return {
    containerId,
    postId: published?.id || '',
    raw: { created, published },
  };
}

export async function publishFacebookReel({
  apiVersion,
  accessToken,
  pageId,
  videoUrl,
  description = '',
}) {
  const base = getGraphBase(apiVersion);
  const startBody = new URLSearchParams({
    access_token: accessToken,
    upload_phase: 'start',
    file_size: '0',
  });
  const started = await graphRequest(`${base}/${pageId}/video_reels`, {
    method: 'POST',
    body: startBody,
  });
  const uploadSessionId = started?.upload_session_id || started?.video_id || started?.id;
  if (!uploadSessionId) throw new Error('facebook_reel_session_not_created');

  const finishBody = new URLSearchParams({
    access_token: accessToken,
    upload_phase: 'finish',
    upload_session_id: uploadSessionId,
    video_state: 'PUBLISHED',
    description,
    file_url: videoUrl,
  });
  const finished = await graphRequest(`${base}/${pageId}/video_reels`, {
    method: 'POST',
    body: finishBody,
  });
  return {
    postId: finished?.video_id || finished?.id || uploadSessionId,
    raw: { started, finished },
  };
}

export async function publishInstagramStory({
  apiVersion,
  accessToken,
  igBusinessAccountId,
  imageUrl = '',
  videoUrl = '',
}) {
  const base = getGraphBase(apiVersion);
  const createBody = new URLSearchParams({ access_token: accessToken });
  if (videoUrl) {
    createBody.set('media_type', 'VIDEO');
    createBody.set('video_url', videoUrl);
  } else {
    createBody.set('image_url', imageUrl);
  }
  const created = await graphRequest(`${base}/${igBusinessAccountId}/media`, {
    method: 'POST',
    body: createBody,
  });
  const containerId = created?.id;
  if (!containerId) throw new Error('instagram_story_container_not_created');

  const publishBody = new URLSearchParams({
    access_token: accessToken,
    creation_id: containerId,
  });
  const published = await graphRequest(`${base}/${igBusinessAccountId}/media_publish`, {
    method: 'POST',
    body: publishBody,
  });
  return {
    containerId,
    postId: published?.id || '',
    raw: { created, published },
  };
}

export async function getPostInsights({ apiVersion, accessToken, postId, platform }) {
  if (!postId) return null;
  const base = getGraphBase(apiVersion);
  const metrics =
    platform === 'instagram_business'
      ? 'impressions,reach,engagement,profile_visits'
      : 'post_impressions,post_impressions_unique,post_engaged_users,post_clicks';
  const endpoint = `${base}/${postId}/insights?metric=${encodeURIComponent(metrics)}&access_token=${encodeURIComponent(accessToken)}`;
  const data = await graphRequest(endpoint);
  const values = Array.isArray(data?.data) ? data.data : [];
  const map = {};
  for (const item of values) {
    const key = item?.name;
    const metricValue = Array.isArray(item?.values) ? item.values[0]?.value : item?.value;
    if (key) map[key] = Number(metricValue || 0);
  }
  return {
    impressions: map.impressions || map.post_impressions || 0,
    reach: map.reach || map.post_impressions_unique || 0,
    engagement: map.engagement || map.post_engaged_users || 0,
    clicks: map.profile_visits || map.post_clicks || 0,
    raw: data,
  };
}
