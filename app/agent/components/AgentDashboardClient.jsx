'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';

// Context to share selected tenant across components
const TenantContext = createContext(null);

export function useTenant() {
  return useContext(TenantContext);
}

export function TenantProvider({ children }) {
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const loadCurrentBusiness = useCallback(async () => {
    try {
      const res = await fetch('/api/agent/current-business', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setCurrentBusiness(data.currentBusiness);
        setBusinesses(data.businesses || []);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load current business:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentBusiness();
  }, [loadCurrentBusiness]);

  const switchBusiness = useCallback(async (tenantId) => {
    if (!tenantId || switching) return;
    
    setSwitching(true);
    try {
      const res = await fetch('/api/agent/switch-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenantId }),
      });

      const data = await res.json();
      if (data.ok) {
        // Reload all data for the new business
        await loadCurrentBusiness();
      }
    } catch (err) {
      console.error('Failed to switch business:', err);
    } finally {
      setSwitching(false);
    }
  }, [switching, loadCurrentBusiness]);

  return (
    <TenantContext.Provider value={{
      currentBusiness,
      businesses,
      stats,
      loading,
      switching,
      switchBusiness,
      hasMultipleBusinesses: businesses.length > 1,
      hasBusinesses: businesses.length > 0,
      refresh: loadCurrentBusiness,
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export default function AgentDashboardClient({ children }) {
  return (
    <TenantProvider>
      {children}
    </TenantProvider>
  );
}

