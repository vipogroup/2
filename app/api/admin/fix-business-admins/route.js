import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/tenant/tenantMiddleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function POSTHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    
    // Only super admins can run this fix
    if (!isSuperAdmin(admin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDb();
    const users = db.collection('users');
    const tenants = db.collection('tenants');
    
    const results = {
      fixed: [],
      notFound: [],
      alreadyFixed: [],
      needsManualFix: []
    };
    
    // רשימת המנהלים שצריך לתקן
    const businessAdminEmails = [
      'admin123@vipo.local',
      'yb0527521153@gmail.com'
    ];
    
    for (const email of businessAdminEmails) {
      // מצא את המשתמש
      const user = await users.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        results.notFound.push(email);
        continue;
      }
      
      // בדוק אם כבר יש לו tenant
      if (user.tenantId) {
        const { ObjectId } = await import('mongodb');
        const tenant = await tenants.findOne({ _id: new ObjectId(user.tenantId) });
        if (tenant) {
          results.alreadyFixed.push({
            email,
            tenantName: tenant.name
          });
          continue;
        }
      }
      
      // חפש עסק מתאים
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
          results.fixed.push({
            email,
            tenantName: tenant.name
          });
          
          // עדכן גם את הטננט
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
        }
      } else {
        // אין עסק מתאים - לפחות שנה את התפקיד
        if (user.role !== 'business_admin') {
          await users.updateOne(
            { _id: user._id },
            { 
              $set: { 
                role: 'business_admin',
                updatedAt: new Date()
              } 
            }
          );
        }
        
        results.needsManualFix.push({
          email,
          currentRole: user.role,
          message: 'Changed to business_admin but no tenant found'
        });
      }
    }
    
    // Get statistics
    const systemUsers = await users.countDocuments({ 
      tenantId: { $exists: false },
      role: { $ne: 'business_admin' }
    });
    
    const businessAdminsWithTenant = await users.countDocuments({ 
      role: 'business_admin',
      tenantId: { $exists: true }
    });
    
    const businessAdminsWithoutTenant = await users.countDocuments({ 
      role: 'business_admin',
      tenantId: { $exists: false }
    });
    
    return NextResponse.json({
      success: true,
      results,
      statistics: {
        systemUsers,
        businessAdminsWithTenant,
        businessAdminsWithoutTenant
      }
    });
    
  } catch (error) {
    console.error('Fix business admins error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
