'use client';

import { useState, useEffect } from 'react';
import { isSuperAdmin, getUserPermissions, hasPermission } from '@/lib/superAdmins';
import { fetchAuthUser } from '@/lib/clientAuthCache';

export function usePermissions() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState([]);
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);

  useEffect(() => {
    let ignore = false;
    const AUTH_CACHE_TTL_MS = 45 * 1000;

    async function fetchUser() {
      try {
        const userData = await fetchAuthUser({ ttlMs: AUTH_CACHE_TTL_MS });
        if (!ignore) {
          setUser(userData);

          if (userData) {
            const userPerms = getUserPermissions(userData);
            const isSuperAdminUser = userData.email ? isSuperAdmin(userData.email) : false;

            setPermissions(userPerms);
            setIsSuperAdminUser(isSuperAdminUser);
          } else {
            setPermissions([]);
            setIsSuperAdminUser(false);
          }
        }
      } catch (err) {
        console.error('Failed to fetch user permissions:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchUser();

    return () => {
      ignore = true;
    };
  }, []);

  const checkPermission = (permission) => {
    if (!user) return false;
    return hasPermission(user, permission);
  };

  return {
    user,
    loading,
    permissions,
    isSuperAdmin: isSuperAdminUser,
    hasPermission: checkPermission,
  };
}
