/**
 * Shared PDF Styles
 * Common StyleSheet definitions used across quote and invoice templates.
 * [QEv2-Phase3A]
 */

import { StyleSheet } from '@react-pdf/renderer';

/** Non-brand colours shared across all PDF templates */
export const STATIC_COLORS = {
  secondary: '#1a1a1a',
  muted: '#666666',
  border: '#e5e5e5',
  white: '#ffffff',
  background: '#f8f8f8',
} as const;

/**
 * Create base styles parameterised by the tenant's primary colour.
 * Both quote-template and invoice-template can call this and spread/extend.
 */
export function createBaseStyles(primaryColor: string) {
  return StyleSheet.create({
    /* ── Page ────────────────────────────────────────────── */
    page: {
      padding: 40,
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: STATIC_COLORS.secondary,
    },

    /* ── Header ─────────────────────────────────────────── */
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
    companyName: {
      fontSize: 20,
      fontFamily: 'Helvetica-Bold',
      color: primaryColor,
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

    /* ── Section labels ─────────────────────────────────── */
    sectionLabel: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: STATIC_COLORS.secondary,
    },
    cellText: {
      fontSize: 10,
      color: STATIC_COLORS.secondary,
    },

    /* ── Table ──────────────────────────────────────────── */
    table: {
      width: '100%' as const,
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
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: STATIC_COLORS.border,
      paddingVertical: 6,
      paddingHorizontal: 10,
      minHeight: 25,
    },
    cellAmount: {
      fontSize: 10,
      color: STATIC_COLORS.secondary,
      textAlign: 'right' as const,
    },

    /* ── Totals ─────────────────────────────────────────── */
    totalsRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: STATIC_COLORS.border,
      paddingVertical: 6,
      paddingHorizontal: 10,
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

    /* ── Terms / footer ─────────────────────────────────── */
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

    /* ── Fixed page footer ──────────────────────────────── */
    pageFooter: {
      position: 'absolute' as const,
      bottom: 20,
      left: 40,
      right: 40,
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: STATIC_COLORS.border,
      paddingTop: 6,
    },
    pageFooterText: {
      fontSize: 7,
      color: STATIC_COLORS.muted,
    },
  });
}
