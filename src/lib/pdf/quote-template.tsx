/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer Image component does not support alt prop */
/**
 * Quote PDF Template — Multi-Page Professional Layout
 * Cover page, before/after photos, categorised line items, tier comparison,
 * terms & signature block, and fixed page footer with page numbers.
 * [QEv2-Phase3A]
 */

import {
  Document,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Lead, QuoteDraft, QuoteLineItem } from '@/types/database';
import type { Branding } from '@/lib/branding';
import { STATIC_COLORS, createBaseStyles } from './shared-pdf-styles';
import {
  formatCurrency,
  formatDate,
  formatQuoteNumber,
  getCategoryLabel,
  getProjectTypeLabel,
  groupLineItemsByCategory,
  resolveImageUrl,
} from './pdf-utils';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type TierName = 'good' | 'better' | 'best';

interface TierData {
  items: QuoteLineItem[];
  total: number;
  label: string;
}

export interface QuotePdfProps {
  lead: Lead;
  quote: QuoteDraft;
  branding: Branding;
  showPhotos?: boolean | undefined;
  showSignatureBlock?: boolean | undefined;
}

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────

export function QuotePdfDocument({
  lead,
  quote,
  branding,
  showPhotos = true,
  showSignatureBlock = true,
}: QuotePdfProps) {
  const primaryColor = branding.primaryColor;
  const base = createBaseStyles(primaryColor);

  // Tiered quote detection
  const quoteRecord = quote as unknown as Record<string, unknown>;
  const isTiered = quoteRecord['tier_mode'] === 'tiered';

  const lineItems = (quote.line_items as unknown as QuoteLineItem[]) || [];
  const quoteDate = new Date(quote.created_at);
  const quoteNumber = formatQuoteNumber(quote.created_at, lead.id);
  const workDescription = getProjectTypeLabel(lead.project_type);

  // Financials
  const subtotal =
    quote.subtotal || lineItems.reduce((sum, item) => sum + item.total, 0);
  const contingencyAmount = quote.contingency_amount || 0;
  const hstAmount = quote.hst_amount || subtotal * 0.13;
  const total = quote.total || subtotal + contingencyAmount + hstAmount;

  // Photos
  const hasUploadedPhoto =
    showPhotos &&
    Array.isArray(lead.uploaded_photos) &&
    lead.uploaded_photos.length > 0;
  const hasGeneratedConcept =
    showPhotos &&
    Array.isArray(lead.generated_concepts) &&
    lead.generated_concepts.length > 0;
  const showPhotoPage = hasUploadedPhoto || hasGeneratedConcept;

  // Resolve image URLs (react-pdf needs absolute URLs)
  const originalPhotoUrl = hasUploadedPhoto
    ? resolveImageUrl(lead.uploaded_photos![0]!)
    : null;
  const conceptUrl = hasGeneratedConcept
    ? resolveImageUrl(lead.generated_concepts![0]!)
    : null;

  // Detect SVG logo (react-pdf Image does NOT support SVG)
  const logoUrl = branding.logoUrl || null;
  const isSvgLogo = logoUrl ? logoUrl.toLowerCase().endsWith('.svg') : false;
  const resolvedLogoUrl =
    logoUrl && !isSvgLogo ? resolveImageUrl(logoUrl) : null;

  // Group line items by category
  const grouped = groupLineItemsByCategory(lineItems);

  // Tier data
  const tierData: Record<TierName, TierData> | null = isTiered
    ? {
        good: {
          items: (quoteRecord['tier_good'] as QuoteLineItem[] | null) || [],
          total: (
            (quoteRecord['tier_good'] as QuoteLineItem[] | null) || []
          ).reduce((s, i) => s + i.total, 0),
          label: 'Good — Economy',
        },
        better: {
          items: (quoteRecord['tier_better'] as QuoteLineItem[] | null) || [],
          total: (
            (quoteRecord['tier_better'] as QuoteLineItem[] | null) || []
          ).reduce((s, i) => s + i.total, 0),
          label: 'Better — Standard',
        },
        best: {
          items: (quoteRecord['tier_best'] as QuoteLineItem[] | null) || [],
          total: (
            (quoteRecord['tier_best'] as QuoteLineItem[] | null) || []
          ).reduce((s, i) => s + i.total, 0),
          label: 'Best — Premium',
        },
      }
    : null;

  // Quote-template-specific styles (extend base)
  const styles = StyleSheet.create({
    /* ── Cover page ─────────────────────────────────────── */
    coverPage: {
      ...base.page,
      paddingTop: 60,
      paddingBottom: 60,
      justifyContent: 'space-between',
    },
    coverLogo: {
      width: 180,
      height: 60,
      objectFit: 'contain' as const,
      marginBottom: 10,
    },
    coverTitle: {
      fontSize: 36,
      fontFamily: 'Helvetica-Bold',
      color: primaryColor,
      marginTop: 30,
      marginBottom: 6,
    },
    coverQuoteRef: {
      fontSize: 12,
      color: STATIC_COLORS.muted,
      marginBottom: 30,
    },
    coverInfoRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    coverLabel: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: STATIC_COLORS.secondary,
      width: 100,
    },
    coverValue: {
      fontSize: 10,
      color: STATIC_COLORS.secondary,
    },
    coverDivider: {
      borderBottomWidth: 2,
      borderBottomColor: primaryColor,
      marginVertical: 16,
    },

    /* ── Photo page ─────────────────────────────────────── */
    photoPage: {
      ...base.page,
      paddingBottom: 50,
    },
    photoRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    photoContainer: {
      flex: 1,
    },
    photoImage: {
      width: '100%',
      height: 280,
      objectFit: 'contain' as const,
      borderRadius: 4,
    },
    photoCaption: {
      fontSize: 9,
      color: STATIC_COLORS.muted,
      textAlign: 'center' as const,
      marginTop: 6,
    },

    /* ── Line items page ────────────────────────────────── */
    itemsPage: {
      ...base.page,
      paddingBottom: 50,
    },
    categoryBar: {
      backgroundColor: primaryColor,
      paddingVertical: 6,
      paddingHorizontal: 10,
      marginTop: 12,
      marginBottom: 0,
    },
    categoryBarText: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      color: STATIC_COLORS.white,
    },
    itemRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: STATIC_COLORS.border,
      paddingVertical: 5,
      paddingHorizontal: 10,
      minHeight: 22,
    },
    itemDescription: {
      flex: 3,
      fontSize: 10,
      color: STATIC_COLORS.secondary,
    },
    itemQty: {
      flex: 1,
      fontSize: 10,
      color: STATIC_COLORS.muted,
      textAlign: 'center' as const,
    },
    itemUnit: {
      flex: 1,
      fontSize: 10,
      color: STATIC_COLORS.muted,
      textAlign: 'center' as const,
    },
    itemTotal: {
      flex: 1,
      fontSize: 10,
      color: STATIC_COLORS.secondary,
      textAlign: 'right' as const,
    },
    categorySubtotalRow: {
      flexDirection: 'row',
      paddingVertical: 4,
      paddingHorizontal: 10,
      backgroundColor: STATIC_COLORS.background,
    },
    categorySubtotalLabel: {
      flex: 5,
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: STATIC_COLORS.secondary,
      textAlign: 'right' as const,
      paddingRight: 10,
    },
    categorySubtotalValue: {
      flex: 1,
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: STATIC_COLORS.secondary,
      textAlign: 'right' as const,
    },

    /* ── Summary totals ─────────────────────────────────── */
    summarySection: {
      marginTop: 20,
      alignItems: 'flex-end' as const,
      width: '100%',
    },
    summaryBox: {
      width: 250,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    summaryLabel: {
      fontSize: 10,
      color: STATIC_COLORS.secondary,
    },
    summaryValue: {
      fontSize: 10,
      color: STATIC_COLORS.secondary,
      fontFamily: 'Helvetica-Bold',
    },
    summaryGrandRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderTopWidth: 2,
      borderTopColor: primaryColor,
      marginTop: 4,
    },
    summaryGrandLabel: {
      fontSize: 14,
      fontFamily: 'Helvetica-Bold',
      color: STATIC_COLORS.secondary,
    },
    summaryGrandValue: {
      fontSize: 14,
      fontFamily: 'Helvetica-Bold',
      color: primaryColor,
    },

    /* ── Terms + Signature page ─────────────────────────── */
    termsPage: {
      ...base.page,
      paddingBottom: 50,
    },
    termsSectionHeading: {
      fontSize: 14,
      fontFamily: 'Helvetica-Bold',
      color: STATIC_COLORS.secondary,
      marginBottom: 10,
      marginTop: 20,
    },
    termsBullet: {
      fontSize: 9,
      color: STATIC_COLORS.secondary,
      marginBottom: 3,
      paddingLeft: 12,
    },
    termsBody: {
      fontSize: 9,
      color: STATIC_COLORS.secondary,
      lineHeight: 1.5,
      marginBottom: 8,
    },
    signatureSection: {
      marginTop: 40,
      borderTopWidth: 1,
      borderTopColor: STATIC_COLORS.border,
      paddingTop: 20,
    },
    signatureLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 30,
    },
    signatureBlock: {
      width: '45%',
    },
    signatureRule: {
      borderBottomWidth: 1,
      borderBottomColor: STATIC_COLORS.secondary,
      marginBottom: 4,
      height: 20,
    },
    signatureLabel: {
      fontSize: 9,
      color: STATIC_COLORS.muted,
    },

    /* ── Tier comparison (kept from original) ───────────── */
    tierSection: {
      marginBottom: 15,
      padding: 12,
      borderWidth: 1,
      borderColor: STATIC_COLORS.border,
      borderRadius: 4,
    },
    tierSectionHighlighted: {
      marginBottom: 15,
      padding: 12,
      borderWidth: 2,
      borderColor: primaryColor,
      borderRadius: 4,
    },
  });

  // Shared fixed footer rendered on every page (inline JSX, not a component — avoids react-hooks/static-components)
  const pageFooterJsx = (
    <View style={base.pageFooter} fixed>
      <Text style={base.pageFooterText}>
        {branding.name} | {branding.phone} | {branding.email} |{' '}
        {branding.website}
      </Text>
      <Text style={base.pageFooterText}>{quoteNumber}</Text>
      <Text
        style={base.pageFooterText}
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );

  return (
    <Document>
      {/* ━━ PAGE 1: Cover Page ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Page size="LETTER" style={styles.coverPage}>
        {/* Company header */}
        <View>
          {resolvedLogoUrl ? (
            <Image src={resolvedLogoUrl} style={styles.coverLogo} />
          ) : (
            <Text style={base.companyName}>{branding.name}</Text>
          )}
          <View style={{ marginTop: 4 }}>
            <Text style={base.companyAddress}>{branding.address}</Text>
            <Text style={base.companyAddress}>
              {branding.city}, {branding.province} {branding.postal}
            </Text>
            <Text style={base.companyPhone}>Tel: {branding.phone}</Text>
            <Text style={base.companyWebsite}>{branding.website}</Text>
          </View>

          <Text style={styles.coverTitle}>ESTIMATE</Text>
          <Text style={styles.coverQuoteRef}>
            {quoteNumber} | {formatDate(quoteDate)}
          </Text>

          <View style={styles.coverDivider} />

          {/* Customer info */}
          <View style={styles.coverInfoRow}>
            <Text style={styles.coverLabel}>Prepared for:</Text>
            <Text style={styles.coverValue}>{lead.name}</Text>
          </View>
          {lead.address && (
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverLabel}>Address:</Text>
              <Text style={styles.coverValue}>{lead.address}</Text>
            </View>
          )}
          {lead.city && (
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverLabel} />
              <Text style={styles.coverValue}>
                {lead.city}, {lead.province} {lead.postal_code}
              </Text>
            </View>
          )}
          {lead.email && (
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverLabel}>Email:</Text>
              <Text style={styles.coverValue}>{lead.email}</Text>
            </View>
          )}
          {lead.phone && (
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverLabel}>Phone:</Text>
              <Text style={styles.coverValue}>{lead.phone}</Text>
            </View>
          )}

          <View style={styles.coverDivider} />

          <View style={styles.coverInfoRow}>
            <Text style={styles.coverLabel}>Project:</Text>
            <Text style={styles.coverValue}>{workDescription}</Text>
          </View>
          <View style={styles.coverInfoRow}>
            <Text style={styles.coverLabel}>Valid for:</Text>
            <Text style={styles.coverValue}>
              {quote.validity_days} days from date of issue
            </Text>
          </View>
        </View>

        {/* Grand total preview */}
        <View
          style={{
            alignItems: 'flex-end',
            marginTop: 20,
          }}
        >
          <Text style={{ fontSize: 11, color: STATIC_COLORS.muted }}>
            Estimated Total (incl. HST)
          </Text>
          <Text
            style={{
              fontSize: 28,
              fontFamily: 'Helvetica-Bold',
              color: primaryColor,
            }}
          >
            ${formatCurrency(total)}
          </Text>
        </View>

        {pageFooterJsx}
      </Page>

      {/* ━━ PAGE 2: Before/After Photos (conditional) ━━━━━ */}
      {showPhotoPage && (
        <Page size="LETTER" style={styles.photoPage}>
          <Text
            style={{
              fontSize: 18,
              fontFamily: 'Helvetica-Bold',
              color: STATIC_COLORS.secondary,
            }}
          >
            Your {workDescription} — Current &amp; Proposed
          </Text>

          <View style={styles.photoRow}>
            {originalPhotoUrl && (
              <View style={styles.photoContainer}>
                <Image src={originalPhotoUrl} style={styles.photoImage} />
                <Text style={styles.photoCaption}>Current</Text>
              </View>
            )}
            {conceptUrl && (
              <View style={styles.photoContainer}>
                <Image src={conceptUrl} style={styles.photoImage} />
                <Text style={styles.photoCaption}>Proposed</Text>
              </View>
            )}
          </View>

          {pageFooterJsx}
        </Page>
      )}

      {/* ━━ PAGE 3+: Line Items by Category ━━━━━━━━━━━━━━━ */}
      <Page size="LETTER" style={styles.itemsPage}>
        <Text
          style={{
            fontSize: 18,
            fontFamily: 'Helvetica-Bold',
            color: STATIC_COLORS.secondary,
            marginBottom: 4,
          }}
        >
          Detailed Breakdown
        </Text>
        <Text style={{ fontSize: 10, color: STATIC_COLORS.muted, marginBottom: 12 }}>
          {workDescription} — {lead.name}
        </Text>

        {/* Column headers */}
        <View
          style={{
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: STATIC_COLORS.border,
            paddingVertical: 4,
            paddingHorizontal: 10,
          }}
        >
          <Text
            style={{
              flex: 3,
              fontSize: 9,
              fontFamily: 'Helvetica-Bold',
              color: STATIC_COLORS.muted,
            }}
          >
            Description
          </Text>
          <Text
            style={{
              flex: 1,
              fontSize: 9,
              fontFamily: 'Helvetica-Bold',
              color: STATIC_COLORS.muted,
              textAlign: 'center' as const,
            }}
          >
            Qty
          </Text>
          <Text
            style={{
              flex: 1,
              fontSize: 9,
              fontFamily: 'Helvetica-Bold',
              color: STATIC_COLORS.muted,
              textAlign: 'center' as const,
            }}
          >
            Unit
          </Text>
          <Text
            style={{
              flex: 1,
              fontSize: 9,
              fontFamily: 'Helvetica-Bold',
              color: STATIC_COLORS.muted,
              textAlign: 'right' as const,
            }}
          >
            Amount
          </Text>
        </View>

        {/* Category groups */}
        {Object.entries(grouped).map(([category, items]) => {
          const catSubtotal = items.reduce((s, i) => s + i.total, 0);
          return (
            <View key={category} wrap={false}>
              {/* Category header bar */}
              <View style={styles.categoryBar}>
                <Text style={styles.categoryBarText}>
                  {getCategoryLabel(category)}
                </Text>
              </View>

              {/* Items */}
              {items.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                  <Text style={styles.itemQty}>{item.quantity}</Text>
                  <Text style={styles.itemUnit}>{item.unit}</Text>
                  <Text style={styles.itemTotal}>
                    {formatCurrency(item.total)}
                  </Text>
                </View>
              ))}

              {/* Category subtotal */}
              <View style={styles.categorySubtotalRow}>
                <Text style={styles.categorySubtotalLabel}>
                  {getCategoryLabel(category)} Subtotal
                </Text>
                <Text style={styles.categorySubtotalValue}>
                  {formatCurrency(catSubtotal)}
                </Text>
              </View>
            </View>
          );
        })}

        {/* ── Grand summary ──────────────────────────────── */}
        <View style={styles.summarySection}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                ${formatCurrency(subtotal)}
              </Text>
            </View>
            {contingencyAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Contingency ({quote.contingency_percent}%)
                </Text>
                <Text style={styles.summaryValue}>
                  ${formatCurrency(contingencyAmount)}
                </Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>HST (13%)</Text>
              <Text style={styles.summaryValue}>
                ${formatCurrency(hstAmount)}
              </Text>
            </View>
            <View style={styles.summaryGrandRow}>
              <Text style={styles.summaryGrandLabel}>TOTAL</Text>
              <Text style={styles.summaryGrandValue}>
                ${formatCurrency(total)}
              </Text>
            </View>
          </View>
        </View>

        {pageFooterJsx}
      </Page>

      {/* ━━ Tier Comparison Page (conditional) ━━━━━━━━━━━━ */}
      {isTiered && tierData && (
        <Page size="LETTER" style={styles.itemsPage}>
          <View style={base.header}>
            <View style={base.logoSection}>
              <Text style={base.companyName}>{branding.name}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' as const }}>
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: 'Helvetica-Bold',
                  color: STATIC_COLORS.secondary,
                }}
              >
                PRICING OPTIONS
              </Text>
            </View>
          </View>

          <Text
            style={{
              fontSize: 11,
              color: STATIC_COLORS.muted,
              marginBottom: 20,
            }}
          >
            We have prepared three options at different price points. Each tier
            includes the same scope of work with different materials and
            finishes.
          </Text>

          {(['good', 'better', 'best'] as TierName[]).map((tierName) => {
            const tier = tierData[tierName];
            const tierSubtotal = tier.total;
            const tierHst = tierSubtotal * 0.13;
            const tierTotal = tierSubtotal + tierHst;
            const isBetter = tierName === 'better';

            return (
              <View
                key={tierName}
                style={
                  isBetter
                    ? styles.tierSectionHighlighted
                    : styles.tierSection
                }
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: 'Helvetica-Bold',
                        color: STATIC_COLORS.secondary,
                      }}
                    >
                      {tier.label}
                    </Text>
                    {isBetter && (
                      <Text
                        style={{
                          fontSize: 9,
                          color: primaryColor,
                          fontFamily: 'Helvetica-Bold',
                          marginLeft: 8,
                        }}
                      >
                        RECOMMENDED
                      </Text>
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: 'Helvetica-Bold',
                      color: STATIC_COLORS.secondary,
                    }}
                  >
                    ${formatCurrency(tierTotal)}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{ fontSize: 9, color: STATIC_COLORS.muted }}
                  >
                    {tier.items.length} items — Subtotal: $
                    {formatCurrency(tierSubtotal)}
                  </Text>
                  <Text
                    style={{ fontSize: 9, color: STATIC_COLORS.muted }}
                  >
                    HST (13%): ${formatCurrency(tierHst)}
                  </Text>
                </View>

                {tier.items.slice(0, 5).map((item, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: 2,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        color: STATIC_COLORS.secondary,
                        flex: 3,
                      }}
                    >
                      {item.description}
                    </Text>
                    <Text
                      style={{
                        fontSize: 9,
                        color: STATIC_COLORS.secondary,
                        textAlign: 'right' as const,
                        flex: 1,
                      }}
                    >
                      ${formatCurrency(item.total)}
                    </Text>
                  </View>
                ))}
                {tier.items.length > 5 && (
                  <Text
                    style={{
                      fontSize: 8,
                      color: STATIC_COLORS.muted,
                      marginTop: 2,
                    }}
                  >
                    + {tier.items.length - 5} more items (see detailed
                    breakdown)
                  </Text>
                )}
              </View>
            );
          })}

          <Text
            style={{
              fontSize: 9,
              color: STATIC_COLORS.muted,
              marginTop: 10,
              textAlign: 'center' as const,
            }}
          >
            All options include the same scope of work. Deposit of{' '}
            {quote.deposit_percent}% required to schedule.
          </Text>

          {pageFooterJsx}
        </Page>
      )}

      {/* ━━ FINAL PAGE: Terms + Signature ━━━━━━━━━━━━━━━━━ */}
      <Page size="LETTER" style={styles.termsPage}>
        <Text
          style={{
            fontSize: 18,
            fontFamily: 'Helvetica-Bold',
            color: STATIC_COLORS.secondary,
            marginBottom: 16,
          }}
        >
          Terms &amp; Conditions
        </Text>

        {/* Assumptions */}
        {quote.assumptions && quote.assumptions.length > 0 && (
          <View>
            <Text style={styles.termsSectionHeading}>Assumptions</Text>
            {quote.assumptions.map((item, i) => (
              <Text key={i} style={styles.termsBullet}>
                {'\u2022'} {item}
              </Text>
            ))}
          </View>
        )}

        {/* Exclusions */}
        {quote.exclusions && quote.exclusions.length > 0 && (
          <View>
            <Text style={styles.termsSectionHeading}>Exclusions</Text>
            {quote.exclusions.map((item, i) => (
              <Text key={i} style={styles.termsBullet}>
                {'\u2022'} {item}
              </Text>
            ))}
          </View>
        )}

        {/* Terms paragraph */}
        <Text style={styles.termsSectionHeading}>General Terms</Text>
        <Text style={styles.termsBody}>
          This estimate is valid for {quote.validity_days} days from the date
          of issue. A deposit of {quote.deposit_percent}% is required to
          schedule work. Pricing is subject to change if client requirements
          change or unexpected conditions are discovered during the project.
          Final costs may vary by up to 10% from this estimate due to
          unforeseen site conditions.
        </Text>
        <Text style={styles.termsBody}>
          All prices are in Canadian dollars and include HST at 13%. Due to
          fluctuations in commodity pricing, material costs are guaranteed for
          30 days only.
        </Text>
        <Text style={styles.termsBody}>
          Payment methods accepted: cheque (payable to {branding.name}),
          e-transfer ({branding.paymentEmail}), or credit card. Finance
          charges of 1.25% per month apply to overdue balances.
        </Text>

        {/* Signature block */}
        {showSignatureBlock && (
          <View style={styles.signatureSection}>
            <Text
              style={{
                fontSize: 12,
                fontFamily: 'Helvetica-Bold',
                color: STATIC_COLORS.secondary,
                marginBottom: 4,
              }}
            >
              Acceptance
            </Text>
            <Text
              style={{
                fontSize: 9,
                color: STATIC_COLORS.muted,
                marginBottom: 16,
              }}
            >
              By signing below, you accept this estimate and authorize{' '}
              {branding.name} to proceed as described above.
            </Text>

            <View style={styles.signatureLine}>
              <View style={styles.signatureBlock}>
                <View style={styles.signatureRule} />
                <Text style={styles.signatureLabel}>
                  Authorized Signature
                </Text>
              </View>
              <View style={styles.signatureBlock}>
                <View style={styles.signatureRule} />
                <Text style={styles.signatureLabel}>Date</Text>
              </View>
            </View>

            <View style={[styles.signatureLine, { marginTop: 20 }]}>
              <View style={styles.signatureBlock}>
                <View style={styles.signatureRule} />
                <Text style={styles.signatureLabel}>Print Name</Text>
              </View>
            </View>
          </View>
        )}

        {pageFooterJsx}
      </Page>
    </Document>
  );
}
