import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Lead from '@/models/Lead';
import { requireAuth } from '@/lib/auth/requireAuth';

async function POSTHandler(request) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const body = await request.json();
    const { leads: leadsData } = body;
    
    if (!Array.isArray(leadsData) || leadsData.length === 0) {
      return NextResponse.json({ error: 'No leads data provided' }, { status: 400 });
    }

    // Limit import size
    if (leadsData.length > 500) {
      return NextResponse.json({ error: 'Maximum 500 leads per import' }, { status: 400 });
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [],
    };

    for (const leadData of leadsData) {
      try {
        // Validate required fields
        if (!leadData.name || !leadData.phone) {
          results.skipped++;
          results.errors.push(`Missing name or phone: ${JSON.stringify(leadData)}`);
          continue;
        }

        // Check for duplicate by phone
        const existing = await Lead.findOne({
          tenantId: user.tenantId,
          phone: leadData.phone.toString().trim(),
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        // Create lead
        await Lead.create({
          tenantId: user.tenantId,
          name: leadData.name.trim(),
          phone: leadData.phone.toString().trim(),
          email: leadData.email?.trim() || undefined,
          source: leadData.source || 'manual',
          status: leadData.status || 'new',
          pipelineStage: leadData.pipelineStage || 'lead',
          segment: leadData.segment || 'cold',
          estimatedValue: parseFloat(leadData.estimatedValue) || 0,
          notes: leadData.notes,
          tags: leadData.tags ? leadData.tags.split(',').map(t => t.trim()) : [],
        });

        results.imported++;
      } catch (err) {
        results.errors.push(`Error importing ${leadData.name}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Error importing leads:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
