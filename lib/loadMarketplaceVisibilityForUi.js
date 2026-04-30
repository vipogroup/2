import { getDb } from '@/lib/db';
import { withDefaultSettings } from '@/lib/settingsDefaults';
import { getVisibilityForUi } from '@/lib/marketplaceProductVisibility';

const SETTINGS_COLLECTION = 'settings';
const SETTINGS_KEY = 'siteSettings';

/** טוען הגדרות גלובליות (מנהל מוצרים) ומחזיר אובייקט visibility כמו ב-MarketplaceHome. */
export async function loadMarketplaceVisibilityForUi() {
  try {
    const db = await getDb();
    const doc = await db.collection(SETTINGS_COLLECTION).findOne({ key: SETTINGS_KEY });
    const settings = withDefaultSettings(doc?.value || {});
    return getVisibilityForUi({
      marketplaceShowStock: settings.marketplaceShowStock,
      marketplaceShowGroup: settings.marketplaceShowGroup,
      marketplaceShowSharedContainer: settings.marketplaceShowSharedContainer,
    });
  } catch {
    return getVisibilityForUi({});
  }
}
