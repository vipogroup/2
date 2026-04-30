import { getNotificationTemplate } from '@/lib/notifications/templates';
import {
  fetchDueScheduledNotifications,
  markScheduledNotificationSent,
  recordScheduledNotificationFailure,
} from '@/lib/notifications/scheduler';
import { pushToUsers, pushToTags, pushToRoles, pushBroadcast } from '@/lib/pushSender';
import { logNotification } from '@/lib/notifications/logger';

const ENV_DRY_RUN = process.env.PUSH_DISPATCH_DRY_RUN === 'true';

function isDryRunEnabled(explicit) {
  return Boolean(explicit) || ENV_DRY_RUN;
}

function ensureArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function normalizeRoles(values = []) {
  const allowed = new Set(['customer', 'agent', 'admin', 'business_admin', 'all']);
  return [...new Set(values.map((value) => String(value).trim().toLowerCase()))].filter((role) =>
    allowed.has(role),
  );
}

function normalizeTags(values = []) {
  return [...new Set(ensureArray(values).map((value) => String(value).trim()).filter(Boolean))];
}

function normalizeIds(values = []) {
  return [...new Set(ensureArray(values).map((value) => String(value).trim()).filter(Boolean))];
}

function renderTemplateString(raw, variables = {}) {
  if (!raw || typeof raw !== 'string') return raw || '';
  return raw.replace(/{{\s*([^}]+)\s*}}/g, (match, key) => {
    const k = String(key || '').trim();
    if (!k) return match;
    const value = variables[k];
    if (value === null || value === undefined) return match;
    return String(value);
  });
}

function buildPayload(template, { variables, overrides }) {
  const vars = variables || {};
  const payloadOverrides = overrides || {};

  const titleSource = payloadOverrides.title || template.title || 'VIPO';
  const bodySource = payloadOverrides.body || template.body || '';

  const title = renderTemplateString(titleSource, vars);
  const body = renderTemplateString(bodySource, vars);

  const payload = {
    title,
    body,
  };

  const copyKeys = ['icon', 'badge', 'image', 'url', 'tag', 'renotify', 'requireInteraction'];
  copyKeys.forEach((key) => {
    if (payloadOverrides[key] !== undefined) {
      payload[key] = payloadOverrides[key];
    }
  });

  const data = {
    templateType: template.type,
    variables: vars,
    ...(payloadOverrides.data && typeof payloadOverrides.data === 'object' ? payloadOverrides.data : {}),
  };

  payload.data = data;

  return payload;
}

async function deliverAudience({ roles, tags, userIds, tenantId }, payload) {
  console.log('DISPATCHER: deliverAudience called', { roles, tags, userIds: userIds.length, tenantId });
  const deliveries = [];
  const roleTargets = [...roles];

  try {
    if (roleTargets.includes('all')) {
      // Multi-Tenant: If tenantId is provided, broadcast only to tenant users (via roles)
      if (tenantId) {
        console.log('DISPATCHER: broadcast limited to tenant:', tenantId);
        const allRoles = ['customer', 'agent', 'admin'];
        const broadcastResult = await pushToRoles(allRoles, payload, tenantId);
        deliveries.push({ channel: 'broadcast', count: broadcastResult.length });
      } else {
        console.log('DISPATCHER: sending global broadcast...');
        const broadcastResult = await pushBroadcast(payload);
        console.log('DISPATCHER: broadcast result:', broadcastResult?.length || 0);
        deliveries.push({ channel: 'broadcast', count: broadcastResult.length });
      }
      roleTargets.splice(roleTargets.indexOf('all'), 1);
    }

    if (roleTargets.length) {
      console.log('DISPATCHER: sending to roles:', roleTargets, 'tenantId:', tenantId);
      // Multi-Tenant: Pass tenantId to filter by tenant
      const roleResult = await pushToRoles(roleTargets, payload, tenantId);
      console.log('DISPATCHER: roles result:', roleResult?.length || 0);
      deliveries.push({ channel: 'roles', targets: roleTargets, count: roleResult.length });
    }

    if (tags.length) {
      console.log('DISPATCHER: sending to tags:', tags);
      const tagResult = await pushToTags(tags, payload, tenantId);
      console.log('DISPATCHER: tags result:', tagResult?.length || 0);
      deliveries.push({ channel: 'tags', targets: tags, count: tagResult.length });
    }

    if (userIds.length) {
      console.log('DISPATCHER: sending to userIds:', userIds.length);
      const userResult = await pushToUsers(userIds, payload);
      console.log('DISPATCHER: users result:', userResult?.length || 0);
      deliveries.push({ channel: 'users', targets: userIds, count: userResult.length });
    }
  } catch (err) {
    console.error('DISPATCHER: deliverAudience error:', err?.message || err);
    throw err;
  }

  console.log('DISPATCHER: total deliveries:', deliveries);
  return deliveries;
}

