/**
 * Invoice PDF Template
 * Professional PDF for tenant-branded invoices
 * Adapted from quote-template.tsx
 * [DEV-089]
 */

/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer Image component does not support alt prop */
import {
  Document,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Invoice, Payment, QuoteLineItem } from '@/types/database';
import type { Branding } from '@/lib/branding';
import { STATIC_COLORS } from './shared-pdf-styles';
import { formatCurrency, formatDate, resolveImageUrl } from './pdf-utils';

export interface InvoicePdfProps {
  invoice: Invoice;
  payments: Payment[];
  branding: Branding;
}

export function InvoicePdfDocument({ invoice, payments, branding }: InvoicePdfProps) {
  const lineItems = (invoice.line_items as unknown as QuoteLineItem[]) || [];
  const subtotal = Number(invoice.subtotal) || 0;
  const hstAmount = Number(invoice.hst_amount) || 0;
  const total = Number(invoice.total) || 0;
  const amountPaid = Number(invoice.amount_paid) || 0;
  const balanceDue = Number(invoice.balance_due) || 0;
  const primaryColor = branding.primaryColor;

  // Logo handling — react-pdf Image does not support SVG
  const logoUrl = branding.logoUrl || null;
  const isSvgLogo = logoUrl ? logoUrl.toLowerCase().endsWith('.svg') : false;
  const resolvedLogoUrl = logoUrl && !isSvgLogo ? resolveImageUrl(logoUrl) : null;

  const minRows = 10;
  const emptyRowsNeeded = Math.max(0, minRows - lineItems.length - 3);

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
    invoiceSection: {
      alignItems: 'flex-end',
    },
    invoiceTitle: {
      fontSize: 24,
      fontFamily: 'Helvetica-Bold',
      color: STATIC_COLORS.secondary,
      marginBottom: 10,
    },
    invoiceInfo: {
      alignItems: 'flex-end',
    },
    invoiceInfoRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 2,
    },
    invoiceInfoLabel: {
      fontSize: 10,
      color: STATIC_COLORS.secondary,
      width: 60,
    },
    invoiceInfoValue: {
      fontSize: 10,
      color: STATIC_COLORS.secondary,
      fontFamily: 'Helvetica-Bold',
      textAlign: 'right' as const,
      width: 90,
    },
    customerWorkRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    customerSection: {
      flex: 1,
    },
    paymentSection: {
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
    emptyRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: STATIC_COLORS.border,
      paddingVertical: 6,
      paddingHorizontal: 10,
      minHeight: 25,
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
      flex: 2.5,
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
      flex: 1.5,
      minWidth: 160,
      paddingTop: 10,
      paddingLeft: 10,
      borderLeftWidth: 1,
      borderLeftColor: STATIC_COLORS.border,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    totalLabel: {
      fontSize: 10,
      color: STATIC_COLORS.secondary,
    },
    totalValue: {
      fontSize: 10,
      color: STATIC_COLORS.secondary,
      fontFamily: 'Helvetica-Bold',
    },
    grandTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 6,
      borderTopWidth: 2,
      borderTopColor: primaryColor,
      marginTop: 4,
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
    balanceDueRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 6,
      marginTop: 8,
    },
    balanceDueLabel: {
      fontSize: 12,
      fontFamily: 'Helvetica-Bold',
      color: primaryColor,
    },
    balanceDueValue: {
      fontSize: 14,
      fontFamily: 'Helvetica-Bold',
      color: primaryColor,
    },
  });

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            {resolvedLogoUrl ? (
              <Image src={resolvedLogoUrl} style={{ width: 180, height: 60, objectFit: 'contain' as const, marginRight: 12 }} />
            ) : (
              <Text style={{ fontSize: 20, fontFamily: 'Helvetica-Bold', color: primaryColor, marginRight: 12 }}>{branding.name}</Text>
            )}
            <View style={styles.companyInfo}>
              <Text style={styles.companyAddress}>{branding.address}</Text>
              <Text style={styles.companyAddress}>{branding.city}, {branding.province} {branding.postal}</Text>
              <Text style={styles.companyPhone}>Tel: {branding.phone}</Text>
              <Text style={styles.companyWebsite}>{branding.website}</Text>
            </View>
          </View>

          <View style={styles.invoiceSection}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={styles.invoiceInfo}>
              <View style={styles.invoiceInfoRow}>
                <Text style={styles.invoiceInfoLabel}>Invoice #:</Text>
                <Text style={styles.invoiceInfoValue}>{invoice.invoice_number}</Text>
              </View>
              <View style={styles.invoiceInfoRow}>
                <Text style={styles.invoiceInfoLabel}>Date:</Text>
                <Text style={styles.invoiceInfoValue}>{formatDate(invoice.issue_date)}</Text>
              </View>
              <View style={styles.invoiceInfoRow}>
                <Text style={styles.invoiceInfoLabel}>Due Date:</Text>
                <Text style={styles.invoiceInfoValue}>{formatDate(invoice.due_date)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.customerWorkRow}>
          <View style={styles.customerSection}>
            <View style={{ flexDirection: 'row' }}>
              <Text style={styles.sectionLabel}>Bill To: </Text>
              <View>
                <Text style={styles.cellText}>{invoice.customer_name}</Text>
                {invoice.customer_address && (
                  <Text style={styles.cellText}>{invoice.customer_address}</Text>
                )}
                <Text style={styles.cellText}>
                  {invoice.customer_city}, {invoice.customer_province} {invoice.customer_postal_code}
                </Text>
                <Text style={styles.cellText}>{invoice.customer_email}</Text>
              </View>
            </View>
          </View>
          <View style={styles.paymentSection}>
            <Text style={styles.sectionLabel}>Payment Terms</Text>
            <Text style={styles.cellText}>15% Deposit Required</Text>
            <Text style={styles.cellText}>E-Transfer: {branding.paymentEmail}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.tableHeaderDescription}>
              <Text style={styles.tableHeaderText}>Description</Text>
            </View>
            <View style={styles.tableHeaderAmount}>
              <Text style={styles.tableHeaderText}>Amount</Text>
            </View>
          </View>

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
            <Text style={styles.termsTitle}>Terms: 15% Deposit required to schedule work.</Text>
            <Text style={styles.termsText}>
              Invoices payable upon receipt. Please make cheques payable to {branding.name}.
              Finance Charges will be applied at a rate of 1.25% per month.
            </Text>
            <Text style={styles.termsText}>
              E-Transfer payments to: {branding.paymentEmail}
            </Text>
            {payments.length > 0 && (
              <>
                <Text style={styles.termsTitle}>Payment History:</Text>
                {payments.map((payment, i) => (
                  <Text key={i} style={styles.termsText}>
                    {formatDate(payment.payment_date)} - ${formatCurrency(Number(payment.amount))} ({payment.payment_method})
                    {payment.reference_number ? ` Ref: ${payment.reference_number}` : ''}
                  </Text>
                ))}
              </>
            )}
          </View>
          <View style={styles.totalSection}>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>TOTAL</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(total)}</Text>
            </View>
            {amountPaid > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Paid</Text>
                <Text style={styles.totalValue}>-{formatCurrency(amountPaid)}</Text>
              </View>
            )}
            <View style={styles.balanceDueRow}>
              <Text style={styles.balanceDueLabel}>BALANCE DUE</Text>
              <Text style={styles.balanceDueValue}>{formatCurrency(balanceDue)}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
