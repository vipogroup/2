#!/usr/bin/env node

import 'dotenv/config';
import { connectMongo } from '../lib/mongoose.js';
import User from '../models/User.js';

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

function transliterateToSlug(input = '') {
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

async function migrateAgentCoupons() {
  await connectMongo();

  const agents = await User.find({ role: 'agent' }).lean();
  if (!agents.length) {
    console.log('No agents found. Nothing to migrate.');
    process.exit(0);
  }

  const slugCounters = new Map();
  const bulkOps = [];

  for (const agent of agents) {
    const slugBase =
      agent.couponSlug || transliterateToSlug(agent.fullName || agent.phone || 'agent');

    const currentCounter = slugCounters.get(slugBase) || agent.couponSequence || 0;
    const nextCounter = currentCounter + 1;
    slugCounters.set(slugBase, nextCounter);

    const sequenceStr = String(nextCounter).padStart(3, '0');
    const couponCode = `${slugBase}-${sequenceStr}`;

    bulkOps.push({
      updateOne: {
        filter: { _id: agent._id },
        update: {
          $set: {
            couponCode,
            couponSlug: slugBase,
            couponSequence: nextCounter,
            discountPercent: agent.discountPercent ?? 10,
            commissionPercent: agent.commissionPercent ?? 10,
            couponStatus: agent.couponStatus || 'active',
          },
        },
      },
    });
  }

  if (bulkOps.length) {
    const result = await User.bulkWrite(bulkOps, { ordered: false });
    console.log('Migration completed. Modified documents:', result.modifiedCount ?? 0);
  } else {
    console.log('No operations to perform.');
  }

  process.exit(0);
}

migrateAgentCoupons().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
