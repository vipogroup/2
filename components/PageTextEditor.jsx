'use client';
import { useState, useEffect, useRef } from 'react';
import { fetchAuthUser } from '@/lib/clientAuthCache';

const AUTH_CACHE_TTL_MS = 45 * 1000;

/**
 * PageTextEditor — wraps a page and adds a floating "edit texts" button.
 * When active, all text labels/headings/descriptions become contentEditable.
 * Changes are saved to localStorage (per pageKey) and re-applied on load.
 *
 * Usage: <PageTextEditor pageKey="products-new">{children}</PageTextEditor>
 */
export default function PageTextEditor({ pageKey, children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [tenantId, setTenantId] = useState('global');
  const [editing, setEditing] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [hasOverrides, setHasOverrides] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pos, setPos] = useState({ x: 8, y: 8 });
  const [scale, setScale] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const containerRef = useRef(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const tenantIdRef = useRef('global');

  // Check if user is admin + get tenant
  useEffect(() => {
    (async () => {
      try {
        const user = await fetchAuthUser({ ttlMs: AUTH_CACHE_TTL_MS });
        const role = user?.role;
        if (role === 'admin' || role === 'super_admin') setIsAdmin(true);
        const tid = user?.tenantId || 'global';
        setTenantId(tid);
        tenantIdRef.current = tid;
      } catch {}
    })();
  }, []);

  // Load overrides + button position from server
  useEffect(() => {
    (async () => {
      try {
        const tid = tenantIdRef.current;
        const res = await fetch(`/api/page-texts?pageKey=${pageKey}&tenantId=${tid}`);
        if (res.ok) {
          const data = await res.json();
          if (data.overrides && Object.keys(data.overrides).length > 0) {
            setOverrides(data.overrides);
            setHasOverrides(true);
          }
          if (data.buttonPos) {
            setPos({ x: data.buttonPos.x ?? 8, y: data.buttonPos.y ?? 8 });
            setScale(data.buttonPos.scale ?? 1);
            setLocked(data.buttonPos.locked ?? false);
          }
        }
      } catch {}
      setDataLoaded(true);
    })();
  }, [pageKey]);

  // Drag handlers (mouse + touch)
  useEffect(() => {
    function onMove(clientX, clientY) {
      if (!dragging.current) return;
      hasMoved.current = true;
      const nx = Math.max(0, Math.min(window.innerWidth - 60, clientX - dragOffset.current.x));
      const ny = Math.max(0, Math.min(window.innerHeight - 30, clientY - dragOffset.current.y));
      setPos({ x: nx, y: window.innerHeight - ny - 30 });
    }
    function onMouseMove(e) { onMove(e.clientX, e.clientY); }
    function onTouchMove(e) {
      if (!dragging.current) return;
      e.preventDefault();
      const t = e.touches[0];
      onMove(t.clientX, t.clientY);
    }
    function onEnd() {
      if (dragging.current) {
        dragging.current = false;
        document.body.style.userSelect = '';
      }
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, []);

  function handleDragStart(e) {
    if (locked) return;
    dragging.current = true;
    hasMoved.current = false;
    document.body.style.userSelect = 'none';
    const rect = e.currentTarget.closest('[data-text-editor]').getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragOffset.current = { x: clientX - rect.left, y: clientY - rect.top };
  }

  function savePosToServer(p, s, l) {
    fetch('/api/page-texts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageKey, tenantId: tenantIdRef.current, buttonPos: { x: p.x, y: p.y, scale: s, locked: l } })
    }).catch(() => {});
  }

  function toggleLock() {
    const newLocked = !locked;
    setLocked(newLocked);
    savePosToServer(pos, scale, newLocked);
  }

  function savePos() {
    savePosToServer(pos, scale, locked);
  }

  function changeScale(delta) {
    const newScale = Math.max(0.5, Math.min(2, +(scale + delta).toFixed(1)));
    setScale(newScale);
    savePosToServer(pos, newScale, locked);
  }

  // Apply overrides after every render (handles React re-renders + tab switches)
  useEffect(() => {
    if (!containerRef.current || editing || !hasOverrides) return;
    const timer = setTimeout(() => {
      applyOverrides(containerRef.current, overrides);
    }, 80);
    return () => clearTimeout(timer);
  });

  function getEditableElements() {
    if (!containerRef.current) return [];
    const candidates = containerRef.current.querySelectorAll(
      'label, h2, h3, h4, p, [class*="font-bold"], [class*="text-sm"], [class*="text-xs"]'
    );
    return Array.from(candidates).filter(el => {
      // Skip elements containing form inputs
      if (el.querySelector('input, select, textarea')) return false;
      // Skip the editor toolbar itself
      if (el.closest('[data-text-editor]')) return false;
      // Skip excluded zones (e.g. product cards)
      if (el.closest('[data-no-edit]')) return false;
      // Skip nav/header elements
      if (el.closest('nav, header')) return false;
      // Skip very short or empty
      const text = el.textContent.trim();
      if (text.length < 2) return false;
      // Skip elements that are only numbers
      if (/^\d+$/.test(text)) return false;
      return true;
    });
  }

  function startEditing() {
    const elements = getEditableElements();
    elements.forEach(el => {
      el.contentEditable = 'true';
      el.dataset.originalText = el.textContent;
      el.style.outline = '2px dashed #3b82f6';
      el.style.outlineOffset = '2px';
      el.style.borderRadius = '4px';
      el.style.cursor = 'text';
      el.style.minHeight = '1.2em';
      el.style.transition = 'outline-color 0.2s';
      // Highlight on focus
      el.addEventListener('focus', () => { el.style.outlineColor = '#f59e0b'; });
      el.addEventListener('blur', () => { el.style.outlineColor = '#3b82f6'; });
    });
    setEditing(true);
  }

  function stopEditing(save) {
    const elements = containerRef.current?.querySelectorAll('[contenteditable="true"]') || [];
    let newOverrides = { ...overrides };

    elements.forEach(el => {
      if (save) {
        const original = (el.dataset.originalText || '').trim();
        const current = el.textContent.trim();
        if (original && current && current !== original) {
          newOverrides[original] = current;
        }
      } else {
        // Cancel — restore original
        if (el.dataset.originalText) {
          el.textContent = el.dataset.originalText;
        }
      }
      el.contentEditable = 'false';
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.borderRadius = '';
      el.style.cursor = '';
      el.style.minHeight = '';
      el.style.transition = '';
      delete el.dataset.originalText;
    });

    if (save) {
      setOverrides(newOverrides);
      setHasOverrides(Object.keys(newOverrides).length > 0);
      fetch('/api/page-texts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageKey, tenantId: tenantIdRef.current, overrides: newOverrides })
      }).catch(() => {});
    }
    setEditing(false);
  }

  function resetAll() {
    if (!confirm('לאפס את כל שינויי הטקסט לברירת המחדל?')) return;
    fetch('/api/page-texts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageKey, tenantId: tenantIdRef.current, overrides: {} })
    }).catch(() => {});
    setOverrides({});
    setHasOverrides(false);
    setEditing(false);
    window.location.reload();
  }

  const btnBase = {
    border: 'none',
    padding: '4px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: '600',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {children}

      {isAdmin && <div
        data-text-editor="true"
        style={{
          position: 'fixed',
          bottom: `${pos.y}px`,
          left: `${pos.x}px`,
          zIndex: 9999,
          cursor: locked ? 'default' : 'grab',
          transform: `scale(${scale})`,
          transformOrigin: 'bottom left',
        }}
      >
        {!editing ? (
          <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
            <button
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
              onMouseUp={() => { if (!hasMoved.current) { if (expanded) { startEditing(); setExpanded(false); } else { setExpanded(true); } } savePos(); }}
              onTouchEnd={(e) => { e.preventDefault(); if (!hasMoved.current) { if (expanded) { startEditing(); setExpanded(false); } else { setExpanded(true); } } savePos(); }}
              title={locked ? 'עריכת טקסטים (נעול)' : 'גרור להזזה • לחץ לעריכה'}
              style={{
                ...btnBase,
                background: 'linear-gradient(135deg, #1e3a8a, #7c3aed)',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                boxShadow: '0 2px 8px rgba(30, 58, 138, 0.3)',
                opacity: 0.7,
                cursor: locked ? 'pointer' : 'grab',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              עריכה
            </button>
            {expanded && (
              <>
                <button
                  onClick={toggleLock}
                  title={locked ? 'שחרר מיקום' : 'נעל מיקום'}
                  style={{
                    ...btnBase,
                    background: locked ? '#ef4444' : '#6b7280',
                    padding: '4px 6px',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                >
                  {locked ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>}
                </button>
                <button
                  onClick={() => changeScale(-0.1)}
                  title="הקטן"
                  style={{ ...btnBase, background: '#475569', padding: '4px 6px', borderRadius: '6px', fontSize: '13px', lineHeight: 1 }}
                >
                  −
                </button>
                <button
                  onClick={() => changeScale(0.1)}
                  title="הגדל"
                  style={{ ...btnBase, background: '#475569', padding: '4px 6px', borderRadius: '6px', fontSize: '13px', lineHeight: 1 }}
                >
                  +
                </button>
                <button
                  onClick={() => setExpanded(false)}
                  title="סגור"
                  style={{ ...btnBase, background: '#94a3b8', padding: '4px 6px', borderRadius: '6px', fontSize: '10px' }}
                >
                  ✖
                </button>
              </>
            )}
          </div>
        ) : (
          <div
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '6px 10px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              gap: '5px',
              alignItems: 'center',
              border: '1.5px solid #3b82f6',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#1e3a8a', whiteSpace: 'nowrap' }}>
              עריכה
            </span>
            <button onClick={() => stopEditing(true)} style={{ ...btnBase, background: '#22c55e' }}>
              שמור
            </button>
            <button onClick={() => stopEditing(false)} style={{ ...btnBase, background: '#ef4444' }}>
              ביטול
            </button>
            <button onClick={resetAll} style={{ ...btnBase, background: '#6b7280', fontSize: '10px', padding: '4px 6px' }}>
              איפוס
            </button>
            <button
              onClick={toggleLock}
              title={locked ? 'שחרר מיקום' : 'נעל מיקום'}
              style={{ ...btnBase, background: locked ? '#ef4444' : '#6b7280', padding: '4px 6px' }}
            >
              {locked ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>}
            </button>
          </div>
        )}
      </div>}
    </div>
  );
}

/**
 * Walk the DOM and replace text nodes whose trimmed content matches an override key.
 */
function applyOverrides(container, overrides) {
  if (!container || !overrides) return;
  const keys = Object.keys(overrides);
  if (keys.length === 0) return;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      // Skip inputs, script, style, and the editor toolbar
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'SCRIPT' || tag === 'STYLE') {
        return NodeFilter.FILTER_REJECT;
      }
      if (parent.closest('[data-text-editor]')) return NodeFilter.FILTER_REJECT;
      if (parent.closest('[data-no-edit]')) return NodeFilter.FILTER_REJECT;
      if (parent.closest('input, select, textarea')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodesToUpdate = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const trimmed = node.textContent.trim();
    if (trimmed && overrides[trimmed]) {
      nodesToUpdate.push({ node, original: trimmed, replacement: overrides[trimmed] });
    }
  }

  // Apply changes outside the walker loop
  nodesToUpdate.forEach(({ node, original, replacement }) => {
    node.textContent = node.textContent.replace(original, replacement);
  });
}
