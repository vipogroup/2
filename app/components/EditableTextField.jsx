'use client';

import { useState, useRef, useEffect } from 'react';
import { useSiteTexts } from '@/lib/useSiteTexts';
import { editTextSafely, validateTextEdit } from '@/lib/editTextSafely';

/**
 * EditableTextField - קומפוננטה לעריכת טקסט inline
 * מציגה טקסט רגיל, ובמצב עריכה מאפשרת לחיצה לעריכה
 * 
 * @param {string} textKey - מזהה הטקסט (textId)
 * @param {string} fallback - ערך ברירת מחדל
 * @param {string} className - classes נוספים
 * @param {string} as - סוג האלמנט (span, p, h1, h2, etc.)
 * @param {object} style - סגנונות inline
 * @param {boolean} multiline - האם להציג textarea
 */
export default function EditableTextField({
  textKey,
  fallback = '',
  className = '',
  as: Component = 'span',
  style = {},
  multiline = false,
  children,
}) {
  const { getText, editMode, updateText } = useSiteTexts();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  const currentText = getText(textKey, fallback);

  // Focus on input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Start editing
  const startEditing = (e) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    setEditValue(currentText);
    setIsEditing(true);
  };

  // Save changes with safety validation
  const saveText = async () => {
    if (editValue === currentText) {
      setIsEditing(false);
      return;
    }

    // ולידציה לפני שמירה
    const elementRef = document.querySelector(`[data-text-key="${textKey}"]`);
    if (elementRef) {
      const validation = validateTextEdit(elementRef, editValue);
      if (!validation.valid) {
        alert(`שגיאה בעריכת הטקסט:\n${validation.issues.join('\n')}`);
        return;
      }
    }

    setSaving(true);
    const success = await updateText(textKey, editValue);
    setSaving(false);

    if (success) {
      setIsEditing(false);
    } else {
      alert('שגיאה בשמירה');
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setIsEditing(false);
    setEditValue('');
  };

  // Handle Enter/Escape
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

  // If editing this field
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

  // Normal display - clickable in edit mode
  const editModeStyles = editMode ? {
    cursor: 'pointer',
    outline: '2px dashed #3b82f6',
    outlineOffset: '2px',
    borderRadius: '4px',
    transition: 'all 0.2s',
  } : {};

  return (
    <Component 
      className={className} 
      style={{ ...style, ...editModeStyles }}
      onClick={editMode ? startEditing : undefined}
      title={editMode ? `לחץ לעריכה: ${textKey}` : undefined}
      data-text-key={textKey}
    >
      {children || currentText}
    </Component>
  );
}
