'use client';

/**
 * Assembly Template Manager — CRUD for reusable line item bundles.
 * Self-contained component for the admin Settings "Templates" tab.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Trash2,
  Pencil,
  Copy,
  Loader2,
  Layers,
  Package,
  Download,
  X,
  Search,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { AssemblyTemplate, AssemblyTemplateItem } from '@/types/database';
import { DEFAULT_ASSEMBLY_TEMPLATES } from '@/lib/data/default-templates';

const CATEGORIES = [
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'basement', label: 'Basement' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'painting', label: 'Painting' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other' },
] as const;

const ITEM_CATEGORIES = [
  { value: 'materials', label: 'Materials' },
  { value: 'labor', label: 'Labour' },
  { value: 'contract', label: 'Contract' },
  { value: 'permit', label: 'Permit' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'allowances', label: 'Allowances' },
  { value: 'other', label: 'Other' },
] as const;

interface EditingTemplate {
  id?: string | undefined;
  name: string;
  category: string;
  description: string;
  items: AssemblyTemplateItem[];
}

/** V8: Per-field validation errors for a template line item. */
export interface ItemValidationErrors {
  description?: string | undefined;
  quantity?: string | undefined;
  unit_price?: string | undefined;
}

/** V8: Validate a single template line item. Returns errors or null if valid. */
export function validateTemplateItem(item: AssemblyTemplateItem): ItemValidationErrors | null {
  const errors: ItemValidationErrors = {};
  let hasError = false;
  if (!item.description.trim()) {
    errors.description = 'Description is required';
    hasError = true;
  }
  if (item.quantity <= 0) {
    errors.quantity = 'Must be > 0';
    hasError = true;
  }
  if (item.unit_price < 0) {
    errors.unit_price = 'Must be >= 0';
    hasError = true;
  }
  return hasError ? errors : null;
}

const EMPTY_ITEM: AssemblyTemplateItem = {
  description: '',
  category: 'materials',
  quantity: 1,
  unit: 'ea',
  unit_price: 0,
};

