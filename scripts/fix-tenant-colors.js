/**
 * סקריפט לעדכון צבעי מיתוג לכל העסקים הקיימים
 * מעדכן את כל ה-tenants לצבעים הנכונים (כחול-טורקיז)
 * 
 * הרצה: node scripts/fix-tenant-colors.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

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

async function fixTenantColors() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI לא מוגדר ב-.env');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ מחובר ל-MongoDB');

    const db = client.db();
    const tenantsCollection = db.collection('tenants');

    // ספור כמה עסקים יש
    const totalCount = await tenantsCollection.countDocuments();
    console.log(`📊 סה"כ עסקים במערכת: ${totalCount}`);

    // עדכן את כל העסקים
    const result = await tenantsCollection.updateMany(
      {}, // כל העסקים
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

    console.log(`✅ עודכנו ${result.modifiedCount} עסקים`);
    console.log('');
    console.log('📋 צבעים חדשים:');
    console.log(`   Primary:    ${CORRECT_COLORS.primaryColor} (כחול כהה)`);
    console.log(`   Secondary:  ${CORRECT_COLORS.secondaryColor} (טורקיז)`);
    console.log(`   Accent:     ${CORRECT_COLORS.accentColor} (טורקיז בהיר)`);
    console.log(`   Success:    ${CORRECT_COLORS.successColor} (ירוק)`);
    console.log(`   Warning:    ${CORRECT_COLORS.warningColor} (צהוב)`);
    console.log(`   Danger:     ${CORRECT_COLORS.dangerColor} (אדום)`);
    console.log(`   Background: ${CORRECT_COLORS.backgroundColor} (לבן-כחלחל)`);
    console.log(`   Text:       ${CORRECT_COLORS.textColor} (כהה)`);
    console.log('');
    console.log('🎉 הסקריפט הסתיים בהצלחה!');

  } catch (error) {
    console.error('❌ שגיאה:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

fixTenantColors();
