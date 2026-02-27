import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/db/server';
import { getSiteId } from '@/lib/db/site';

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const siteId = getSiteId();
    const supabase = createServiceClient();

    // Look up leads by email for this tenant
    const { data: leads } = await supabase
      .from('leads')
      .select('id, email')
      .eq('site_id', siteId)
      .ilike('email', email.trim());

    if (!leads || leads.length === 0) {
      // Don't reveal whether data exists — return success either way
      return NextResponse.json({
        message: 'If we have your data, a deletion request has been submitted. You will receive confirmation within 30 days.',
      });
    }

    // Mark leads with deletion request timestamp
    const leadIds = leads.map((l) => l.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deletion_requested_at column may not be in generated types
    await (supabase as any).from('leads').update({ deletion_requested_at: new Date().toISOString() }).in('id', leadIds);

    console.log(`Data deletion requested: email=${email}, name=${name || 'N/A'}, site=${siteId}, leads=${leadIds.length}`);

    return NextResponse.json({
      message: 'Your data deletion request has been submitted. You will receive confirmation within 30 days.',
    });
  } catch (error) {
    console.error('Data deletion error:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request. Please try again.' },
      { status: 500 },
    );
  }
}
