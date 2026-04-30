// Error Logger Utility
// Automatically logs errors to the database

const LOG_ENDPOINT = '/api/admin/error-logs';

// Log levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info'
};

// Log an error to the database
export async function logError(error, options = {}) {
  const {
    level = LOG_LEVELS.ERROR,
    source = 'client',
    url = typeof window !== 'undefined' ? window.location.href : null,
    userId = null,
    metadata = {}
  } = options;

  try {
    const logData = {
      level,
      message: error?.message || String(error),
      source,
      stack: error?.stack || null,
      url,
      userId,
      metadata: {
        ...metadata,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        timestamp: new Date().toISOString()
      }
    };

    // Send to API (fire and forget)
    fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    }).catch(() => {
      // Silently fail - don't create infinite loop
      console.error('[ErrorLogger] Failed to send log to server');
    });

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorLogger]', logData);
    }

    return true;
  } catch (e) {
    console.error('[ErrorLogger] Failed to log error:', e);
    return false;
  }
}

// Log a warning
export function logWarning(message, options = {}) {
  return logError({ message }, { ...options, level: LOG_LEVELS.WARN });
}

// Log info
export function logInfo(message, options = {}) {
  return logError({ message }, { ...options, level: LOG_LEVELS.INFO });
}

// Server-side error logger (for API routes)
export async function logServerError(error, req, options = {}) {
  const { getDb } = await import('@/lib/db');
  
  try {
    const db = await getDb();
    
    const logEntry = {
      level: options.level || LOG_LEVELS.ERROR,
      message: error?.message || String(error),
      source: options.source || 'server',
      stack: error?.stack || null,
      url: req?.url || options.url || null,
      userId: options.userId || null,
      metadata: {
        method: req?.method,
        headers: req?.headers ? Object.fromEntries(req.headers) : null,
        ...options.metadata
      },
      resolved: false,
      createdAt: new Date()
    };

    await db.collection('error_logs').insertOne(logEntry);
    
    // Log to console
    console.error('[ServerError]', logEntry.message);
    
    return true;
  } catch (e) {
    console.error('[ErrorLogger] Failed to log server error:', e);
    return false;
  }
}

// Global error handler for Next.js client
export function setupGlobalErrorHandler() {
  if (typeof window === 'undefined') return;

  // Handle unhandled errors
  window.onerror = function(message, source, lineno, colno, error) {
    logError(error || { message }, {
      source: 'window.onerror',
      metadata: { source, lineno, colno }
    });
    return false;
  };

  // Handle unhandled promise rejections
  window.onunhandledrejection = function(event) {
    logError(event.reason, {
      source: 'unhandledrejection',
      metadata: { type: 'promise' }
    });
  };
}

// Helper function to create system alerts (for use in server-side code)
export async function createSystemAlert(type, title, message, source = 'system', metadata = {}) {
  try {
    const { getDb } = await import('@/lib/db');
    const db = await getDb();
    
    await db.collection('system_alerts').insertOne({
      type,
      title,
      message,
      source,
      metadata,
      read: false,
      createdAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Failed to create system alert:', error);
    return false;
  }
}
