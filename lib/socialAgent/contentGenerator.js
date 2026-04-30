function compactText(value, max = 2200) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => String(t || '').trim())
    .filter(Boolean)
    .map((t) => (t.startsWith('#') ? t : `#${t.replace(/\s+/g, '')}`))
    .slice(0, 15);
}

function buildUserPrompt({ kind, product, siteUrl }) {
  if (kind === 'affiliate_recruitment') {
    return [
      'צור תוכן שיווקי בעברית לגיוס משווקים שותפים (Affiliates) עבור VIPO.',
      `האתר: ${siteUrl}`,
      'החזר JSON בלבד עם מפתחות: facebookPost, instagramCaption, storyText, hashtags, cta.',
      'סגנון: מניע לפעולה, קצר, אמין, מתאים לרשתות חברתיות.',
      'storyText: עד 50 תווים, מניע לפעולה מיידית.',
    ].join('\n');
  }
  if (kind === 'story') {
    return [
      'צור תוכן Story קצרצר בעברית לאינסטגרם ופייסבוק עבור VIPO.',
      product ? `מוצר: ${product.name || ''}, מחיר: ${Number(product?.price || 0)} ש"ח` : `האתר: ${siteUrl}`,
      'החזר JSON בלבד עם מפתחות: facebookPost, instagramCaption, storyText, hashtags, cta.',
      'storyText: עד 50 תווים, ישיר, מניע לפעולה מיידית.',
      'facebookPost ו-instagramCaption: עד 100 תווים.',
      'hashtags: 3-5 בלבד.',
    ].join('\n');
  }
  return [
    'צור תוכן שיווקי בעברית לקידום מוצר.',
    `שם מוצר: ${product?.name || ''}`,
    `תיאור קצר: ${product?.description || ''}`,
    `מחיר: ${Number(product?.price || 0)} ש"ח`,
    `לינק מוצר: ${siteUrl}/products/${product?._id || ''}`,
    'החזר JSON בלבד עם מפתחות: facebookPost, instagramCaption, storyText, hashtags, cta.',
    'סגנון: ישיר, איכותי, מכירתי, ללא הבטחות לא מציאותיות.',
    'storyText: עד 50 תווים, ישיר ומניע לפעולה.',
  ].join('\n');
}

export async function generateSocialCopy({
  openAiApiKey,
  kind,
  product = null,
  siteUrl = 'https://vipo.co.il',
}) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content:
            'You are a Hebrew social media copywriter. Return valid JSON only. Keep copy policy-safe.',
        },
        {
          role: 'user',
          content: buildUserPrompt({ kind, product, siteUrl }),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'social_copy',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              facebookPost: { type: 'string' },
              instagramCaption: { type: 'string' },
              storyText: { type: 'string' },
              hashtags: { type: 'array', items: { type: 'string' } },
              cta: { type: 'string' },
            },
            required: ['facebookPost', 'instagramCaption', 'storyText', 'hashtags', 'cta'],
          },
        },
      },
    }),
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload?.error?.message || 'openai_generation_failed');
  }

  const raw = payload?.output_text || '{}';
  let parsed = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  return {
    facebookPost: compactText(parsed.facebookPost, 5000),
    instagramCaption: compactText(parsed.instagramCaption, 2200),
    storyText: compactText(parsed.storyText, 50),
    hashtags: normalizeTags(parsed.hashtags),
    cta: compactText(parsed.cta, 200),
  };
}
