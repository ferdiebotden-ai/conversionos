'use client';

/**
 * Visualization Metrics Widget
 * Dashboard widget showing AI visualizer performance metrics
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Image,
  Clock,
  Target,
  TrendingUp,
  MessageSquare,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface VisualizationMetrics {
  total_visualizations: number;
  avg_generation_time_ms: number;
  avg_validation_score: number | null;
  retry_rate: number;
  quote_conversion_rate: number;
  admin_selection_rate: number;
  conversation_mode_rate: number;
}

type FeasibilityDistribution = Record<string, number>;

interface VisualizationMetricsWidgetProps {
  className?: string;
}

export function VisualizationMetricsWidget({
  className,
}: VisualizationMetricsWidgetProps) {
  const [metrics, setMetrics] = useState<VisualizationMetrics | null>(null);
  const [feasibility, setFeasibility] = useState<FeasibilityDistribution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/admin/visualizations/metrics?days=30');
        if (!response.ok) throw new Error('Failed to fetch metrics');
        const data = await response.json();
        setMetrics(data.summary);
        if (data.feasibilityDistribution) {
          setFeasibility(data.feasibilityDistribution);
        }
      } catch (err) {
        console.error('Error fetching visualization metrics:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            AI Visualizer Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            AI Visualizer Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="w-6 h-6 mx-auto mb-2" />
            <p className="text-sm">No metrics available yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (ms: number): string => {
    const seconds = Math.round(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="w-5 h-5 text-primary" />
          AI Visualizer Metrics
          <span className="text-xs font-normal text-muted-foreground ml-auto">
            Last 30 days
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Total Visualizations */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Image className="w-4 h-4" />
              Total Generated
            </div>
            <div className="text-2xl font-bold">
              {metrics.total_visualizations.toLocaleString()}
            </div>
          </div>

          {/* Average Generation Time */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              Avg Gen Time
            </div>
            <div className="text-2xl font-bold">
              {formatTime(metrics.avg_generation_time_ms)}
            </div>
          </div>

          {/* Quote Conversion */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              Quote Conversion
            </div>
            <div className="text-2xl font-bold">
              {metrics.quote_conversion_rate.toFixed(1)}%
            </div>
          </div>

          {/* Admin Selection Rate */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="w-4 h-4" />
              Admin Selected
            </div>
            <div className="text-2xl font-bold">
              {metrics.admin_selection_rate.toFixed(1)}%
            </div>
          </div>

          {/* Conversation Mode Rate */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              Chat Mode
            </div>
            <div className="text-2xl font-bold">
              {metrics.conversation_mode_rate.toFixed(1)}%
            </div>
          </div>

        </div>

        {/* Validation Score Bar */}
        {metrics.avg_validation_score !== null && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Structure Preservation</span>
              <span className="font-medium">
                {Math.round(metrics.avg_validation_score * 100)}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  metrics.avg_validation_score >= 0.85
                    ? 'bg-green-500'
                    : metrics.avg_validation_score >= 0.7
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                )}
                style={{ width: `${metrics.avg_validation_score * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Feasibility Distribution */}
        {feasibility && Object.keys(feasibility).length > 0 && (() => {
          const maxCount = Math.max(...Object.values(feasibility));
          const SCORE_COLORS: Record<number, string> = {
            1: 'bg-red-500',
            2: 'bg-red-400',
            3: 'bg-yellow-500',
            4: 'bg-green-400',
            5: 'bg-green-500',
          };
          return (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground mb-2">Feasibility Scores</div>
              <div className="flex items-end gap-1.5 h-[48px]">
                {[1, 2, 3, 4, 5].map((score) => {
                  const count = feasibility[String(score)] || 0;
                  const heightPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <div key={score} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full flex items-end" style={{ height: '36px' }}>
                        <div
                          className={cn(
                            'w-full rounded-t-sm transition-all',
                            SCORE_COLORS[score]
                          )}
                          style={{ height: `${Math.max(heightPct, count > 0 ? 8 : 0)}%` }}
                          title={`Score ${score}: ${count}`}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{score}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
          Retry rate:{' '}
          <span className="font-medium text-foreground">
            {metrics.retry_rate.toFixed(1)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
