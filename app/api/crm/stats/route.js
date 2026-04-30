import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/dbConnect';
import Lead from '@/models/Lead';
import Conversation from '@/models/Conversation';
import CrmTask from '@/models/CrmTask';
import { requireAuth } from '@/lib/auth/requireAuth';
import { getTenantFilter } from '@/lib/tenantContext';

async function GETHandler(request) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    
    const filter = getTenantFilter(user);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    
    const dateFilter = { ...filter, createdAt: { $gte: startDate } };

    // Leads stats
    const [
      totalLeads,
      newLeads,
      convertedLeads,
      leadsBySource,
      leadsByStage,
      leadsBySegment,
    ] = await Promise.all([
      Lead.countDocuments(filter),
      Lead.countDocuments(dateFilter),
      Lead.countDocuments({ ...filter, status: 'converted' }),
      Lead.aggregate([
        { $match: filter },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: filter },
        { $group: { _id: '$pipelineStage', count: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: filter },
        { $group: { _id: '$segment', count: { $sum: 1 } } },
      ]),
    ]);

    // Conversion rate
    const conversionRate = totalLeads > 0 
      ? ((convertedLeads / totalLeads) * 100).toFixed(1)
      : 0;

    // Pipeline value
    const pipelineValue = await Lead.aggregate([
      { $match: { ...filter, status: { $nin: ['converted', 'lost'] } } },
      { $group: { _id: null, total: { $sum: '$estimatedValue' } } },
    ]);

    // Tasks stats
    const [totalTasks, completedTasks, overdueTasks] = await Promise.all([
      CrmTask.countDocuments(filter),
      CrmTask.countDocuments({ ...filter, status: 'completed' }),
      CrmTask.countDocuments({ 
        ...filter, 
        status: 'pending', 
        dueAt: { $lt: new Date() } 
      }),
    ]);

    // Conversations stats
    const [totalConversations, openConversations] = await Promise.all([
      Conversation.countDocuments(filter),
      Conversation.countDocuments({ ...filter, status: { $in: ['new', 'open'] } }),
    ]);

    // Leads by day (last 7 days)
    const leadsByDay = await Lead.aggregate([
      { 
        $match: { 
          ...filter, 
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return NextResponse.json({
      leads: {
        total: totalLeads,
        new: newLeads,
        converted: convertedLeads,
        conversionRate: parseFloat(conversionRate),
        bySource: leadsBySource.reduce((acc, item) => {
          acc[item._id || 'unknown'] = item.count;
          return acc;
        }, {}),
        byStage: leadsByStage.reduce((acc, item) => {
          acc[item._id || 'lead'] = item.count;
          return acc;
        }, {}),
        bySegment: leadsBySegment.reduce((acc, item) => {
          acc[item._id || 'cold'] = item.count;
          return acc;
        }, {}),
        byDay: leadsByDay,
      },
      pipeline: {
        totalValue: pipelineValue[0]?.total || 0,
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        overdue: overdueTasks,
        completionRate: totalTasks > 0 
          ? ((completedTasks / totalTasks) * 100).toFixed(1)
          : 0,
      },
      conversations: {
        total: totalConversations,
        open: openConversations,
      },
    });
  } catch (error) {
    console.error('Error fetching CRM stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
