import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getDb } from '@/lib/db';
import { sendTemplateNotification } from '@/lib/notifications/dispatcher';
import { pushToUsers } from '@/lib/pushSender';
import { apiDebugLog } from '@/lib/apiDebugLog';

/**
 * NextAuth configuration for Google OAuth
 * Includes legacy JWT bridge for compatibility with existing auth system
 */

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
      },
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    /**
     * Sign-in callback - handles user upsert and referral attribution
     */
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'google') {
        return true;
      }

      const email = user.email?.toLowerCase().trim();
      if (!email) {
        console.error('[GOOGLE_AUTH] No email from Google');
        return false;
      }

      // Allow sign-in first, handle DB operations in background
      // This prevents DB errors from blocking OAuth
      try {
        apiDebugLog('[GOOGLE_AUTH] Starting DB operations for:', email);
        const db = await getDb();
        apiDebugLog('[GOOGLE_AUTH] DB connection established');
        const users = db.collection('users');

        // Check if user exists
        let existingUser = await users.findOne({ email });
        apiDebugLog('[GOOGLE_AUTH] Existing user check:', existingUser ? 'FOUND' : 'NOT FOUND', 'email:', email);
        if (existingUser) {
          apiDebugLog('[GOOGLE_AUTH] Existing user details:', {
            id: String(existingUser._id),
            role: existingUser.role,
            provider: existingUser.provider,
            createdAt: existingUser.createdAt,
          });
        }

        if (!existingUser) {
          // Create new user using upsert to handle race conditions
          const newUserData = {
            fullName: user.name || email.split('@')[0],
            email,
            phone: null,
            role: 'customer',
            passwordHash: null,
            provider: 'google',
            providerAccountId: account.providerAccountId,
            image: user.image || null,
            isActive: true,
            referredBy: null,
            referralsCount: 0,
            referralCount: 0,
            commissionBalance: 0,
            onboardingCompletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          let newUserId;
          let isNewUser = false;

          try {
            // Use findOneAndUpdate with upsert to avoid duplicate key errors
            const result = await users.findOneAndUpdate(
              { email },
              { 
                $setOnInsert: newUserData 
              },
              { 
                upsert: true, 
                returnDocument: 'after' 
              }
            );
            
            newUserId = result._id;
            // Check if this was a new insert by comparing createdAt
            const timeDiff = Date.now() - new Date(result.createdAt).getTime();
            isNewUser = timeDiff < 5000; // Created in last 5 seconds = new user
            
            apiDebugLog('[GOOGLE_AUTH] User upsert result:', email, 'ID:', String(newUserId), 'isNew:', isNewUser);
          } catch (insertErr) {
            // If upsert fails, try to find existing user
            console.error('[GOOGLE_AUTH] Upsert error, trying findOne:', insertErr.message);
            const existingAfterError = await users.findOne({ email });
            if (existingAfterError) {
              newUserId = existingAfterError._id;
              isNewUser = false;
            } else {
              throw insertErr;
            }
          }

          // Only send notifications for truly new users
          apiDebugLog('[GOOGLE_AUTH] Notification check:', { isNewUser, newUserId: String(newUserId), email });
          if (isNewUser && newUserId) {
            apiDebugLog('[GOOGLE_AUTH] New user created, sending notifications:', email);
            
            // Create admin notification for new Google user
            try {
              const notifications = db.collection('notifications');
              await notifications.insertOne({
                type: 'new_user',
                message: `נרשם משתמש חדש (Google): ${newUserData.fullName || email}`,
                payload: {
                  userId: newUserId,
                  email: newUserData.email,
                  fullName: newUserData.fullName,
                  provider: 'google',
                },
                read: false,
                tenantId: null,
                __v: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              apiDebugLog('[GOOGLE_AUTH] Admin notification created for new user');
            } catch (notifyErr) {
              console.error('[GOOGLE_AUTH] Notification error:', notifyErr.message);
            }

            // Send push notifications
            try {
              // 1. Welcome notification to new user
              await pushToUsers([String(newUserId)], {
                title: 'ברוכים הבאים ל-VIPO!',
                body: `שלום ${newUserData.fullName || 'משתמש יקר'}, ההרשמה שלך הושלמה בהצלחה!`,
                icon: '/icons/192.png',
                url: '/shop',
                data: { type: 'welcome_user', userId: String(newUserId) },
              });

              // 2. Admin notification about new Google registration
              await sendTemplateNotification({
                templateType: 'admin_new_registration',
                variables: {
                  user_type: 'לקוח (Google)',
                  datetime: new Date().toLocaleString('he-IL'),
                },
                audienceRoles: ['admin'],
                payloadOverrides: {
                  url: '/admin/users',
                  data: {
                    userId: String(newUserId),
                    userType: 'customer',
                    provider: 'google',
                  },
                },
              });
              apiDebugLog('[GOOGLE_AUTH] Push notifications sent for new user');
            } catch (pushErr) {
              console.error('[GOOGLE_AUTH] Push error:', pushErr.message);
            }
          } else {
            apiDebugLog('[GOOGLE_AUTH] User already existed, skipping notifications:', email);
          }
        } else {
          // Update existing user with provider info if missing
          if (!existingUser.provider) {
            await users.updateOne(
              { _id: existingUser._id },
              {
                $set: {
                  provider: 'google',
                  providerAccountId: account.providerAccountId,
                  image: user.image || existingUser.image,
                  updatedAt: new Date(),
                },
              }
            );
          }
          apiDebugLog('[GOOGLE_AUTH] Existing user signed in:', email);
        }
      } catch (error) {
        // Log error but still allow sign-in
        console.error('[GOOGLE_AUTH] DB error (allowing sign-in anyway):', error.message);
      }

      // Always return true to allow OAuth sign-in
      return true;
    },

    /**
     * JWT callback - adds user data to token
     * Refreshes user data from DB on every token refresh to ensure role is up-to-date
     */
    async jwt({ token, user, account }) {
      // Get email from account (first login) or from existing token
      const email = user?.email?.toLowerCase().trim() || token?.email?.toLowerCase().trim();
      
      if (email) {
        try {
          const db = await getDb();
          const users = db.collection('users');
          const dbUser = await users.findOne(
            { email },
            { projection: { _id: 1, role: 1, fullName: 1, onboardingCompletedAt: 1 } }
          );

          if (dbUser) {
            // Always update token with latest DB values
            token.userId = String(dbUser._id);
            token.role = dbUser.role || 'customer';
            token.fullName = dbUser.fullName;
            token.onboardingCompletedAt = dbUser.onboardingCompletedAt;
            token.email = email; // Store email for future refreshes
            apiDebugLog('[GOOGLE_AUTH] JWT refreshed for:', email, 'role:', token.role);
          } else {
            // User was deleted from DB - reset to customer defaults
            apiDebugLog('[GOOGLE_AUTH] User not found in DB, resetting token:', email);
            token.role = 'customer';
            token.userId = null;
            token.email = email;
          }
        } catch (e) {
          console.error('[GOOGLE_AUTH] JWT callback error:', e.message);
        }
      }

      return token;
    },

    /**
     * Session callback - exposes user data to client
     */
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.fullName = token.fullName;
        session.user.onboardingCompletedAt = token.onboardingCompletedAt;
      }
      return session;
    },

    /**
     * Redirect callback - handles post-login routing
     * Redirects to /auth/complete-google to finish registration (update phone, process referral)
     */
    async redirect({ url, baseUrl }) {
      // Handle both absolute and relative URLs
      if (url.startsWith('/')) {
        // Relative URL - append to baseUrl
        return baseUrl + url;
      }
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Redirect to complete-google page to finish registration
      return baseUrl + '/auth/complete-google';
    },
  },

  // Note: Legacy cookie bridge removed - using NextAuth tokens directly
  // The requireAuthApi function now supports both NextAuth and legacy tokens
});

export { handler as GET, handler as POST };
