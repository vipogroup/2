import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/dbConnect';
import Lead from '@/models/Lead';
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
    const format = searchParams.get('format') || 'json';
    const status = searchParams.get('status');
    const segment = searchParams.get('segment');
    const pipelineStage = searchParams.get('pipelineStage');
    
    const filter = getTenantFilter(user);
    if (status) filter.status = status;
    if (segment) filter.segment = segment;
    if (pipelineStage) filter.pipelineStage = pipelineStage;

    const leads = await Lead.find(filter)
      .populate('assignedTo', 'fullName email')
      .sort({ createdAt: -1 })
      .lean();

    if (format === 'csv') {
      // Generate CSV
      const headers = ['שם', 'טלפון', 'אימייל', 'סטטוס', 'שלב', 'סגמנט', 'ערך משוער', 'מקור', 'תאריך יצירה', 'הערות'];
      const rows = leads.map(lead => [
        lead.name,
        lead.phone,
        lead.email || '',
        lead.status,
        lead.pipelineStage || 'lead',
        lead.segment || 'cold',
        lead.estimatedValue || 0,
        lead.source,
        new Date(lead.createdAt).toLocaleDateString('he-IL'),
        (lead.notes || '').replace(/,/g, ';'),
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      // Add BOM for Hebrew Excel support
      const bom = '\uFEFF';
      
      return new NextResponse(bom + csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="leads-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // JSON format
    return NextResponse.json({
      leads: leads.map(lead => ({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        status: lead.status,
        pipelineStage: lead.pipelineStage,
        segment: lead.segment,
        estimatedValue: lead.estimatedValue,
        source: lead.source,
        notes: lead.notes,
        tags: lead.tags,
        assignedTo: lead.assignedTo?.fullName,
        createdAt: lead.createdAt,
      })),
      total: leads.length,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error exporting leads:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
