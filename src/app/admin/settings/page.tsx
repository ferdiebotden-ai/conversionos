'use client';

/**
 * Admin Settings Page
 * Database-backed business configuration for pricing, quote generation, and notifications
 * [DEV-072]
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Loader2, AlertCircle, DollarSign, Settings2, Bell, Building, MessageSquareQuote, Upload, Layers, Info, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { CategoryMarkupSettings } from '@/components/admin/category-markup-settings';
import { DEFAULT_CATEGORY_MARKUPS, type CategoryMarkupsConfig } from '@/lib/pricing/category-markups';
import { PriceUpload } from '@/components/admin/price-upload';
import { TemplateManager } from '@/components/admin/template-manager';
import { useTier } from '@/components/tier-provider';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { isValidEmail, isValidPhone, isValidCanadianPostal } from '@/lib/utils/validation';
import { SettingsPreview } from '@/components/admin/settings-preview';
import type { PreviewBranding } from '@/hooks/use-settings-preview';

// Types for settings
interface PricingRange {
  min: number;
  max: number;
}

interface PricingSettings {
  economy: PricingRange;
  standard: PricingRange;
  premium: PricingRange;
}

interface Settings {
  // Pricing per sqft
  pricing_kitchen: PricingSettings;
  pricing_bathroom: PricingSettings;
  pricing_basement: PricingSettings;
  pricing_flooring: PricingSettings;
  // Business rates
  labor_rate: { hourly: number };
  contract_markup: { percent: number };
  contingency: { percent: number };
  hst_rate: { percent: number };
  deposit_rate: { percent: number };
  quote_validity: { days: number };
  // Notifications
  notifications?: {
    email: string;
    onNewLead: boolean;
    onQuoteSent: boolean;
    onQuoteOpened: boolean;
  };
  // Business info
  business_info?: {
    name: string;
    address: string;
    city: string;
    province: string;
    postal: string;
    phone: string;
    email: string;
    website: string;
  };
  // Quote assistance
  quote_assistance?: {
    mode: 'none' | 'range' | 'estimate';
    rangeBand: number;
  };
  // Per-category markups
  category_markups?: CategoryMarkupsConfig;
}

const DEFAULT_SETTINGS: Settings = {
  pricing_kitchen: { economy: { min: 150, max: 200 }, standard: { min: 200, max: 275 }, premium: { min: 275, max: 400 } },
  pricing_bathroom: { economy: { min: 200, max: 300 }, standard: { min: 300, max: 450 }, premium: { min: 450, max: 600 } },
  pricing_basement: { economy: { min: 40, max: 55 }, standard: { min: 55, max: 70 }, premium: { min: 70, max: 100 } },
  pricing_flooring: { economy: { min: 8, max: 12 }, standard: { min: 12, max: 18 }, premium: { min: 18, max: 30 } },
  labor_rate: { hourly: 85 },
  contract_markup: { percent: 15 },
  contingency: { percent: 10 },
  hst_rate: { percent: 13 },
  deposit_rate: { percent: 15 },
  quote_validity: { days: 30 },
  notifications: {
    email: '',
    onNewLead: true,
    onQuoteSent: true,
    onQuoteOpened: true,
  },
  business_info: {
    name: '',
    address: '',
    city: '',
    province: 'ON',
    postal: '',
    phone: '',
    email: '',
    website: '',
  },
  quote_assistance: {
    mode: 'range',
    rangeBand: 10000,
  },
  category_markups: DEFAULT_CATEGORY_MARKUPS,
};

/** Validate all pricing ranges: min must be less than max */
function getPricingErrors(settings: Settings): Record<string, string> {
  const errors: Record<string, string> = {};
  const pricingKeys = ['pricing_kitchen', 'pricing_bathroom', 'pricing_basement', 'pricing_flooring'] as const;
  const levels = ['economy', 'standard', 'premium'] as const;
  for (const key of pricingKeys) {
    const pricing = settings[key];
    for (const level of levels) {
      if (pricing[level].min >= pricing[level].max) {
        errors[`${key}-${level}`] = 'Minimum must be less than maximum';
      }
    }
  }
  return errors;
}

