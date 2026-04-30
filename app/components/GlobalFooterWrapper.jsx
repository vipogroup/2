'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

// Dynamically import GlobalFooter with no SSR to completely avoid hydration issues
const GlobalFooter = dynamic(() => import('./GlobalFooter'), {
  ssr: false,
  loading: () => null
});

// Pages where footer should be hidden (full-screen layouts)
const HIDDEN_FOOTER_PATHS = ['/messages', '/homepage', '/admin'];

export default function GlobalFooterWrapper() {
  const pathname = usePathname();
  
  // Hide footer on specific pages
  if (HIDDEN_FOOTER_PATHS.some(path => pathname?.startsWith(path))) {
    return null;
  }
  
  return <GlobalFooter />;
}
