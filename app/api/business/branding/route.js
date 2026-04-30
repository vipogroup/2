import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Default colors - 8 קטגוריות מלאות
const DEFAULT_COLORS = {
  primary: '#1e3a8a',
  secondary: '#0891b2',
  accent: '#06b6d4',
  success: '#16a34a',
  warning: '#eab308',
  danger: '#dc2626',
  background: '#f7fbff',
  text: '#0d1b2a',
};

// בדיקת הרשאות מנהל עסק
async function checkBusinessAuth(request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value || cookieStore.get('token')?.value;
  
  if (!token) {
    return null;
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!['admin', 'super_admin', 'business_admin', 'business'].includes(decoded.role)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

// GET - קבלת הגדרות לעסק
export async function GET(request) {
  try {
    const user = await checkBusinessAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const db = await getDb();
    
    // Get tenantId from user or from query param (for super_admin)
    const { searchParams } = new URL(request.url);
    let tenantId = user.tenantId || searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant ID' }, { status: 400 });
    }
    
    // קבל הגדרות מה-tenant עצמו
    const tenant = await db.collection('tenants').findOne({ 
      _id: new ObjectId(tenantId) 
    });
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    
    // Build settings from tenant.branding
    const tenantSettings = {
      colors: {
        primary: tenant.branding?.primaryColor || DEFAULT_COLORS.primary,
        secondary: tenant.branding?.secondaryColor || DEFAULT_COLORS.secondary,
        accent: tenant.branding?.accentColor || DEFAULT_COLORS.accent,
        success: tenant.branding?.successColor || DEFAULT_COLORS.success,
        warning: tenant.branding?.warningColor || DEFAULT_COLORS.warning,
        danger: tenant.branding?.dangerColor || DEFAULT_COLORS.danger,
        background: tenant.branding?.backgroundColor || DEFAULT_COLORS.background,
        text: tenant.branding?.textColor || DEFAULT_COLORS.text,
      },
      logo: {
        url: tenant.branding?.logo || '',
        maxWidth: 150,
      },
      useGlobalBranding: tenant.branding?.useGlobalBranding ?? true,
    };
    
    // Global settings (defaults)
    const globalSettings = {
      colors: DEFAULT_COLORS,
    };
    
    return NextResponse.json({
      settings: tenantSettings,
      tenantSettings,
      globalSettings,
      isUsingGlobal: tenantSettings.useGlobalBranding,
    });
  } catch (error) {
    console.error('Error getting business branding:', error);
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 });
  }
}

// POST - עדכון הגדרות עסק - שומר ישירות ל-tenants.branding
export async function POST(request) {
  try {
    const user = await checkBusinessAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const db = await getDb();
    const body = await request.json();
    const { useGlobalBranding, colors, logo, tenantId: bodyTenantId } = body;
    
    // Get tenantId from user or from body (for super_admin)
    const tenantId = user.tenantId || bodyTenantId;
    
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant ID' }, { status: 400 });
    }
    
    // Build update for tenant.branding
    const brandingUpdate = {
      useGlobalBranding: useGlobalBranding === true,
    };
    
    if (!useGlobalBranding && colors) {
      brandingUpdate.primaryColor = colors.primary;
      brandingUpdate.secondaryColor = colors.secondary;
      brandingUpdate.accentColor = colors.accent;
      brandingUpdate.successColor = colors.success;
      brandingUpdate.warningColor = colors.warning;
      brandingUpdate.dangerColor = colors.danger;
      brandingUpdate.backgroundColor = colors.background;
      brandingUpdate.textColor = colors.text;
    }
    
    if (logo?.url) {
      brandingUpdate.logo = logo.url;
    }
    
    // Update tenant document directly
    await db.collection('tenants').updateOne(
      { _id: new ObjectId(tenantId) },
      { 
        $set: { 
          branding: brandingUpdate,
          updatedAt: new Date(),
        } 
      }
    );
    
    const message = useGlobalBranding 
      ? 'העסק משתמש כעת בעיצוב הגלובלי'
      : 'הגדרות העיצוב של העסק עודכנו בהצלחה';
    
    return NextResponse.json({
      success: true,
      settings: {
        colors: colors || DEFAULT_COLORS,
        useGlobalBranding: brandingUpdate.useGlobalBranding,
      },
      message,
    });
  } catch (error) {
    console.error('Error updating business branding:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
