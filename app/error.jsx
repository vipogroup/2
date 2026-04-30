'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Error Icon */}
        <div className="mb-8">
          <div 
            className="w-32 h-32 mx-auto rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)' }}
          >
            <span className="text-6xl text-red-500">!</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          משהו השתבש
        </h1>

        <p className="text-gray-600 mb-8">
          מצטערים, אירעה שגיאה בלתי צפויה. אנחנו עובדים על לתקן את זה.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 rounded-2xl text-white font-semibold shadow-lg transition-transform hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          >
            נסה שוב
          </button>
          <a
            href="/"
            className="px-6 py-3 rounded-2xl font-semibold border-2 transition-transform hover:scale-105"
            style={{ borderColor: '#1e3a8a', color: '#1e3a8a' }}
          >
            חזרה לדף הבית
          </a>
        </div>

        {/* Error Details (dev only) */}
        {process.env.NODE_ENV === 'development' && error?.message && (
          <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-xl text-right">
            <p className="text-sm font-semibold text-red-800 mb-2">פרטי השגיאה:</p>
            <p className="text-xs text-red-600 font-mono break-all">
              {error.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
