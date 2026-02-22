import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/server';
import { getSiteId } from '@/lib/db/site';
import { generateSageCsv } from '@/lib/export/sage-csv';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';
import type { Invoice, InvoiceStatus } from '@/types/database';

/**
 * GET /api/invoices/export/sage
 * Export invoices as Sage 50-compatible CSV
 */
export async function GET(request: NextRequest) {
  try {
    const tier = await getTier();
    if (!canAccess(tier, 'invoicing')) {
      return NextResponse.json({ error: 'Invoicing requires the Accelerate plan or higher' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const status = searchParams.get('status') || 'all';

    const supabase = createServiceClient();

    let query = supabase
      .from('invoices')
      .select('*')
      .eq('site_id', getSiteId())
      .neq('status', 'cancelled')
      .neq('status', 'draft')
      .order('issue_date', { ascending: true });

    if (startDate) {
      query = query.gte('issue_date', startDate);
    }
    if (endDate) {
      query = query.lte('issue_date', endDate);
    }
    if (status !== 'all') {
      query = query.eq('status', status as InvoiceStatus);
    }

    const { data: invoices, error } = await query;

    if (error) {
      console.error('Error fetching invoices for export:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invoices' },
        { status: 500 }
      );
    }

    if (!invoices || invoices.length === 0) {
      return NextResponse.json(
        { error: 'No invoices found for the selected criteria' },
        { status: 404 }
      );
    }

    const csv = generateSageCsv(invoices as Invoice[]);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="sage_export_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Sage export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