function PricingCard({
  title,
  settingKey,
  pricing,
  onChange,
  pricingErrors,
}: {
  title: string;
  settingKey: string;
  pricing: PricingSettings;
  onChange: (key: string, level: string, field: string, value: number) => void;
  pricingErrors: Record<string, string>;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(['economy', 'standard', 'premium'] as const).map((level) => {
          const errorKey = `${settingKey}-${level}`;
          const errorMsg = pricingErrors[errorKey];
          const errorId = `${errorKey}-error`;
          return (
            <div key={level} className="space-y-2">
              <Label className="text-sm capitalize">{level}</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={pricing[level].min}
                  onChange={(e) => onChange(settingKey, level, 'min', parseFloat(e.target.value) || 0)}
                  className={`w-20 h-8 ${errorMsg ? 'border-destructive' : ''}`}
                  aria-label={`${title} ${level} minimum price`}
                  aria-invalid={!!errorMsg}
                  aria-describedby={errorMsg ? errorId : undefined}
                />
                <span className="text-sm text-muted-foreground">to $</span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={pricing[level].max}
                  onChange={(e) => onChange(settingKey, level, 'max', parseFloat(e.target.value) || 0)}
                  className={`w-20 h-8 ${errorMsg ? 'border-destructive' : ''}`}
                  aria-label={`${title} ${level} maximum price`}
                  aria-invalid={!!errorMsg}
                  aria-describedby={errorMsg ? errorId : undefined}
                />
                <span className="text-sm text-muted-foreground">/sqft</span>
              </div>
              {errorMsg && (
                <p id={errorId} className="text-xs text-destructive" role="alert">
                  {errorMsg}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { canAccess } = useTier();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  // V2: Cross-field validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // F10: Quote mode change confirmation
  const [showQuoteModeConfirm, setShowQuoteModeConfirm] = useState(false);
  const [pendingQuoteMode, setPendingQuoteMode] = useState<string | null>(null);
  // F13: Live settings preview
  const [showPreview, setShowPreview] = useState(false);

  // Load settings from API
  const loadSettings = useCallback(async (isRetry = false) => {
    if (isRetry) setIsRetrying(true);
    setLoadFailed(false);
    try {
      const response = await fetch('/api/admin/settings');
      if (!response.ok) {
        throw new Error('Failed to load settings');
      }
      const data = await response.json();

      // Merge with defaults
      const loadedSettings: Settings = { ...DEFAULT_SETTINGS };
      if (data.data) {
        for (const [key, value] of Object.entries(data.data)) {
          if (key in loadedSettings) {
            (loadedSettings as unknown as Record<string, unknown>)[key] = (value as { value: unknown }).value;
          }
        }
      }
      setSettings(loadedSettings);
    } catch (err) {
      console.error('Error loading settings:', err);
      setLoadFailed(true);
      // Use defaults if load fails
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // F13: Derive preview branding from current settings state
  const previewBranding = useMemo<PreviewBranding>(() => ({
    name: settings.business_info?.name,
    phone: settings.business_info?.phone,
    email: settings.business_info?.email,
    website: settings.business_info?.website,
    address: settings.business_info?.address,
    city: settings.business_info?.city,
    province: settings.business_info?.province,
    postal: settings.business_info?.postal,
  }), [settings.business_info]);

  // Handle pricing change
  const handlePricingChange = (key: string, level: string, field: string, value: number) => {
    setSettings((prev) => {
      const pricingKey = key as keyof Settings;
      const currentPricing = prev[pricingKey] as PricingSettings;
      return {
        ...prev,
        [key]: {
          ...currentPricing,
          [level]: {
            ...currentPricing[level as keyof PricingSettings],
            [field]: value,
          },
        },
      };
    });
    setHasChanges(true);
    setSaveSuccess(false);
  };

  // Handle simple value change
  const handleValueChange = (key: string, field: string, value: number | string | boolean) => {
    setSettings((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key as keyof Settings] as Record<string, unknown>),
        [field]: value,
      },
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  // Save settings with validation
  const handleSave = async () => {
    // V2: Cross-field pricing validation
    const pricingErrors = getPricingErrors(settings);
    // V3/V4/V5: Field-level validation
    const errors: Record<string, string> = { ...pricingErrors };

    // V4: Phone validation (settings)
    if (settings.business_info?.phone && !isValidPhone(settings.business_info.phone)) {
      errors['businessPhone'] = 'Phone number must be at least 10 digits';
    }
    // V3: Email validation (settings — notification email)
    if (settings.notifications?.email && !isValidEmail(settings.notifications.email)) {
      errors['notificationEmail'] = 'Please enter a valid email address';
    }
    // V3: Email validation (settings — business email)
    if (settings.business_info?.email && !isValidEmail(settings.business_info.email)) {
      errors['businessEmail'] = 'Please enter a valid email address';
    }
    // V5: Canadian postal code validation
    if (settings.business_info?.postal && !isValidCanadianPostal(settings.business_info.postal)) {
      errors['businessPostal'] = 'Enter a valid Canadian postal code (e.g., N5A 1A1)';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Please fix the validation errors before saving.');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      // Build settings to save
      const settingsToSave = [
        { key: 'pricing_kitchen', value: settings.pricing_kitchen },
        { key: 'pricing_bathroom', value: settings.pricing_bathroom },
        { key: 'pricing_basement', value: settings.pricing_basement },
        { key: 'pricing_flooring', value: settings.pricing_flooring },
        { key: 'labor_rate', value: settings.labor_rate },
        { key: 'contract_markup', value: settings.contract_markup },
        { key: 'contingency', value: settings.contingency },
        { key: 'deposit_rate', value: settings.deposit_rate },
        { key: 'quote_validity', value: settings.quote_validity },
        { key: 'notifications', value: settings.notifications },
        { key: 'business_info', value: settings.business_info },
        { key: 'quote_assistance', value: settings.quote_assistance },
        { key: 'category_markups', value: settings.category_markups },
      ];

      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsToSave }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setSaveSuccess(true);
      setHasChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={showPreview ? 'flex gap-0 h-[calc(100vh-4rem)]' : ''}>
    <div className={`space-y-6 ${showPreview ? 'w-1/2 min-w-[480px] overflow-y-auto p-6' : 'max-w-4xl'}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" id="settings-heading">Settings</h2>
          <p className="text-muted-foreground">
            Configure pricing, business settings, and quote defaults.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
              Unsaved changes
            </Badge>
          )}
          <Button
            variant={showPreview ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowPreview((v) => !v)}
            className="gap-1.5"
            aria-label={showPreview ? 'Hide preview' : 'Show preview'}
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            Preview
          </Button>
        </div>
      </div>

      {/* E3: Settings load failure banner */}
      {loadFailed && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm flex-1">Failed to load settings. Using defaults.</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadSettings(true)}
            disabled={isRetrying}
            className="shrink-0"
          >
            {isRetrying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
            Retry
          </Button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <Tabs defaultValue="pricing" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pricing" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Pricing
          </TabsTrigger>
          <TabsTrigger value="rates" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Rates & Defaults
          </TabsTrigger>
          <TabsTrigger value="quoting" className="gap-2">
            <MessageSquareQuote className="h-4 w-4" />
            Quoting
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="business" className="gap-2">
            <Building className="h-4 w-4" />
            Business Info
          </TabsTrigger>
          {canAccess('csv_price_upload') && (
            <TabsTrigger value="price-list" className="gap-2">
              <Upload className="h-4 w-4" />
              Price List
            </TabsTrigger>
          )}
          {canAccess('assembly_templates') && (
            <TabsTrigger value="templates" className="gap-2">
              <Layers className="h-4 w-4" />
              Templates
            </TabsTrigger>
          )}
        </TabsList>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Per-Square-Foot Pricing</CardTitle>
              <CardDescription>
                Configure pricing ranges for different project types and finish levels.
                These rates are used by the AI to generate quote estimates.
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <PricingCard
              title="Kitchen Renovation"
              settingKey="pricing_kitchen"
              pricing={settings.pricing_kitchen}
              onChange={handlePricingChange}
              pricingErrors={fieldErrors}
            />
            <PricingCard
              title="Bathroom Renovation"
              settingKey="pricing_bathroom"
              pricing={settings.pricing_bathroom}
              onChange={handlePricingChange}
              pricingErrors={fieldErrors}
            />
            <PricingCard
              title="Basement Finishing"
              settingKey="pricing_basement"
              pricing={settings.pricing_basement}
              onChange={handlePricingChange}
              pricingErrors={fieldErrors}
            />
            <PricingCard
              title="Flooring Installation"
              settingKey="pricing_flooring"
              pricing={settings.pricing_flooring}
              onChange={handlePricingChange}
              pricingErrors={fieldErrors}
            />
          </div>
        </TabsContent>

        {/* Rates Tab */}
        <TabsContent value="rates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Rates</CardTitle>
              <CardDescription>
                Configure labor rates and markups used in quote calculations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="labor_rate">Internal Labour Rate ($/hr)</Label>
                <Input
                  id="labor_rate"
                  type="number"
                  min="0"
                  step="1"
                  value={settings.labor_rate.hourly}
                  onChange={(e) => handleValueChange('labor_rate', 'hourly', parseFloat(e.target.value) || 0)}
                  className="w-32"
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium">Per-Category Markups</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure markups by category. These are applied to the AI&apos;s base cost estimates when generating quotes.
                  </p>
                </div>
                <CategoryMarkupSettings
                  markups={settings.category_markups || DEFAULT_CATEGORY_MARKUPS}
                  onChange={(category, value) => {
                    setSettings(prev => ({
                      ...prev,
                      category_markups: {
                        ...(prev.category_markups || DEFAULT_CATEGORY_MARKUPS),
                        [category]: value,
                      },
                    }));
                    setHasChanges(true);
                    setSaveSuccess(false);
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quote Defaults</CardTitle>
              <CardDescription>
                Default values used when generating quotes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contingency">Default Contingency (%)</Label>
                  <Input
                    id="contingency"
                    type="number"
                    min="0"
                    max="30"
                    step="1"
                    value={settings.contingency.percent}
                    onChange={(e) => handleValueChange('contingency', 'percent', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deposit_rate">Required Deposit (%)</Label>
                  <Input
                    id="deposit_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={settings.deposit_rate.percent}
                    onChange={(e) => handleValueChange('deposit_rate', 'percent', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quote_validity">Quote Validity (days)</Label>
                  <Input
                    id="quote_validity"
                    type="number"
                    min="7"
                    max="90"
                    step="1"
                    value={settings.quote_validity.days}
                    onChange={(e) => handleValueChange('quote_validity', 'days', parseInt(e.target.value, 10) || 30)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="hst_rate">HST Rate (%)</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>Ontario HST is 13% (set by law)</TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="hst_rate"
                    type="number"
                    value={settings.hst_rate.percent}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quoting Tab */}
        <TabsContent value="quoting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quote Assistance</CardTitle>
              <CardDescription>
                This setting controls how pricing appears across your entire website — in navigation buttons, chat widget messages, and the AI estimate experience. When set to &ldquo;No Pricing&rdquo;, all quote-related buttons become &ldquo;Contact Us&rdquo; and the AI assistant avoids discussing dollar amounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="quoteMode">Pricing Display Mode</Label>
                <Select
                  value={settings.quote_assistance?.mode || 'range'}
                  onValueChange={(value) => {
                    // F10: Confirm when switching TO 'none'
                    if (value === 'none' && settings.quote_assistance?.mode !== 'none') {
                      setPendingQuoteMode(value);
                      setShowQuoteModeConfirm(true);
                      return;
                    }
                    setSettings(prev => ({
                      ...prev,
                      quote_assistance: {
                        ...prev.quote_assistance!,
                        mode: value as 'none' | 'range' | 'estimate',
                      },
                    }));
                    setHasChanges(true);
                    setSaveSuccess(false);
                  }}
                >
                  <SelectTrigger id="quoteMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Pricing</SelectItem>
                    <SelectItem value="range">Price Range</SelectItem>
                    <SelectItem value="estimate">Full Estimate</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {settings.quote_assistance?.mode === 'none' && 'No dollar amounts shown. Homeowners see "Request a callback for pricing."'}
                  {settings.quote_assistance?.mode === 'range' && 'Cost ranges shown with configurable band width (e.g. "$25,000 – $35,000 + HST").'}
                  {settings.quote_assistance?.mode === 'estimate' && 'Best AI estimate shown with disclaimer (e.g. "AI estimate: ~$31,500 + HST").'}
                </p>
              </div>

              {settings.quote_assistance?.mode === 'range' && (
                <div className="space-y-2">
                  <Label htmlFor="rangeBand">Range Band Width</Label>
                  <Select
                    value={String(settings.quote_assistance?.rangeBand || 10000)}
                    onValueChange={(value) => {
                      setSettings(prev => ({
                        ...prev,
                        quote_assistance: {
                          ...prev.quote_assistance!,
                          rangeBand: parseInt(value, 10) as 1000 | 5000 | 10000,
                        },
                      }));
                      setHasChanges(true);
                      setSaveSuccess(false);
                    }}
                  >
                    <SelectTrigger id="rangeBand">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1000">$1,000 bands</SelectItem>
                      <SelectItem value="5000">$5,000 bands</SelectItem>
                      <SelectItem value="10000">$10,000 bands</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    How wide the price range should be. Wider bands = less specific.
                  </p>
                </div>
              )}

              <Separator />

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Preview</p>
                <p className="text-sm text-muted-foreground">
                  {settings.quote_assistance?.mode === 'none' && 'Your homeowner would see: "Interested in this design? Request a callback from your contractor."'}
                  {settings.quote_assistance?.mode === 'range' && (
                    <>Your homeowner would see: &ldquo;Estimated: $25,000 – ${(25000 + (settings.quote_assistance?.rangeBand || 10000)).toLocaleString()} + HST&rdquo;</>
                  )}
                  {settings.quote_assistance?.mode === 'estimate' && 'Your homeowner would see: "AI estimate: ~$31,500 + HST. This is a preliminary estimate."'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Configure email notifications for lead and quote events.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notificationEmail">Notification Email</Label>
                <Input
                  id="notificationEmail"
                  type="email"
                  value={settings.notifications?.email || ''}
                  onChange={(e) => handleValueChange('notifications', 'email', e.target.value)}
                  placeholder="admin@example.com"
                  aria-invalid={!!fieldErrors['notificationEmail']}
                  aria-describedby={fieldErrors['notificationEmail'] ? 'notificationEmail-error' : undefined}
                />
                {fieldErrors['notificationEmail'] ? (
                  <p id="notificationEmail-error" className="text-xs text-destructive" role="alert">
                    {fieldErrors['notificationEmail']}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Email address for receiving notifications.
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">New lead notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when a new lead is submitted.
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications?.onNewLead ?? true}
                    onCheckedChange={(checked) => handleValueChange('notifications', 'onNewLead', checked)}
                    aria-label="New lead notifications"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Quote sent notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when a quote is sent to a customer.
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications?.onQuoteSent ?? true}
                    onCheckedChange={(checked) => handleValueChange('notifications', 'onQuoteSent', checked)}
                    aria-label="Quote sent notifications"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Quote opened notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when a customer opens their quote.
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications?.onQuoteOpened ?? true}
                    onCheckedChange={(checked) => handleValueChange('notifications', 'onQuoteOpened', checked)}
                    aria-label="Quote opened notifications"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Info Tab */}
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                Business details shown on quotes and emails.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={settings.business_info?.name || ''}
                  onChange={(e) => handleValueChange('business_info', 'name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessAddress">Street Address</Label>
                <Input
                  id="businessAddress"
                  value={settings.business_info?.address || ''}
                  onChange={(e) => handleValueChange('business_info', 'address', e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="businessCity">City</Label>
                  <Input
                    id="businessCity"
                    value={settings.business_info?.city || ''}
                    onChange={(e) => handleValueChange('business_info', 'city', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessProvince">Province</Label>
                  <Input
                    id="businessProvince"
                    value={settings.business_info?.province || ''}
                    onChange={(e) => handleValueChange('business_info', 'province', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessPostal">Postal Code</Label>
                  <Input
                    id="businessPostal"
                    value={settings.business_info?.postal || ''}
                    onChange={(e) => handleValueChange('business_info', 'postal', e.target.value)}
                    aria-invalid={!!fieldErrors['businessPostal']}
                    aria-describedby={fieldErrors['businessPostal'] ? 'businessPostal-error' : undefined}
                  />
                  {fieldErrors['businessPostal'] && (
                    <p id="businessPostal-error" className="text-xs text-destructive" role="alert">
                      {fieldErrors['businessPostal']}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessPhone">Phone</Label>
                  <Input
                    id="businessPhone"
                    type="tel"
                    value={settings.business_info?.phone || ''}
                    onChange={(e) => handleValueChange('business_info', 'phone', e.target.value)}
                    aria-invalid={!!fieldErrors['businessPhone']}
                    aria-describedby={fieldErrors['businessPhone'] ? 'businessPhone-error' : undefined}
                  />
                  {fieldErrors['businessPhone'] && (
                    <p id="businessPhone-error" className="text-xs text-destructive" role="alert">
                      {fieldErrors['businessPhone']}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessEmail">Email</Label>
                  <Input
                    id="businessEmail"
                    type="email"
                    value={settings.business_info?.email || ''}
                    onChange={(e) => handleValueChange('business_info', 'email', e.target.value)}
                    aria-invalid={!!fieldErrors['businessEmail']}
                    aria-describedby={fieldErrors['businessEmail'] ? 'businessEmail-error' : undefined}
                  />
                  {fieldErrors['businessEmail'] && (
                    <p id="businessEmail-error" className="text-xs text-destructive" role="alert">
                      {fieldErrors['businessEmail']}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessWebsite">Website</Label>
                <Input
                  id="businessWebsite"
                  value={settings.business_info?.website || ''}
                  onChange={(e) => handleValueChange('business_info', 'website', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Price List Tab (F9 — self-contained, own API calls) */}
        {canAccess('csv_price_upload') && (
          <TabsContent value="price-list" className="space-y-6">
            <PriceUpload />
          </TabsContent>
        )}

        {/* Templates Tab (F10 — self-contained, own API calls) */}
        {canAccess('assembly_templates') && (
          <TabsContent value="templates" className="space-y-6">
            <TemplateManager />
          </TabsContent>
        )}
      </Tabs>

      {/* Save Button */}
      <div className="flex items-center gap-4 sticky bottom-4 bg-background p-4 border rounded-lg shadow-lg">
        <Button onClick={handleSave} disabled={isSaving || !hasChanges} size="lg">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
        {saveSuccess && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <Check className="h-4 w-4" />
            Settings saved successfully
          </span>
        )}
      </div>

      {/* F10: Quote mode change to 'none' confirmation */}
      <ConfirmDialog
        open={showQuoteModeConfirm}
        onOpenChange={setShowQuoteModeConfirm}
        title="Disable Pricing Information"
        description="This will hide all pricing information from your website. Visitors will not see cost estimates."
        confirmLabel="Disable Pricing"
        destructive
        onConfirm={() => {
          if (pendingQuoteMode) {
            setSettings(prev => ({
              ...prev,
              quote_assistance: {
                ...prev.quote_assistance!,
                mode: pendingQuoteMode as 'none' | 'range' | 'estimate',
              },
            }));
            setHasChanges(true);
            setSaveSuccess(false);
          }
          setPendingQuoteMode(null);
        }}
        onCancel={() => setPendingQuoteMode(null)}
      />
    </div>

    {/* F13: Live preview panel */}
    {showPreview && (
      <div className="flex-1 min-w-[320px]">
        <SettingsPreview settings={previewBranding} />
      </div>
    )}
    </div>
  );
}
