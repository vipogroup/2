import { escapeXml } from '@/lib/meta/metaFeedUtils';
import { META_FEED_CANONICAL_ORIGIN } from '@/lib/meta/metaFeedConstants';

/**
 * @param {string[]} itemXmlBlocks
 * @returns {string}
 */
export function buildRssDocument(itemXmlBlocks) {
  const channelTitle = escapeXml('VIPO — מחסני נירוסטה — Product Feed');
  const channelDesc = escapeXml('Stock-only product feed for Meta Catalog (Phase 1)');
  const itemsSection =
    itemXmlBlocks.length > 0 ? `\n${itemXmlBlocks.join('\n')}` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${channelTitle}</title>
    <link>${escapeXml(META_FEED_CANONICAL_ORIGIN)}</link>
    <description>${channelDesc}</description>${itemsSection}
  </channel>
</rss>
`;
}
