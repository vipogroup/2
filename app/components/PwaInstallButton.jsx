'use client';

import { useCallback, useEffect, useState } from 'react';

const buttonStyle = {
  background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
  color: '#ffffff',
};

export default function PwaInstallButton({ className = '' }) {
  const [promptEvent, setPromptEvent] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setPromptEvent(event);
      setIsSupported(true);
    };

    const handleInstalled = () => {
      setPromptEvent(null);
      setIsInstalled(true);
    };

    const handleControllerChange = () => {
      // when new SW activates after install
      setIsInstalled(true);
    };

    window.addEventListener('pwa:beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa:installed', handleInstalled);
    window.addEventListener('appinstalled', handleInstalled);
    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);

    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('pwa-installed') : null;
      if (stored === 'true') {
        setIsInstalled(true);
      }
    } catch (err) {
      // ignore
    }

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('pwa:beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa:installed', handleInstalled);
      window.removeEventListener('appinstalled', handleInstalled);
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice.catch(() => ({ outcome: 'dismissed' }));
    if (outcome === 'accepted') {
      setPromptEvent(null);
    }
  }, [promptEvent]);

  if (!promptEvent || isInstalled || !isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      className={`px-3 py-2 rounded-lg text-sm font-semibold shadow-sm transition hover:scale-[1.02] ${className}`}
      style={buttonStyle}
    >
      התקן את האפליקציה
    </button>
  );
}
