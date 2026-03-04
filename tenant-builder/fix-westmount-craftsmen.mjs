/**
 * Fix Westmount Craftsmen:
 * 1. Add email to business_info (info@westmountcraftsmen.com)
 * 2. Set branding.ogImageUrl from existing hero
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib/env-loader.mjs';

loadEnv();

const SITE_ID = 'westmount-craftsmen';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// --- Patch business_info ---
console.log('[1/2] Patching business_info...');
const { data: infoRow } = await sb.from('admin_settings').select('value')
  .eq('site_id', SITE_ID).eq('key', 'business_info').single();
const info = typeof infoRow.value === 'string' ? JSON.parse(infoRow.value) : infoRow.value;
info.email = 'info@westmountcraftsmen.com';
info.quotes_email = 'info@westmountcraftsmen.com';
await sb.from('admin_settings').update({ value: info }).eq('site_id', SITE_ID).eq('key', 'business_info');
console.log('  email set:', info.email);

// --- Patch branding ogImageUrl ---
console.log('[2/2] Patching branding ogImageUrl...');
const { data: pRow } = await sb.from('admin_settings').select('value')
  .eq('site_id', SITE_ID).eq('key', 'company_profile').single();
const profile = typeof pRow.value === 'string' ? JSON.parse(pRow.value) : pRow.value;
const heroUrl = profile.heroImageUrl || '';

const { data: bRow } = await sb.from('admin_settings').select('value')
  .eq('site_id', SITE_ID).eq('key', 'branding').single();
const branding = typeof bRow.value === 'string' ? JSON.parse(bRow.value) : bRow.value;
branding.ogImageUrl = heroUrl;
await sb.from('admin_settings').update({ value: branding }).eq('site_id', SITE_ID).eq('key', 'branding');
console.log('  ogImageUrl set:', heroUrl.slice(-40));

console.log('\n✓ Done.');
