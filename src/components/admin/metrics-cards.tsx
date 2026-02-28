'use client';

/**
 * Metrics Cards
 * KPI cards for the admin dashboard
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string | undefined;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  } | undefined;
  className?: string | undefined;
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: MetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          {trend && (
            <span
              className={cn(
                'flex items-center text-xs font-medium',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend.isPositive ? (
                <ArrowUp className="h-3 w-3 mr-0.5" />
              ) : (
                <ArrowDown className="h-3 w-3 mr-0.5" />
              )}
              {Math.abs(trend.value)}%
            </span>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricsData {
  newLeads: {
    today: number;
    week: number;
    month: number;
    trend: number;
  };
  conversionRate: number;
  averageQuoteValue: number;
  avgResponseTime: string;
}

interface MetricsCardsProps {
  data?: MetricsData;
  isLoading?: boolean;
}

export function MetricsCards({ data, isLoading }: MetricsCardsProps) {
  // Default data for when not provided or loading
  const metrics = data || {
    newLeads: { today: 0, week: 0, month: 0, trend: 0 },
    conversionRate: 0,
    averageQuoteValue: 0,
    avgResponseTime: '--',
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-2" />
              <div className="h-3 bg-muted rounded w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="New Leads"
        value={metrics.newLeads.today}
        description={`${metrics.newLeads.week} this week`}
        icon={Users}
        trend={
          metrics.newLeads.trend !== 0
            ? { value: metrics.newLeads.trend, isPositive: metrics.newLeads.trend > 0 }
            : undefined
        }
      />
      <MetricCard
        title="Conversion Rate"
        value={`${metrics.conversionRate}%`}
        description="Sent or won"
        icon={TrendingUp}
      />
      <MetricCard
        title="Avg Quote Value"
        value={`$${metrics.averageQuoteValue.toLocaleString()}`}
        description="Last 30 days"
        icon={DollarSign}
      />
      <MetricCard
        title="Avg Response Time"
        value={metrics.avgResponseTime}
        description="First contact"
        icon={Clock}
      />
    </div>
  );
}
