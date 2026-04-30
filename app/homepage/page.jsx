import { permanentRedirect } from 'next/navigation';

/**
 * Official marketing homepage is "/" only (see PRE_LAUNCH_FINAL_GO_NO_GO_REPORT.md).
 * This route exists for legacy/bookmarks; do not duplicate content or metadata here.
 */
export default function LegacyHomepageRedirect() {
  permanentRedirect('/');
}
