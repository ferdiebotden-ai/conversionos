/**
 * Quote Email Template
 * Professional email template for sending quotes to customers
 * [DEV-058]
 */

import {
  Body,
  Button,
  Container,
  Column,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components';
import type { Lead, QuoteDraft } from '@/types/database';
import type { Branding } from '@/lib/branding';

// Static colors (non-brand)
const STATIC_COLORS = {
  secondary: '#1a1a1a',
  muted: '#666666',
  border: '#e5e5e5',
  background: '#f8f8f8',
  white: '#ffffff',
};

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(amount);
}

// Format date
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Project type display names
const PROJECT_TYPE_LABELS: Record<string, string> = {
  kitchen: 'Kitchen Renovation',
  bathroom: 'Bathroom Renovation',
  basement: 'Basement Finishing',
  flooring: 'Flooring Installation',
  painting: 'Painting',
  exterior: 'Exterior Work',
  other: 'Renovation Project',
};

export interface QuoteEmailProps {
  lead: Lead;
  quote: QuoteDraft;
  customMessage?: string | undefined;
  branding: Branding;
  acceptanceUrl?: string | undefined;
}

export function QuoteEmailTemplate({ lead, quote, customMessage, branding, acceptanceUrl }: QuoteEmailProps) {
  const firstName = lead.name.split(' ')[0];
  const projectType = PROJECT_TYPE_LABELS[lead.project_type || 'other'] || 'Renovation Project';
  const quoteDate = new Date(quote.created_at);
  const expiresAt = quote.expires_at
    ? new Date(quote.expires_at)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const quoteNumber = `DEMO-${quoteDate.getFullYear()}-${String(lead.id).slice(0, 8).toUpperCase()}`;
  const lineItemCount = Array.isArray(quote.line_items) ? quote.line_items.length : 0;
  const primaryColor = branding.primaryColor;

  // Styles (use branding color)
  const main = {
    backgroundColor: STATIC_COLORS.background,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
  };

  const container = {
    backgroundColor: STATIC_COLORS.white,
    margin: '0 auto',
    padding: '40px 0',
    maxWidth: '600px',
  };

  const headerSection = {
    padding: '0 40px 30px',
    borderBottom: `2px solid ${primaryColor}`,
  };

  const brandNameStyle = {
    fontSize: '28px',
    fontWeight: '700' as const,
    color: primaryColor,
    margin: '0',
  };

  const taglineStyle = {
    fontSize: '14px',
    color: STATIC_COLORS.muted,
    margin: '4px 0 0',
  };

  const contentSection = {
    padding: '30px 40px',
  };

  const greeting = {
    fontSize: '18px',
    fontWeight: '600' as const,
    color: STATIC_COLORS.secondary,
    margin: '0 0 16px',
  };

  const paragraph = {
    fontSize: '15px',
    lineHeight: '1.6',
    color: STATIC_COLORS.secondary,
    margin: '0 0 16px',
  };

  const quoteCard = {
    backgroundColor: STATIC_COLORS.background,
    borderRadius: '8px',
    padding: '24px',
    margin: '24px 0',
  };

  const quoteTitle = {
    fontSize: '16px',
    fontWeight: '600' as const,
    color: primaryColor,
    margin: '0 0 16px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  };

  const quoteRow = {
    margin: '0 0 8px',
  };

  const quoteLabel = {
    fontSize: '14px',
    color: STATIC_COLORS.muted,
    margin: '0',
  };

  const quoteValue = {
    fontSize: '14px',
    fontWeight: '600' as const,
    color: STATIC_COLORS.secondary,
    margin: '0',
  };

  const totalRow = {
    paddingTop: '16px',
    marginTop: '16px',
    borderTop: `2px solid ${primaryColor}`,
  };

  const totalLabel = {
    fontSize: '18px',
    fontWeight: '700' as const,
    color: STATIC_COLORS.secondary,
    margin: '0',
  };

  const totalValue = {
    fontSize: '24px',
    fontWeight: '700' as const,
    color: primaryColor,
    margin: '0',
  };

  const depositText = {
    fontSize: '14px',
    color: STATIC_COLORS.muted,
    margin: '8px 0 0',
  };

  const ctaSection = {
    textAlign: 'center' as const,
    padding: '16px 0 24px',
  };

  const ctaButton = {
    backgroundColor: primaryColor,
    borderRadius: '6px',
    color: STATIC_COLORS.white,
    fontSize: '16px',
    fontWeight: '600' as const,
    textDecoration: 'none',
    textAlign: 'center' as const,
    padding: '14px 32px',
    display: 'inline-block',
  };

  const validityBadge = {
    backgroundColor: STATIC_COLORS.secondary,
    borderRadius: '4px',
    color: STATIC_COLORS.white,
    fontSize: '12px',
    fontWeight: '500' as const,
    padding: '6px 12px',
    display: 'inline-block',
    margin: '16px 0 0',
  };

  const customMessageSection = {
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    padding: '16px 20px',
    margin: '0 0 24px',
    borderLeft: `4px solid #f59e0b`,
  };

  const customMessageText = {
    fontSize: '14px',
    lineHeight: '1.5',
    color: STATIC_COLORS.secondary,
    margin: '0',
    fontStyle: 'italic' as const,
  };

  const footerSection = {
    padding: '24px 40px',
    borderTop: `1px solid ${STATIC_COLORS.border}`,
  };

  const footerText = {
    fontSize: '13px',
    color: STATIC_COLORS.muted,
    margin: '0 0 4px',
    textAlign: 'center' as const,
  };

  const footerLink = {
    color: primaryColor,
    textDecoration: 'none',
  };

  const hr = {
    borderColor: STATIC_COLORS.border,
    margin: '24px 0',
  };

  return (
    <Html>
      <Head />
      <Preview>
        Your quote from {branding.name} - {formatCurrency(quote.total || 0)} for your {projectType.toLowerCase()}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={headerSection}>
            <Text style={brandNameStyle}>{branding.name}</Text>
            <Text style={taglineStyle}>{branding.tagline}</Text>
          </Section>

          {/* Content */}
          <Section style={contentSection}>
            <Text style={greeting}>Hi {firstName},</Text>

            <Text style={paragraph}>
              Thank you for considering {branding.name} for your {projectType.toLowerCase()}.
              We&apos;re excited about the possibility of bringing your vision to life!
            </Text>

            <Text style={paragraph}>
              Attached you&apos;ll find your detailed quote (#{quoteNumber}) with a complete
              breakdown of materials, labour, and all associated costs.
            </Text>

            {/* Custom message from contractor */}
            {customMessage && (
              <Section style={customMessageSection}>
                <Text style={customMessageText}>&ldquo;{customMessage}&rdquo;</Text>
              </Section>
            )}

            {/* Quote summary card */}
            <Section style={quoteCard}>
              <Text style={quoteTitle}>Quote Summary</Text>

              <Row style={quoteRow}>
                <Column>
                  <Text style={quoteLabel}>Project Type</Text>
                </Column>
                <Column align="right">
                  <Text style={quoteValue}>{projectType}</Text>
                </Column>
              </Row>

              <Row style={quoteRow}>
                <Column>
                  <Text style={quoteLabel}>Quote Number</Text>
                </Column>
                <Column align="right">
                  <Text style={quoteValue}>{quoteNumber}</Text>
                </Column>
              </Row>

              <Row style={quoteRow}>
                <Column>
                  <Text style={quoteLabel}>Line Items</Text>
                </Column>
                <Column align="right">
                  <Text style={quoteValue}>{lineItemCount} items</Text>
                </Column>
              </Row>

              <Row style={quoteRow}>
                <Column>
                  <Text style={quoteLabel}>Subtotal</Text>
                </Column>
                <Column align="right">
                  <Text style={quoteValue}>{formatCurrency(quote.subtotal || 0)}</Text>
                </Column>
              </Row>

              {(quote.contingency_percent || 0) > 0 && (
                <Row style={quoteRow}>
                  <Column>
                    <Text style={quoteLabel}>Contingency ({quote.contingency_percent}%)</Text>
                  </Column>
                  <Column align="right">
                    <Text style={quoteValue}>{formatCurrency(quote.contingency_amount || 0)}</Text>
                  </Column>
                </Row>
              )}

              <Row style={quoteRow}>
                <Column>
                  <Text style={quoteLabel}>HST ({quote.hst_percent}%)</Text>
                </Column>
                <Column align="right">
                  <Text style={quoteValue}>{formatCurrency(quote.hst_amount || 0)}</Text>
                </Column>
              </Row>

              <Row style={totalRow}>
                <Column>
                  <Text style={totalLabel}>Total</Text>
                </Column>
                <Column align="right">
                  <Text style={totalValue}>{formatCurrency(quote.total || 0)}</Text>
                </Column>
              </Row>

              <Text style={depositText}>
                Deposit required: {formatCurrency(quote.deposit_required || 0)} ({quote.deposit_percent}%)
              </Text>
            </Section>

            {/* Acceptance CTA */}
            {acceptanceUrl && (
              <Section style={ctaSection}>
                <Button href={acceptanceUrl} style={ctaButton}>
                  Review &amp; Approve Your Quote
                </Button>
                <Text style={{ ...paragraph, fontSize: '13px', color: STATIC_COLORS.muted, marginTop: '8px' }}>
                  Click above to review and approve this quote online
                </Text>
              </Section>
            )}

            {/* CTA */}
            <Section style={ctaSection}>
              <Text style={paragraph}>
                Please review the attached PDF for the complete breakdown including
                assumptions, exclusions, and terms.
              </Text>

              <Text style={validityBadge}>
                Valid until {formatDate(expiresAt)}
              </Text>
            </Section>

            <Hr style={hr} />

            <Text style={paragraph}>
              Have questions or want to discuss your project further?
              We&apos;d love to hear from you!
            </Text>

            <Section style={ctaSection}>
              <Button href={`mailto:${branding.quotesEmail}`} style={ctaButton}>
                Reply to This Quote
              </Button>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              {branding.name} | {branding.city}, {branding.province}
            </Text>
            <Text style={footerText}>
              <Link href={`mailto:${branding.quotesEmail}`} style={footerLink}>
                {branding.quotesEmail}
              </Link>
              {' '}&bull;{' '}
              <Link href={`tel:${branding.phone.replace(/[^+\d]/g, '')}`} style={footerLink}>
                {branding.phone}
              </Link>
            </Text>
            <Text style={{ ...footerText, marginTop: '16px', fontSize: '11px' }}>
              This email was sent to {lead.email} because you requested a renovation quote.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default QuoteEmailTemplate;
