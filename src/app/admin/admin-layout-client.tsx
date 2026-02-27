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
import { Sparkles, FileText, MessageSquare, ArrowRight } from 'lucide-react';
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

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const FEATURE_HIGHLIGHTS = [
  { icon: Sparkles, label: 'AI-Powered Quotes' },
  { icon: FileText, label: 'Smart Invoicing' },
  { icon: MessageSquare, label: '24/7 Lead Capture' },
] as const;

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
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="mx-4 w-full max-w-md"
            >
              <motion.div
                className="rounded-2xl border border-border/50 bg-card px-8 pb-8 pt-7 text-center shadow-2xl"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {/* Tenant logo or name */}
                <motion.div variants={fadeUp} className="mb-5">
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
                </motion.div>

                {/* Sparkle icon with gradient ring */}
                <motion.div variants={fadeUp} className="mb-5">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent ring-1 ring-primary/20">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                </motion.div>

                {/* Headline */}
                <motion.h1
                  variants={fadeUp}
                  className="mb-2 text-2xl font-bold tracking-tight text-foreground"
                >
                  Your AI Command Centre is Ready
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  variants={fadeUp}
                  className="mb-5 text-sm leading-relaxed text-muted-foreground"
                >
                  We&apos;ve loaded two sample projects so you can test-drive every
                  feature &mdash; from AI-generated quotes to one-click invoicing.
                  Go ahead, click everything.
                </motion.p>

                {/* Feature highlight pills */}
                <motion.div
                  variants={fadeUp}
                  className="mb-7 flex flex-wrap items-center justify-center gap-2"
                >
                  {FEATURE_HIGHLIGHTS.map(({ icon: Icon, label }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground"
                    >
                      <Icon className="h-3.5 w-3.5 text-primary" />
                      {label}
                    </span>
                  ))}
                </motion.div>

                {/* CTA */}
                <motion.div variants={fadeUp}>
                  <Button
                    size="lg"
                    onClick={dismissSplash}
                    className="h-12 w-full text-base font-semibold group"
                  >
                    Start Exploring
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </motion.div>

                {/* Subtle demo badge */}
                <motion.p
                  variants={fadeUp}
                  className="mt-4 text-xs text-muted-foreground/50"
                >
                  Demo data for illustration &mdash; your real account starts fresh
                </motion.p>
              </motion.div>
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
