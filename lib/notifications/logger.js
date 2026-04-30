import { connectToDatabase } from '@/lib/db';
import NotificationLog from '@/models/NotificationLog';

export async function logNotification({
  tenantId = null,
  templateType,
  title,
  body = '',
  deliveries = [],
  roles = [],
  tags = [],
  userIds = [],
  variables = {},
  payload = {},
  status = 'sent',
  errorMessage = null,
  source = 'system',
  triggeredBy = 'system',
}) {
  try {
    await connectToDatabase();

    // Determine audience type and targets
    let audienceType = 'users';
    let audienceTargets = [];
    let recipientCount = 0;

    // Calculate total recipient count from deliveries
    for (const delivery of deliveries) {
      recipientCount += delivery.count || 0;
      
      if (delivery.channel === 'broadcast') {
        audienceType = 'broadcast';
        audienceTargets = ['all'];
      } else if (delivery.channel === 'roles' && audienceType !== 'broadcast') {
        audienceType = 'roles';
        audienceTargets = [...new Set([...audienceTargets, ...(delivery.targets || [])])];
      } else if (delivery.channel === 'tags' && audienceType === 'users') {
        audienceType = 'tags';
        audienceTargets = [...new Set([...audienceTargets, ...(delivery.targets || [])])];
      } else if (delivery.channel === 'users') {
        audienceTargets = [...new Set([...audienceTargets, ...(delivery.targets || [])])];
      } else if (delivery.channel === 'dry_run') {
        audienceType = roles.length ? 'roles' : tags.length ? 'tags' : 'users';
        audienceTargets = roles.length ? roles : tags.length ? tags : userIds;
      }
    }

    // If no deliveries, use provided audience info
    if (!deliveries.length) {
      if (roles.length) {
        audienceType = 'roles';
        audienceTargets = roles;
      } else if (tags.length) {
        audienceType = 'tags';
        audienceTargets = tags;
      } else if (userIds.length) {
        audienceType = 'users';
        audienceTargets = userIds;
      }
    }

    // For single user notifications, extract recipient details
    let recipientUserId = null;
    let recipientName = null;
    let recipientRole = null;

    if (userIds.length === 1) {
      recipientUserId = userIds[0];
      // Try to get role from variables or payload
      recipientRole = variables.user_role || payload?.data?.userType || null;
      recipientName = variables.customer_name || variables.agent_name || null;
    }

    const logEntry = new NotificationLog({
      tenantId: tenantId || null,
      templateType,
      title,
      body,
      audienceType,
      audienceTargets: audienceTargets.slice(0, 100), // Limit targets stored
      recipientCount,
      recipientUserId,
      recipientName,
      recipientRole,
      status,
      errorMessage,
      variables,
      payload,
      triggeredBy,
      source,
    });

    await logEntry.save();
    
    console.log('NOTIFICATION_LOG: Saved', {
      templateType,
      status,
      recipientCount,
      audienceType,
    });

    return logEntry;
  } catch (err) {
    console.error('NOTIFICATION_LOG: Failed to save log:', err?.message || err);
    throw err;
  }
}

export async function getNotificationLogs({
  tenantId = null,
  templateType = null,
  status = null,
  recipientRole = null,
  search = null,
  startDate = null,
  endDate = null,
  page = 1,
  limit = 50,
} = {}) {
  try {
    await connectToDatabase();

    const query = {};

    // Filter by tenant (null = super admin sees all)
    if (tenantId) {
      query.tenantId = tenantId;
    }

    // Filter by template type
    if (templateType) {
      query.templateType = templateType;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by recipient role
    if (recipientRole) {
      query.$or = [
        { recipientRole },
        { audienceTargets: recipientRole },
      ];
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      NotificationLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NotificationLog.countDocuments(query),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (err) {
    console.error('NOTIFICATION_LOG: Failed to get logs:', err?.message || err);
    throw err;
  }
}

export async function getNotificationStats(tenantId = null) {
  try {
    await connectToDatabase();

    const matchStage = tenantId ? { tenantId } : {};

    const stats = await NotificationLog.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          dryRun: { $sum: { $cond: [{ $eq: ['$status', 'dry_run'] }, 1, 0] } },
          totalRecipients: { $sum: '$recipientCount' },
        },
      },
    ]);

    const templateStats = await NotificationLog.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$templateType',
          count: { $sum: 1 },
          recipients: { $sum: '$recipientCount' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    return {
      summary: stats[0] || { total: 0, sent: 0, failed: 0, dryRun: 0, totalRecipients: 0 },
      byTemplate: templateStats,
    };
  } catch (err) {
    console.error('NOTIFICATION_LOG: Failed to get stats:', err?.message || err);
    throw err;
  }
}
