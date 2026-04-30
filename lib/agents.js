import { ObjectId } from 'mongodb';
import { connectMongo } from '@/lib/mongoose';
import User from '@/models/User';
import Tenant from '@/models/Tenant';
import AgentBusiness from '@/models/AgentBusiness';

export const DEFAULT_AGENT_DISCOUNT_PERCENT = 10;
export const DEFAULT_AGENT_COMMISSION_PERCENT = 12;

const transliterationMap = {
  א: 'a',
  ב: 'b',
  ג: 'g',
  ד: 'd',
  ה: 'h',
  ו: 'v',
  ז: 'z',
  ח: 'ch',
  ט: 't',
  י: 'y',
  כ: 'k',
  ך: 'k',
  ל: 'l',
  מ: 'm',
  ם: 'm',
  נ: 'n',
  ן: 'n',
  ס: 's',
  ע: 'a',
  פ: 'p',
  ף: 'p',
  צ: 'ts',
  ץ: 'ts',
  ק: 'k',
  ר: 'r',
  ש: 'sh',
  ת: 't',
};

export function transliterateToSlug(input = '') {
  if (!input) return 'agent';

  const normalized = input
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => {
      if (transliterationMap[char]) return transliterationMap[char];
      if (/[a-z0-9]/.test(char)) return char;
      if (char === ' ') return '-';
      if (/[-_]/.test(char)) return char;
      return '';
    })
    .join('');

  const collapsed = normalized.replace(/[-_]{2,}/g, '-');
  const trimmed = collapsed.replace(/^-+|-+$/g, '');
  return trimmed || 'agent';
}

export async function generateAgentCoupon({ fullName, agentId }) {
  if (!fullName || typeof fullName !== 'string') {
    throw new Error('generateAgentCoupon: fullName is required');
  }

  await connectMongo();

  const slugBase = transliterateToSlug(fullName);

  const existing = await User.aggregate([
    { $match: { couponSlug: slugBase } },
    { $group: { _id: null, maxSeq: { $max: '$couponSequence' } } },
  ]);

  const nextSeq = (existing[0]?.maxSeq || 0) + 1;
  const sequenceStr = String(nextSeq).padStart(3, '0');
  const couponCode = `${slugBase}-${sequenceStr}`;

  let currentAgent = null;
  if (agentId) {
    currentAgent = await User.findById(agentId).lean();
    await User.updateOne(
      { _id: new ObjectId(agentId) },
      {
        $set: {
          couponCode,
          couponSlug: slugBase,
          couponSequence: nextSeq,
          ...(currentAgent?.couponStatus ? {} : { couponStatus: 'active' }),
          ...(currentAgent?.discountPercent == null
            ? { discountPercent: DEFAULT_AGENT_DISCOUNT_PERCENT }
            : {}),
          ...(currentAgent?.commissionPercent == null
            ? { commissionPercent: DEFAULT_AGENT_COMMISSION_PERCENT }
            : {}),
        },
      },
    );
  }

  return { couponCode, couponSlug: slugBase, couponSequence: nextSeq };
}

/**
 * הצטרפות אוטומטית של סוכן לכל העסקים הפעילים
 * נקרא בעת הרשמה כסוכן
 * @param {Object} params
 * @param {string|ObjectId} params.agentId - מזהה הסוכן
 * @param {string} params.fullName - שם הסוכן ליצירת קופון
 * @returns {Promise<{joined: number, coupons: Array}>}
 */
export async function joinAgentToAllTenants({ agentId, fullName }) {
  if (!agentId) {
    throw new Error('joinAgentToAllTenants: agentId is required');
  }

  await connectMongo();

  const agentObjectId = typeof agentId === 'string' ? new ObjectId(agentId) : agentId;
  
  // מציאת כל העסקים הפעילים
  const activeTenants = await Tenant.find({ status: 'active' }).lean();
  
  if (activeTenants.length === 0) {
    console.log('JOIN_ALL_TENANTS: No active tenants found');
    return { joined: 0, coupons: [] };
  }

  const results = [];
  const slugBase = transliterateToSlug(fullName || 'agent');

  for (const tenant of activeTenants) {
    try {
      // בדיקה אם הסוכן כבר מחובר לעסק הזה
      const existingConnection = await AgentBusiness.findOne({
        agentId: agentObjectId,
        tenantId: tenant._id,
      });

      if (existingConnection) {
        console.log(`JOIN_ALL_TENANTS: Agent ${agentId} already connected to tenant ${tenant.slug}`);
        results.push({
          tenantId: tenant._id.toString(),
          tenantSlug: tenant.slug,
          couponCode: existingConnection.couponCode,
          status: 'already_connected',
        });
        continue;
      }

      // יצירת קופון ייחודי לעסק הזה
      // פורמט: [שם]-[tenant-slug]-[מספר סידורי]
      const tenantSlugShort = tenant.slug.slice(0, 10);
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const couponCode = `${slugBase}-${tenantSlugShort}-${randomSuffix}`;

      // יצירת חיבור סוכן-עסק
      const agentBusiness = await AgentBusiness.create({
        agentId: agentObjectId,
        tenantId: tenant._id,
        couponCode,
        commissionPercent: tenant.agentSettings?.defaultCommissionPercent || DEFAULT_AGENT_COMMISSION_PERCENT,
        status: 'active',
        joinedAt: new Date(),
      });

      console.log(`JOIN_ALL_TENANTS: Agent ${agentId} joined tenant ${tenant.slug} with coupon ${couponCode}`);
      
      results.push({
        tenantId: tenant._id.toString(),
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
        couponCode,
        status: 'joined',
      });
    } catch (err) {
      console.error(`JOIN_ALL_TENANTS: Error joining tenant ${tenant.slug}:`, err.message);
      results.push({
        tenantId: tenant._id.toString(),
        tenantSlug: tenant.slug,
        status: 'error',
        error: err.message,
      });
    }
  }

  const joinedCount = results.filter(r => r.status === 'joined').length;
  console.log(`JOIN_ALL_TENANTS: Agent ${agentId} joined ${joinedCount} tenants`);

  return { 
    joined: joinedCount, 
    coupons: results.filter(r => r.status === 'joined' || r.status === 'already_connected'),
  };
}
