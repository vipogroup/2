/**
 * ניתוח actionable לדפי Top Pages מ-GSC (נתונים קיימים בלבד).
 * ללא קריאות API נוספות.
 */

import { mapGscUrlToEntity } from './gscEntityMapper';
import { buildGscEntityActions } from './gscEntityActions';

/** @typedef {'good' | 'warning' | 'critical'} GscPageStatus */

/**
 * @param {{ page?: string, clicks?: number, impressions?: number, ctr?: number, position?: number }} row
 * @returns {object & { status: GscPageStatus, issues: string[], recommendations: string[] } & ReturnType<typeof mapGscUrlToEntity>}
 */
export function enrichGscPage(row) {
  const page = String(row.page || '');
  const entity = mapGscUrlToEntity(page);
  const actions = buildGscEntityActions(page, entity);
  const clicks = Number(row.clicks ?? 0);
  const impressions = Number(row.impressions ?? 0);
  const ctr = Number(row.ctr ?? 0);
  const position = Number(row.position ?? 0);

  const issues = [];
  const recommendations = [];

  if (impressions === 0) {
    issues.push('אין חשיפות בטווח הנבחר');
    recommendations.push('בדקו אינדוקס, תגיות noindex, או הרחבת טווח הזמן; השוו מול דוח הכיסוי ב-GSC');
  }

  if (impressions > 100 && clicks === 0) {
    issues.push('חשיפות גבוהות ללא קליקים (מעל 100 חשיפות)');
    recommendations.push('שפרו title ו-meta description כדי לשפר CTR בתוצאות החיפוש');
  }

  if (impressions > 100 && ctr < 0.01) {
    issues.push('CTR נמוך מ-1%');
    recommendations.push('השוו את קטע התוצאה מול מתחרים; נסו כותרות מדויקות ומושכות יותר');
  }

  if (position > 20 && impressions > 50) {
    issues.push('מיקום ממוצע רחוק (מעל 20)');
    recommendations.push('חיזקו רלוונטיות תוכן, מילות מפתח וקישורים פנימיים לדף');
  }

  if (position >= 8 && position <= 15 && impressions > 20) {
    issues.push('פוטנציאל שיפור: מיקום 8–15 בעמוד הראשון');
    recommendations.push('הרחבת תוכן ומיקוד כוונת חיפוש יכולים לדחוף קדימה בתוצאות');
  }

  /** @type {GscPageStatus} */
  let status = 'good';

  if (impressions === 0 || (impressions > 100 && clicks === 0)) {
    status = 'critical';
  } else if (clicks >= 5 && ctr >= 0.02 && impressions >= 25) {
    status = 'good';
  } else if (
    (impressions > 100 && ctr < 0.01)
    || (position > 20 && impressions > 50)
    || (position >= 8 && position <= 15 && impressions > 20)
  ) {
    status = 'warning';
  } else {
    status = 'good';
  }

  return {
    page,
    clicks,
    impressions,
    ctr,
    position,
    status,
    issues,
    recommendations,
    ...entity,
    actions,
  };
}

/**
 * @param {Array<{ page?: string, clicks?: number, impressions?: number, ctr?: number, position?: number }>} rows
 */
export function enrichGscPages(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(enrichGscPage);
}

/**
 * חלוקה לבלוקי דשבורד (ללא כפילות קריטית בין קבוצות).
 * @param {ReturnType<typeof enrichGscPages>} enriched
 */
export function buildGscDashboardBuckets(enriched) {
  const list = Array.isArray(enriched) ? enriched : [];

  const critical = list.filter(
    (p) => p.impressions === 0 || (p.impressions > 100 && p.clicks === 0),
  );

  const criticalUrls = new Set(critical.map((p) => p.page));

  const opportunities = list.filter((p) => {
    if (criticalUrls.has(p.page)) return false;
    const pos = p.position;
    const inBand = pos >= 8 && pos <= 15 && p.impressions > 20;
    const lowCtrWithClicks = p.impressions > 100 && p.ctr < 0.01 && p.clicks > 0;
    return inBand || lowCtrWithClicks;
  });

  const oppUrls = new Set(opportunities.map((p) => p.page));

  const topPerformers = list
    .filter((p) => {
      if (p.impressions === 0) return false;
      return p.clicks >= 5 && p.ctr >= 0.02 && p.impressions >= 25;
    })
    .sort((a, b) => b.clicks - a.clicks || b.ctr - a.ctr)
    .slice(0, 15);

  return {
    critical,
    opportunities,
    topPerformers,
    /** כל הדפים המועשרים (לטבלת Top Pages) */
    all: list,
  };
}
