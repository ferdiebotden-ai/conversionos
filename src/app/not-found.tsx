'use client';

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useCopyContext } from '@/lib/copy/use-site-copy'
import { getNotFoundCTA } from '@/lib/copy/site-copy'

export default function NotFound() {
  const cta = getNotFoundCTA(useCopyContext())

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <h2 className="mt-4 text-2xl font-semibold text-foreground">
        Page Not Found
      </h2>
      <p className="mt-4 max-w-md text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-8 flex gap-4">
        <Button asChild>
          <Link href="/">Go Home</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={cta.href}>{cta.label}</Link>
        </Button>
      </div>
    </div>
  )
}
