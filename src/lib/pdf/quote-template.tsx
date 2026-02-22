/**
 * Quote PDF Template
 * Professional PDF for tenant-branded estimates
 * [DEV-057, DEV-072]
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Lead, QuoteDraft, QuoteLineItem } from '@/types/database';
import type { Branding } from '@/lib/branding';

// Static colors (non-brand)
const STATIC_COLORS = {
  secondary: '#1a1a1a',
  muted: '#666666',
  border: '#e5e5e5',
  white: '#ffffff',
};

// Format currency without cents for cleaner display (matching sample)
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format date as YYYY-MM-DD
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0] ?? '';
}

// Project type display names
const PROJECT_TYPE_LABELS: Record<string, string> = {
  kitchen: 'Kitchen Renovation',
  bathroom: 'Bathroom Renovation',
  basement: 'Basement Work',
  flooring: 'Flooring Installation',
  painting: 'Painting',
  exterior: 'Exterior Work',
  other: 'Renovation Work',
};

export interface QuotePdfProps {
  lead: Lead;
  quote: QuoteDraft;
  branding: Branding;
}

export function QuotePdfDocument({ lead, quote, branding }: QuotePdfProps) {
  const lineItems = (quote.line_items as unknown as QuoteLineItem[]) || [];
  const quoteDate = new Date(quote.created_at);
  const primaryColor = branding.primaryColor;

  // Generate quote number from lead ID (first 3 digits or sequential)
  const quoteNumber = lead.id.slice(0, 3).replace(/[^0-9]/g, '') || '001';

  // Calculate HST (13%)
  const subtotal = quote.subtotal || lineItems.reduce((sum, item) => sum + item.total, 0);
  const hstAmount = quote.hst_amount || subtotal * 0.13;
  const total = quote.total || subtotal + hstAmount;

  // Work description
  const workDescription = PROJECT_TYPE_LABELS[lead.project_type || 'other'] || 'Renovation Work';

  // Minimum rows to display (for visual consistency)
  const minRows = 12;
  const emptyRowsNeeded = Math.max(0, minRows - lineItems.length - 3); // -3 for subtotal, HST rows

  // Styles using branding color
  const styles = StyleSheet.create({
    page: {
      padding: 40,
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: STATIC_COLORS.secondary,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    logoSection: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      flex: 1,
    },
    companyInfo: {
      paddingTop: 5,
    },
    companyAddress: {
      fontSize: 10,
      color: STATIC_COLORS.secondary,
      marginBottom: 2,
    },
    companyPhone: {
      fontSize: 10,
      color: STATIC_COLORS.secondary,
      marginBottom: 2,
    },
    companyWebsite: {
      fontSize: 10,
      color: primaryColor,
      fontFamily: 'Helvetica-Bold',
    },
    estimateSection: {
      alignItems: 'flex-end',
    },
    estimateTitle: {
      fontSize: 24,
      fontFamily: 'Helvetica-Bold',
      color: STATIC_COLORS.secondary,
      marginBottom: 10,
    },
    estimateInfo: {
      alignItems: 'flex-end',
    },
    estimateInfoRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 2,
    },
    estimateInfoLabel: {
      fontSize: 10,
      color: STATIC_COLORS.secondary,
      width: 40,
    },
    estimateInfoValue: {
      fontSize: 10,
      color: STATIC_COLORS.secondary,
      fontFamily: 'Helvetica-Bold',
      textAlign: 'right' as const,
      width: 80,
    },
    customerWorkRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    customerSection: {
      flex: 1,
    },
    workSection: {
      flex: 1,
      alignItems: 'flex-end',
    },
    sectionLabel: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: STATIC_COLORS.secondary,
    },
    cellText: {
      fontSize: 10,
      color: STATIC_COLORS.secondary,
    },
    workDescription: {
      fontSize: 10,
      color: STATIC_COLORS.secondary,
      textAlign: 'right' as const,
    },
    table: {
      width: '100%',
      marginBottom: 0,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: primaryColor,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    tableHeaderText: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      color: STATIC_COLORS.white,
    },
    tableHeaderDescription: {
      flex: 3,
    },
    tableHeaderAmount: {
      flex: 1,
      textAlign: 'right' as const,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: STATIC_COLORS.border,
      paddingVertical: 6,
      paddingHorizontal: 10,
      minHeight: 25,
    },
    tableRowDescription: {
      flex: 3,
    },
    tableRowAmount: {
      flex: 1,
      textAlign: 'right' as const,
    },
    cellAmount: {
      fontSize: 10,
      color: STATIC_COLORS.secondary,
      textAlign: 'right' as const,
    },
    totalsRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: STATIC_COLORS.border,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    hstRow: {
      flexDirection: 'row',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderBottomWidth: 0,
    },
    bottomSection: {
      flexDirection: 'row',
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: STATIC_COLORS.border,
    },
    termsSection: {
      flex: 3,
      paddingTop: 10,
      paddingRight: 20,
    },
    termsTitle: {
      fontSize: 9,
      fontFamily: 'Helvetica-Bold',
      color: STATIC_COLORS.secondary,
      marginBottom: 4,
    },
    termsText: {
      fontSize: 8,
      color: STATIC_COLORS.muted,
      lineHeight: 1.4,
      marginBottom: 8,
    },
    totalSection: {
      flex: 1,
      paddingTop: 10,
      paddingLeft: 10,
      borderLeftWidth: 1,
      borderLeftColor: STATIC_COLORS.border,
    },
    grandTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    grandTotalLabel: {
      fontSize: 12,
      fontFamily: 'Helvetica-Bold',
      color: STATIC_COLORS.secondary,
    },
    grandTotalValue: {
      fontSize: 14,
      fontFamily: 'Helvetica-Bold',
      color: STATIC_COLORS.secondary,
    },
    emptyRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: STATIC_COLORS.border,
      paddingVertical: 6,
      paddingHorizontal: 10,
      minHeight: 25,
    },
  });

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {/* Logo and Company Info */}
          <View style={styles.logoSection}>
            {/* Company Name */}
            <Text style={{ fontSize: 20, fontFamily: 'Helvetica-Bold', color: primaryColor }}>{branding.name}</Text>
            <View style={styles.companyInfo}>
              <Text style={styles.companyAddress}>{branding.address}</Text>
              <Text style={styles.companyAddress}>{branding.city}, {branding.province} {branding.postal}</Text>
              <Text style={styles.companyPhone}>Tel: {branding.phone}</Text>
              <Text style={styles.companyWebsite}>{branding.website}</Text>
            </View>
          </View>

          {/* Estimate Info */}
          <View style={styles.estimateSection}>
            <Text style={styles.estimateTitle}>ESTIMATE</Text>
            <View style={styles.estimateInfo}>
              <View style={styles.estimateInfoRow}>
                <Text style={styles.estimateInfoLabel}>No.:</Text>
                <Text style={styles.estimateInfoValue}>{quoteNumber}</Text>
              </View>
              <View style={styles.estimateInfoRow}>
                <Text style={styles.estimateInfoLabel}>Date:</Text>
                <Text style={styles.estimateInfoValue}>{formatDate(quoteDate)}</Text>
              </View>
              <View style={styles.estimateInfoRow}>
                <Text style={styles.estimateInfoLabel}>Page:</Text>
                <Text style={styles.estimateInfoValue}>1</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Customer and Work */}
        <View style={styles.customerWorkRow}>
          <View style={styles.customerSection}>
            <View style={{ flexDirection: 'row' }}>
              <Text style={styles.sectionLabel}>Customer: </Text>
              <View>
                <Text style={styles.cellText}>{lead.name}</Text>
                {lead.address && <Text style={styles.cellText}>{lead.address}</Text>}
                {lead.city && (
                  <Text style={styles.cellText}>
                    {lead.city}, {lead.province} {lead.postal_code}
                  </Text>
                )}
              </View>
            </View>
          </View>
          <View style={styles.workSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Text style={styles.sectionLabel}>Work: </Text>
              <Text style={styles.workDescription}>{workDescription}</Text>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <View style={styles.tableHeaderDescription}>
              <Text style={styles.tableHeaderText}>Description</Text>
            </View>
            <View style={styles.tableHeaderAmount}>
              <Text style={styles.tableHeaderText}>Amount</Text>
            </View>
          </View>

          {/* Line Items */}
          {lineItems.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.tableRowDescription}>
                <Text style={styles.cellText}>{item.description}</Text>
              </View>
              <View style={styles.tableRowAmount}>
                <Text style={styles.cellAmount}>{formatCurrency(item.total)}</Text>
              </View>
            </View>
          ))}

          {/* Empty rows for spacing */}
          {Array.from({ length: emptyRowsNeeded }).map((_, index) => (
            <View key={`empty-${index}`} style={styles.emptyRow}>
              <View style={styles.tableRowDescription}>
                <Text style={styles.cellText}></Text>
              </View>
              <View style={styles.tableRowAmount}>
                <Text style={styles.cellAmount}></Text>
              </View>
            </View>
          ))}

          {/* Subtotal */}
          <View style={styles.totalsRow}>
            <View style={styles.tableRowDescription}>
              <Text style={styles.cellText}>Subtotal:</Text>
            </View>
            <View style={styles.tableRowAmount}>
              <Text style={styles.cellAmount}>{formatCurrency(subtotal)}</Text>
            </View>
          </View>

          {/* HST */}
          <View style={styles.hstRow}>
            <View style={styles.tableRowDescription}>
              <Text style={styles.cellText}>H - HST 13%</Text>
              <Text style={styles.cellText}>GST/HST</Text>
            </View>
            <View style={styles.tableRowAmount}>
              <Text style={styles.cellAmount}></Text>
              <Text style={styles.cellAmount}>{formatCurrency(hstAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Terms and Total */}
        <View style={styles.bottomSection}>
          <View style={styles.termsSection}>
            <Text style={styles.termsTitle}>Terms: 50% Deposit required to schedule work.</Text>
            <Text style={styles.termsText}>
              Disclaimer: Pricing on this estimate is subject to change if client changes requirements
              or unexpected issues arise during job. Due to fluctuations in commodity availability,
              supplies pricing will be guaranteed for only one week.
            </Text>
            <Text style={styles.termsText}>
              Invoices payable upon receipt. Please make cheques payable to {branding.name}.
              Finance Charges will be applied at a rate of 1.25% per month
            </Text>
          </View>
          <View style={styles.totalSection}>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>TOTAL</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(total)}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
