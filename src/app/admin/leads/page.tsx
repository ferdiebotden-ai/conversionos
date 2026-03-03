import { Suspense } from 'react';
import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync } from '@/lib/db/site';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';
import { LeadsTable } from '@/components/admin/leads-table';
import { LeadsPageHeader } from '@/components/admin/leads-page-header';
import { Skeleton } from '@/components/ui/skeleton';
import type { LeadStatus, ProjectType } from '@/types/database';

export const dynamic = 'force-dynamic';

interface LeadsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    projectType?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
    limit?: string;
  }>;
}

async function getLeads(searchParams: LeadsPageProps['searchParams']) {
  const params = await searchParams;
  const supabase = createServiceClient();
  const siteId = await getSiteIdAsync();

  const page = parseInt(params.page || '1', 10);
  const limit = parseInt(params.limit || '10', 10);
  const offset = (page - 1) * limit;
  const sortBy = params.sortBy || 'created_at';
  const sortOrder = params.sortOrder || 'desc';

  // Build query
  let query = supabase.from('leads').select('*', { count: 'exact' }).eq('site_id', siteId);

  // Apply filters
  if (params.status) {
    query = query.eq('status', params.status as LeadStatus);
  }
  if (params.projectType) {
    query = query.eq('project_type', params.projectType as ProjectType);
  }
  if (params.search) {
    query = query.or(
      `name.ilike.%${params.search}%,email.ilike.%${params.search}%,phone.ilike.%${params.search}%`
    );
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: leads, count, error } = await query;

  if (error) {
    console.error('Error fetching leads:', error);
    return {
      leads: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
      feasibilityMap: {} as Record<string, number>,
    };
  }

  // Fetch feasibility scores for these leads from linked visualizations
  // contractor_feasibility_score may not be in generated types yet
  const leadIds = (leads || []).map((l) => l.id);
  const feasibilityMap: Record<string, number> = {};

  if (leadIds.length > 0) {
    const { data: vizData } = await (supabase
      .from('visualizations') as ReturnType<typeof supabase.from>)
      .select('lead_id, contractor_feasibility_score')
      .in('lead_id', leadIds)
      .not('contractor_feasibility_score', 'is', null) as { data: Array<{ lead_id: string | null; contractor_feasibility_score: number | null }> | null };

    if (vizData) {
      // Use the highest score per lead (if multiple visualizations)
      for (const v of vizData) {
        if (v.lead_id && v.contractor_feasibility_score != null) {
          const score = v.contractor_feasibility_score;
          const existing = feasibilityMap[v.lead_id];
          if (existing === undefined || score > existing) {
            feasibilityMap[v.lead_id] = score;
          }
        }
      }
    }
  }

  return {
    leads: leads || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
    feasibilityMap,
  };
}

function LeadsTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filters skeleton */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-[300px]" />
        <Skeleton className="h-10 w-[140px]" />
        <Skeleton className="h-10 w-[140px]" />
      </div>
      {/* Table skeleton */}
      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const [{ leads, pagination, feasibilityMap }, tier] = await Promise.all([
    getLeads(searchParams),
    getTier(),
  ]);

  const hasIntake = canAccess(tier, 'contractor_lead_intake');

  return (
    <div className="space-y-6">
      <LeadsPageHeader showIntakeButton={hasIntake} />

      <Suspense fallback={<LeadsTableSkeleton />}>
        <LeadsTable
          initialLeads={leads}
          initialPagination={pagination}
          initialFeasibilityMap={feasibilityMap}
        />
      </Suspense>
    </div>
  );
}
