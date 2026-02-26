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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const dynamic = 'force-dynamic';

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
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

  // Fetch quote draft
  const { data: quote } = await supabase
    .from('quote_drafts')
    .select('*')
    .eq('lead_id', id)
    .eq('site_id', getSiteId())
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { lead, quote };
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;
  const data = await getLeadData(id);

  if (!data) {
    notFound();
  }

  const { lead, quote } = data;

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
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="visualizations">Visualizations</TabsTrigger>
          <TabsTrigger value="quote">Quote</TabsTrigger>
          <TabsTrigger value="drawings">Drawings</TabsTrigger>
          <TabsTrigger value="transcript">Chat</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

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
              />
            </div>
          </div>
        </TabsContent>

        {/* Visualizations Tab */}
        <TabsContent value="visualizations">
          <LeadVisualizationPanel leadId={lead.id} />
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
          />
        </TabsContent>

        {/* Drawings Tab */}
        <TabsContent value="drawings">
          <LeadDrawingsPanel leadId={lead.id} />
        </TabsContent>

        {/* Chat Transcript Tab */}
        <TabsContent value="transcript">
          <ChatTranscript transcript={lead.chat_transcript} />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <AuditLogView leadId={lead.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
