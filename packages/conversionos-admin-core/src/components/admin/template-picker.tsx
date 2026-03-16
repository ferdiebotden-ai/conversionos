'use client';

/**
 * Template Picker — Modal for inserting assembly templates into the quote editor.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Layers, Package, ChevronDown, ChevronUp } from 'lucide-react';
import type { AssemblyTemplate, AssemblyTemplateItem } from '@/types/database';

interface TemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (template: AssemblyTemplate) => void;
}

const FILTER_CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'basement', label: 'Basement' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'general', label: 'General' },
] as const;

export function TemplatePicker({ open, onOpenChange, onInsert }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<AssemblyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Fetch templates
  useEffect(() => {
    if (!open) return;

    async function fetchTemplates() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/templates');
        const json = await res.json();
        if (json.success) {
          const parsed = (json.data as AssemblyTemplate[]).map((t) => ({
            ...t,
            items: typeof t.items === 'string' ? JSON.parse(t.items) : t.items,
          }));
          setTemplates(parsed);
        }
      } catch {
        // Silently fail — user sees empty state
      } finally {
        setLoading(false);
      }
    }

    fetchTemplates();
    setSelectedId(null);
    setExpandedId(null);
    setCategoryFilter('all');
  }, [open]);

  const filteredTemplates = categoryFilter === 'all'
    ? templates
    : templates.filter(t => t.category === categoryFilter);

  const selectedTemplate = templates.find(t => t.id === selectedId);

  const handleInsert = useCallback(() => {
    if (selectedTemplate) {
      onInsert(selectedTemplate);
      onOpenChange(false);
    }
  }, [selectedTemplate, onInsert, onOpenChange]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Insert Assembly Template
          </DialogTitle>
        </DialogHeader>

        {/* Category filter */}
        <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {FILTER_CATEGORIES.map(c => (
              <TabsTrigger key={c.value} value={c.value} className="text-xs">
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Template list */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && filteredTemplates.length === 0 && (
            <div className="py-12 text-center">
              <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {templates.length === 0
                  ? 'No templates yet. Create templates in Settings > Templates.'
                  : 'No templates match this category.'}
              </p>
            </div>
          )}

          {filteredTemplates.map((template) => {
            const items = typeof template.items === 'string' ? JSON.parse(template.items) : template.items;
            const total = templateTotal(items);
            const isSelected = selectedId === template.id;
            const isExpanded = expandedId === template.id;

            return (
              <div
                key={template.id}
                className={`border rounded-lg cursor-pointer transition-colours ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedId(template.id)}
              >
                <div className="p-3 flex items-center justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{template.name}</span>
                      <Badge variant="outline" className={`text-xs shrink-0 ${categoryBadgeColour(template.category)}`}>
                        {template.category}
                      </Badge>
                    </div>
                    {template.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{template.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <div className="text-right">
                      <div className="text-sm font-medium">${total.toLocaleString('en-CA')}</div>
                      <div className="text-xs text-muted-foreground">{items.length} items</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(isExpanded ? null : template.id);
                      }}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Expanded item preview */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t">
                    <div className="space-y-1 pt-2">
                      {items.map((item: AssemblyTemplateItem, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate flex-1">{item.description}</span>
                          <span className="ml-2 shrink-0">
                            {item.quantity} {item.unit} × ${item.unit_price} = ${(item.quantity * item.unit_price).toLocaleString('en-CA')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInsert} disabled={!selectedId}>
            <Layers className="h-4 w-4 mr-2" />
            Insert Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
