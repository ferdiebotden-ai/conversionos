import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/db/server';
import { getSiteId } from '@/lib/db/site';
import { LeadDetailHeader } from '@/components/admin/lead-detail-header';
import { LeadContactCard } from '@/components/admin/lead-contact-card';
import { LeadProjectCard } from '@/components/admin/lead-project-card';
import { PhotoGallery } from '@/components/admin/photo-gallery';
import { ChatTranscript } from '@/components/admin/chat-transcript';
import { QuoteEditor } from '@/components/admin/quote-editor';
import { AuditLogView } from '@/components/admin/audit-log';
import { LeadVisualizationPanel } from '@/components/admin/lead-visualization-panel';
import { LeadDrawingsPanel } from '@/components/admin/lead-drawings-panel';
import { getDepositPercent } from '@/lib/pricing/deposit.server';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const dynamic = 'force-dynamic';

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

interface VersionSummary {
  version: number;
  status: 'draft' | 'sent';
  updatedAt: string;
  sentAt?: string | undefined;
  total: number | null;
  acceptanceStatus?: string | undefined;
}

async function getLeadData(id: string) {
  const supabase = createServiceClient();

  // Fetch lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .eq('site_id', getSiteId())
    .single();

  if (leadError || !lead) {
    return null;
  }

  // Fetch ALL quote versions (newest first)
  const { data: allDrafts } = await supabase
    .from('quote_drafts')
    .select('*')
    .eq('lead_id', id)
    .eq('site_id', getSiteId())
    .order('version', { ascending: false });

  // Latest version is the editable draft
  const quote = allDrafts?.[0] ?? null;

  // Build version summary list
  const versions: VersionSummary[] = (allDrafts || []).map((d) => {
    const row = d as Record<string, unknown>;
    return {
      version: d.version,
      status: d.sent_at ? 'sent' as const : 'draft' as const,
      updatedAt: d.updated_at,
      sentAt: d.sent_at || undefined,
      total: d.total,
      acceptanceStatus: (row['acceptance_status'] as string) || undefined,
    };
  });

  // Fetch primary visualization for featured concept
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- client_favourited_concepts not in generated types
  const { data: vizRows } = await (supabase as any)
    .from('visualizations')
    .select('generated_concepts, client_favourited_concepts')
    .eq('lead_id', id)
    .eq('site_id', getSiteId())
    .order('created_at', { ascending: false })
    .limit(1);

  let featuredConceptUrl: string | null = null;
  const viz = vizRows?.[0];
  if (viz) {
    const concepts = Array.isArray(viz.generated_concepts)
      ? (viz.generated_concepts as { imageUrl?: string; refinedImageUrl?: string }[])
      : [];
    const favourited = Array.isArray(viz.client_favourited_concepts)
      ? (viz.client_favourited_concepts as number[])
      : [];
    const starredIdx = favourited[0];
    if (starredIdx != null && concepts[starredIdx]) {
      const concept = concepts[starredIdx];
      featuredConceptUrl = concept.refinedImageUrl || concept.imageUrl || null;
    }
  }

  return { lead, quote, versions, featuredConceptUrl };
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;
  const data = await getLeadData(id);

  if (!data) {
    notFound();
  }

  const { lead, quote, versions, featuredConceptUrl } = data;
  const depositPercent = await getDepositPercent();

  return (
    <div className="space-y-6">
      {/* Header with status and actions */}
      <LeadDetailHeader
        lead={lead}
        hasQuote={!!quote && Array.isArray(quote.line_items) && quote.line_items.length > 0}
        quoteSentAt={quote?.sent_at}
      />

      {/* Main content */}
      <Tabs defaultValue="details" className="space-y-6">
        <div className="relative">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-background to-transparent z-10 md:hidden" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background to-transparent z-10 md:hidden" />
          <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
            <TabsList className="inline-flex w-auto min-w-full md:w-full">
              <TabsTrigger value="details" className="shrink-0">Details</TabsTrigger>
              <TabsTrigger value="visualizations" className="shrink-0">Visualizations</TabsTrigger>
              <TabsTrigger value="quote" className="shrink-0">Quote</TabsTrigger>
              <TabsTrigger value="drawings" className="shrink-0">Drawings</TabsTrigger>
              <TabsTrigger value="transcript" className="shrink-0">Chat</TabsTrigger>
              <TabsTrigger value="activity" className="shrink-0">Activity</TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left column */}
            <div className="space-y-6">
              <LeadContactCard lead={lead} />
              <LeadProjectCard lead={lead} />
            </div>

            {/* Right column */}
            <div className="space-y-6">
              <PhotoGallery
                uploadedPhotos={lead.uploaded_photos}
                generatedConcepts={lead.generated_concepts}
                featuredConceptUrl={featuredConceptUrl}
              />
            </div>
          </div>
        </TabsContent>

        {/* Visualizations Tab */}
        <TabsContent value="visualizations">
          <LeadVisualizationPanel leadId={lead.id} chatTranscript={lead.chat_transcript} />
        </TabsContent>

        {/* Quote Tab */}
        <TabsContent value="quote">
          <QuoteEditor
            leadId={lead.id}
            initialQuote={quote}
            initialEstimate={lead.quote_draft_json}
            customerEmail={lead.email}
            customerName={lead.name}
            projectType={lead.project_type || undefined}
            goalsText={lead.goals_text || undefined}
            versions={versions}
            depositPercent={depositPercent}
          />
        </TabsContent>

        {/* Drawings Tab */}
        <TabsContent value="drawings">
          <LeadDrawingsPanel leadId={lead.id} />
        </TabsContent>

        {/* Chat Transcript Tab */}
        <TabsContent value="transcript">
          <ChatTranscript
            transcript={lead.chat_transcript}
            intakeRawInput={(lead as Record<string, unknown>)['intake_raw_input'] as string | undefined}
            intakeMethod={(lead as Record<string, unknown>)['intake_method'] as string | undefined}
          />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <AuditLogView leadId={lead.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
