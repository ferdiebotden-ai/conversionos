/**
 * Admin Layout (Server Component)
 * Gates the admin dashboard behind the 'admin_dashboard' entitlement.
 * Elevate tenants are redirected to the homepage.
 */

import { redirect } from 'next/navigation';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';
import { AdminLayoutClient } from './admin-layout-client';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tier = await getTier();

  if (!canAccess(tier, 'admin_dashboard')) {
    redirect('/');
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
