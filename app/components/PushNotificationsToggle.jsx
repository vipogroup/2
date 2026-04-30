'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ensureNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  hasActiveSubscription,
} from '@/app/lib/pushClient';
import { usePushConsent } from '@/app/hooks/usePushConsent';
import PushConsentModal from '@/app/components/PushConsentModal';

const MESSAGES = {
  unsupported: 'המכשיר או הדפדפן לא תומכים בהתראות דחיפה.',
  notConfigured: 'התראות טרם הוגדרו בשרת. פנה למנהל המערכת.',
  denied: 'ההתראה נדחתה. יש לאפשר התראות בהגדרות הדפדפן.',
  insecure_context: 'כדי להפעיל התראות צריך לפתוח את המערכת ב-HTTPS (או localhost).',
  granted: 'התראות הופעלו בהצלחה.',
  disabled: 'התראות בוטלו.',
  generalError: 'שמירת ההתראה נכשלה. נסה שוב.',
  ios_install_required: 'להתראות ב-iOS: התקן את האפליקציה דרך "הוסף למסך הבית".',
  service_worker_failed: 'התקנת ההתראות נכשלה. נסה לרענן את הדף.',
  permission_error: 'אירעה שגיאה בבקשת ההרשאות. נסה שוב.',
};

function pushDebug(...args) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[push]', ...args);
  }
}

function buildTags(role, extraTags = []) {
  const base = [];
  if (role === 'admin') base.push('admin');
  else if (role === 'agent') base.push('agent');
  else base.push('customer');
  return [...new Set([...base, ...extraTags])];
}

