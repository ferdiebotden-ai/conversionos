/**
 * PDF Utility Functions
 * Shared helpers for quote and invoice PDF generation.
 * [QEv2-Phase3A]
 */

import type { QuoteLineItem } from '@/types/database';

/** Human-readable category labels matching the quote engine categories */
export const CATEGORY_LABELS: Record<string, string> = {
  demolition: 'Demolition & Removal',
  structural: 'Structural & Framing',
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  materials: 'Materials & Finishes',
  labour: 'Labour',
  other: 'Other',
};

/** Project type display names */
export const PROJECT_TYPE_LABELS: Record<string, string> = {
  kitchen: 'Kitchen Renovation',
  bathroom: 'Bathroom Renovation',
  basement: 'Basement Work',
  flooring: 'Flooring Installation',
  painting: 'Painting',
  exterior: 'Exterior Work',
  other: 'Renovation Work',
};

/** Group line items by their category field, maintaining insertion order */
export function groupLineItemsByCategory(
  items: QuoteLineItem[]
): Record<string, QuoteLineItem[]> {
  const groups: Record<string, QuoteLineItem[]> = {};
  for (const item of items) {
    const cat = item.category || 'other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat]!.push(item);
  }
  return groups;
}

/**
 * Format quote reference number.
 * Pattern: {prefix}-{year}-{first 8 chars of lead ID uppercase}
 * Default prefix is 'QE' (Quote Estimate). Callers may override.
 */
export function formatQuoteNumber(
  quoteCreatedAt: string,
  leadId: string,
  prefix = 'QE'
): string {
  const year = new Date(quoteCreatedAt).getFullYear();
  return `${prefix}-${year}-${leadId.slice(0, 8).toUpperCase()}`;
}

/** Format a number as Canadian currency (no $ prefix — caller adds context) */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Get human-readable category label, falling back to title-cased input */
export function getCategoryLabel(category: string): string {
  return (
    CATEGORY_LABELS[category] ||
    category.charAt(0).toUpperCase() + category.slice(1)
  );
}

/** Format date as YYYY-MM-DD */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0] ?? '';
}

/**
 * Resolve image URL for react-pdf.
 * Relative URLs are prefixed with NEXT_PUBLIC_APP_URL so react-pdf can fetch them.
 * Returns null if input is falsy.
 */
export function resolveImageUrl(
  url: string | null | undefined
): string | null {
  if (!url) return null;
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:')
  ) {
    return url;
  }
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || '';
  return `${appUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Get project type display label */
export function getProjectTypeLabel(projectType: string | null): string {
  return PROJECT_TYPE_LABELS[projectType || 'other'] || 'Renovation Work';
}
