import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
import jwt from 'jsonwebtoken';
import { connectMongo } from '@/lib/mongoose';
import BrandingSettings from '@/models/BrandingSettings';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// GET - קבלת הגדרות צבעים (ציבורי - לכל המערכת)
export async function GET(request) {
  try {
    await connectMongo();
    
    // נסה לזהות משתמש מחובר
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value || cookieStore.get('token')?.value;
    let tenantId = null;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        tenantId = decoded.tenantId;
      } catch {
        // אין בעיה - נחזיר גלובלי
      }
    }
    
    // אם יש עסק - קבל את ההגדרות שלו
    let settings;
    if (tenantId) {
      settings = await BrandingSettings.getForTenant(tenantId);
    } else {
      settings = await BrandingSettings.getGlobal();
    }
    
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error getting branding:', error);
    
    // במקרה של שגיאה - החזר ברירות מחדל
    return NextResponse.json({
      settings: {
        colors: {
          primary: '#1e3a8a',
          secondary: '#0891b2',
          accent: '#6366f1',
        },
        statusColors: {
          success: '#16a34a',
          warning: '#f59e0b',
          error: '#dc2626',
          info: '#3b82f6',
        },
        gradient: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
      }
    });
  }
}
