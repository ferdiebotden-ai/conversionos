/**
 * New Lead Notification Email
 * Sent to business owner when a new lead is submitted
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

import type { PlanTier } from '@/lib/entitlements';

interface NewLeadNotificationEmailProps {
  leadId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null | undefined;
  projectType: string;
  estimateLow?: number | undefined;
  estimateHigh?: number | undefined;
  timeline?: string | null | undefined;
  goalsText?: string | null | undefined;
  hasPhotos?: boolean | undefined;
  confidenceScore?: number | null | undefined;
  tier?: PlanTier;
  adminUrl?: string;
}

export function NewLeadNotificationEmail({
  leadId,
  customerName,
  customerEmail,
  customerPhone,
  projectType,
  estimateLow,
  estimateHigh,
  timeline,
  goalsText,
  hasPhotos,
  confidenceScore,
  tier = 'accelerate',
  adminUrl: customAdminUrl,
}: NewLeadNotificationEmailProps) {
  const hasEstimate = estimateLow && estimateHigh;
  const formattedProjectType = projectType.charAt(0).toUpperCase() + projectType.slice(1);
  const hasDashboard = tier !== 'elevate';
  const adminUrl = customAdminUrl || `https://leadquoteenginev2.vercel.app/admin/dashboard`;

  const timelineLabels: Record<string, string> = {
    asap: 'ASAP',
    '1_3_months': '1-3 months',
    '3_6_months': '3-6 months',
    '6_plus_months': '6+ months',
    just_exploring: 'Just exploring',
  };

  return (
    <Html>
      <Head />
      <Preview>New {formattedProjectType} Lead: {customerName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <div style={badge}>NEW LEAD</div>

          <Heading style={heading}>
            {formattedProjectType} Renovation Request
          </Heading>

          <Section style={infoBox}>
            <Text style={infoLabel}>Customer</Text>
            <Text style={infoValue}>{customerName}</Text>

            <Text style={infoLabel}>Email</Text>
            <Text style={infoValue}>
              <Link href={`mailto:${customerEmail}`} style={link}>
                {customerEmail}
              </Link>
            </Text>

            {customerPhone && (
              <>
                <Text style={infoLabel}>Phone</Text>
                <Text style={infoValue}>
                  <Link href={`tel:${customerPhone}`} style={link}>
                    {customerPhone}
                  </Link>
                </Text>
              </>
            )}

            {timeline && (
              <>
                <Text style={infoLabel}>Timeline</Text>
                <Text style={infoValue}>{timelineLabels[timeline] || timeline}</Text>
              </>
            )}
          </Section>

          {hasEstimate && (
            <Section style={estimateBox}>
              <Text style={estimateLabel}>AI Estimate</Text>
              <Text style={estimateValue}>
                ${estimateLow.toLocaleString()} - ${estimateHigh.toLocaleString()}
              </Text>
              {confidenceScore && (
                <Text style={confidenceText}>
                  Confidence: {Math.round(confidenceScore * 100)}%
                </Text>
              )}
            </Section>
          )}

          {goalsText && (
            <Section style={goalsBox}>
              <Text style={infoLabel}>Project Description</Text>
              <Text style={goalsValue}>{goalsText}</Text>
            </Section>
          )}

          <Section style={metaSection}>
            {hasPhotos && (
              <span style={metaBadge}>Has Photos</span>
            )}
            <span style={metaBadge}>Lead ID: {leadId.slice(0, 8)}</span>
          </Section>

          <Hr style={hr} />

          {hasDashboard ? (
            <Section style={ctaSection}>
              <Link href={adminUrl} style={ctaButton}>
                View in Dashboard
              </Link>
            </Section>
          ) : (
            <Section style={ctaSection}>
              <Text style={elevateCta}>
                Reply to this email or call the homeowner directly to follow up.
              </Text>
            </Section>
          )}

          <Text style={footer}>
            This lead was generated via the AI Quote Assistant.
            <br />
            Reply directly to reach {customerName} at {customerEmail}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '580px',
  borderRadius: '8px',
};

const badge = {
  backgroundColor: '#1565C0',
  color: '#ffffff',
  padding: '6px 12px',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: '700',
  letterSpacing: '0.5px',
  display: 'inline-block',
  marginBottom: '16px',
};

const heading = {
  fontSize: '24px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#1a1a1a',
  margin: '0 0 24px',
};

const infoBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '20px',
  margin: '0 0 16px',
};

const infoLabel = {
  fontSize: '12px',
  color: '#666',
  margin: '12px 0 4px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const infoValue = {
  fontSize: '16px',
  color: '#1a1a1a',
  margin: '0',
  fontWeight: '500',
};

const link = {
  color: '#1565C0',
  textDecoration: 'none',
};

const estimateBox = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  padding: '20px',
  margin: '0 0 16px',
  borderLeft: '4px solid #1565C0',
};

const estimateLabel = {
  fontSize: '12px',
  color: '#666',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const estimateValue = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#1565C0',
  margin: '0',
};

const confidenceText = {
  fontSize: '14px',
  color: '#666',
  margin: '8px 0 0',
};

const goalsBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '20px',
  margin: '0 0 16px',
};

const goalsValue = {
  fontSize: '14px',
  color: '#333',
  margin: '0',
  lineHeight: '22px',
  whiteSpace: 'pre-wrap' as const,
};

const metaSection = {
  margin: '16px 0',
};

const metaBadge = {
  backgroundColor: '#e5e7eb',
  color: '#374151',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '12px',
  marginRight: '8px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '24px 0',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const ctaButton = {
  backgroundColor: '#1565C0',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
};

const elevateCta = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1565C0',
  textAlign: 'center' as const,
  margin: '0',
};

const footer = {
  color: '#666',
  fontSize: '12px',
  lineHeight: '20px',
  textAlign: 'center' as const,
};

export default NewLeadNotificationEmail;