export async function sendTemplateNotification({
  templateType,
  variables = {},
  audienceRoles = [],
  audienceTags = [],
  audienceUserIds = [],
  payloadOverrides = {},
  dryRun = false,
  tenantId = null, // Multi-Tenant: Add tenantId support
}) {
  console.log('DISPATCHER: sendTemplateNotification called', { 
    templateType, 
    audienceRoles, 
    audienceTags,
    audienceUserIds: audienceUserIds?.length || 0,
    tenantId,
  });
  
  if (!templateType) {
    console.error('DISPATCHER: template_type_required');
    throw new Error('template_type_required');
  }

  const template = await getNotificationTemplate(templateType);
  console.log('DISPATCHER: template found:', !!template, template?.type);
  
  if (!template) {
    console.error('DISPATCHER: template_not_found for', templateType);
    const err = new Error(`template_not_found: ${templateType}`);
    err.status = 404;
    throw err;
  }
  if (template.enabled === false) {
    console.error('DISPATCHER: template_disabled', templateType);
    const err = new Error(`template_disabled: ${templateType}`);
    err.status = 400;
    throw err;
  }

  const payload = buildPayload(template, { variables, overrides: payloadOverrides });

  const roles = normalizeRoles([
    ...(Array.isArray(template.audience) ? template.audience : []),
    ...ensureArray(payloadOverrides.audience),
    ...audienceRoles,
  ]);

  const tags = normalizeTags([
    ...ensureArray(payloadOverrides.tags),
    ...audienceTags,
  ]);

  const userIds = normalizeIds([
    ...ensureArray(payloadOverrides.userIds),
    ...audienceUserIds,
  ]);

  const dryRunEnabled = isDryRunEnabled(dryRun);

  let deliveries = [];
  let status = 'sent';
  let errorMessage = null;

  try {
    deliveries = dryRunEnabled
      ? [
          {
            channel: 'dry_run',
            roles,
            tags,
            userIds,
            tenantId,
            count: 0,
          },
        ]
      : await deliverAudience({ roles, tags, userIds, tenantId }, payload);
    
    if (dryRunEnabled) {
      status = 'dry_run';
    }
  } catch (err) {
    status = 'failed';
    errorMessage = err?.message || 'unknown_error';
    console.error('DISPATCHER: sendTemplateNotification error:', errorMessage);
  }

  // Log notification to history
  try {
    await logNotification({
      tenantId,
      templateType: template.type,
      title: payload.title,
      body: payload.body,
      deliveries,
      roles,
      tags,
      userIds,
      variables,
      payload,
      status,
      errorMessage,
      source: 'dispatcher',
    });
  } catch (logErr) {
    console.error('DISPATCHER: failed to log notification:', logErr?.message);
  }

  if (status === 'failed') {
    throw new Error(errorMessage);
  }

  return {
    ok: true,
    templateType: template.type,
    deliveries,
    dryRun: dryRunEnabled,
  };
}

export async function dispatchScheduledNotification(scheduleDoc, options = {}) {
  if (!scheduleDoc || !scheduleDoc.templateType) {
    return { ok: false, error: 'invalid_schedule_document' };
  }

  try {
    const payloadOverrides = scheduleDoc.payloadOverrides || {};
    const variables = payloadOverrides.variables || scheduleDoc.metadata?.variables || {};
    const dryRunEnabled = isDryRunEnabled(options.dryRun);
    const response = await sendTemplateNotification({
      templateType: scheduleDoc.templateType,
      variables,
      audienceRoles: scheduleDoc.audience || [],
      audienceTags: payloadOverrides.tags || [],
      audienceUserIds: payloadOverrides.userIds || [],
      payloadOverrides,
      dryRun: dryRunEnabled,
    });

    if (!dryRunEnabled) {
      await markScheduledNotificationSent(scheduleDoc._id);
    }

    return { ok: true, deliveries: response.deliveries, dryRun: response.dryRun };
  } catch (error) {
    const dryRunEnabled = isDryRunEnabled(options.dryRun);
    if (!dryRunEnabled) {
      await recordScheduledNotificationFailure(scheduleDoc._id, error);
    }
    return { ok: false, error: error?.message || 'dispatch_failed' };
  }
}

export async function processDueNotifications(referenceDate = new Date(), options = {}) {
  const due = await fetchDueScheduledNotifications(referenceDate);
  if (!due.length) {
    return { ok: true, processed: 0, dryRun: isDryRunEnabled(options.dryRun), results: [] };
  }

  const dryRunEnabled = isDryRunEnabled(options.dryRun);
  const results = [];
  for (const item of due) {
    const res = await dispatchScheduledNotification(item, { dryRun: dryRunEnabled });
    results.push({
      scheduleId: item._id ? String(item._id) : null,
      templateType: item.templateType,
      ok: res.ok,
      deliveries: res.deliveries || [],
      error: res.error || null,
      dryRun: dryRunEnabled,
    });
  }

  const processed = results.filter((result) => result.ok).length;
  return { ok: true, processed, dryRun: dryRunEnabled, results };
}
