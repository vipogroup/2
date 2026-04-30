'use client';

import { useState, useEffect, useRef } from 'react';
import { editTextSafely, validateTextEdit } from '@/lib/editTextSafely';
import { fetchAuthUser } from '@/lib/clientAuthCache';

const AUTH_CACHE_TTL_MS = 60 * 1000;

/**
 * EditableText - קומפוננטה לעריכת טקסט inline
 * מציגה טקסט רגיל, ולמנהל מציגה גם כפתור עריכה
 * 
 * @param {string} textKey - מזהה הטקסט במסד הנתונים (textId)
 * @param {string} defaultValue - ערך ברירת מחדל אם אין טקסט במסד
 * @param {string} className - classes נוספים לעיצוב
 * @param {string} as - סוג האלמנט (span, p, h1, h2, etc.)
 * @param {object} style - סגנונות inline
 * @param {boolean} multiline - האם להציג textarea במקום input
 */
export default function EditableText({
  textKey,
  defaultValue = '',
  className = '',
  as: Component = 'span',
  style = {},
  multiline = false,
  children,
}) {
  const [text, setText] = useState(defaultValue);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef(null);

  // בדיקה אם המשתמש הוא מנהל
  useEffect(() => {
    let ignore = false;

    const checkAdmin = async () => {
      try {
        const user = await fetchAuthUser({ ttlMs: AUTH_CACHE_TTL_MS });
        if (!ignore) {
          // מנהל ראשי בלבד יכול לערוך
          setIsAdmin(user?.role === 'admin');
        }
      } catch (e) {
        // לא מחובר או שגיאה
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

  // טעינת הטקסט מהמסד
  useEffect(() => {
    const loadText = async () => {
      if (!textKey) return;
      
      try {
        const res = await fetch(`/api/site-texts?textId=${textKey}`);
        if (res.ok) {
          const data = await res.json();
          if (data.texts && data.texts.length > 0) {
            setText(data.texts[0].value || defaultValue);
          }
        }
      } catch (e) {
        // שגיאה בטעינה - נשתמש בערך ברירת מחדל
      } finally {
        setLoaded(true);
      }
    };
    loadText();
  }, [textKey, defaultValue]);

  // פוקוס על השדה כשנכנסים למצב עריכה
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // התחלת עריכה
  const startEditing = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditValue(text);
    setIsEditing(true);
  };

  // שמירת השינויים עם ולידציה
  const saveText = async () => {
    if (editValue === text) {
      setIsEditing(false);
      return;
    }

    // ולידציה לפני שמירה
    const elementRef = document.querySelector(`[data-text-key="${textKey}"]`);
    if (elementRef) {
      const validation = validateTextEdit(elementRef, editValue);
      if (!validation.valid) {
        alert(`לא ניתן לשמור את הטקסט:\n${validation.issues.join('\n')}`);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch('/api/site-texts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textId: textKey, value: editValue }),
      });

      if (res.ok) {
        setText(editValue);
        setIsEditing(false);
      } else {
        alert('שגיאה בשמירה');
      }
    } catch (e) {
      alert('שגיאה בשמירה: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ביטול עריכה
  const cancelEditing = () => {
    setIsEditing(false);
    setEditValue('');
  };

  // טיפול ב-Enter/Escape
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      cancelEditing();
    } else if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      saveText();
    } else if (e.key === 'Enter' && e.ctrlKey && multiline) {
      e.preventDefault();
      saveText();
    }
  };

  // אם במצב עריכה
  if (isEditing) {
    return (
      <span className="inline-flex items-center gap-2 relative" dir="rtl">
        {multiline ? (
          <textarea
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="px-2 py-1 border-2 border-blue-500 rounded-lg text-gray-900 bg-white min-w-[200px] resize-y"
            rows={3}
            disabled={saving}
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="px-2 py-1 border-2 border-blue-500 rounded-lg text-gray-900 bg-white min-w-[150px]"
            disabled={saving}
          />
        )}
        <button
          onClick={saveText}
          disabled={saving}
          className="p-1.5 text-white rounded-lg transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          title="שמור (Enter)"
        >
          {saving ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <button
          onClick={cancelEditing}
          disabled={saving}
          className="p-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all disabled:opacity-50"
          title="ביטול (Escape)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </span>
    );
  }

  // תצוגה רגילה עם כפתור עריכה למנהל
  return (
    <Component 
      className={`${className} ${isAdmin ? 'group relative' : ''}`} 
      style={style}
      data-text-key={textKey}
    >
      {children || text || defaultValue}
      
      {isAdmin && loaded && (
        <button
          onClick={startEditing}
          className="inline-flex items-center justify-center w-6 h-6 mr-1 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500 text-white rounded-full hover:bg-blue-600 align-middle"
          title={`עריכת טקסט: ${textKey}`}
          style={{ verticalAlign: 'middle' }}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}
    </Component>
  );
}
