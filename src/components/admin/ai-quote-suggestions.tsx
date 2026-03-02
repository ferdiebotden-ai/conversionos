'use client';

/**
 * AI Quote Suggestions Component
 * Displays AI-generated line items with accept/modify/reject actions
 * [DEV-072]
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sparkles,
  Check,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import type { AIGeneratedQuote, AIQuoteLineItem } from '@/lib/schemas/ai-quote';

interface AIQuoteSuggestionsProps {
  aiQuote: AIGeneratedQuote | null;
  onAcceptItem: (item: AIQuoteLineItem) => void;
  onAcceptAll: () => void;
  onRegenerate: (guidance?: string) => Promise<void>;
  isRegenerating?: boolean;
  acceptedItemIds: Set<string>;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(value);
}

function getConfidenceColor(score: number): string {
  if (score >= 0.8) return 'bg-green-100 text-green-800 border-green-200';
  if (score >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-orange-100 text-orange-800 border-orange-200';
}

function getConfidenceLabel(score: number): string {
  if (score >= 0.8) return 'High';
  if (score >= 0.6) return 'Medium';
  return 'Low';
}

const CATEGORY_COLORS: Record<string, string> = {
  materials: 'bg-blue-100 text-blue-800',
  labor: 'bg-purple-100 text-purple-800',
  contract: 'bg-indigo-100 text-indigo-800',
  permit: 'bg-gray-100 text-gray-800',
  other: 'bg-slate-100 text-slate-800',
};

export function AIQuoteSuggestions({
  aiQuote,
  onAcceptItem,
  onAcceptAll,
  onRegenerate,
  isRegenerating = false,
  acceptedItemIds,
}: AIQuoteSuggestionsProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [regenerateGuidance, setRegenerateGuidance] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [isCardExpanded, setIsCardExpanded] = useState(false);

  if (!aiQuote) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No AI-generated quote available for this lead.</p>
            <p className="text-sm mt-1">
              AI quotes are generated automatically when leads are submitted with sufficient project details.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const subtotal = aiQuote.lineItems.reduce((sum, item) => sum + item.total, 0);
  const allAccepted = aiQuote.lineItems.every((_, i) => acceptedItemIds.has(`ai-${i}`));

  function toggleItemExpand(index: number) {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  }

  async function handleRegenerate() {
    await onRegenerate(regenerateGuidance.trim() || undefined);
    setShowRegenerateDialog(false);
    setRegenerateGuidance('');
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-white">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">AI-Generated Quote</CardTitle>
              <CardDescription>
                Review and accept suggested line items
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={getConfidenceColor(aiQuote.overallConfidence)}
                  >
                    {Math.round(aiQuote.overallConfidence * 100)}% confident
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Overall AI confidence in this quote</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCardExpanded(!isCardExpanded)}
              className="h-8 w-8 p-0"
              aria-label={isCardExpanded ? 'Collapse AI quote' : 'Expand AI quote'}
            >
              {isCardExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isCardExpanded && <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Line Items</p>
            <p className="text-lg font-semibold">{aiQuote.lineItems.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Subtotal</p>
            <p className="text-lg font-semibold">{formatCurrency(subtotal)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Confidence</p>
            <p className="text-lg font-semibold">
              {getConfidenceLabel(aiQuote.overallConfidence)}
            </p>
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-2">
          {aiQuote.lineItems.map((item, index) => {
            const itemId = `ai-${index}`;
            const isAccepted = acceptedItemIds.has(itemId);
            const isExpanded = expandedItems.has(index);

            return (
              <div
                key={index}
                className={`border rounded-lg transition-all ${
                  isAccepted
                    ? 'border-green-200 bg-green-50/50'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <div className="p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{item.description}</span>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${CATEGORY_COLORS[item.category] || ''}`}
                        >
                          {item.category}
                        </Badge>
                        {isAccepted && (
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Added
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg font-semibold text-primary">
                          {formatCurrency(item.total)}
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className={`text-xs ${getConfidenceColor(item.confidenceScore)}`}
                              >
                                {Math.round(item.confidenceScore * 100)}%
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-medium mb-1">AI Reasoning:</p>
                              <p className="text-sm">{item.aiReasoning}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleItemExpand(index)}
                        className="h-8 w-8 p-0"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      {!isAccepted && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAcceptItem(item)}
                          className="h-8"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t text-sm">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium text-muted-foreground">AI Reasoning</p>
                          <p className="mt-1">{item.aiReasoning}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Assumptions & Exclusions */}
        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full justify-between"
          >
            <span className="text-sm font-medium">Assumptions & Exclusions</span>
            {showDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {showDetails && (
            <div className="mt-2 space-y-3 text-sm">
              {aiQuote.assumptions.length > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Assumptions</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {aiQuote.assumptions.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiQuote.exclusions.length > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Exclusions</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {aiQuote.exclusions.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiQuote.professionalNotes && (
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Professional Notes</p>
                  <p className="text-muted-foreground">{aiQuote.professionalNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRegenerateDialog(true)}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Regenerate
          </Button>

          {!allAccepted && (
            <Button
              size="sm"
              onClick={onAcceptAll}
              className="bg-primary hover:bg-primary/90"
            >
              <Check className="h-4 w-4 mr-1" />
              Accept All ({aiQuote.lineItems.length - acceptedItemIds.size} remaining)
            </Button>
          )}

          {allAccepted && (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              All items accepted
            </Badge>
          )}
        </div>
      </CardContent>}

      {/* Regenerate Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate AI Quote</DialogTitle>
            <DialogDescription>
              Optionally provide guidance to help the AI generate a better quote.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Textarea
              placeholder="e.g., 'Include higher-end materials', 'The customer mentioned they want engineered hardwood', 'Add more detail for electrical work'"
              value={regenerateGuidance}
              onChange={(e) => setRegenerateGuidance(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to regenerate with the same inputs, or provide specific guidance.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRegenerateDialog(false)}
              disabled={isRegenerating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="bg-primary hover:bg-primary/90"
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate Quote
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