export default function PushNotificationsToggle({ role = 'customer', tags = [], className = '' }) {
  const [state, setState] = useState({
    supported: true,
    configured: true,
    subscribed: false,
    loading: true,
    message: '',
    permission: typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default',
  });

  const allTags = useMemo(() => buildTags(role, tags), [role, tags]);
  const {
    hasConsent,
    isOpen: consentOpen,
    requestConsent,
    closeConsent,
    acceptConsent,
    declineConsent,
    version: consentVersion,
  } = usePushConsent({ role });
  const [pendingSource, setPendingSource] = useState(null);

  const evaluateStatus = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const hostname = window.location?.hostname || '';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    if (!window.isSecureContext && !isLocalhost) {
      setState((prev) => ({
        ...prev,
        supported: false,
        configured: true,
        loading: false,
        message: MESSAGES.insecure_context,
      }));
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState((prev) => ({ ...prev, supported: false, loading: false, message: MESSAGES.unsupported }));
      return;
    }

    try {
      const res = await fetch('/api/push/config', { cache: 'no-store' });
      const data = res.ok ? await res.json() : { configured: false };

      if (!data?.configured) {
        setState((prev) => ({ ...prev, configured: false, loading: false, message: MESSAGES.notConfigured }));
        return;
      }

      // Test VAPID key validity before attempting subscription
      if (data.publicKey) {
        try {
          const testKey = data.publicKey.trim().replace(/^['"]+|['"]+$/g, '').replace(/\s+/g, '');
          const padding = '='.repeat((4 - (testKey.length % 4)) % 4);
          const base64 = (testKey + padding).replace(/-/g, '+').replace(/_/g, '/');
          atob(base64); // Test decode
        } catch (vapidError) {
          console.error('VAPID key validation failed:', vapidError);
          setState((prev) => ({ ...prev, configured: false, loading: false, message: MESSAGES.notConfigured }));
          return;
        }
      }

      const subscribed = await hasActiveSubscription();

      let shouldRepair = false;
      try {
        const currentKey = String(data?.publicKey || '').trim().replace(/^['"]+|['"]+$/g, '').replace(/\s+/g, '');
        const storedKey = window.localStorage.getItem('vipogroup_vapid_public_key');
        shouldRepair = subscribed && Notification.permission === 'granted' && (!storedKey || storedKey !== currentKey);
      } catch (_) {
        shouldRepair = false;
      }

      if (shouldRepair) {
        try {
          await subscribeToPush({
            tags: allTags,
            consentAt: new Date().toISOString(),
            consentVersion,
            consentMeta: { source: 'auto_repair', role },
            forcePrompt: true,
          });
        } catch (repairError) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[push] auto repair failed', repairError);
          }
        }
      }

      setState((prev) => ({
        ...prev,
        supported: true,
        configured: true,
        subscribed: subscribed && !shouldRepair,
        loading: false,
        permission: Notification.permission,
        message: subscribed ? MESSAGES.granted : '',
      }));
    } catch (error) {
      console.error('Failed to fetch push config', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        message: MESSAGES.generalError,
      }));
    }
  }, [allTags, consentVersion, role]);

  useEffect(() => {
    evaluateStatus();
  }, [evaluateStatus]);

  // Listen for push subscription changes from other components (e.g., PushNotificationModal)
  useEffect(() => {
    const handleSubscriptionChange = (event) => {
      const { subscribed } = event.detail || {};
      if (subscribed) {
        setState((prev) => ({
          ...prev,
          subscribed: true,
          loading: false,
          permission: 'granted',
          message: MESSAGES.granted,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          subscribed: false,
          loading: false,
          message: MESSAGES.disabled,
        }));
      }
    };

    window.addEventListener('push-subscription-changed', handleSubscriptionChange);
    return () => window.removeEventListener('push-subscription-changed', handleSubscriptionChange);
  }, []);

  const performSubscribe = useCallback(
    async ({ source, consentAt = new Date().toISOString(), recordConsent = true, forcePrompt = false }) => {
      pushDebug('performSubscribe called', { source, consentAt, recordConsent });
      setState((prev) => ({ ...prev, loading: true, message: '' }));
      try {
        const permissionResult = await ensureNotificationPermission();
        pushDebug('permission result', permissionResult);
        if (!permissionResult.granted) {
          declineConsent(permissionResult.reason || 'permission_denied');
          setState((prev) => ({
            ...prev,
            loading: false,
            permission: permissionResult.reason,
            message: MESSAGES[permissionResult.reason] || MESSAGES.denied,
          }));
          return;
        }

        pushDebug('calling subscribeToPush with tags', allTags);
        await subscribeToPush({
          tags: allTags,
          consentAt,
          consentVersion,
          consentMeta: { source, role },
          forcePrompt,
        });
        pushDebug('subscribeToPush success');
        if (recordConsent) {
          acceptConsent({ source, consentAt });
        }
        setState((prev) => ({
          ...prev,
          subscribed: true,
          loading: false,
          permission: 'granted',
          message: MESSAGES.granted,
        }));
      } catch (error) {
        console.error('subscribeToPush failed', error);
        setState((prev) => ({
          ...prev,
          loading: false,
          message: MESSAGES[error?.message] || MESSAGES.generalError,
        }));
      } finally {
        setPendingSource(null);
      }
    },
    [acceptConsent, allTags, consentVersion, declineConsent, role],
  );

  const handleEnable = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, message: '' }));
    try {
      if (!hasConsent) {
        setPendingSource('modal');
        setState((prev) => ({ ...prev, loading: false }));
        requestConsent();
        return;
      }

      await performSubscribe({ source: 'toggle' });
    } catch (error) {
      console.warn('Failed to prepare push enable', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        message: MESSAGES.generalError,
      }));
    }
  }, [hasConsent, performSubscribe, requestConsent]);

  const handleDisable = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, message: '' }));
    try {
      await unsubscribeFromPush();
      setState((prev) => ({
        ...prev,
        subscribed: false,
        loading: false,
        message: MESSAGES.disabled,
      }));
    } catch (error) {
      console.warn('Failed to disable push', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        message: MESSAGES.generalError,
      }));
    }
  }, []);

  const handleConsentAccept = useCallback(async () => {
    const source = pendingSource || 'modal';
    const consentAt = new Date().toISOString();
    acceptConsent({ source, consentAt });
    closeConsent();
    await performSubscribe({ source, consentAt, recordConsent: false });
  }, [acceptConsent, closeConsent, pendingSource, performSubscribe]);

  const handleConsentDecline = useCallback(() => {
    declineConsent('user_declined');
    closeConsent();
    setPendingSource(null);
    setState((prev) => ({
      ...prev,
      loading: false,
      message: MESSAGES.denied,
    }));
  }, [closeConsent, declineConsent]);

  const { supported, configured, subscribed, loading, message, permission } = state;
  const actionable = supported && configured;

  const renderStatus = () => {
    if (!actionable) {
      return <p className="text-xs text-red-500">{message}</p>;
    }
    if (!message) return null;
    const isSuccess = subscribed && message === MESSAGES.granted;
    return (
      <p className={`text-xs ${isSuccess ? 'text-emerald-600' : 'text-gray-500'}`}>{message}</p>
    );
  };

  const buttonLabel = () => {
    if (!actionable) return 'התראות לא זמינות';
    if (subscribed) return 'כבה התראות';
    if (permission === 'denied') return 'אפשר התראות בדפדפן';
    return 'הדלק התראות';
  };

  const buttonDisabled = !actionable || permission === 'denied';

  return (
    <div className={`space-y-1 ${className}`}>
      <p className="text-xs font-medium text-gray-600">התראות בזמן אמת</p>
      <button
        type="button"
        onClick={subscribed ? handleDisable : handleEnable}
        disabled={buttonDisabled}
        className="w-full text-xs font-semibold py-2 px-3 rounded-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed relative"
        style={{
          color: '#ffffff',
          background: subscribed
            ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
            : 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
          opacity: loading ? 0.8 : 1,
        }}
      >
        {loading && (
          <span className="absolute inset-y-0 right-3 flex items-center" aria-hidden="true">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V2C6.477 2 2 6.477 2 12h2zm2 5.291A7.962 7.962 0 014 12H2c0 3.314 1.343 6.313 3.515 8.485L6 17.291z"
              />
            </svg>
          </span>
        )}
        <span className={loading ? 'opacity-70' : ''}>{buttonLabel()}</span>
      </button>
      {renderStatus()}
      <PushConsentModal
        open={consentOpen}
        role={role}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
      />
    </div>
  );
}
