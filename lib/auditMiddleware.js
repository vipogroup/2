/**
 * Audit Middleware - Automatic activity logging for API routes
 * 
 * Usage:
 *   import { withAudit } from '@/lib/auditMiddleware';
 *   
 *   async function handler(req) { ... }
 *   export const POST = withAudit(handler, { action: 'create', entity: 'product' });
 */

import { getDb } from '@/lib/db';

// Extract user info from JWT token in request
async function getUserFromRequest(req) {
  const cookieHeader = req.headers.get('cookie') || '';
  const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/) || cookieHeader.match(/token=([^;]+)/);
  
  if (!tokenMatch) return null;
  
  try {
    const jwt = await import('jsonwebtoken');
    const token = tokenMatch[1];
    const payload = jwt.default.verify(token, process.env.JWT_SECRET);
    return {
      userId: payload.userId || payload.id || payload.sub,
      email: payload.email,
      role: payload.role
    };
  } catch {
    return null;
  }
}

// Get client IP
function getClientIp(req) {
  const forwarded = req.headers?.get?.('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers?.get?.('x-real-ip') || 'unknown';
}

// Log activity to database
async function logActivity(data) {
  try {
    const db = await getDb();
    await db.collection('activity_logs').insertOne({
      ...data,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('[AuditMiddleware] Failed to log activity:', error.message);
  }
}

/**
 * Wrap an API handler with automatic audit logging
 * @param {Function} handler - The API route handler
 * @param {Object} options - Audit options
 * @param {string} options.action - Action type (create, update, delete, login, etc.)
 * @param {string} options.entity - Entity type (user, product, order, etc.)
 * @param {Function} options.getDescription - Optional function to generate description from request/response
 * @param {Function} options.getEntityId - Optional function to extract entity ID from request
 */
export function withAudit(handler, options = {}) {
  return async function auditedHandler(req, context) {
    const startTime = Date.now();
    const user = await getUserFromRequest(req);
    const ip = getClientIp(req);
    const url = req.url;
    const method = req.method;
    
    let response;
    let error = null;
    let body = null;
    
    // Try to parse request body for context
    try {
      const clonedReq = req.clone();
      body = await clonedReq.json().catch(() => null);
    } catch {}
    
    try {
      // Execute the original handler
      response = await handler(req, context);
      
      // Log successful action
      const responseData = response ? await response.clone().json().catch(() => ({})) : {};
      
      await logActivity({
        action: options.action || method.toLowerCase(),
        entity: options.entity || 'unknown',
        entityId: options.getEntityId ? options.getEntityId(body, responseData, context) : responseData._id || responseData.id || null,
        userId: user?.userId || null,
        userEmail: user?.email || null,
        userRole: user?.role || null,
        description: options.getDescription 
          ? options.getDescription(body, responseData, context)
          : `${options.action || method} on ${options.entity || 'resource'}`,
        metadata: {
          method,
          url,
          ip,
          duration: Date.now() - startTime,
          success: true,
          statusCode: response?.status || 200
        }
      });
      
      return response;
    } catch (err) {
      error = err;
      
      // Log failed action
      await logActivity({
        action: options.action || method.toLowerCase(),
        entity: options.entity || 'unknown',
        entityId: null,
        userId: user?.userId || null,
        userEmail: user?.email || null,
        userRole: user?.role || null,
        description: `Failed: ${options.action || method} on ${options.entity || 'resource'}`,
        metadata: {
          method,
          url,
          ip,
          duration: Date.now() - startTime,
          success: false,
          error: err.message
        }
      });
      
      throw err;
    }
  };
}

/**
 * Simple function to manually log an activity
 * Use this when you need more control over what gets logged
 */
export async function logAdminActivity(options) {
  const {
    action,
    entity,
    entityId,
    userId,
    userEmail,
    description,
    metadata = {}
  } = options;
  
  await logActivity({
    action,
    entity,
    entityId: entityId || null,
    userId: userId || null,
    userEmail: userEmail || null,
    description: description || `${action} on ${entity}`,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString()
    }
  });
}

// Pre-configured audit wrappers for common operations
export const auditPresets = {
  createUser: { action: 'create', entity: 'user', getDescription: (body) => `יצירת משתמש: ${body?.email || 'unknown'}` },
  updateUser: { action: 'update', entity: 'user', getDescription: (body) => `עדכון משתמש: ${body?.email || body?.userId || 'unknown'}` },
  deleteUser: { action: 'delete', entity: 'user', getDescription: (body) => `מחיקת משתמש: ${body?.email || body?.userId || 'unknown'}` },
  
  createProduct: { action: 'create', entity: 'product', getDescription: (body) => `יצירת מוצר: ${body?.name || 'unknown'}` },
  updateProduct: { action: 'update', entity: 'product', getDescription: (body) => `עדכון מוצר: ${body?.name || body?.id || 'unknown'}` },
  deleteProduct: { action: 'delete', entity: 'product', getDescription: (body) => `מחיקת מוצר: ${body?.name || body?.id || 'unknown'}` },
  
  createOrder: { action: 'create', entity: 'order', getDescription: (body, res) => `הזמנה חדשה: ${res?.orderId || 'unknown'}` },
  updateOrder: { action: 'update', entity: 'order', getDescription: (body) => `עדכון הזמנה: ${body?.orderId || body?.id || 'unknown'}` },
  
  login: { action: 'login', entity: 'auth', getDescription: (body) => `התחברות: ${body?.email || 'unknown'}` },
  logout: { action: 'logout', entity: 'auth', getDescription: () => 'התנתקות מהמערכת' },
  
  settings: { action: 'settings', entity: 'system', getDescription: (body) => `שינוי הגדרות: ${Object.keys(body || {}).join(', ')}` },
  backup: { action: 'backup', entity: 'system', getDescription: () => 'גיבוי מערכת' },
  deploy: { action: 'deploy', entity: 'system', getDescription: () => 'Deploy לפרודקשן' },
};
