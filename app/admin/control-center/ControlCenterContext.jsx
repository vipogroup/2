'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const StorageKey = 'vipo-cc-marketing-tenant';

const ControlCenterContext = createContext(null);

export function ControlCenterProvider({ user, children }) {
  const [tenants, setTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [selectedTenantId, setSelectedTenantIdState] = useState('');

  const isSuperAdmin = user?.role === 'super_admin';
  const userTenantId = user?.tenantId ? String(user.tenantId) : '';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isSuperAdmin) {
      const saved = sessionStorage.getItem(StorageKey);
      if (saved) setSelectedTenantIdState(saved);
    } else if (userTenantId) {
      setSelectedTenantIdState(userTenantId);
    }
  }, [isSuperAdmin, userTenantId]);

  const setSelectedTenantId = useCallback((id) => {
    const next = id == null ? '' : String(id);
    setSelectedTenantIdState(next);
    if (typeof window !== 'undefined') {
      if (next) sessionStorage.setItem(StorageKey, next);
      else sessionStorage.removeItem(StorageKey);
    }
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    let cancelled = false;
    (async () => {
      setTenantsLoading(true);
      try {
        const res = await fetch('/api/catalog-manager/tenants', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        const list = data.tenants || [];
        if (cancelled) return;
        setTenants(list);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setTenantsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  const selectedTenantLabel = useMemo(() => {
    if (!selectedTenantId) return 'כל החנויות';
    const t = tenants.find((x) => String(x._id) === String(selectedTenantId));
    return t?.name || selectedTenantId;
  }, [selectedTenantId, tenants]);

  const value = useMemo(
    () => ({
      isSuperAdmin,
      userTenantId,
      tenants,
      tenantsLoading,
      selectedTenantId,
      setSelectedTenantId,
      selectedTenantLabel,
    }),
    [
      isSuperAdmin,
      userTenantId,
      tenants,
      tenantsLoading,
      selectedTenantId,
      setSelectedTenantId,
      selectedTenantLabel,
    ],
  );

  return <ControlCenterContext.Provider value={value}>{children}</ControlCenterContext.Provider>;
}

export function useControlCenterTenant() {
  return useContext(ControlCenterContext);
}
