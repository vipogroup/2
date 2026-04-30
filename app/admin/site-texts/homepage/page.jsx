'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function HomePageTextsEditor() {
  const pathname = usePathname();
  const basePath = pathname?.startsWith('/business') ? '/business' : '/admin';
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const [editedValues, setEditedValues] = useState({});
  const [saveMessage, setSaveMessage] = useState(null);

  // Fetch texts on mount
  useEffect(() => {
    fetchTexts();
  }, []);

  const fetchTexts = async () => {
    try {
      setLoading(true);
      // First initialize defaults if needed
      await fetch('/api/site-texts?page=home&initDefaults=true');
      // Then fetch all texts
      const res = await fetch('/api/site-texts?page=home');
      const data = await res.json();
      if (data.success && data.sections) {
        setSections(data.sections);
        // Expand first section by default
        if (data.sections.length > 0) {
          setExpandedSections({ [data.sections[0].sectionId]: true });
        }
      }
    } catch (error) {
      console.error('Error fetching texts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleValueChange = (textId, value) => {
    setEditedValues(prev => ({
      ...prev,
      [textId]: value
    }));
  };

  const saveField = async (textId) => {
    if (editedValues[textId] === undefined) return;
    
    setSaving(prev => ({ ...prev, [textId]: true }));
    try {
      const res = await fetch('/api/site-texts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textId, value: editedValues[textId] })
      });
      
      if (res.ok) {
        setSaveMessage({ type: 'success', text: 'נשמר בהצלחה!' });
        // Update local state
        setSections(prev => prev.map(section => ({
          ...section,
          fields: section.fields.map(field => 
            field.textId === textId 
              ? { ...field, value: editedValues[textId] }
              : field
          )
        })));
        // Clear edited value
        setEditedValues(prev => {
          const newState = { ...prev };
          delete newState[textId];
          return newState;
        });
      } else {
        setSaveMessage({ type: 'error', text: 'שגיאה בשמירה' });
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'שגיאה בשמירה' });
    } finally {
      setSaving(prev => ({ ...prev, [textId]: false }));
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const resetField = (textId, defaultValue) => {
    setEditedValues(prev => ({
      ...prev,
      [textId]: defaultValue
    }));
  };

  const getCurrentValue = (field) => {
    return editedValues[field.textId] !== undefined 
      ? editedValues[field.textId] 
      : field.value;
  };

  const hasChanges = (textId, currentValue) => {
    return editedValues[textId] !== undefined && editedValues[textId] !== currentValue;
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        direction: 'rtl'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e5e7eb',
          borderTopColor: '#0891b2',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p style={{ color: '#6b7280' }}>טוען טקסטים...</p>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', direction: 'rtl', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ marginBottom: '16px' }}>
          <Link href={`${basePath}/site-texts`} style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#6b7280',
            textDecoration: 'none',
            fontSize: '0.9rem',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'scaleX(-1)' }}>
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
            </svg>
            חזרה לניהול טקסטים
          </Link>
        </div>
        
        <h1 style={{ 
          fontSize: '1.8rem', 
          fontWeight: '700', 
          background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '10px'
        }}>
          עמוד ראשי (Home Page)
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
          ערוך את כל הטקסטים שמופיעים בעמוד הבית
        </p>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          borderRadius: '8px',
          background: saveMessage.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          fontWeight: '500',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
          zIndex: 1000,
          animation: 'slideDown 0.3s ease'
        }}>
          {saveMessage.text}
        </div>
      )}

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sections.map((section) => (
          <div 
            key={section.sectionId}
            style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
              overflow: 'hidden',
              border: '1px solid #e5e7eb'
            }}
          >
            {/* Section Header - Accordion */}
            <button
              onClick={() => toggleSection(section.sectionId)}
              style={{
                width: '100%',
                padding: '18px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: expandedSections[section.sectionId] 
                  ? 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)'
                  : '#f8f9fa',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px' 
              }}>
                <span style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: '600',
                  color: expandedSections[section.sectionId] ? 'white' : '#1e3a8a'
                }}>
                  {section.sectionLabel}
                </span>
                <span style={{
                  background: expandedSections[section.sectionId] 
                    ? 'rgba(255,255,255,0.2)' 
                    : 'rgba(8, 145, 178, 0.1)',
                  color: expandedSections[section.sectionId] ? 'white' : '#0891b2',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: '500'
                }}>
                  {section.fields.length} שדות
                </span>
              </div>
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill={expandedSections[section.sectionId] ? 'white' : '#6b7280'}
                style={{
                  transform: expandedSections[section.sectionId] ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 0.3s ease'
                }}
              >
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
              </svg>
            </button>

            {/* Section Content */}
            {expandedSections[section.sectionId] && (
              <div style={{ padding: '24px' }}>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '20px' 
                }}>
                  {section.fields.map((field) => (
                    <div 
                      key={field.textId}
                      style={{
                        background: '#f8f9fa',
                        borderRadius: '10px',
                        padding: '20px',
                        border: hasChanges(field.textId, field.value) 
                          ? '2px solid #f59e0b' 
                          : '1px solid #e5e7eb'
                      }}
                    >
                      {/* Field Header */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '12px',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}>
                        <div>
                          <label style={{ 
                            fontWeight: '600', 
                            color: '#1e3a8a',
                            display: 'block',
                            marginBottom: '4px'
                          }}>
                            {field.label}
                          </label>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            color: '#9ca3af',
                            fontFamily: 'monospace',
                            background: '#e5e7eb',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {field.textId}
                          </span>
                        </div>
                        <span style={{ 
                          fontSize: '0.8rem', 
                          color: '#6b7280',
                          background: 'white',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb'
                        }}>
                          {field.previewLocation}
                        </span>
                      </div>

                      {/* Input Field */}
                      {field.fieldType === 'textarea' ? (
                        <textarea
                          value={getCurrentValue(field)}
                          onChange={(e) => handleValueChange(field.textId, e.target.value)}
                          style={{
                            width: '100%',
                            minHeight: '100px',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.95rem',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                            direction: 'rtl'
                          }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={getCurrentValue(field)}
                          onChange={(e) => handleValueChange(field.textId, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.95rem',
                            direction: 'rtl'
                          }}
                        />
                      )}

                      {/* Actions */}
                      <div style={{ 
                        display: 'flex', 
                        gap: '10px', 
                        marginTop: '12px',
                        justifyContent: 'flex-start'
                      }}>
                        <button
                          onClick={() => saveField(field.textId)}
                          disabled={!hasChanges(field.textId, field.value) || saving[field.textId]}
                          style={{
                            padding: '8px 20px',
                            borderRadius: '6px',
                            border: 'none',
                            background: hasChanges(field.textId, field.value)
                              ? 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)'
                              : '#e5e7eb',
                            color: hasChanges(field.textId, field.value) ? 'white' : '#9ca3af',
                            fontWeight: '500',
                            cursor: hasChanges(field.textId, field.value) ? 'pointer' : 'not-allowed',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {saving[field.textId] ? (
                            <>
                              <span style={{
                                width: '14px',
                                height: '14px',
                                border: '2px solid rgba(255,255,255,0.3)',
                                borderTopColor: 'white',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                display: 'inline-block'
                              }} />
                              שומר...
                            </>
                          ) : (
                            'שמור'
                          )}
                        </button>
                        <button
                          onClick={() => resetField(field.textId, field.defaultValue)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            background: 'white',
                            color: '#6b7280',
                            fontWeight: '500',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                          }}
                        >
                          איפוס לברירת מחדל
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideDown {
          from { 
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to { 
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
