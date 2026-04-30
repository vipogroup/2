import { getDb } from '../lib/db.js';
import { ObjectId } from 'mongodb';

async function fixBusinessAdmins() {
  try {
    const db = await getDb();
    const users = db.collection('users');
    const tenants = db.collection('tenants');
    
    console.log('🔍 מחפש מנהלי עסק שצריך לתקן...');
    
    // רשימת המנהלים שצריך לתקן
    const businessAdminEmails = [
      'admin123@vipo.local',
      'yb0527521153@gmail.com'
    ];
    
    for (const email of businessAdminEmails) {
      console.log(`\n📧 מטפל ב-${email}...`);
      
      // מצא את המשתמש
      const user = await users.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        console.log(`❌ משתמש ${email} לא נמצא`);
        continue;
      }
      
      console.log(`✅ נמצא משתמש: ${user.fullName || user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   TenantId: ${user.tenantId || 'אין'}`);
      
      // בדוק אם כבר יש לו tenant
      if (user.tenantId) {
        const tenant = await tenants.findOne({ _id: new ObjectId(user.tenantId) });
        if (tenant) {
          console.log(`   ✅ כבר משויך לעסק: ${tenant.name}`);
          continue;
        }
      }
      
      // חפש עסק לפי אימייל או שם
      let tenant = await tenants.findOne({ 
        $or: [
          { adminEmail: email },
          { email: email },
          { adminEmails: email }
        ]
      });
      
      if (!tenant && user.fullName) {
        // נסה למצוא לפי שם
        tenant = await tenants.findOne({
          $or: [
            { name: { $regex: user.fullName, $options: 'i' } },
            { adminName: { $regex: user.fullName, $options: 'i' } }
          ]
        });
      }
      
      if (tenant) {
        console.log(`   🏢 נמצא עסק מתאים: ${tenant.name}`);
        
        // עדכן את המשתמש
        const updateResult = await users.updateOne(
          { _id: user._id },
          { 
            $set: { 
              tenantId: tenant._id,
              role: 'business_admin',
              updatedAt: new Date()
            } 
          }
        );
        
        if (updateResult.modifiedCount > 0) {
          console.log(`   ✅ המשתמש עודכן בהצלחה!`);
          
          // עדכן גם את הטננט אם צריך
          await tenants.updateOne(
            { _id: tenant._id },
            { 
              $set: { 
                adminUserId: user._id,
                adminEmail: email,
                updatedAt: new Date()
              }
            }
          );
        } else {
          console.log(`   ⚠️ לא בוצע עדכון`);
        }
      } else {
        console.log(`   ⚠️ לא נמצא עסק מתאים - צריך ליצור עסק חדש או לשייך ידנית`);
        
        // אם אין עסק, לפחות שנה את התפקיד
        if (user.role === 'admin') {
          await users.updateOne(
            { _id: user._id },
            { 
              $set: { 
                role: 'business_admin',
                updatedAt: new Date()
              } 
            }
          );
          console.log(`   ✅ תפקיד שונה ל-business_admin`);
        }
      }
    }
    
    console.log('\n📊 סיכום:');
    
    // הצג סטטיסטיקות
    const systemUsers = await users.find({ 
      tenantId: { $exists: false },
      role: { $ne: 'business_admin' }
    }).toArray();
    
    const businessAdminsWithoutTenant = await users.find({ 
      role: 'business_admin',
      tenantId: { $exists: false }
    }).toArray();
    
    const businessAdminsWithTenant = await users.find({ 
      role: 'business_admin',
      tenantId: { $exists: true }
    }).toArray();
    
    console.log(`משתמשי מערכת: ${systemUsers.length}`);
    console.log(`מנהלי עסק עם tenant: ${businessAdminsWithTenant.length}`);
    console.log(`מנהלי עסק ללא tenant: ${businessAdminsWithoutTenant.length}`);
    
    if (businessAdminsWithoutTenant.length > 0) {
      console.log('\n⚠️ מנהלי עסק שעדיין צריך לטפל בהם:');
      businessAdminsWithoutTenant.forEach(admin => {
        console.log(`   - ${admin.email || admin.phone} (${admin.fullName || 'ללא שם'})`);
      });
    }
    
    console.log('\n✅ סיום!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ שגיאה:', error);
    process.exit(1);
  }
}

// הרץ את התיקון
fixBusinessAdmins();
