'use client';

/**
 * Leads Table
 * DataTable component for managing leads with sorting, filtering, and pagination
 * [DEV-049]
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { Lead, LeadStatus, ProjectType } from '@/types/database';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronRightIcon,
  Eye,
  Loader2,
} from 'lucide-react';

// Status badge styles
const STATUS_STYLES: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  draft_ready: { label: 'Draft Ready', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
  needs_clarification: { label: 'Needs Info', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  sent: { label: 'Sent', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  won: { label: 'Won', className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' },
  lost: { label: 'Lost', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
};

// Project type labels
const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  basement: 'Basement',
  flooring: 'Flooring',
  painting: 'Painting',
  exterior: 'Exterior',
  other: 'Other',
};

// Format relative time
function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

// Define columns factory (needs feasibility map for dot indicators)
function createColumns(feasibilityMap: Record<string, number>): ColumnDef<Lead>[] {
  return [
  {
    accessorKey: 'name',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 data-[state=open]:bg-accent"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
          {isSorted === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : isSorted === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium flex items-center gap-2">
        <FeasibilityDot score={feasibilityMap[row.original.id]} />
        {row.getValue('name')}
      </div>
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <div className="text-muted-foreground">{row.getValue('email')}</div>
    ),
  },
  {
    accessorKey: 'project_type',
    header: 'Project',
    cell: ({ row }) => {
      const type = row.getValue('project_type') as ProjectType | null;
      return (
        <div>{type ? PROJECT_TYPE_LABELS[type] : 'Other'}</div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as LeadStatus;
      const style = STATUS_STYLES[status];
      return (
        <Badge variant="secondary" className={cn('text-xs', style.className)}>
          {style.label}
        </Badge>
      );
    },
  },
  {
    id: 'source',
    header: 'Source',
    cell: ({ row }) => {
      const source = (row.original as Record<string, unknown>)['source'] as string | null | undefined;
      const SOURCE_STYLES: Record<string, { label: string; className: string }> = {
        'contractor_intake': { label: 'Intake', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
        'phone': { label: 'Phone', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
        'referral': { label: 'Referral', className: 'bg-violet-100 text-violet-800 hover:bg-violet-100' },
        'ai_chat': { label: 'AI Chat', className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' },
        'website': { label: 'Website', className: '' },
      };
      const style = (source && SOURCE_STYLES[source]) || { label: 'Website', className: '' };
      return (
        <Badge variant="secondary" className={cn('text-xs', style.className)}>
          {style.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 data-[state=open]:bg-accent"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Created
          {isSorted === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : isSorted === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="text-muted-foreground">
        {formatRelativeTime(row.getValue('created_at'))}
      </div>
    ),
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <Link href={`/admin/leads/${row.original.id}`}>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      </Link>
    ),
  },
];
}

// Feasibility score dot colours
function FeasibilityDot({ score }: { score?: number | undefined }) {
  if (score == null) {
    return (
      <span
        className="inline-block w-2 h-2 rounded-full bg-gray-300 shrink-0"
        title="No feasibility score"
      />
    );
  }
  const colorClass =
    score >= 4
      ? 'bg-green-500'
      : score === 3
        ? 'bg-yellow-500'
        : 'bg-red-500';
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colorClass} shrink-0`}
      title={`Feasibility: ${score}/5`}
    />
  );
}

/** Mobile card view for a single lead */
function LeadCard({
  lead,
  feasibilityScore,
  onClick,
}: {
  lead: Lead;
  feasibilityScore?: number | undefined;
  onClick: () => void;
}) {
  const status = lead.status as LeadStatus;
  const style = STATUS_STYLES[status];
  const projectType = lead.project_type as ProjectType | null;
  const source = (lead as Record<string, unknown>)['source'] as string | null | undefined;
  const SOURCE_LABELS: Record<string, { label: string; className: string }> = {
    'contractor_intake': { label: 'Intake', className: 'bg-blue-100 text-blue-800' },
    'phone': { label: 'Phone', className: 'bg-orange-100 text-orange-800' },
    'referral': { label: 'Referral', className: 'bg-violet-100 text-violet-800' },
    'ai_chat': { label: 'AI Chat', className: 'bg-emerald-100 text-emerald-800' },
    'website': { label: 'Website', className: '' },
  };
  const sourceStyle = (source && SOURCE_LABELS[source]) || { label: 'Website', className: '' };

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 p-4 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors active:bg-muted"
    >
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <FeasibilityDot score={feasibilityScore} />
          <span className="font-medium truncate">{lead.name}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className={cn('text-xs', style.className)}>
            {style.label}
          </Badge>
          {projectType && (
            <span className="text-xs text-muted-foreground">
              {PROJECT_TYPE_LABELS[projectType]}
            </span>
          )}
          <Badge variant="secondary" className={cn('text-xs', sourceStyle.className)}>
            {sourceStyle.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {lead.email} &middot; {formatRelativeTime(lead.created_at)}
        </p>
      </div>
      <ChevronRightIcon className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

interface LeadsTableProps {
  initialLeads: Lead[];
  initialPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  initialFeasibilityMap?: Record<string, number>;
}

export function LeadsTable({ initialLeads, initialPagination, initialFeasibilityMap }: LeadsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useMediaQuery('(max-width: 767px)');

  // State
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [pagination, setPagination] = useState(initialPagination);
  const [feasibilityMap] = useState<Record<string, number>>(initialFeasibilityMap || {});
  const [isLoading, setIsLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'created_at', desc: true },
  ]);

  // Filters from URL
  const currentSearch = searchParams.get('search') || '';
  const currentStatus = searchParams.get('status') || '';
  const currentProjectType = searchParams.get('projectType') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentLimit = parseInt(searchParams.get('limit') || '10', 10);

  // Local search state for debouncing
  const [searchInput, setSearchInput] = useState(currentSearch);

  // Update URL with new params
  const updateParams = useCallback(
    (updates: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '' || value === 0) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      // Reset to page 1 when filters change (except for page changes)
      if (!('page' in updates) && (updates['search'] !== undefined || updates['status'] !== undefined || updates['projectType'] !== undefined)) {
        params.set('page', '1');
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentSearch) {
        updateParams({ search: searchInput || null });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, currentSearch, updateParams]);

  // Fetch leads when URL params change
  useEffect(() => {
    async function fetchLeads() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (currentSearch) params.set('search', currentSearch);
        if (currentStatus) params.set('status', currentStatus);
        if (currentProjectType) params.set('projectType', currentProjectType);
        params.set('page', String(currentPage));
        params.set('limit', String(currentLimit));

        // Add sorting
        const firstSort = sorting[0];
        if (sorting.length > 0 && firstSort) {
          params.set('sortBy', firstSort.id);
          params.set('sortOrder', firstSort.desc ? 'desc' : 'asc');
        }

        const response = await fetch(`/api/leads?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          setLeads(data.data);
          setPagination(data.pagination);
        }
      } catch (error) {
        console.error('Error fetching leads:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLeads();
  }, [currentSearch, currentStatus, currentProjectType, currentPage, currentLimit, sorting]);

  const columns = createColumns(feasibilityMap);

  const table = useReactTable({
    data: leads,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    manualSorting: true,
    manualPagination: true,
    pageCount: pagination.totalPages,
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-9"
            aria-label="Search leads"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                updateParams({ search: null });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {/* Status filter */}
          <Select
            value={currentStatus || 'all'}
            onValueChange={(value) =>
              updateParams({ status: value === 'all' ? null : value })
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_STYLES).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Project type filter */}
          <Select
            value={currentProjectType || 'all'}
            onValueChange={(value) =>
              updateParams({ projectType: value === 'all' ? null : value })
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {Object.entries(PROJECT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Per page */}
          <Select
            value={String(currentLimit)}
            onValueChange={(value) =>
              updateParams({ limit: parseInt(value, 10), page: 1 })
            }
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table (desktop) / Cards (mobile) */}
      {isMobile ? (
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length > 0 ? (
            leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                feasibilityScore={feasibilityMap[lead.id]}
                onClick={() => router.push(`/admin/leads/${lead.id}`)}
              />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No leads found.
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => router.push(`/admin/leads/${row.original.id}`)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No leads found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Showing {leads.length > 0 ? (currentPage - 1) * currentLimit + 1 : 0} to{' '}
          {Math.min(currentPage * currentLimit, pagination.total)} of{' '}
          {pagination.total} leads
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateParams({ page: currentPage - 1 })}
            disabled={currentPage <= 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="flex items-center gap-1 text-sm">
            Page {currentPage} of {pagination.totalPages || 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateParams({ page: currentPage + 1 })}
            disabled={currentPage >= pagination.totalPages || isLoading}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
