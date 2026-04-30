'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { getPublicGaMeasurementId } from '@/lib/publicAnalytics';

const ENV_GA_ID = getPublicGaMeasurementId();
const ENV_GTM_ID = process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID || process.env.NEXT_PUBLIC_GTM_ID || '';
const ENV_GSC_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || process.env.NEXT_PUBLIC_GOOGLE_SEARCH_CONSOLE_VERIFICATION || '';

export default function GoogleAnalytics() {
  const [gaId, setGaId] = useState(ENV_GA_ID);
  const [gtmId, setGtmId] = useState(ENV_GTM_ID);
  const [gscVerification, setGscVerification] = useState(ENV_GSC_VERIFICATION);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.ok && data.settings) {
          setGaId(data.settings.googleAnalyticsId || ENV_GA_ID || '');
          setGtmId(data.settings.googleTagManagerId || ENV_GTM_ID || '');
          setGscVerification(data.settings.googleSearchConsoleVerification || ENV_GSC_VERIFICATION || '');
        } else {
          setGaId(ENV_GA_ID || '');
          setGtmId(ENV_GTM_ID || '');
          setGscVerification(ENV_GSC_VERIFICATION || '');
        }
      } catch (error) {
        console.error('Failed to fetch analytics settings:', error);
        setGaId(ENV_GA_ID || '');
        setGtmId(ENV_GTM_ID || '');
        setGscVerification(ENV_GSC_VERIFICATION || '');
      }
    }
    fetchSettings();
  }, []);

  useEffect(() => {
    const raw = String(gscVerification || '').trim();
    const value = raw.replace(/^google-site-verification=/i, '').trim();

    if (!value) {
      return;
    }

    let meta = document.querySelector('meta[name="google-site-verification"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'google-site-verification');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', value);
  }, [gscVerification]);

  // No tracking IDs configured
  if (!gaId && !gtmId) {
    return null;
  }

  return (
    <>
      {/* Google Analytics */}
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', {
                page_path: window.location.pathname,
              });
            `}
          </Script>
        </>
      )}

      {/* Google Tag Manager */}
      {gtmId && (
        <>
          <Script id="google-tag-manager" strategy="afterInteractive">
            {`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${gtmId}');
            `}
          </Script>
        </>
      )}
    </>
  );
}

// Helper function to track events - can be imported and used anywhere
export function trackEvent(eventName, eventParams = {}) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
}

// Predefined e-commerce events
export const analytics = {
  // View product
  viewItem: (product) => {
    trackEvent('view_item', {
      currency: 'ILS',
      value: product.price,
      items: [{
        item_id: product._id || product.id,
        item_name: product.name,
        price: product.price,
        quantity: 1,
      }],
    });
  },

  // Add to cart
  addToCart: (product, quantity = 1) => {
    trackEvent('add_to_cart', {
      currency: 'ILS',
      value: product.price * quantity,
      items: [{
        item_id: product._id || product.id,
        item_name: product.name,
        price: product.price,
        quantity: quantity,
      }],
    });
  },

  // Remove from cart
  removeFromCart: (product, quantity = 1) => {
    trackEvent('remove_from_cart', {
      currency: 'ILS',
      value: product.price * quantity,
      items: [{
        item_id: product._id || product.id,
        item_name: product.name,
        price: product.price,
        quantity: quantity,
      }],
    });
  },

  // Begin checkout
  beginCheckout: (cart, total) => {
    trackEvent('begin_checkout', {
      currency: 'ILS',
      value: total,
      items: cart.map(item => ({
        item_id: item._id || item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    });
  },

  // Purchase complete
  purchase: (orderId, total, items) => {
    trackEvent('purchase', {
      transaction_id: orderId,
      currency: 'ILS',
      value: total,
      items: items.map(item => ({
        item_id: item._id || item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    });
  },

  // User registration
  signUp: (method = 'email') => {
    trackEvent('sign_up', { method });
  },

  // User login
  login: (method = 'email') => {
    trackEvent('login', { method });
  },

  // Search
  search: (searchTerm) => {
    trackEvent('search', { search_term: searchTerm });
  },
};
