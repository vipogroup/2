'use client';

import { useState, useEffect } from 'react';

function LinkIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function CopyIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );
}

function PhoneIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

export default function TunnelButton() {
  const [loading, setLoading] = useState(false);
  const [tunnelUrl, setTunnelUrl] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Check if tunnel is already running on mount
  useEffect(() => {
    checkTunnelStatus();
  }, []);

  const checkTunnelStatus = async () => {
    try {
      const res = await fetch('/api/admin/tunnel', { credentials: 'include' });
      const data = await res.json();
      if (data.ok && data.url) {
        setTunnelUrl(data.url);
      }
    } catch (err) {
      // Ignore errors on status check
    }
  };

  const startTunnel = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/admin/tunnel', {
        method: 'POST',
        credentials: 'include',
      });
      
      const data = await res.json();
      
      if (data.ok && data.url) {
        setTunnelUrl(data.url);
      } else {
        setError(data.error || 'שגיאה ביצירת הקישור');
      }
    } catch (err) {
      setError('שגיאה בחיבור לשרת');
    } finally {
      setLoading(false);
    }
  };

  const stopTunnel = async () => {
    try {
      await fetch('/api/admin/tunnel', {
        method: 'DELETE',
        credentials: 'include',
      });
      setTunnelUrl(null);
    } catch (err) {
      // Ignore
    }
  };

  const copyToClipboard = async () => {
    if (tunnelUrl) {
      await navigator.clipboard.writeText(tunnelUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="p-2 rounded-lg"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
        >
          <PhoneIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">גישה מהמובייל</h3>
          <p className="text-sm text-gray-600">צור קישור לבדיקת האתר מהטלפון</p>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {tunnelUrl ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200">
            <LinkIcon className="w-5 h-5 text-cyan-600 flex-shrink-0" />
            <a 
              href={tunnelUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-cyan-600 hover:underline text-sm break-all flex-1"
              dir="ltr"
            >
              {tunnelUrl}
            </a>
            <button
              onClick={copyToClipboard}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              title="העתק קישור"
            >
              {copied ? (
                <CheckIcon className="w-4 h-4 text-green-600" />
              ) : (
                <CopyIcon className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={stopTunnel}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              סגור קישור
            </button>
            <button
              onClick={copyToClipboard}
              className="flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              {copied ? 'הועתק!' : 'העתק קישור'}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            פתח את הקישור בטלפון לבדיקת האתר והתראות Push
          </p>
        </div>
      ) : (
        <button
          onClick={startTunnel}
          disabled={loading}
          className="w-full px-4 py-3 text-white rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
        >
          {loading ? (
            <>
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              יוצר קישור...
            </>
          ) : (
            <>
              <LinkIcon className="w-5 h-5" />
              צור קישור למובייל
            </>
          )}
        </button>
      )}
    </div>
  );
}
