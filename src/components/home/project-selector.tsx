'use client';

/**
 * Project Type Quick Selector
 * Intent-driven navigation widget — clicking a project type navigates
 * to /estimate?project=kitchen with AI chat pre-loaded with context.
 */

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  ChefHat,
  Bath,
  Sofa,
  Layers,
  Home,
  MoreHorizontal,
} from 'lucide-react';

const PROJECT_TYPES = [
  { id: 'kitchen', label: 'Kitchen', icon: ChefHat },
  { id: 'bathroom', label: 'Bathroom', icon: Bath },
  { id: 'basement', label: 'Basement', icon: Layers },
  { id: 'living_room', label: 'Living Room', icon: Sofa },
  { id: 'full_home', label: 'Full Home', icon: Home },
  { id: 'other', label: 'Other', icon: MoreHorizontal },
] as const;

interface ProjectSelectorProps {
  className?: string;
}

export function ProjectSelector({ className }: ProjectSelectorProps) {
  const router = useRouter();

  return (
    <div className={cn('text-center', className)}>
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        What are you planning?
      </h2>
      <p className="mt-2 text-muted-foreground">
        Select your project type to get started
      </p>

      <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4 max-w-3xl mx-auto">
        {PROJECT_TYPES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => router.push(`/estimate?project=${id}`)}
            className={cn(
              'group flex flex-col items-center gap-2 rounded-xl border-2 border-border bg-card p-4',
              'transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-md',
              'active:scale-95 active:border-primary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            )}
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary/10">
              <Icon className="size-6 text-muted-foreground transition-colors group-hover:text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
