import { ObjectId } from 'mongodb';

function buildForbiddenError() {
  const err = new Error('forbidden');
  err.status = 403;
  err.code = 'TENANT_FORBIDDEN';
  return err;
}

function normalizeTenantId(value) {
  if (!value) throw buildForbiddenError();

  if (value instanceof ObjectId) return value;

  if (typeof value === 'string') {
    if (!ObjectId.isValid(value)) throw buildForbiddenError();
    return new ObjectId(value);
  }

  if (typeof value === 'object' && value?._bsontype === 'ObjectId' && typeof value.toString === 'function') {
    return value;
  }

  if (!ObjectId.isValid(value)) throw buildForbiddenError();
  return new ObjectId(value);
}

export function getTenantIdOrThrow(decodedOrUser) {
  return normalizeTenantId(decodedOrUser?.tenantId);
}

export function withTenant(filter, tenantId) {
  const normalizedTenantId = normalizeTenantId(tenantId);
  const base = filter && typeof filter === 'object' ? filter : {};

  if (!Object.prototype.hasOwnProperty.call(base, 'tenantId') || base.tenantId == null) {
    return { ...base, tenantId: normalizedTenantId };
  }

  const existingTenantId = normalizeTenantId(base.tenantId);
  if (existingTenantId.toString() !== normalizedTenantId.toString()) {
    throw buildForbiddenError();
  }

  return { ...base, tenantId: existingTenantId };
}
