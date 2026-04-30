'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY_ZOOM = 'admin-page-zoom';
const STORAGE_KEY_LOCKED = 'admin-zoom-locked';
const STORAGE_KEY_POS = 'admin-zoom-position';
const ZOOM_EVENT = 'admin-zoom-change';

export default function ZoomControl({ onZoomChange }) {
  const [zoom, setZoom] = useState(1.0);
  const [locked, setLocked] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: -80 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const controlRef = useRef(null);

  useEffect(() => {
    const savedZoom = localStorage.getItem(STORAGE_KEY_ZOOM);
    const savedLocked = localStorage.getItem(STORAGE_KEY_LOCKED);
    const savedPos = localStorage.getItem(STORAGE_KEY_POS);
    if (savedZoom) setZoom(parseFloat(savedZoom));
    if (savedLocked) setLocked(savedLocked === 'true');
    if (savedPos) {
      try { setPosition(JSON.parse(savedPos)); } catch {}
    }
  }, []);

  useEffect(() => {
    onZoomChange?.(zoom);

    try {
      window.dispatchEvent(new CustomEvent(ZOOM_EVENT, { detail: zoom }));
    } catch (_) {}
  }, [zoom, onZoomChange]);

  useEffect(() => {
    const onExternalZoom = (e) => {
      const next = typeof e?.detail === 'number' ? e.detail : parseFloat(e?.detail);
      if (!Number.isFinite(next)) return;
      setZoom((prev) => (prev === next ? prev : next));
    };

    window.addEventListener(ZOOM_EVENT, onExternalZoom);
    return () => window.removeEventListener(ZOOM_EVENT, onExternalZoom);
  }, []);

  const updateZoom = useCallback((delta) => {
    if (locked) return;
    setZoom(prev => {
      const next = Math.round(Math.max(0.5, Math.min(1.3, prev + delta)) * 100) / 100;
      localStorage.setItem(STORAGE_KEY_ZOOM, String(next));
      return next;
    });
  }, [locked]);

  const toggleLock = useCallback(() => {
    setLocked(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY_LOCKED, String(next));
      return next;
    });
  }, []);

  const onMouseDown = useCallback((e) => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    const rect = controlRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const x = e.clientX - dragOffset.current.x;
      const y = e.clientY - dragOffset.current.y;
      const newPos = { x, y };
      setPosition(newPos);
      localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(newPos));
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      if (!e.touches[0]) return;
      const x = e.touches[0].clientX - dragOffset.current.x;
      const y = e.touches[0].clientY - dragOffset.current.y;
      const newPos = { x, y };
      setPosition(newPos);
      localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(newPos));
    };
    const onUp = () => setDragging(false);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging]);

  const onTouchStart = useCallback((e) => {
    if (e.target.closest('button')) return;
    const touch = e.touches[0];
    if (!touch) return;
    const rect = controlRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffset.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    setDragging(true);
  }, []);

  return (
    <div
      ref={controlRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      className="fixed z-[9999] select-none"
      style={{
        left: position.x,
        top: position.y,
        cursor: dragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
    >
      <div
        className="flex items-center gap-0.5 rounded-lg shadow-lg border border-gray-200 p-1"
        style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <button
          onClick={() => updateZoom(-0.05)}
          disabled={locked}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="הקטן"
        >
          <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
        </button>

        <span className="text-[10px] font-bold text-gray-500 w-9 text-center">{Math.round(zoom * 100)}%</span>

        <button
          onClick={() => updateZoom(0.05)}
          disabled={locked}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="הגדל"
        >
          <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>

        <div className="w-px h-5 mx-0.5" style={{ background: '#e2e8f0' }} />

        <button
          onClick={toggleLock}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 transition-all"
          title={locked ? 'בטל נעילה' : 'נעל גודל'}
        >
          {locked ? (
            <svg className="w-3.5 h-3.5" style={{ color: '#1e3a8a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
          )}
        </button>
      </div>
    </div>
  );
}
