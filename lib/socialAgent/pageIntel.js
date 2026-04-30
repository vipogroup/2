/**
 * מודיעין לפרסום: סריקת פוסטים אחרונים בפייסבוק (Graph API בלבד)
 * מהעמוד שלך + עמודי השוואה (אם הטוקן וההרשאות מאפשרים — עמודים שאינם שלך עלולים להיחסם).
 */

async function fetchFacebookFeedSnippets({ apiVersion, accessToken, pageId, limit = 12 }) {
  if (!pageId || !accessToken) return [];
  const base = `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(pageId)}/feed`;
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: 'message,story,created_time',
    limit: String(Math.min(Math.max(limit, 1), 25)),
  });
  const res = await fetch(`${base}?${params.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) return [];
  const items = Array.isArray(data?.data) ? data.data : [];
  return items
    .map((p) => {
      const text = [p.message, p.story].filter(Boolean).join(' | ').replace(/\s+/g, ' ').trim();
      return text ? { text: text.slice(0, 500), created: p.created_time || '' } : null;
    })
    .filter(Boolean);
}

function buildCorpus(snippetsByLabel) {
  const parts = [];
  for (const { label, snippets } of snippetsByLabel) {
    if (!snippets?.length) continue;
    parts.push(`=== ${label} ===`);
    snippets.forEach((s, i) => {
      parts.push(`${i + 1}. ${s.text}`);
    });
  }
  return parts.join('\n').slice(0, 8000);
}

/**
 * מחזיר טקסט קצר בעברית: נושאים, טון, פערים, כיוונים לפוסט הבא — להזנה ל-copywriter.
 */
export async function buildPageLandscapeIntel(cfg) {
  if (!cfg.pageIntelEnabled || !cfg.openAiApiKey) return '';

  const snippetsByLabel = [];

  const own = await fetchFacebookFeedSnippets({
    apiVersion: cfg.metaApiVersion,
    accessToken: cfg.metaAccessToken,
    pageId: cfg.metaPageId,
    limit: 12,
  });
  snippetsByLabel.push({ label: 'העמוד שלנו (פייסבוק)', snippets: own });

  const refs = Array.isArray(cfg.referencePageIds) ? cfg.referencePageIds : [];
  for (const rawId of refs.slice(0, 4)) {
    const pageId = String(rawId || '').trim();
    if (!pageId || pageId === cfg.metaPageId) continue;
    const sn = await fetchFacebookFeedSnippets({
      apiVersion: cfg.metaApiVersion,
      accessToken: cfg.metaAccessToken,
      pageId,
      limit: 8,
    });
    if (sn.length) {
      snippetsByLabel.push({ label: `עמוד השוואה ${pageId}`, snippets: sn });
    }
  }

  const corpus = buildCorpus(snippetsByLabel);
  if (!corpus.trim()) return '';

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content:
            'אתה אנליסט שיווק חברתי. כתוב בעברית בלבד, עד 900 תווים, נקודות כניסה ברורות: נושאים חוזרים, טון, מה חסר, זוויות מומלצות לפוסט הבא. בלי JSON, בלי מילה "JSON".',
        },
        {
          role: 'user',
          content: `להלן דוגמאות טקסט מפוסטים אחרונים (ייתכן שחלקן מעמודי השוואה). נתח והנח את הכותב:\n\n${corpus}`,
        },
      ],
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    return '';
  }
  const text = payload?.choices?.[0]?.message?.content || '';
  return String(text).replace(/\s+/g, ' ').trim().slice(0, 1200);
}
