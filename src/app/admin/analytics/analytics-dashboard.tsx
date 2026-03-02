'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Image,
  Clock,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  Loader2,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendsData {
  daily: Array<{
    date: string;
    visualizations: number;
    avgGenerationTime: number;
  }>;
  byRoomType: Record<string, number>;
  byMode: Record<string, number>;
  totalVisualizations: number;
  totalLeads: number;
  chatOnlyLeads: number;
  avgGenerationTime: number;
  conversionRate: number;
  avgConcepts: number;
  period: number;
  deltas: {
    visualizations: number | null;
    avgGenerationTime: number | null;
    conversionRate: number | null;
    leads: number | null;
    chatOnlyLeads: number | null;
  };
}

const PERIOD_OPTIONS = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
];

const vizChartConfig = {
  visualizations: {
    label: 'Visualizations',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

const genTimeChartConfig = {
  avgGenerationTime: {
    label: 'Avg Time (s)',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

const roomTypeChartConfig: ChartConfig = {
  kitchen: { label: 'Kitchen', color: 'var(--chart-1)' },
  bathroom: { label: 'Bathroom', color: 'var(--chart-2)' },
  basement: { label: 'Basement', color: 'var(--chart-3)' },
  bedroom: { label: 'Bedroom', color: 'var(--chart-4)' },
  living_room: { label: 'Living Room', color: 'var(--chart-5)' },
  exterior: { label: 'Exterior', color: 'var(--chart-1)' },
  other: { label: 'Other', color: 'var(--chart-3)' },
};

const modeChartConfig: ChartConfig = {
  quick: { label: 'Quick Mode', color: 'var(--chart-1)' },
  conversation: { label: 'Conversation', color: 'var(--chart-4)' },
};

const PIE_COLORS = [
  'var(--chart-1)',
  'var(--chart-4)',
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

function DeltaBadge({ value, suffix = '%', invertColor = false }: { value: number | null; suffix?: string; invertColor?: boolean }) {
  if (value === null) return null;
  const isPositive = value > 0;
  const isGood = invertColor ? !isPositive : isPositive;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium rounded-full px-1.5 py-0.5',
        isGood
          ? 'text-emerald-700 bg-emerald-50'
          : value === 0
            ? 'text-muted-foreground bg-muted'
            : 'text-red-700 bg-red-50'
      )}
    >
      {isPositive ? (
        <TrendingUp className="w-3 h-3" />
      ) : value < 0 ? (
        <TrendingDown className="w-3 h-3" />
      ) : null}
      {value > 0 ? '+' : ''}{value}{suffix}
    </span>
  );
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<TrendsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    async function fetchTrends() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/visualizations/trends?days=${period}`);
        if (!response.ok) throw new Error('Failed to fetch trends');
        const json = await response.json();
        setData(json);
      } catch (err) {
        console.error('Error fetching trends:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTrends();
  }, [period]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Analytics</h2>
            <p className="text-muted-foreground">AI Visualizer performance insights</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!data || data.totalVisualizations === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Analytics</h2>
            <p className="text-muted-foreground">AI Visualizer performance insights</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-primary/40" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No visualizations yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm text-center">
            Analytics will appear here once homeowners start using the AI Visualizer on your site.
          </p>
        </div>
      </div>
    );
  }

  // Prepare room type data for bar chart
  const roomTypeData = Object.entries(data.byRoomType)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Prepare mode data for pie chart
  const modeData = Object.entries(data.byMode).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics</h2>
          <p className="text-muted-foreground">AI Visualizer performance insights</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-muted/30">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={period === opt.value ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 px-3 text-xs',
                period === opt.value && 'shadow-sm'
              )}
              onClick={() => setPeriod(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Visualizations */}
        <Card className="relative overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Visualizations</p>
                <p className="text-3xl font-bold tracking-tight">
                  {data.totalVisualizations.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2">
                <Image className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mt-2">
              <DeltaBadge value={data.deltas.visualizations} suffix="% vs prev" />
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />
        </Card>

        {/* Avg Generation Time */}
        <Card className="relative overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Avg Generation Time</p>
                <p className="text-3xl font-bold tracking-tight">
                  {data.avgGenerationTime}s
                </p>
              </div>
              <div className="rounded-lg bg-chart-2/10 p-2">
                <Clock className="w-5 h-5 text-chart-2" />
              </div>
            </div>
            <div className="mt-2">
              <DeltaBadge value={data.deltas.avgGenerationTime} suffix="% vs prev" invertColor />
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-chart-2/20 via-chart-2/40 to-chart-2/20" />
        </Card>

        {/* Conversion Rate */}
        <Card className="relative overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Viz-to-Lead Rate</p>
                <p className="text-3xl font-bold tracking-tight">
                  {data.conversionRate}%
                </p>
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <ArrowRight className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="mt-2">
              <DeltaBadge value={data.deltas.conversionRate} suffix="pt vs prev" />
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/20 via-emerald-500/40 to-emerald-500/20" />
        </Card>

        {/* Total Leads */}
        <Card className="relative overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                <p className="text-3xl font-bold tracking-tight">
                  {data.totalLeads}
                </p>
              </div>
              <div className="rounded-lg bg-chart-4/10 p-2">
                <Layers className="w-5 h-5 text-chart-4" />
              </div>
            </div>
            <div className="mt-2">
              <DeltaBadge value={data.deltas.leads} suffix="% vs prev" />
            </div>
            {data.chatOnlyLeads > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {data.chatOnlyLeads} from chat, {data.totalLeads - data.chatOnlyLeads} from visualizer
              </p>
            )}
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-chart-4/20 via-chart-4/40 to-chart-4/20" />
        </Card>
      </div>

      {/* Large Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Visualizations Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Visualizations Over Time</CardTitle>
            <CardDescription>Daily visualization count for the last {period} days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={vizChartConfig} className="h-[280px] w-full">
              <AreaChart
                data={data.daily}
                margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
              >
                <defs>
                  <linearGradient id="vizGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-visualizations)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-visualizations)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <ChartTooltip
                  content={<ChartTooltipContent labelFormatter={(v) => formatDate(v as string)} />}
                />
                <Area
                  type="monotone"
                  dataKey="visualizations"
                  stroke="var(--color-visualizations)"
                  strokeWidth={2}
                  fill="url(#vizGradient)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Generation Time Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Generation Time Trend</CardTitle>
            <CardDescription>Average generation time in seconds per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={genTimeChartConfig} className="h-[280px] w-full">
              <LineChart
                data={data.daily}
                margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  unit="s"
                />
                <ChartTooltip
                  content={<ChartTooltipContent labelFormatter={(v) => formatDate(v as string)} />}
                />
                <Line
                  type="monotone"
                  dataKey="avgGenerationTime"
                  stroke="var(--color-avgGenerationTime)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'var(--color-avgGenerationTime)' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Smaller Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Room Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Room Type Distribution</CardTitle>
            <CardDescription>Which rooms homeowners visualize most</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={roomTypeChartConfig} className="h-[240px] w-full">
              <BarChart
                data={roomTypeData}
                layout="vertical"
                margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                  tickFormatter={(v: string) => {
                    const cfg = roomTypeChartConfig[v];
                    return (cfg?.label as string) || v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                  }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="count"
                  radius={[0, 6, 6, 0]}
                  fill="var(--chart-1)"
                  maxBarSize={28}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Quick vs Conversation Mode */}
        <Card>
          <CardHeader>
            <CardTitle>Generation Mode</CardTitle>
            <CardDescription>Quick generate vs conversation-guided</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={modeChartConfig} className="h-[240px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={modeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                  strokeWidth={0}
                >
                  {modeData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={PIE_COLORS[index % PIE_COLORS.length] ?? 'var(--chart-1)'}
                    />
                  ))}
                </Pie>
                <ChartLegend
                  content={<ChartLegendContent nameKey="name" payload={[]} />}
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
