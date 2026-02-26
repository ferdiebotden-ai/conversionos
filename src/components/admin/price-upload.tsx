'use client';

/**
 * CSV Price Upload — Upload and manage contractor price lists.
 * Self-contained component for the admin Settings "Price List" tab.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  Trash2,
  Download,
  Loader2,
  AlertCircle,
  Check,
  FileText,
  X,
} from 'lucide-react';
import type { ContractorPrice } from '@/types/database';

interface CsvPreviewRow {
  item_name: string;
  category: string;
  unit: string;
  unit_price: string;
  supplier?: string;
}

interface UploadError {
  row: number;
  message: string;
}

export function PriceUpload() {
  const [prices, setPrices] = useState<ContractorPrice[]>([]);
  const [uploadedAt, setUploadedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{ imported: number; errors: UploadError[] } | null>(null);

  // Preview state
  const [previewRows, setPreviewRows] = useState<CsvPreviewRow[]>([]);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current prices
  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/prices');
      const json = await res.json();
      if (json.success) {
        setPrices(json.data);
        setUploadedAt(json.uploadedAt);
      }
    } catch {
      console.error('Failed to fetch prices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Handle file selection
  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file (.csv)');
      return;
    }

    setError(null);
    setUploadResult(null);
    setPreviewFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        setError('CSV must have a header row and at least one data row');
        setPreviewFile(null);
        return;
      }

      // Parse headers
      const headers = lines[0]!.split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
      const rows: CsvPreviewRow[] = [];

      for (let i = 1; i < Math.min(lines.length, 11); i++) {
        const cols = lines[i]!.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = cols[idx] ?? ''; });
        rows.push({
          item_name: row['item_name'] ?? '',
          category: row['category'] ?? '',
          unit: row['unit'] ?? 'ea',
          unit_price: row['unit_price'] ?? '0',
          supplier: row['supplier'] ?? '',
        });
      }

      setPreviewRows(rows);
    };
    reader.readAsText(file);
  }, []);

  // Upload CSV
  const handleUpload = useCallback(async () => {
    if (!previewFile) return;

    setUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('csv', previewFile);

      const res = await fetch('/api/admin/prices', { method: 'POST', body: formData });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Upload failed');
        if (json.errors) {
          setUploadResult({ imported: 0, errors: json.errors });
        }
        return;
      }

      setUploadResult({ imported: json.imported, errors: json.errors ?? [] });
      setPreviewRows([]);
      setPreviewFile(null);
      await fetchPrices();
    } catch {
      setError('Failed to upload CSV');
    } finally {
      setUploading(false);
    }
  }, [previewFile, fetchPrices]);

  // Clear all prices
  const handleClear = useCallback(async () => {
    if (!confirm(`Clear all ${prices.length} uploaded prices? This cannot be undone.`)) return;

    try {
      const res = await fetch('/api/admin/prices', { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setPrices([]);
        setUploadedAt(null);
        setUploadResult(null);
      }
    } catch {
      setError('Failed to clear prices');
    }
  }, [prices.length]);

  // Download sample CSV
  const handleDownloadSample = useCallback(() => {
    const csv = `item_name,category,unit,unit_price,supplier
"Stock cabinets (per linear ft)",materials,lin ft,220,Home Hardware
"Quartz countertop",materials,sqft,85,Caesarstone
"Plumber (licensed)",labor,hr,95,
"Electrician (licensed)",contract,hr,110,Smith Electric
"Building permit",permit,ea,500,
"LVP flooring",materials,sqft,7.50,
"Drywall (4x8 sheet)",materials,ea,18,`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'price-list-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Drag-drop handlers
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const categoryBadgeColour = (category: string) => {
    const colours: Record<string, string> = {
      materials: 'bg-blue-100 text-blue-700',
      labor: 'bg-amber-100 text-amber-700',
      contract: 'bg-purple-100 text-purple-700',
      permit: 'bg-red-100 text-red-700',
      equipment: 'bg-green-100 text-green-700',
      allowances: 'bg-orange-100 text-orange-700',
      other: 'bg-gray-100 text-gray-700',
    };
    return colours[category] ?? 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Price List</CardTitle>
          <CardDescription>
            Upload a CSV file with your material and labour costs. These prices will be used
            instead of Ontario database defaults when generating AI quotes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag-drop zone */}
          {!previewFile && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colours ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">
                Drag and drop your CSV file here, or{' '}
                <button
                  className="text-primary underline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Required columns: item_name, category, unit, unit_price. Optional: supplier
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = '';
                }}
              />
            </div>
          )}

          {/* Preview table */}
          {previewRows.length > 0 && previewFile && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{previewFile.name}</span>
                  <Badge variant="outline" className="text-xs">Preview (first 10 rows)</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setPreviewRows([]); setPreviewFile(null); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead>Supplier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.item_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${categoryBadgeColour(row.category)}`}>
                            {row.category}
                          </Badge>
                        </TableCell>
                        <TableCell>{row.unit}</TableCell>
                        <TableCell className="text-right">${row.unit_price}</TableCell>
                        <TableCell className="text-muted-foreground">{row.supplier || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {prices.length > 0 && (
                <p className="text-sm text-amber-600">
                  This will replace your existing {prices.length} uploaded prices.
                </p>
              )}

              <div className="flex gap-2">
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Price List
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => { setPreviewRows([]); setPreviewFile(null); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Download sample */}
          <Button variant="link" size="sm" className="px-0 text-muted-foreground" onClick={handleDownloadSample}>
            <Download className="h-3 w-3 mr-1" />
            Download sample CSV template
          </Button>
        </CardContent>
      </Card>

      {/* Error display */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Upload result */}
      {uploadResult && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${
          uploadResult.errors.length > 0
            ? 'bg-amber-50 border border-amber-200 text-amber-700'
            : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
        }`}>
          <Check className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">
            Imported {uploadResult.imported} price{uploadResult.imported !== 1 ? 's' : ''} successfully.
            {uploadResult.errors.length > 0 && ` ${uploadResult.errors.length} row(s) had errors.`}
          </span>
        </div>
      )}

      {uploadResult && uploadResult.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-amber-700">Upload Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {uploadResult.errors.map((err, i) => (
                <li key={i} className="text-muted-foreground">
                  <span className="font-medium text-foreground">Row {err.row}:</span> {err.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Current prices */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Price List</CardTitle>
              <CardDescription>
                {loading
                  ? 'Loading...'
                  : prices.length === 0
                    ? 'No prices uploaded yet. AI quotes will use Ontario database defaults.'
                    : `${prices.length} item${prices.length !== 1 ? 's' : ''} uploaded${uploadedAt ? ` on ${new Date(uploadedAt).toLocaleDateString('en-CA')}` : ''}`}
              </CardDescription>
            </div>
            {prices.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClear} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        {prices.length > 0 && (
          <CardContent>
            <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead>Supplier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prices.map((price) => (
                    <TableRow key={price.id}>
                      <TableCell className="font-medium">{price.item_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${categoryBadgeColour(price.category)}`}>
                          {price.category}
                        </Badge>
                      </TableCell>
                      <TableCell>{price.unit}</TableCell>
                      <TableCell className="text-right">${Number(price.unit_price).toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">{price.supplier || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
