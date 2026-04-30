'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchAuthUser } from '@/lib/clientAuthCache';

const AUTH_CACHE_TTL_MS = 60 * 1000;

const SiteTextsContext = createContext({
  texts: {},
  loading: true,
  isAdmin: false,
  getText: () => '',
  updateText: async () => {},
  refreshTexts: async () => {},
});

export function SiteTextsProvider({ children, page = 'home' }) {
  const [texts, setTexts] = useState({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // בדיקה אם המשתמש הוא מנהל
  useEffect(() => {
    let ignore = false;

    const checkAdmin = async () => {
      try {
        const user = await fetchAuthUser({ ttlMs: AUTH_CACHE_TTL_MS });
        if (!ignore) {
          setIsAdmin(user?.role === 'admin');
        }
      } catch (e) {
        // לא מחובר
        if (!ignore) {
          setIsAdmin(false);
        }
      }
    };

    checkAdmin();

    return () => {
      ignore = true;
    };
  }, []);

  // טעינת כל הטקסטים לדף
  const loadTexts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/site-texts?page=${page}&initDefaults=true`);
      if (res.ok) {
        const data = await res.json();
        
        // יצירת מפה של textId => value
        const textsMap = {};
        if (data.sections) {
          for (const section of data.sections) {
            for (const field of section.fields) {
              textsMap[field.textId] = field.value || field.defaultValue;
            }
          }
        } else if (data.texts) {
          for (const text of data.texts) {
            textsMap[text.textId] = text.value || text.defaultValue;
          }
        }
        
        setTexts(textsMap);
      }
    } catch (e) {
      console.error('Error loading site texts:', e);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadTexts();
  }, [loadTexts]);

  // קבלת טקסט לפי מזהה
  const getText = useCallback((textKey, defaultValue = '') => {
    return texts[textKey] || defaultValue;
  }, [texts]);

  // עדכון טקסט
  const updateText = useCallback(async (textKey, newValue) => {
    try {
      const res = await fetch('/api/site-texts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textId: textKey, value: newValue }),
      });

      if (res.ok) {
        setTexts(prev => ({ ...prev, [textKey]: newValue }));
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error updating text:', e);
      return false;
    }
  }, []);

  return (
    <SiteTextsContext.Provider value={{
      texts,
      loading,
      isAdmin,
      getText,
      updateText,
      refreshTexts: loadTexts,
    }}>
      {children}
    </SiteTextsContext.Provider>
  );
}

export function useSiteTexts() {
  return useContext(SiteTextsContext);
}

export default SiteTextsContext;
