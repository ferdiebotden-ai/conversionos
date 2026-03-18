'use client';

/**
 * Admin Header
 * Top header bar with mobile menu toggle and page title
 */

import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

interface AdminHeaderProps {
  onMenuClick?: () => void;
  title?: string;
}

export function AdminHeader({ onMenuClick, title = 'Dashboard' }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-card px-4 lg:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Page title */}
      <h1 className="text-lg font-semibold flex-1">{title}</h1>
    </header>
  );
}
