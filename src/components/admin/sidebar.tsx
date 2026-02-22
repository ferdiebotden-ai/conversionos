'use client';

/**
 * Admin Sidebar
 * Navigation sidebar for the admin dashboard
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/db/client';
import {
  LayoutDashboard,
  Users,
  FileText,
  DollarSign,
  Pencil,
  Settings,
  Sparkles,
  LogOut,
  Home,
} from 'lucide-react';
import { useBranding } from '@/components/branding-provider';
import { useTier } from '@/components/tier-provider';
import type { Feature } from '@/lib/entitlements';

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  feature?: Feature;
}[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/leads', label: 'Leads', icon: Users },
  { href: '/admin/quotes', label: 'Quotes', icon: FileText, feature: 'ai_quote_engine' },
  { href: '/admin/invoices', label: 'Invoices', icon: DollarSign, feature: 'invoicing' },
  { href: '/admin/drawings', label: 'Drawings', icon: Pencil, feature: 'drawings' },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  className?: string;
  onNavClick?: () => void;
}

export function Sidebar({ className, onNavClick }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const branding = useBranding();
  const { canAccess } = useTier();

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.feature || canAccess(item.feature)
  );

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  return (
    <aside className={cn('flex flex-col h-full bg-card border-r border-border', className)}>
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <Link
          href="/admin"
          className="flex items-center gap-2"
          {...(onNavClick && { onClick: onNavClick })}
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-sm">{branding.name}</span>
            <span className="block text-xs text-muted-foreground">Admin</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              {...(onNavClick && { onClick: onNavClick })}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full"
        >
          <Home className="w-5 h-5" />
          Back to Site
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>

        <div className="mt-4 px-3 text-xs text-muted-foreground">
          <p>ConversionOS</p>
          <p>Powered by AI</p>
        </div>
      </div>
    </aside>
  );
}