export function TemplateManager() {
  const [templates, setTemplates] = useState<AssemblyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seedingDefaults, setSeedingDefaults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EditingTemplate | null>(null);
  // V8: Track whether save was attempted (to show validation errors)
  const [saveAttempted, setSaveAttempted] = useState(false);

  // F14: Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // C5: Load defaults confirmation dialog
  const [defaultsConfirmOpen, setDefaultsConfirmOpen] = useState(false);

  // F14: Debounce search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  // F14: Filter templates
  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (filterCategory !== 'all') {
      result = result.filter(t => t.category === filterCategory);
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [templates, filterCategory, debouncedSearch]);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/templates');
      const json = await res.json();
      if (json.success) {
        // Parse items JSONB for each template
        const parsed = (json.data as AssemblyTemplate[]).map((t) => ({
          ...t,
          items: typeof t.items === 'string' ? JSON.parse(t.items) : t.items,
        }));
        setTemplates(parsed);
      }
    } catch {
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Open create dialog
  const handleCreate = useCallback(() => {
    setEditing({
      name: '',
      category: 'kitchen',
      description: '',
      items: [{ ...EMPTY_ITEM }],
    });
    setSaveAttempted(false);
    setDialogOpen(true);
  }, []);

  // Open edit dialog
  const handleEdit = useCallback((template: AssemblyTemplate) => {
    setEditing({
      id: template.id,
      name: template.name,
      category: template.category,
      description: template.description ?? '',
      items: [...(typeof template.items === 'string' ? JSON.parse(template.items) : template.items)],
    });
    setSaveAttempted(false);
    setDialogOpen(true);
  }, []);

  // Duplicate
  const handleDuplicate = useCallback((template: AssemblyTemplate) => {
    const items = typeof template.items === 'string' ? JSON.parse(template.items) : template.items;
    setEditing({
      name: `${template.name} (Copy)`,
      category: template.category,
      description: template.description ?? '',
      items: [...items],
    });
    setSaveAttempted(false);
    setDialogOpen(true);
  }, []);

  // Delete
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/admin/templates/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setTemplates(prev => prev.filter(t => t.id !== id));
      }
    } catch {
      setError('Failed to delete template');
    }
  }, []);

  // V8: Compute item validation errors
  const itemErrors = useMemo(() => {
    if (!editing) return [];
    return editing.items.map(item => validateTemplateItem(item));
  }, [editing]);

  const hasItemErrors = useMemo(() => {
    return itemErrors.some(e => e !== null);
  }, [itemErrors]);

  // Save (create or update)
  const handleSave = useCallback(async () => {
    if (!editing) return;

    setSaveAttempted(true);

    if (!editing.name.trim()) {
      setError('Template name is required');
      return;
    }
    if (editing.items.length === 0) {
      setError('Template must have at least one item');
      return;
    }

    // V8: Check for item validation errors
    const errors = editing.items.map(item => validateTemplateItem(item));
    if (errors.some(e => e !== null)) {
      setError('Fix line item errors before saving');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: editing.name.trim(),
        category: editing.category,
        description: editing.description.trim() || null,
        items: editing.items,
      };

      let res: Response;
      if (editing.id) {
        res = await fetch(`/api/admin/templates/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/admin/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Save failed');
        return;
      }

      setDialogOpen(false);
      setEditing(null);
      setSaveAttempted(false);
      await fetchTemplates();
    } catch {
      setError('Failed to save template');
    } finally {
      setSaving(false);
    }
  }, [editing, fetchTemplates]);

  // Seed default templates
  const handleSeedDefaults = useCallback(async () => {
    setSeedingDefaults(true);
    setError(null);

    try {
      for (const tmpl of DEFAULT_ASSEMBLY_TEMPLATES) {
        await fetch('/api/admin/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...tmpl, is_default: true }),
        });
      }
      await fetchTemplates();
    } catch {
      setError('Failed to load default templates');
    } finally {
      setSeedingDefaults(false);
    }
  }, [fetchTemplates]);

  // Edit dialog item handlers
  const updateItem = useCallback((index: number, field: keyof AssemblyTemplateItem, value: string | number) => {
    setEditing(prev => {
      if (!prev) return prev;
      const items = [...prev.items];
      items[index] = { ...items[index]!, [field]: value } as AssemblyTemplateItem;
      return { ...prev, items };
    });
  }, []);

  const addItem = useCallback(() => {
    setEditing(prev => {
      if (!prev) return prev;
      return { ...prev, items: [...prev.items, { ...EMPTY_ITEM }] };
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setEditing(prev => {
      if (!prev) return prev;
      const items = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: items.length > 0 ? items : [{ ...EMPTY_ITEM }] };
    });
  }, []);

  const templateTotal = (items: AssemblyTemplateItem[]) =>
    items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const categoryBadgeColour = (category: string) => {
    const colours: Record<string, string> = {
      kitchen: 'bg-orange-100 text-orange-700',
      bathroom: 'bg-blue-100 text-blue-700',
      basement: 'bg-stone-100 text-stone-700',
      flooring: 'bg-amber-100 text-amber-700',
      painting: 'bg-pink-100 text-pink-700',
      exterior: 'bg-green-100 text-green-700',
      general: 'bg-gray-100 text-gray-700',
      other: 'bg-gray-100 text-gray-700',
    };
    return colours[category] ?? 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Assembly Templates</CardTitle>
              <CardDescription>
                Create reusable bundles of line items for common renovation work packages.
                Insert templates into quotes with one click.
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Empty state */}
      {templates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-medium mb-2">No templates yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Get started with our default Ontario renovation templates, or create your own.
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => setDefaultsConfirmOpen(true)} disabled={seedingDefaults}>
                {seedingDefaults ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading Defaults...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Load Default Templates ({DEFAULT_ASSEMBLY_TEMPLATES.length})
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create from Scratch
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* F14: Search and filter (only show when templates exist) */}
      {templates.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Template list */}
      {templates.length > 0 && filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No templates match your search. Try a different term or category.
            </p>
          </CardContent>
        </Card>
      )}

      {filteredTemplates.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredTemplates.map((template) => {
            const items = typeof template.items === 'string' ? JSON.parse(template.items) : template.items;
            const total = templateTotal(items);
            return (
              <Card key={template.id} className="group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        {template.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${categoryBadgeColour(template.category)}`}>
                          {template.category}
                        </Badge>
                        {template.is_default && (
                          <Badge variant="outline" className="text-xs">Default</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(template)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(template)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(template.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                    <span className="font-medium">${total.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* C5: Load defaults confirmation dialog */}
      <ConfirmDialog
        open={defaultsConfirmOpen}
        onOpenChange={setDefaultsConfirmOpen}
        title="Load Default Templates"
        description={`This will add ${DEFAULT_ASSEMBLY_TEMPLATES.length} default templates. ${templates.length} existing templates will not be affected.`}
        confirmLabel="Load Defaults"
        onConfirm={handleSeedDefaults}
        listItems={DEFAULT_ASSEMBLY_TEMPLATES.map(t => t.name)}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditing(null); setSaveAttempted(false); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit Template' : 'Create Template'}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="templateName">Template Name</Label>
                  <Input
                    id="templateName"
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="e.g., Standard Kitchen Demo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="templateCategory">Category</Label>
                  <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                    <SelectTrigger id="templateCategory">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="templateDesc">Description</Label>
                <Textarea
                  id="templateDesc"
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Brief description of this work package..."
                  rows={2}
                />
              </div>

              {/* Line items editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Line Items</Label>
                  <Button variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Item
                  </Button>
                </div>

                {/* M5: Desktop table layout (hidden on mobile) */}
                <div className="border rounded-lg overflow-hidden hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[35%]">Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="w-16">Qty</TableHead>
                        <TableHead className="w-20">Unit</TableHead>
                        <TableHead className="w-24 text-right">Price</TableHead>
                        <TableHead className="w-24 text-right">Total</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editing.items.map((item, idx) => {
                        const errs = saveAttempted ? itemErrors[idx] : null;
                        return (
                          <TableRow key={idx}>
                            <TableCell className="p-1">
                              <Input
                                value={item.description}
                                onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                placeholder="Item description"
                                className={`h-8 text-sm ${errs?.description ? 'border-destructive' : ''}`}
                              />
                              {errs?.description && <p className="text-xs text-destructive mt-0.5">{errs.description}</p>}
                            </TableCell>
                            <TableCell className="p-1">
                              <Select value={item.category} onValueChange={(v) => updateItem(idx, 'category', v)}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ITEM_CATEGORIES.map(c => (
                                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="p-1">
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                value={item.quantity}
                                onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                className={`h-8 text-sm w-16 ${errs?.quantity ? 'border-destructive' : ''}`}
                              />
                              {errs?.quantity && <p className="text-xs text-destructive mt-0.5">{errs.quantity}</p>}
                            </TableCell>
                            <TableCell className="p-1">
                              <Input
                                value={item.unit}
                                onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                                className="h-8 text-sm w-20"
                              />
                            </TableCell>
                            <TableCell className="p-1">
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={item.unit_price}
                                onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                                className={`h-8 text-sm w-24 text-right ${errs?.unit_price ? 'border-destructive' : ''}`}
                              />
                              {errs?.unit_price && <p className="text-xs text-destructive mt-0.5">{errs.unit_price}</p>}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium p-1">
                              ${(item.quantity * item.unit_price).toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="p-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => removeItem(idx)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* M5: Mobile stacked layout (visible only on mobile) */}
                <div className="space-y-3 md:hidden">
                  {editing.items.map((item, idx) => {
                    const errs = saveAttempted ? itemErrors[idx] : null;
                    return (
                      <div key={idx} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-medium">Item {idx + 1}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeItem(idx)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {/* Description — full width */}
                        <div>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(idx, 'description', e.target.value)}
                            placeholder="Item description"
                            className={`text-sm ${errs?.description ? 'border-destructive' : ''}`}
                          />
                          {errs?.description && <p className="text-xs text-destructive mt-0.5">{errs.description}</p>}
                        </div>
                        {/* Category — full width */}
                        <Select value={item.category} onValueChange={(v) => updateItem(idx, 'category', v)}>
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ITEM_CATEGORIES.map(c => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {/* Qty, Unit, Price in a row */}
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label className="text-xs">Qty</Label>
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              className={`text-sm ${errs?.quantity ? 'border-destructive' : ''}`}
                            />
                            {errs?.quantity && <p className="text-xs text-destructive mt-0.5">{errs.quantity}</p>}
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs">Unit</Label>
                            <Input
                              value={item.unit}
                              onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs">Price</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.unit_price}
                              onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                              className={`text-sm text-right ${errs?.unit_price ? 'border-destructive' : ''}`}
                            />
                            {errs?.unit_price && <p className="text-xs text-destructive mt-0.5">{errs.unit_price}</p>}
                          </div>
                        </div>
                        <div className="text-right text-sm font-medium">
                          ${(item.quantity * item.unit_price).toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-right text-sm font-medium pr-0 md:pr-14">
                  Total: ${templateTotal(editing.items).toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditing(null); setSaveAttempted(false); }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || (saveAttempted && hasItemErrors)}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editing?.id ? 'Save Changes' : 'Create Template'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
