'use client';

import { useCallback, useMemo, useState } from 'react';

import {
  getConsentRecord,
  hasValidConsent,
  hasRespondedToConsent,
  markConsentAccepted,
  markConsentDeclined,
  PUSH_CONSENT_VERSION,
} from '@/app/lib/pushConsent';

function safeHasValidConsent(version) {
  try {
    return hasValidConsent(version);
  } catch (error) {
    return false;
  }
}

function safeHasRespondedToConsent(version) {
  if (typeof window === 'undefined') return true; // SSR - don't show modal
  try {
    return hasRespondedToConsent(version);
  } catch (error) {
    return true; // On error, don't show modal
  }
}

function safeGetConsentRecord() {
  if (typeof window === 'undefined') return null;
  try {
    return getConsentRecord();
  } catch (error) {
    return null;
  }
}

export function usePushConsent({ role = null, version = PUSH_CONSENT_VERSION } = {}) {
  const [consentRecord, setConsentRecord] = useState(() => safeGetConsentRecord());
  const [isOpen, setIsOpen] = useState(() => !safeHasRespondedToConsent(version));

  const hasConsent = useMemo(() => {
    if (consentRecord?.accepted && consentRecord?.version === version) {
      return true;
    }
    return safeHasValidConsent(version);
  }, [consentRecord, version]);

  const requestConsent = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeConsent = useCallback(() => {
    setIsOpen(false);
  }, []);

  const acceptConsent = useCallback(
    (meta = {}) => {
      const record = markConsentAccepted({ role, version, meta });
      setConsentRecord(record);
      setIsOpen(false);
      return record;
    },
    [role, version],
  );

  const declineConsent = useCallback(
    (reason = null) => {
      const record = markConsentDeclined({ role, version, reason });
      setConsentRecord(record);
      setIsOpen(false);
      return record;
    },
    [role, version],
  );

  return {
    consentRecord,
    hasConsent,
    isOpen,
    requestConsent,
    closeConsent,
    acceptConsent,
    declineConsent,
    version,
  };
}
