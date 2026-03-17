/**
 * Contractor Feedback Email
 * Sent to the platform owner when a contractor submits feedback
 * through the admin dashboard co-pilot widget.
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface FeedbackMessage {
  role: 'user' | 'bot';
  content: string;
}

interface ContractorFeedbackEmailProps {
  companyName: string;
  category: string;
  messages: FeedbackMessage[];
  timestamp: string;
  siteId: string;
}

const CATEGORY_COLOURS: Record<string, { bg: string; text: string }> = {
  'Pricing Issue': { bg: '#fef2f2', text: '#dc2626' },
  'Feature Request': { bg: '#eff6ff', text: '#2563eb' },
  'Question': { bg: '#f0fdf4', text: '#16a34a' },
  'General Feedback': { bg: '#f5f3ff', text: '#7c3aed' },
};

export function ContractorFeedbackEmail({
  companyName,
  category,
  messages,
  timestamp,
  siteId,
}: ContractorFeedbackEmailProps) {
  const categoryStyle = CATEGORY_COLOURS[category] ?? { bg: '#f5f3ff', text: '#7c3aed' };

  return (
    <Html>
      <Head />
      <Preview>
        {category} from {companyName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={headerSection}>
            <Text style={tenantName}>{companyName}</Text>
            <Heading style={heading}>Platform Feedback</Heading>
          </Section>

          {/* Category badge */}
          <Section style={{ margin: '0 0 20px' }}>
            <span
              style={{
                backgroundColor: categoryStyle.bg,
                color: categoryStyle.text,
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '600',
                display: 'inline-block',
              }}
            >
              {category}
            </span>
          </Section>

          {/* Conversation transcript */}
          <Section style={transcriptBox}>
            <Text style={transcriptLabel}>CONVERSATION</Text>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  textAlign: msg.role === 'user' ? 'left' : 'right',
                  marginBottom: i < messages.length - 1 ? '12px' : '0',
                }}
              >
                <Text
                  style={{
                    ...messageBubble,
                    ...(msg.role === 'user' ? userBubble : botBubble),
                  }}
                >
                  {msg.content}
                </Text>
                <Text
                  style={{
                    ...roleLabel,
                    textAlign: msg.role === 'user' ? 'left' : 'right',
                  }}
                >
                  {msg.role === 'user' ? 'Contractor' : 'Bot'}
                </Text>
              </div>
            ))}
          </Section>

          {/* Metadata */}
          <Section style={metaSection}>
            <span style={metaBadge}>Tenant: {siteId}</span>
            <span style={metaBadge}>{timestamp}</span>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Text style={footer}>
            Reply to this email to respond directly to the contractor.
            <br />
            This feedback was submitted via the admin dashboard.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles — following patterns from new-lead-notification.tsx
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '580px',
  borderRadius: '8px',
};

const headerSection = {
  marginBottom: '20px',
};

const tenantName = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '0 0 4px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  fontWeight: '600',
};

const heading = {
  fontSize: '24px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#1a1a1a',
  margin: '0',
};

const transcriptBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '20px',
  margin: '0 0 16px',
};

const transcriptLabel = {
  fontSize: '11px',
  color: '#9ca3af',
  margin: '0 0 14px',
  letterSpacing: '0.5px',
  fontWeight: '600',
};

const messageBubble = {
  fontSize: '14px',
  lineHeight: '21px',
  margin: '0',
  padding: '10px 14px',
  borderRadius: '12px',
  display: 'inline-block',
  maxWidth: '85%',
};

const userBubble = {
  backgroundColor: '#0d9488',
  color: '#ffffff',
  borderBottomLeftRadius: '4px',
};

const botBubble = {
  backgroundColor: '#e5e7eb',
  color: '#374151',
  borderBottomRightRadius: '4px',
};

const roleLabel = {
  fontSize: '10px',
  color: '#9ca3af',
  margin: '2px 4px 0',
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

const footer = {
  color: '#666',
  fontSize: '12px',
  lineHeight: '20px',
  textAlign: 'center' as const,
};

export default ContractorFeedbackEmail;
