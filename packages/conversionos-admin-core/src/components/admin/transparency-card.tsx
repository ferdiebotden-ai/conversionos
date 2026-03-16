'use client';

/**
 * Transparency Card
 * "Show the math" breakdown for an AI-generated line item.
 * Displays room analysis, material selection, cost breakdown table,
 * markup applied, and data source.
 * [DEV-072 Phase 2]
 */

import { Badge } from '@/components/ui/badge';
import { Eye, Palette, Database } from 'lucide-react';
import type { TransparencyBreakdown } from '@/lib/schemas/transparency';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(value);
}

interface TransparencyCardProps {
  data: TransparencyBreakdown;
  confidenceScore?: number | undefined;
}

function getConfidenceConfig(score: number) {
  const pct = Math.round(score * 100);
  if (pct >= 80) return { label: `${pct}%`, colour: 'bg-green-50 text-green-700 border-green-200' };
  if (pct >= 60) return { label: `${pct}%`, colour: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: `${pct}%`, colour: 'bg-red-50 text-red-700 border-red-200' };
}

export function TransparencyCard({ data, confidenceScore }: TransparencyCardProps) {
  const rowSum = data.costBreakdown.reduce((sum, line) => sum + line.total, 0);
  const hasUnlistedCosts = Math.abs(rowSum - data.totalBeforeMarkup) > 0.01;

  return (
    <div className="mx-2 my-2 p-4 bg-gradient-to-br from-primary/5 to-muted/30 border border-primary/10 rounded-lg space-y-3">
      {/* Room Analysis */}
      <div className="flex items-start gap-2">
        <Eye className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-sm italic text-muted-foreground">{data.roomAnalysis}</p>
      </div>

      {/* Material Selection */}
      <div className="flex items-start gap-2">
        <Palette className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-sm text-foreground">{data.materialSelection}</p>
      </div>

      {/* Cost Breakdown Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-primary/10">
              <th className="text-left py-1 pr-4 text-muted-foreground font-medium">Item</th>
              <th className="text-right py-1 px-2 text-muted-foreground font-medium">Qty</th>
              <th className="text-left py-1 px-2 text-muted-foreground font-medium">Unit</th>
              <th className="text-right py-1 px-2 text-muted-foreground font-medium">Unit Cost</th>
              <th className="text-right py-1 pl-2 text-muted-foreground font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.costBreakdown.map((line, i) => (
              <tr key={i} className="border-b border-primary/5">
                <td className="py-1.5 pr-4">
                  <span>{line.label}</span>
                  {line.source === 'ontario_db' && (
                    <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0 bg-green-50 text-green-700 border-green-200">
                      DB
                    </Badge>
                  )}
                </td>
                <td className="text-right py-1.5 px-2 tabular-nums">{line.quantity}</td>
                <td className="py-1.5 px-2 text-muted-foreground">{line.unit}</td>
                <td className="text-right py-1.5 px-2 tabular-nums">{formatCurrency(line.unitCost)}</td>
                <td className="text-right py-1.5 pl-2 tabular-nums">{formatCurrency(line.total)}</td>
              </tr>
            ))}
            {hasUnlistedCosts && (
              <tr className="border-b border-primary/5">
                <td colSpan={4} className="py-1.5 pr-4 text-muted-foreground italic">
                  Additional labour, fasteners &amp; sundries
                </td>
                <td className="text-right py-1.5 pl-2 tabular-nums text-muted-foreground italic">
                  {formatCurrency(data.totalBeforeMarkup - rowSum)}
                </td>
              </tr>
            )}
            {/* Subtotal row */}
            <tr className="border-t border-primary/10">
              <td colSpan={4} className="py-1.5 text-right text-muted-foreground font-medium">Subtotal</td>
              <td className="text-right py-1.5 pl-2 tabular-nums font-medium">{formatCurrency(data.totalBeforeMarkup)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Markup */}
      {data.markupApplied.amount > 0 && (
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            {data.markupApplied.label} ({data.markupApplied.percent}%): +{formatCurrency(data.markupApplied.amount)}
          </Badge>
        </div>
      )}

      {/* Footer: data source + confidence + total */}
      <div className="flex items-center justify-between pt-1 border-t border-primary/10">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-muted">
            <Database className="h-3 w-3 mr-1" />
            {data.dataSource}
          </Badge>
          {confidenceScore != null && confidenceScore > 0 && (() => {
            const conf = getConfidenceConfig(confidenceScore);
            return (
              <Badge variant="outline" className={conf.colour}>
                Confidence: {conf.label}
              </Badge>
            );
          })()}
        </div>
        <span className="text-primary font-semibold">
          {formatCurrency(data.totalAfterMarkup)}
        </span>
      </div>
    </div>
  );
}
