'use client';

/**
 * Quote Editor
 * Full quote editor with line items, totals, assumptions/exclusions, and AI integration
 * [DEV-054, DEV-055, DEV-056, DEV-072]
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { QuoteLineItem, type LineItem } from './quote-line-item';
import { RegenerateQuoteDialog } from './regenerate-quote-dialog';
import { QuoteSendWizard } from './quote-send-wizard';
import { TierComparison, type TierName } from './tier-comparison';
import { ScopeGapRecommendations } from './scope-gap-recommendations';
import { QuoteVersionHistory, type VersionSummary } from './quote-version-history';
import { detectScopeGaps, type ScopeGap } from '@/lib/ai/scope-gap-rules';
import { TemplatePicker } from './template-picker';
import { countPriceMatches } from '@/lib/pricing/fuzzy-match';
import type { QuoteDraft, Json, AssemblyTemplate, ContractorPrice } from '@/types/database';
import type { AIGeneratedQuote, AIQuoteLineItem, AITieredQuote } from '@/lib/schemas/ai-quote';
import {
  Plus,
  Save,
  Loader2,
  FileText,
  AlertCircle,
  Download,
  Send,
  Check,
  Sparkles,
  RotateCcw,
  Layers,
  Minus,
  X,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

// Business constants
const HST_PERCENT = 13;
const DEFAULT_DEPOSIT_PERCENT = 15;
const DEFAULT_CONTINGENCY_PERCENT = 10;

// Default templates
const DEFAULT_ASSUMPTIONS = [
  'All work to be completed during regular business hours (Mon-Fri, 8am-5pm)',
  'Customer provides access to work area and utilities',
  'Existing structure is sound and code-compliant',
  'No hidden damage or issues behind walls/floors',
];

const DEFAULT_EXCLUSIONS = [
  'Permit fees (if required)',
  'Moving or storage of customer belongings',
  'Repairs to existing structural damage',
  'Hazardous material removal (asbestos, mold, etc.)',
];

interface QuoteEditorProps {
  leadId: string;
  initialQuote: QuoteDraft | null;
  initialEstimate: Json | null;
  customerEmail?: string;
  customerName?: string;
  projectType?: string | undefined;
  goalsText?: string | undefined;
  versions?: VersionSummary[] | undefined;
  depositPercent?: number | undefined;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

interface ParsedLineItem {
  description?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  total?: number;
  isFromAI?: boolean;
  isModified?: boolean;
  isAccepted?: boolean;
  confidenceScore?: number;
  aiReasoning?: string;
  transparencyData?: unknown;
  costBeforeMarkup?: number;
  markupPercent?: number;
}

function isLineItemObject(item: Json): item is { [key: string]: Json | undefined } {
  return item !== null && typeof item === 'object' && !Array.isArray(item);
}

function parseLineItems(lineItems: Json | null): LineItem[] {
  if (!Array.isArray(lineItems)) return [];
  return lineItems
    .filter(isLineItemObject)
    .map((item) => {
      const parsed = item as unknown as ParsedLineItem;
      return {
        id: generateId(),
        description: parsed.description || '',
        category: (parsed.category as LineItem['category']) || 'other',
        quantity: parsed.quantity || 1,
        unit: parsed.unit || 'ea',
        unit_price: parsed.unit_price || 0,
        total: parsed.total || 0,
        isFromAI: parsed.isFromAI || false,
        isModified: parsed.isModified || false,
        isAccepted: parsed.isAccepted || false,
        confidenceScore: parsed.confidenceScore,
        aiReasoning: parsed.aiReasoning,
        transparencyData: parsed.transparencyData as LineItem['transparencyData'],
        costBeforeMarkup: parsed.costBeforeMarkup,
        markupPercent: parsed.markupPercent,
      };
    });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(value);
}

type TierMode = 'single' | 'tiered';

// Extract AI quote from initialEstimate
function extractAIQuote(estimate: Json | null): AIGeneratedQuote | null {
  if (!estimate || typeof estimate !== 'object' || Array.isArray(estimate)) {
    return null;
  }
  const obj = estimate as { aiQuote?: AIGeneratedQuote };
  return obj.aiQuote || null;
}

// Extract tiered AI quote from initialEstimate
function extractTieredAIQuote(estimate: Json | null): AITieredQuote | null {
  if (!estimate || typeof estimate !== 'object' || Array.isArray(estimate)) {
    return null;
  }
  const obj = estimate as { aiTieredQuote?: AITieredQuote };
  return obj.aiTieredQuote || null;
}

// Convert AI line items to editor line items
function aiItemsToLineItems(items: AIQuoteLineItem[]): LineItem[] {
  return items.map((item) => ({
    id: generateId(),
    description: item.description,
    category: item.category as LineItem['category'],
    quantity: 1,
    unit: 'lot',
    unit_price: item.total,
    total: item.total,
    isFromAI: true,
    isModified: false,
    confidenceScore: item.confidenceScore,
    aiReasoning: item.aiReasoning,
    transparencyData: item.transparencyData,
    costBeforeMarkup: item.transparencyData?.totalBeforeMarkup,
    markupPercent: item.transparencyData?.markupApplied?.percent,
  }));
}

export function QuoteEditor({
  leadId,
  initialQuote,
  initialEstimate,
  customerEmail,
  customerName,
  projectType = 'other',
  goalsText,
  versions,
  depositPercent = DEFAULT_DEPOSIT_PERCENT,
}: QuoteEditorProps) {
  // Extract AI quote from initial estimate
  const aiQuoteFromEstimate = extractAIQuote(initialEstimate);

  // State — auto-populate from AI if no saved quote exists
  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    if (initialQuote) {
      return parseLineItems(initialQuote.line_items);
    }
    // Auto-populate from AI quote — items load directly into editable table
    if (aiQuoteFromEstimate) {
      return aiQuoteFromEstimate.lineItems.map((item) => ({
        id: generateId(),
        description: item.description,
        category: item.category as LineItem['category'],
        quantity: 1,
        unit: 'lot',
        unit_price: item.total,
        total: item.total,
        isFromAI: true,
        isModified: false,
        confidenceScore: item.confidenceScore,
        aiReasoning: item.aiReasoning,
        transparencyData: item.transparencyData,
        costBeforeMarkup: item.transparencyData?.totalBeforeMarkup,
        markupPercent: item.transparencyData?.markupApplied?.percent,
      }));
    }
    return [];
  });

  const [aiQuote, setAiQuote] = useState<AIGeneratedQuote | null>(aiQuoteFromEstimate);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  const [contingencyPercent, setContingencyPercent] = useState(
    initialQuote?.contingency_percent ?? DEFAULT_CONTINGENCY_PERCENT
  );

  const [assumptions, setAssumptions] = useState<string>(() => {
    // Use AI assumptions if available and no existing quote
    if (!initialQuote && aiQuoteFromEstimate?.assumptions?.length) {
      return aiQuoteFromEstimate.assumptions.join('\n');
    }
    return (initialQuote?.assumptions || DEFAULT_ASSUMPTIONS).join('\n');
  });

  const [exclusions, setExclusions] = useState<string>(() => {
    // Use AI exclusions if available and no existing quote
    if (!initialQuote && aiQuoteFromEstimate?.exclusions?.length) {
      return aiQuoteFromEstimate.exclusions.join('\n');
    }
    return (initialQuote?.exclusions || DEFAULT_EXCLUSIONS).join('\n');
  });

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // V9: Subtotal sanity check dismissal
  const [sanityDismissed, setSanityDismissed] = useState(false);

  // F7: Tier mode toggle confirmation
  const [showTierConfirm, setShowTierConfirm] = useState(false);

  // C4: Reset to AI confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // E1: Retry state — tracks the last failed operation for retry
  const [failedOperation, setFailedOperation] = useState<'save' | 'load' | null>(null);

  // PDF and send quote state
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSendWizard, setShowSendWizard] = useState(false);
  const [sentAt, setSentAt] = useState<Date | null>(
    initialQuote?.sent_at ? new Date(initialQuote.sent_at) : null
  );

  // Version history state
  const latestVersion = versions?.[0]?.version ?? (initialQuote?.version ?? 1);
  const [selectedVersion, setSelectedVersion] = useState(latestVersion);
  const isReadOnly = versions && versions.length > 1 && selectedVersion !== latestVersion;

  // Template picker state
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Contractor prices state (for "Using your prices" indicator)
  const [contractorPrices, setContractorPrices] = useState<ContractorPrice[]>([]);
  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch('/api/admin/prices');
        const json = await res.json();
        if (json.success && json.data?.length > 0) {
          setContractorPrices(json.data);
        }
      } catch {
        // Silently fail — indicator just won't show
      }
    }
    fetchPrices();
  }, []);

  const contractorPriceMatchCount = useMemo(
    () => countPriceMatches(lineItems.map(i => i.description), contractorPrices),
    [lineItems, contractorPrices],
  );

  // Acceptance status from initial quote
  const quoteRecord = initialQuote as unknown as Record<string, unknown> | null;
  const acceptanceStatus = quoteRecord?.['acceptance_status'] as string | null;
  const acceptedByName = quoteRecord?.['accepted_by_name'] as string | null;
  const acceptedAt = quoteRecord?.['accepted_at'] as string | null;

  // Tier state — Good/Better/Best
  const initialQuoteRecord = initialQuote as unknown as Record<string, unknown> | null;
  const [tierMode, setTierMode] = useState<TierMode>(() =>
    initialQuoteRecord?.['tier_mode'] === 'tiered' ? 'tiered' : 'single'
  );
  const [activeTier, setActiveTier] = useState<TierName>('better');
  const [tieredLineItems, setTieredLineItems] = useState<Record<TierName, LineItem[]>>(() => {
    // Restore from saved quote
    if (initialQuoteRecord?.['tier_mode'] === 'tiered') {
      return {
        good: parseLineItems(initialQuoteRecord['tier_good'] as Json ?? null),
        better: parseLineItems(initialQuoteRecord['tier_better'] as Json ?? null),
        best: parseLineItems(initialQuoteRecord['tier_best'] as Json ?? null),
      };
    }
    // Or from AI tiered quote
    const tieredAI = extractTieredAIQuote(initialEstimate);
    if (tieredAI) {
      return {
        good: aiItemsToLineItems(tieredAI.tiers.good.lineItems),
        better: aiItemsToLineItems(tieredAI.tiers.better.lineItems),
        best: aiItemsToLineItems(tieredAI.tiers.best.lineItems),
      };
    }
    return { good: [], better: [], best: [] };
  });
  const [tieredDescriptions, setTieredDescriptions] = useState<Record<TierName, string>>(() => {
    const tieredAI = extractTieredAIQuote(initialEstimate);
    return {
      good: tieredAI?.tiers.good.description || 'Economy finish, stock materials',
      better: tieredAI?.tiers.better.description || 'Standard finish, mid-range materials',
      best: tieredAI?.tiers.best.description || 'Premium finish, designer-grade materials',
    };
  });

  // Debounce ref for auto-save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const contingencyAmount = subtotal * (contingencyPercent / 100);
  const subtotalWithContingency = subtotal + contingencyAmount;
  const hstAmount = subtotalWithContingency * (HST_PERCENT / 100);
  const total = subtotalWithContingency + hstAmount;
  const depositRequired = total * (depositPercent / 100);

  // Count AI items
  const aiItemCount = lineItems.filter((item) => item.isFromAI).length;

  // Save function
  const saveQuote = useCallback(async () => {
    // In tiered mode, use the better tier for line_items (backward compat)
    const itemsToSave = tierMode === 'tiered' ? tieredLineItems.better : lineItems;
    if (itemsToSave.length === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        line_items: itemsToSave.map(({ id, ...item }) => item),
        assumptions: assumptions.split('\n').filter((a) => a.trim()),
        exclusions: exclusions.split('\n').filter((e) => e.trim()),
        contingency_percent: contingencyPercent,
      };

      if (tierMode === 'tiered') {
        payload['tier_mode'] = 'tiered';
        payload['tier_good'] = tieredLineItems.good.map(({ id, ...item }) => item);
        payload['tier_better'] = tieredLineItems.better.map(({ id, ...item }) => item);
        payload['tier_best'] = tieredLineItems.best.map(({ id, ...item }) => item);
      } else {
        payload['tier_mode'] = 'single';
      }

      const response = await fetch(`/api/quotes/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save quote');
      }

      setLastSaved(new Date());
      setHasChanges(false);
    } catch (err) {
      console.error('Error saving quote:', err);
      setError('Failed to save quote.');
      setFailedOperation('save');
    } finally {
      setIsSaving(false);
    }
  }, [leadId, lineItems, assumptions, exclusions, contingencyPercent, tierMode, tieredLineItems]);

  // Auto-save on changes (debounced)
  useEffect(() => {
    if (!hasChanges) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveQuote();
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasChanges, saveQuote]);

  // Mark as changed
  function markChanged() {
    setHasChanges(true);
  }

  // Line item handlers
  function handleAddItem() {
    const newItem: LineItem = {
      id: generateId(),
      description: '',
      category: 'materials',
      quantity: 1,
      unit: 'ea',
      unit_price: 0,
      total: 0,
      isFromAI: false,
    };
    setLineItems([...lineItems, newItem]);
    markChanged();
  }

  function handleInsertTemplate(template: AssemblyTemplate) {
    const items = typeof template.items === 'string' ? JSON.parse(template.items) : template.items;
    const newItems: LineItem[] = items.map((item: { description: string; category: string; quantity: number; unit: string; unit_price: number }) => ({
      id: generateId(),
      description: item.description,
      category: item.category as LineItem['category'],
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
      isFromAI: false,
    }));
    setLineItems([...lineItems, ...newItems]);
    markChanged();
  }

  function handleUpdateItem(index: number, updatedItem: LineItem) {
    const newItems = [...lineItems];
    newItems[index] = updatedItem;
    setLineItems(newItems);
    markChanged();
  }

  function handleDeleteItem(index: number) {
    const newItems = lineItems.filter((_, i) => i !== index);
    setLineItems(newItems);
    markChanged();
  }

  function handleDuplicateItem(index: number) {
    const itemToDuplicate = lineItems[index];
    if (!itemToDuplicate) return;

    const duplicatedItem: LineItem = {
      ...itemToDuplicate,
      id: generateId(),
      description: `${itemToDuplicate.description} (copy)`,
      isFromAI: false, // Duplicates are manual
      isModified: false,
      isAccepted: false,
    };

    const newItems = [...lineItems];
    newItems.splice(index + 1, 0, duplicatedItem);
    setLineItems(newItems);
    markChanged();
  }

  // Tier switching — save current tier, load new tier
  function handleSwitchTier(newTier: TierName) {
    if (newTier === activeTier) return;

    // Save current line items to the active tier
    setTieredLineItems((prev) => ({
      ...prev,
      [activeTier]: lineItems,
    }));

    // Load new tier's items
    setLineItems(tieredLineItems[newTier]);
    setActiveTier(newTier);
    markChanged();
  }

  // Toggle tier mode — F7: Confirm before generating tiers
  function handleToggleTierMode() {
    if (tierMode === 'single') {
      // Show confirmation before generating tiers
      setShowTierConfirm(true);
    } else {
      // Switching to single — no confirmation needed
      setTierMode('single');
      // Save current active tier first
      setTieredLineItems((prev) => ({
        ...prev,
        [activeTier]: lineItems,
      }));
      markChanged();
    }
  }

  // Actually execute the tier mode switch after confirmation
  function executeToggleToTiered() {
    setTierMode('tiered');
    if (tieredLineItems.good.length === 0 && tieredLineItems.better.length === 0) {
      handleRegenerateAIQuote(undefined, true);
    } else {
      setLineItems(tieredLineItems.better);
      setActiveTier('better');
    }
    markChanged();
  }

  // Keep tieredLineItems in sync when lineItems changes in tiered mode
  useEffect(() => {
    if (tierMode === 'tiered') {
      setTieredLineItems((prev) => ({
        ...prev,
        [activeTier]: lineItems,
      }));
    }
  }, [lineItems, tierMode, activeTier]);

  async function handleRegenerateAIQuote(guidance?: string, forceTiered?: boolean) {
    const shouldTier = forceTiered || tierMode === 'tiered';
    setIsRegenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/quotes/${leadId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guidance, tiered: shouldTier }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to regenerate quote');
      }

      const data = await response.json();
      setAiQuote(data.aiQuote);

      if (shouldTier && data.aiTieredQuote) {
        // Populate all three tiers
        const newTiered: Record<TierName, LineItem[]> = {
          good: aiItemsToLineItems(data.aiTieredQuote.tiers.good.lineItems),
          better: aiItemsToLineItems(data.aiTieredQuote.tiers.better.lineItems),
          best: aiItemsToLineItems(data.aiTieredQuote.tiers.best.lineItems),
        };
        setTieredLineItems(newTiered);
        setTieredDescriptions({
          good: data.aiTieredQuote.tiers.good.description,
          better: data.aiTieredQuote.tiers.better.description,
          best: data.aiTieredQuote.tiers.best.description,
        });

        // Load the active tier (default to better)
        setActiveTier('better');
        setLineItems(newTiered.better);
        setTierMode('tiered');
      } else if (data.aiQuote) {
        // Single tier — replace line items directly
        const newItems = aiItemsToLineItems(data.aiQuote.lineItems);
        setLineItems(newItems);
      }

      // Update assumptions/exclusions from AI
      if (data.aiQuote?.assumptions?.length > 0) {
        setAssumptions(data.aiQuote.assumptions.join('\n'));
      }
      if (data.aiQuote?.exclusions?.length > 0) {
        setExclusions(data.aiQuote.exclusions.join('\n'));
      }
      markChanged();
    } catch (err) {
      console.error('Error regenerating quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to regenerate quote');
      setFailedOperation('load');
    } finally {
      setIsRegenerating(false);
    }
  }

  // C4: Show confirmation before resetting
  function handleResetToAI() {
    if (!aiQuote) return;
    setShowResetConfirm(true);
  }

  // Actually execute the reset after confirmation
  function executeResetToAI() {
    if (!aiQuote) return;

    const aiItems = aiItemsToLineItems(aiQuote.lineItems);
    setLineItems(aiItems);

    // Also reset tiered data if available
    const tieredAI = extractTieredAIQuote(initialEstimate);
    if (tieredAI && tierMode === 'tiered') {
      setTieredLineItems({
        good: aiItemsToLineItems(tieredAI.tiers.good.lineItems),
        better: aiItemsToLineItems(tieredAI.tiers.better.lineItems),
        best: aiItemsToLineItems(tieredAI.tiers.best.lineItems),
      });
    }

    if (aiQuote.assumptions.length > 0) {
      setAssumptions(aiQuote.assumptions.join('\n'));
    }
    if (aiQuote.exclusions.length > 0) {
      setExclusions(aiQuote.exclusions.join('\n'));
    }

    markChanged();
  }

  // Download PDF
  async function handleDownloadPdf() {
    if (lineItems.length === 0) {
      setError('Add line items before downloading PDF');
      return;
    }

    // Save first if there are unsaved changes
    if (hasChanges) {
      await saveQuote();
    }

    setIsDownloading(true);
    setError(null);

    try {
      const response = await fetch(`/api/quotes/${leadId}/pdf`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate PDF');
      }

      // Get filename from header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'quote.pdf';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match?.[1]) {
          filename = match[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  }

  // Handle send wizard opening - save first if needed
  async function handleOpenSendWizard() {
    if (lineItems.length === 0) {
      setError('Add line items before sending quote');
      return;
    }

    if (!customerEmail) {
      setError('No email address available for this customer');
      return;
    }

    // Save first if there are unsaved changes
    if (hasChanges) {
      await saveQuote();
    }

    setShowSendWizard(true);
  }

  // Handle send complete - refresh the page
  function handleSendComplete() {
    window.location.reload();
  }

  // Average confidence across AI items
  const aiConfidence = aiItemCount > 0
    ? lineItems
        .filter((item) => item.isFromAI && item.confidenceScore != null)
        .reduce((sum, item) => sum + (item.confidenceScore || 0), 0) /
      Math.max(1, lineItems.filter((item) => item.isFromAI && item.confidenceScore != null).length)
    : 0;

  // Tier comparison data
  const tierComparisonData = useMemo(() => {
    if (tierMode !== 'tiered') return null;
    return {
      good: {
        label: 'Good',
        description: tieredDescriptions.good,
        items: tieredLineItems.good,
      },
      better: {
        label: 'Better',
        description: tieredDescriptions.better,
        items: tieredLineItems.better,
      },
      best: {
        label: 'Best',
        description: tieredDescriptions.best,
        items: tieredLineItems.best,
      },
    };
  }, [tierMode, tieredLineItems, tieredDescriptions]);

  // V9: Subtotal sanity check
  const isSanityWarning = subtotal > 0 && (subtotal < 500 || subtotal > 500000);

  // Scope gap detection (pure rules, zero API cost, microseconds)
  const scopeGaps = useMemo(() => {
    return detectScopeGaps(lineItems, projectType);
  }, [lineItems, projectType]);

  // F8: Filter out gaps where the suggested item already exists in line items
  const filteredScopeGaps = useMemo(() => {
    const existingDescriptions = new Set(
      lineItems.map((item) => item.description.toLowerCase().trim())
    );
    return scopeGaps.filter(
      (gap) => !existingDescriptions.has(gap.suggestedItem.description.toLowerCase().trim())
    );
  }, [scopeGaps, lineItems]);

  // E1: Retry handler
  function handleRetry() {
    if (failedOperation === 'save') {
      setError(null);
      setFailedOperation(null);
      saveQuote();
    } else if (failedOperation === 'load') {
      setError(null);
      setFailedOperation(null);
      handleRegenerateAIQuote();
    }
  }

  function handleDismissError() {
    setError(null);
    setFailedOperation(null);
  }

  function handleAddScopeGapItem(gap: ScopeGap) {
    const newItem: LineItem = {
      id: generateId(),
      description: gap.suggestedItem.description,
      category: gap.suggestedItem.category,
      quantity: 1,
      unit: 'lot',
      unit_price: gap.suggestedItem.estimatedTotal,
      total: gap.suggestedItem.estimatedTotal,
      isFromAI: false,
    };
    setLineItems([...lineItems, newItem]);
    markChanged();
  }

  // Tier totals for send wizard
  const tierTotals = useMemo(() => {
    if (tierMode !== 'tiered') return undefined;
    const calcTotal = (items: LineItem[]) => {
      const sub = items.reduce((sum, item) => sum + item.total, 0);
      const cont = sub * (contingencyPercent / 100);
      const subCont = sub + cont;
      return subCont + subCont * (HST_PERCENT / 100);
    };
    return {
      good: calcTotal(tieredLineItems.good),
      better: calcTotal(tieredLineItems.better),
      best: calcTotal(tieredLineItems.best),
    };
  }, [tierMode, tieredLineItems, contingencyPercent]);

  return (
    <div className="space-y-6">
      {/* Tier Mode Toggle */}
      {aiQuote && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={tierMode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => tierMode !== 'single' && handleToggleTierMode()}
              disabled={isRegenerating}
            >
              <Minus className="h-4 w-4 mr-1" />
              Single Tier
            </Button>
            <Button
              variant={tierMode === 'tiered' ? 'default' : 'outline'}
              size="sm"
              onClick={() => tierMode !== 'tiered' && handleToggleTierMode()}
              disabled={isRegenerating}
            >
              <Layers className="h-4 w-4 mr-1" />
              Three Tiers
            </Button>
          </div>
          {isRegenerating && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </span>
          )}
        </div>
      )}

      {/* Tier Comparison Bar */}
      {tierMode === 'tiered' && tierComparisonData && (
        <TierComparison
          tiers={tierComparisonData}
          activeTier={activeTier}
          onSelectTier={handleSwitchTier}
        />
      )}

      {/* AI Info Banner */}
      {aiQuote && aiItemCount > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50/50 border border-purple-200/50">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="text-purple-700">
              AI-generated quote
              {tierMode === 'tiered' && ` — ${activeTier.charAt(0).toUpperCase() + activeTier.slice(1)} tier`}
              {tierMode === 'single' && ` — ${aiItemCount} items`}
              {aiConfidence > 0 && ` — ${Math.round(aiConfidence * 100)}% avg confidence`}
            </span>
            {contractorPriceMatchCount > 0 && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                Using your prices ({contractorPriceMatchCount} item{contractorPriceMatchCount !== 1 ? 's' : ''})
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRegenerateDialog(true)}
            disabled={isRegenerating}
            className="text-purple-700 border-purple-200 hover:bg-purple-100"
          >
            {isRegenerating ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-1" />
            )}
            Regenerate
          </Button>
        </div>
      )}

      {/* Version History */}
      {versions && versions.length > 1 && (
        <QuoteVersionHistory
          versions={versions}
          activeVersion={selectedVersion}
          onSelectVersion={setSelectedVersion}
        />
      )}

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Quote Line Items
            </CardTitle>
            {aiItemCount > 0 && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                <Sparkles className="h-3 w-3 mr-1" />
                {aiItemCount} from AI
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            {hasChanges && !isSaving && (
              <span className="text-xs text-amber-600">Unsaved changes</span>
            )}
            {isSaving && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </span>
            )}
            <Button onClick={saveQuote} disabled={isSaving || !hasChanges || !!isReadOnly} size="sm">
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* E1: Error banner with retry/dismiss */}
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="text-sm flex-1">{error}</span>
              {failedOperation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismissError}
                className="h-6 w-6 shrink-0 text-destructive hover:bg-destructive/10"
                aria-label="Dismiss error"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Initial estimate info (legacy display) */}
          {initialEstimate && !initialQuote && !aiQuote && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                AI Estimate:{' '}
                {formatCurrency((initialEstimate as { estimateLow?: number }).estimateLow || 0)} -{' '}
                {formatCurrency((initialEstimate as { estimateHigh?: number }).estimateHigh || 0)}
              </p>
            </div>
          )}

          {/* F8: Scope Gap Recommendations above line items */}
          {filteredScopeGaps.length > 0 && (
            <div className="mb-4">
              <ScopeGapRecommendations
                gaps={filteredScopeGaps}
                onAddItem={handleAddScopeGapItem}
              />
            </div>
          )}

          {/* V9: Subtotal sanity check warning */}
          {isSanityWarning && !sanityDismissed && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="text-sm flex-1">This quote total seems unusual. Please verify.</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSanityDismissed(true)}
                className="h-6 w-6 shrink-0 text-amber-600 hover:bg-amber-100"
                aria-label="Dismiss warning"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="w-[80px]">Qty</TableHead>
                  <TableHead className="w-[80px]">Unit</TableHead>
                  <TableHead className="w-[120px]">Unit Price</TableHead>
                  <TableHead className="text-right w-[120px]">Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item, index) => (
                  <QuoteLineItem
                    key={item.id}
                    item={item}
                    onChange={(updated) => handleUpdateItem(index, updated)}
                    onDelete={() => handleDeleteItem(index)}
                    onDuplicate={() => handleDuplicateItem(index)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddItem}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Line Item
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplatePicker(true)}
            >
              <Layers className="h-4 w-4 mr-1" />
              Insert Template
            </Button>
            {aiQuote && lineItems.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetToAI}
                className="text-muted-foreground"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset to AI Quote
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quote Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-w-md">
            {/* Subtotal */}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>

            {/* Contingency */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Contingency</span>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  step="1"
                  value={contingencyPercent}
                  onChange={(e) => {
                    setContingencyPercent(parseFloat(e.target.value) || 0);
                    markChanged();
                  }}
                  className="w-[70px] h-8"
                  aria-label="Contingency percentage"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <span className="font-medium">{formatCurrency(contingencyAmount)}</span>
            </div>

            {/* HST */}
            <div className="flex justify-between">
              <span className="text-muted-foreground">HST ({HST_PERCENT}%)</span>
              <span className="font-medium">{formatCurrency(hstAmount)}</span>
            </div>

            {/* Total */}
            <div className="flex justify-between pt-3 border-t">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg">{formatCurrency(total)}</span>
            </div>

            {/* Deposit */}
            <div className="flex justify-between text-primary">
              <span className="font-medium">
                Deposit Required ({depositPercent}%)
              </span>
              <span className="font-bold">{formatCurrency(depositRequired)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assumptions & Exclusions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assumptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="assumptions" className="text-sm text-muted-foreground">
                One assumption per line
              </Label>
              <Textarea
                id="assumptions"
                value={assumptions}
                onChange={(e) => {
                  setAssumptions(e.target.value);
                  markChanged();
                }}
                placeholder="Enter assumptions..."
                rows={6}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Exclusions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="exclusions" className="text-sm text-muted-foreground">
                One exclusion per line
              </Label>
              <Textarea
                id="exclusions"
                value={exclusions}
                onChange={(e) => {
                  setExclusions(e.target.value);
                  markChanged();
                }}
                placeholder="Enter exclusions..."
                rows={6}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions: Download PDF & Send Quote */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quote Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              {sentAt && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  <span>
                    Sent to {initialQuote?.sent_to_email || customerEmail} on{' '}
                    {sentAt.toLocaleDateString('en-CA', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
              {acceptanceStatus === 'accepted' && acceptedByName && acceptedAt && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Check className="h-3 w-3 mr-1" />
                  Approved by {acceptedByName} on{' '}
                  {new Date(acceptedAt).toLocaleDateString('en-CA', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Badge>
              )}
              {acceptanceStatus === 'pending' && sentAt && (
                <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                  Awaiting approval
                </Badge>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadPdf}
                disabled={isDownloading || lineItems.length === 0}
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download PDF
              </Button>

              {!isReadOnly && (
                <Button
                  onClick={handleOpenSendWizard}
                  disabled={lineItems.length === 0 || !customerEmail}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sentAt ? 'Resend Quote' : 'Send Quote'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Send Quote Wizard with Email Preview */}
      <QuoteSendWizard
        open={showSendWizard}
        onOpenChange={setShowSendWizard}
        leadId={leadId}
        customerName={customerName || 'Customer'}
        customerEmail={customerEmail || ''}
        projectType={projectType}
        quoteTotal={total}
        depositRequired={depositRequired}
        lineItemCount={lineItems.length}
        goalsText={goalsText}
        sentAt={sentAt}
        onSendComplete={handleSendComplete}
        tierMode={tierMode}
        tierTotals={tierTotals}
      />

      {/* Regenerate Quote Dialog */}
      <RegenerateQuoteDialog
        open={showRegenerateDialog}
        onOpenChange={setShowRegenerateDialog}
        onRegenerate={handleRegenerateAIQuote}
        isRegenerating={isRegenerating}
      />

      {/* Template Picker */}
      <TemplatePicker
        open={showTemplatePicker}
        onOpenChange={setShowTemplatePicker}
        onInsert={handleInsertTemplate}
      />

      {/* F7: Tier mode toggle confirmation */}
      <ConfirmDialog
        open={showTierConfirm}
        onOpenChange={setShowTierConfirm}
        title="Generate Pricing Tiers"
        description="Generate Good/Better/Best tiers? This will take ~10 seconds and create three pricing options."
        confirmLabel="Generate"
        onConfirm={executeToggleToTiered}
      />

      {/* C4: Reset to AI confirmation */}
      <ConfirmDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        title="Reset to AI Quote"
        description="This will discard all manual edits and regenerate from AI. This cannot be undone."
        confirmLabel="Reset"
        destructive
        onConfirm={executeResetToAI}
      />
    </div>
  );
}
