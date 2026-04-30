'use client';

import { useEffect } from 'react';

export default function PwaInstaller({ enabled = true }) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let isMounted = true;
    let requestInstallPrompt = null;

    const registerServiceWorker = async () => {
      try {
        console.log('PWA: Registering service worker...');
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('PWA: Service worker registered successfully', registration?.active?.state);

        if (!registration) return;

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage?.({ type: 'CHECK_UPDATES' });
              }
            }
          });
        });
      } catch (error) {
        console.error('PWA: Service worker registration FAILED', error);
      }
    };

    const assignRequestHelper = () => {
      requestInstallPrompt = async () => {
        const promptEvent = window.deferredPwaPrompt;
        if (!promptEvent) {
          return { outcome: 'unavailable' };
        }

        try {
          promptEvent.prompt();
          const choice = await promptEvent.userChoice.catch(() => ({ outcome: 'dismissed' }));
          window.deferredPwaPrompt = null;
          window.dispatchEvent(new CustomEvent('pwa:install-choice', { detail: choice }));
          return choice;
        } catch (err) {
          console.warn('PWA install prompt failed', err);
          return { outcome: 'error', error: err };
        }
      };

      window.requestPwaInstallPrompt = requestInstallPrompt;
    };

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      window.deferredPwaPrompt = event;
      assignRequestHelper();
      window.dispatchEvent(new CustomEvent('pwa:beforeinstallprompt'));
    };

    const handleAppInstalled = () => {
      try {
        localStorage.setItem('pwa-installed', 'true');
      } catch (err) {
        console.warn('Failed to persist PWA install state', err);
      }
      window.dispatchEvent(new CustomEvent('pwa:installed'));
    };

    const handleControllerChange = () => {
      window.dispatchEvent(new CustomEvent('pwa:controllerchange'));
    };

    const handleRequestInstall = () => {
      window.requestPwaInstallPrompt?.();
    };

    registerServiceWorker();
    assignRequestHelper();

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    window.addEventListener('pwa:request-install', handleRequestInstall);

    return () => {
      isMounted = false; // eslint-disable-line no-unused-vars
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      window.removeEventListener('pwa:request-install', handleRequestInstall);
      if (window.requestPwaInstallPrompt === requestInstallPrompt) {
        delete window.requestPwaInstallPrompt;
      }
    };
  }, [enabled]);

  return null;
}
