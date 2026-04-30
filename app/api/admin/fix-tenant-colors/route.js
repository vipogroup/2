import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuthApi } from '@/lib/auth/server';
import { isSuperAdminUser } from '@/lib/superAdmins';

export const dynamic = 'force-dynamic';

const CORRECT_COLORS = {
  primaryColor: '#1e3a8a',
  secondaryColor: '#0891b2',
  accentColor: '#06b6d4',
  successColor: '#16a34a',
  warningColor: '#eab308',
  dangerColor: '#dc2626',
  backgroundColor: '#f7fbff',
  textColor: '#0d1b2a',
  useGlobalBranding: true,
};

export async function POST(request) {
  try {
    // בדיקת הרשאות - רק super_admin
    const user = await requireAuthApi(request);
    if (!isSuperAdminUser(user)) {
      return NextResponse.json({ error: 'רק מנהל ראשי יכול לבצע פעולה זו' }, { status: 403 });
    }

    const db = await getDb();
    
    // עדכון כל העסקים
    const result = await db.collection('tenants').updateMany(
      {},
      {
        $set: {
          'branding.primaryColor': CORRECT_COLORS.primaryColor,
          'branding.secondaryColor': CORRECT_COLORS.secondaryColor,
          'branding.accentColor': CORRECT_COLORS.accentColor,
          'branding.successColor': CORRECT_COLORS.successColor,
          'branding.warningColor': CORRECT_COLORS.warningColor,
          'branding.dangerColor': CORRECT_COLORS.dangerColor,
          'branding.backgroundColor': CORRECT_COLORS.backgroundColor,
          'branding.textColor': CORRECT_COLORS.textColor,
          'branding.useGlobalBranding': CORRECT_COLORS.useGlobalBranding,
          updatedAt: new Date(),
        }
      }
    );

    // עדכון גם את הגדרות הגלובליות
    await db.collection('settings').updateOne(
      { key: 'siteSettings' },
      {
        $set: {
          'value.primaryColor': CORRECT_COLORS.primaryColor,
          'value.secondaryColor': CORRECT_COLORS.secondaryColor,
          'value.accentColor': CORRECT_COLORS.accentColor,
          'value.successColor': CORRECT_COLORS.successColor,
          'value.warningColor': CORRECT_COLORS.warningColor,
          'value.dangerColor': CORRECT_COLORS.dangerColor,
          'value.backgroundColor': CORRECT_COLORS.backgroundColor,
          'value.textColor': CORRECT_COLORS.textColor,
          'value.themePreset': 'vipo-turquoise',
          updatedAt: new Date(),
        }
      },
      { upsert: true }
    );

    // עדכון BrandingSettings אם קיים
    await db.collection('brandingsettings').updateMany(
      {},
      {
        $set: {
          'colors.primary': CORRECT_COLORS.primaryColor,
          'colors.secondary': CORRECT_COLORS.secondaryColor,
          'colors.accent': CORRECT_COLORS.accentColor,
          updatedAt: new Date(),
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: `עודכנו ${result.modifiedCount} עסקים לצבעים כחול-טורקיז`,
      colors: CORRECT_COLORS,
    });

  } catch (error) {
    console.error('Error fixing tenant colors:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון צבעים' }, { status: 500 });
  }
}
