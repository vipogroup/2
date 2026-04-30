'use client';

const CONFIG_ENDPOINT = '/api/push/config';
const SUBSCRIBE_ENDPOINT = '/api/push/subscribe';
const VAPID_PUBLIC_KEY_STORAGE = 'vipogroup_vapid_public_key';

function sanitizeBase64Input(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  const withoutQuotes = trimmed.replace(/^['"]+|['"]+$/g, '');
  return withoutQuotes.replace(/\s+/g, '');
}

function base64ToUint8Array(base64String) {
  if (!base64String) {
    console.error('VAPID_ERROR: Empty base64String provided');
    throw new Error('invalid_vapid_public_key');
  }

  const normalized = sanitizeBase64Input(base64String);
  if (!normalized) {
    console.error('VAPID_ERROR: Sanitization resulted in empty string', { original: base64String });
    throw new Error('invalid_vapid_public_key');
  }

  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  const base64 = (normalized + padding).replace(/-/g, '+').replace(/_/g, '/');

  let rawData;
  try {
    rawData = atob(base64);
  } catch (error) {
    console.error('VAPID_ERROR: atob failed', { 
      original: base64String,
      normalized: normalized,
      final: base64,
      error: error.message 
    });
    throw new Error('invalid_vapid_public_key');
  }
  
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function safeGetStoredVapidKey() {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(VAPID_PUBLIC_KEY_STORAGE);
  } catch {
    return null;
  }
}

function safeSetStoredVapidKey(value) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(VAPID_PUBLIC_KEY_STORAGE, String(value || ''));
  } catch {
    // ignore
  }
}

async function waitForServiceWorkerActivation(registration) {
  if (registration?.active?.state === 'activated') {
    return registration;
  }

  const worker = registration?.installing || registration?.waiting || registration?.active;
  if (!worker) {
    throw new Error('service_worker_no_instance');
  }

  await new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      if (settled) return;
      settled = true;
      worker.removeEventListener('statechange', handleStateChange);
      clearTimeout(timeoutId);
    };

    const handleStateChange = () => {
      if (registration.active && registration.active.state === 'activated') {
        cleanup();
        resolve();
      }
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('service_worker_timeout'));
    }, 10000);

    worker.addEventListener('statechange', handleStateChange);
    handleStateChange();
  });

  return registration;
}

async function getReadyServiceWorkerRegistration() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('service_worker_not_supported');
  }

  let registration = await navigator.serviceWorker.getRegistration('/');

  if (!registration) {
    console.log('PUSH_CLIENT: no registration found, registering sw.js...');
    try {
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('PUSH_CLIENT: service worker registered');
    } catch (error) {
      console.error('PUSH_CLIENT: failed to register service worker', error);
      throw new Error('service_worker_registration_failed');
    }
  }

  if (!registration) {
    throw new Error('service_worker_not_available');
  }

  try {
    await waitForServiceWorkerActivation(registration);
  } catch (activationError) {
    console.error('PUSH_CLIENT: service worker failed to activate', activationError);
    throw activationError;
  }

  return registration;
}

async function getPushConfig() {
  const res = await fetch(CONFIG_ENDPOINT, { cache: 'no-store' });
  if (!res.ok) return { ok: false };
  return res.json();
}

async function postSubscription(body, method = 'POST') {
  console.log('PUSH_CLIENT: postSubscription called', { method, bodyKeys: Object.keys(body) });
  const res = await fetch(SUBSCRIBE_ENDPOINT, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  console.log('PUSH_CLIENT: postSubscription response', { ok: res.ok, status: res.status });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error('PUSH_CLIENT: postSubscription FAILED', data);
    throw new Error(data.error || 'subscription_failed');
  }
  const result = await res.json();
  console.log('PUSH_CLIENT: postSubscription SUCCESS', result);
  return result;
}

