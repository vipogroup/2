import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/db';
import { verify as verifyJwt } from '@/lib/auth/createToken';
import { hashPassword } from '@/lib/auth/hash';

function getToken(req) {
  return req.cookies.get('auth_token')?.value || req.cookies.get('token')?.value || '';
}

function ensureAdmin(req) {
  const decoded = verifyJwt(getToken(req));
  if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'super_admin' && decoded.role !== 'business_admin')) {
    return null;
  }
  return decoded;
}

function normalize(doc) {
  if (!doc) return doc;
  return {
    ...doc,
    _id: doc._id ? String(doc._id) : undefined,
  };
}

async function GETHandler(req, { params }) {
  try {
    if (!ensureAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params?.id;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid agent id' }, { status: 400 });
    }

    const db = await getDb();
    const col = db.collection('users');
    const agent = await col.findOne(
      { _id: new ObjectId(id), role: 'agent' },
      {
        projection: {
          passwordHash: 0,
          password: 0,
        },
      },
    );

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ agent: normalize(agent) });
  } catch (error) {
    console.error('AGENT_GET_ERROR', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

async function PUTHandler(req, { params }) {
  try {
    if (!ensureAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params?.id;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid agent id' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const updates = {};

    if (typeof body.fullName === 'string' && body.fullName.trim()) {
      updates.fullName = body.fullName.trim();
    }

    if (typeof body.email === 'string') {
      const normalizedEmail = body.email.trim().toLowerCase();
      if (!normalizedEmail) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }
      updates.email = normalizedEmail;
    }

    if (typeof body.phone === 'string') {
      const normalizedPhone = body.phone.trim();
      if (!normalizedPhone) {
        return NextResponse.json({ error: 'Phone is required' }, { status: 400 });
      }
      updates.phone = normalizedPhone;
    }

    if (body.discountPercent !== undefined) {
      const discount = Number(body.discountPercent);
      if (Number.isFinite(discount) && discount >= 0) {
        updates.discountPercent = discount;
      }
    }

    if (body.commissionPercent !== undefined) {
      const commission = Number(body.commissionPercent);
      if (Number.isFinite(commission) && commission >= 0) {
        updates.commissionPercent = commission;
      }
    }

    if (typeof body.couponStatus === 'string') {
      const status = body.couponStatus.trim().toLowerCase();
      if (['active', 'inactive'].includes(status)) {
        updates.couponStatus = status;
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'isActive')) {
      updates.isActive = Boolean(body.isActive);
    }

    const password = typeof body.password === 'string' ? body.password.trim() : '';
    let passwordHashUpdate = null;
    if (password) {
      passwordHashUpdate = await hashPassword(password);
    }

    if (!Object.keys(updates).length && !passwordHashUpdate) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const db = await getDb();
    const col = db.collection('users');
    const objectId = new ObjectId(id);

    const existing = await col.findOne({ _id: objectId, role: 'agent' });
    if (!existing) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (updates.email) {
      const dupEmail = await col.findOne({
        _id: { $ne: objectId },
        email: updates.email,
      });
      if (dupEmail) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      }
    }

    if (updates.phone) {
      const dupPhone = await col.findOne({
        _id: { $ne: objectId },
        phone: updates.phone,
      });
      if (dupPhone) {
        return NextResponse.json({ error: 'Phone already in use' }, { status: 409 });
      }
    }

    const updateDoc = {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    };

    if (passwordHashUpdate) {
      updateDoc.$set.passwordHash = passwordHashUpdate;
    }

    await col.updateOne({ _id: objectId, role: 'agent' }, updateDoc);

    const agent = await col.findOne(
      { _id: objectId },
      { projection: { passwordHash: 0, password: 0 } },
    );

    return NextResponse.json({ success: true, agent: normalize(agent) });
  } catch (error) {
    console.error('AGENT_UPDATE_ERROR', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const PUT = withErrorLogging(PUTHandler);
