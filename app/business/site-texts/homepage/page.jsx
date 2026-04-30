'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export default function BusinessHomePageTextsEditor() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const [editedValues, setEditedValues] = useState({});
  const [saveMessage, setSaveMessage] = useState(null);
  const [businessId, setBusinessId] = useState(null);

  // Get businessId from API
  useEffect(() => {
    const getBusinessId = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data?.user?.businessId) {
          setBusinessId(data.user.businessId);
        } else if (data?.user?.id) {
          setBusinessId(data.user.id);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      }
    };
    getBusinessId();
  }, []);

  const fetchTexts = useCallback(async () => {
    try {
      setLoading(true);
      // First initialize defaults if needed
      await fetch(`/api/site-texts?page=home&initDefaults=true&businessId=${businessId}`);
      // Then fetch all texts
      const res = await fetch(`/api/site-texts?page=home&businessId=${businessId}`);
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
  }, [businessId]);

  // Fetch texts when businessId is known
  useEffect(() => {
    if (businessId) {
      fetchTexts();
    }
  }, [businessId, fetchTexts]);

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
        body: JSON.stringify({ 
          textId, 
          value: editedValues[textId],
          businessId 
        })
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

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem', color: '#0891b2' }}>טוען טקסטים...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', direction: 'rtl', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ 
            fontSize: '1.8rem', 
            fontWeight: '700', 
            background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '10px'
          }}>
            ניהול טקסטים - דף הבית
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
            ערוך את כל הטקסטים המופיעים בדף הבית של החנות שלך
          </p>
        </div>
        <Link href="/business/site-texts" style={{ 
          padding: '10px 20px',
          background: '#f3f4f6',
          color: '#1f2937',
          borderRadius: '8px',
          textDecoration: 'none',
          fontSize: '0.9rem',
          fontWeight: '500',
          transition: 'all 0.2s'
        }}>
          ← חזרה
        </Link>
      </div>

      {/* Save message */}
      {saveMessage && (
        <div style={{
          padding: '12px 20px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: saveMessage.type === 'success' ? '#d1fae5' : '#fee2e2',
          color: saveMessage.type === 'success' ? '#065f46' : '#991b1b',
          fontSize: '0.95rem',
          fontWeight: '500'
        }}>
          {saveMessage.text}
        </div>
      )}

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sections.map(section => (
          <div key={section.sectionId} style={{
            background: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}>
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.sectionId)}
              style={{
                width: '100%',
                padding: '20px',
                background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(8, 145, 178, 0.05) 100%)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(30, 58, 138, 0.08) 0%, rgba(8, 145, 178, 0.08) 100%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(8, 145, 178, 0.05) 100%)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '8px',
                  height: '40px',
                  borderRadius: '4px',
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)'
                }} />
                <div style={{ textAlign: 'right' }}>
                  <h2 style={{ 
                    fontSize: '1.2rem', 
                    fontWeight: '600',
                    color: '#1e3a8a',
                    margin: 0
                  }}>
                    {section.sectionLabel}
                  </h2>
                  <p style={{ 
                    fontSize: '0.85rem', 
                    color: '#6b7280',
                    margin: '4px 0 0 0'
                  }}>
                    {section.fields.length} שדות לעריכה
                  </p>
                </div>
              </div>
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#0891b2" 
                strokeWidth="2"
                style={{
                  transform: expandedSections[section.sectionId] ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s'
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Section Fields */}
            {expandedSections[section.sectionId] && (
              <div style={{ padding: '20px' }}>
                {section.fields.map(field => (
                  <div key={field.textId} style={{
                    padding: '20px',
                    borderRadius: '8px',
                    background: '#f9fafb',
                    marginBottom: '16px'
                  }}>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <label style={{ 
                          fontWeight: '600', 
                          fontSize: '1rem',
                          color: '#1e3a8a'
                        }}>
                          {field.label}
                        </label>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          background: '#e0f2fe',
                          color: '#0369a1',
                          borderRadius: '4px',
                          fontFamily: 'monospace'
                        }}>
                          {field.textId}
                        </span>
                      </div>
                      {field.previewLocation && (
                        <div style={{ 
                          fontSize: '0.85rem', 
                          color: '#6b7280',
                          marginTop: '4px'
                        }}>
                          {field.previewLocation}
                        </div>
                      )}
                    </div>

                    {/* Input field */}
                    {field.fieldType === 'textarea' ? (
                      <textarea
                        value={editedValues[field.textId] !== undefined 
                          ? editedValues[field.textId] 
                          : field.value || field.defaultValue}
                        onChange={(e) => handleValueChange(field.textId, e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '100px',
                          padding: '12px',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          fontSize: '0.95rem',
                          fontFamily: 'inherit',
                          resize: 'vertical'
                        }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={editedValues[field.textId] !== undefined 
                          ? editedValues[field.textId] 
                          : field.value || field.defaultValue}
                        onChange={(e) => handleValueChange(field.textId, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          fontSize: '0.95rem'
                        }}
                      />
                    )}

                    {/* Action buttons */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '10px', 
                      marginTop: '12px' 
                    }}>
                      {editedValues[field.textId] !== undefined && (
                        <>
                          <button
                            onClick={() => saveField(field.textId)}
                            disabled={saving[field.textId]}
                            style={{
                              padding: '8px 20px',
                              background: saving[field.textId] 
                                ? '#9ca3af'
                                : 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.9rem',
                              fontWeight: '500',
                              cursor: saving[field.textId] ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            {saving[field.textId] ? 'שומר...' : 'שמור'}
                          </button>
                          <button
                            onClick={() => resetField(field.textId, field.defaultValue)}
                            style={{
                              padding: '8px 20px',
                              background: '#f3f4f6',
                              color: '#374151',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '0.9rem',
                              fontWeight: '500',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            אפס לברירת מחדל
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