export async function ensureNotificationPermission() {
  if (typeof window === 'undefined') {
    return { granted: false, reason: 'unsupported' };
  }

  const hostname = window.location?.hostname || '';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  if (!window.isSecureContext && !isLocalhost) {
    return { granted: false, reason: 'insecure_context' };
  }

  // בדיקת תמיכה בהתראות במובייל
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  // אם זה iOS, נבדוק אם האפליקציה מותקנת
  if (isIOS) {
    const isStandalone = window.navigator.standalone === true;
    if (!isStandalone) {
      // אם האפליקציה לא מותקנת, נבקש מהמשתמש להתקין
      return { granted: false, reason: 'ios_install_required' };
    }
  }

  // בדיקה אם הדפדפן תומך בהתראות
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { granted: false, reason: 'unsupported' };
  }

  // בדיקת הרשאות קיימות
  const permission = Notification.permission;
  if (permission === 'granted') {
    return { granted: true };
  }
  if (permission === 'denied') {
    return { granted: false, reason: 'denied' };
  }

  try {
    // בקשת הרשאות
    const result = await Notification.requestPermission();
    
    // אם אושר, נוודא שה-Service Worker נרשם
    if (result === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      if (!registration) {
        return { granted: false, reason: 'service_worker_failed' };
      }
    }

    return { 
      granted: result === 'granted', 
      reason: result,
      platform: isIOS ? 'ios' : isAndroid ? 'android' : 'desktop'
    };
  } catch (error) {
    console.error('Permission request failed:', error);
    return { granted: false, reason: 'permission_error' };
  }
}

export async function subscribeToPush({
  tags = [],
  consentAt = null,
  consentVersion = null,
  consentMeta = null,
  forcePrompt = false
} = {}) {
  console.log('PUSH_CLIENT: subscribeToPush started');
  if (typeof window === 'undefined') {
    throw new Error('client_only');
  }

  const hostname = window.location?.hostname || '';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  if (!window.isSecureContext && !isLocalhost) {
    throw new Error('insecure_context');
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.error('PUSH_CLIENT: unsupported browser');
    throw new Error('unsupported');
  }

  const permission = await ensureNotificationPermission();
  console.log('PUSH_CLIENT: permission', permission);
  if (!permission.granted) {
    throw new Error(permission.reason || 'permission_denied');
  }

  const config = await getPushConfig();
  console.log('PUSH_CLIENT: config', config);
  if (!config?.configured || !config.publicKey) {
    throw new Error('web_push_not_configured');
  }

  const currentPublicKey = sanitizeBase64Input(config.publicKey);
  const storedPublicKey = safeGetStoredVapidKey();
  const shouldRecreateSubscription = Boolean(forcePrompt || (storedPublicKey && storedPublicKey !== currentPublicKey));

  console.log('PUSH_CLIENT: waiting for service worker...');
  const registration = await getReadyServiceWorkerRegistration();
  console.log('PUSH_CLIENT: service worker ready', registration?.active?.state);
  let subscription = await registration.pushManager.getSubscription();
  console.log('PUSH_CLIENT: existing subscription', subscription ? 'YES' : 'NO');

  if (subscription && shouldRecreateSubscription) {
    console.log('PUSH_CLIENT: VAPID key changed (or forced). Recreating subscription...');
    try {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe().catch(() => {});
      await postSubscription({ endpoint }, 'DELETE').catch(() => {});
    } catch (err) {
      console.warn('PUSH_CLIENT: failed to cleanup old subscription', err);
    }
    subscription = null;
  }

  if (!subscription) {
    console.log('PUSH_CLIENT: creating new subscription...');
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(currentPublicKey),
    });
    console.log('PUSH_CLIENT: subscription created');
  }

  console.log('PUSH_CLIENT: posting subscription to server...');
  await postSubscription({
    subscription,
    tags,
    consentAt,
    consentVersion,
    consentMeta,
  });
  console.log('PUSH_CLIENT: subscription saved to server!');

  safeSetStoredVapidKey(currentPublicKey);

  return { ok: true, subscription };
}

export async function unsubscribeFromPush() {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'client_only' };
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, error: 'unsupported' };
  }

  let registration;
  try {
    registration = await getReadyServiceWorkerRegistration();
  } catch (error) {
    console.error('PUSH_CLIENT: failed to obtain service worker for unsubscribe', error);
    return { ok: false, error: error.message || 'service_worker_not_available' };
  }
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    return { ok: true, unsubscribed: false };
  }

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe().catch(() => {});

  try {
    await postSubscription({ endpoint }, 'DELETE');
  } catch (err) {
    console.warn('Failed to remove subscription server-side', err);
  }

  return { ok: true, unsubscribed: true };
}

export async function hasActiveSubscription() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }
  try {
    const registration = await getReadyServiceWorkerRegistration();
    const subscription = await registration.pushManager.getSubscription();
    return Boolean(subscription);
  } catch (error) {
    console.warn('PUSH_CLIENT: hasActiveSubscription failed', error);
    return false;
  }
}
