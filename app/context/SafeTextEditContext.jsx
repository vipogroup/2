'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { editTextSafely, validateTextEdit } from '@/lib/editTextSafely';

const SafeTextEditContext = createContext();

/**
 * SafeTextEditProvider - ספק קונטקסט לעריכת טקסט בטוחה
 * מרכז את כל פעולות עריכת הטקסט דרך נקודה אחת מוגנת
 */
export function SafeTextEditProvider({ children }) {
  
  /**
   * עדכון טקסט בטוח עם rollback אוטומטי
   */
  const updateTextSafely = useCallback(async (element, newText, options = {}) => {
    if (!element) {
      console.error('updateTextSafely: Element is required');
      return { success: false, error: 'Element is required' };
    }
    
    // ולידציה ראשונית
    const validation = validateTextEdit(element, newText);
    if (!validation.valid) {
      return {
        success: false,
        error: 'Validation failed',
        issues: validation.issues
      };
    }
    
    // ביצוע עריכה בטוחה
    const result = editTextSafely(element, newText, {
      ...options,
      onError: (error) => {
        console.error('Text edit failed:', error);
        if (options.onError) {
          options.onError(error);
        }
      }
    });
    
    return result;
  }, []);
  
  /**
   * עדכון טקסט ב-API עם הגנה
   */
  const saveTextToAPI = useCallback(async (textKey, newValue, businessId = null) => {
    try {
      // סניטציה לפני שליחה
      const sanitized = newValue.replace(/<[^>]+>/g, '');
      
      const body = { 
        textId: textKey, 
        value: sanitized
      };
      
      if (businessId) {
        body.businessId = businessId;
      }
      
      const res = await fetch('/api/site-texts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      
      const data = await res.json();
      return { success: true, data };
      
    } catch (error) {
      console.error('saveTextToAPI failed:', error);
      return { success: false, error: error.message };
    }
  }, []);
  
  /**
   * יצירת עורך טקסט בטוח
   */
  const createSafeEditor = useCallback((element, textKey) => {
    if (!element) return null;
    
    // הוספת data attribute לזיהוי
    element.setAttribute('data-text-key', textKey);
    element.setAttribute('data-safe-edit', 'true');
    
    // מניעת contentEditable ישיר
    Object.defineProperty(element, 'contentEditable', {
      get() { return 'false'; },
      set() { 
        console.warn('Direct contentEditable blocked for safe editing');
        return false;
      }
    });
    
    return {
      element,
      textKey,
      update: (newText) => updateTextSafely(element, newText),
      save: (newValue) => saveTextToAPI(textKey, newValue)
    };
  }, [updateTextSafely, saveTextToAPI]);
  
  return (
    <SafeTextEditContext.Provider value={{
      updateTextSafely,
      saveTextToAPI,
      createSafeEditor,
      validateTextEdit
    }}>
      {children}
    </SafeTextEditContext.Provider>
  );
}

export function useSafeTextEdit() {
  const context = useContext(SafeTextEditContext);
  if (!context) {
    throw new Error('useSafeTextEdit must be used within SafeTextEditProvider');
  }
  return context;
}

export default SafeTextEditContext;
