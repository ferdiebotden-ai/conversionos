'use client';

/**
 * Admin Layout (Client Component)
 * Wraps all admin pages with sidebar navigation.
 * In demo mode, shows a one-time interstitial splash explaining
 * this is a preview (production would be login-protected).
 */

import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { Sidebar } from '@/components/admin/sidebar';
import { AdminHeader } from '@/components/admin/header';
import { Button } from '@/components/ui/button';
import { useBranding } from '@/components/branding-provider';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';

// Map routes to page titles
const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/leads': 'Leads',
  '/admin/quotes': 'Quotes',
  '/admin/invoices': 'Invoices',
  '/admin/drawings': 'Drawings',
  '/admin/settings': 'Settings',
};

const SPLASH_KEY = 'conversionos-demo-splash-seen';

export function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const branding = useBranding();

  // Demo interstitial — show once per browser session (lazy init avoids effect)
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !sessionStorage.getItem(SPLASH_KEY);
  });

  const dismissSplash = useCallback(() => {
    sessionStorage.setItem(SPLASH_KEY, '1');
    setShowSplash(false);
  }, []);

  // Don't show layout on login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Get page title based on pathname
  const getPageTitle = () => {
    // Check for exact match first
    if (PAGE_TITLES[pathname]) {
      return PAGE_TITLES[pathname];
    }
    // Check for prefix matches (e.g., /admin/leads/123)
    for (const [route, title] of Object.entries(PAGE_TITLES)) {
      if (pathname.startsWith(route + '/')) {
        // For detail pages, show parent title
        return title;
      }
    }
    return 'Admin';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Interstitial Splash */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="demo-splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="mx-4 w-full max-w-md"
            >
              <div className="rounded-2xl border border-border/50 bg-card p-8 text-center shadow-2xl">
                {/* Tenant logo or name */}
                <div className="mb-6">
                  {branding.logoUrl ? (
                    <Image
                      src={branding.logoUrl}
                      alt={branding.name}
                      width={180}
                      height={45}
                      className="mx-auto h-10 w-auto"
                    />
                  ) : (
                    <h2 className="text-xl font-bold text-foreground">
                      {branding.name}
                    </h2>
                  )}
                </div>

                {/* Shield icon */}
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <ShieldCheck className="h-7 w-7 text-primary" />
                </div>

                {/* Headline */}
                <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
                  Admin Dashboard Preview
                </h1>

                {/* Subtitle */}
                <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
                  Experience the full contractor command centre. In production,
                  this dashboard is protected with secure authentication.
                </p>

                {/* CTA */}
                <Button
                  size="lg"
                  onClick={dismissSplash}
                  className="h-12 w-full text-base font-semibold"
                >
                  Continue to Dashboard
                </Button>

                {/* Subtle demo badge */}
                <p className="mt-4 text-xs text-muted-foreground/60">
                  Demo instance &mdash; sample data for illustration
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar onNavClick={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="lg:pl-64">
        <AdminHeader
          onMenuClick={() => setMobileMenuOpen(true)}
          title={getPageTitle()}
        />

        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
