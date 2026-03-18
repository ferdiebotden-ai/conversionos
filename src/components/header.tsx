"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Menu, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"
import { useBranding } from "@/components/branding-provider"
import { useCopyContext } from "@/lib/copy/use-site-copy"
import { getHeaderCTA } from "@/lib/copy/site-copy"
import { useTier } from "@/components/tier-provider"

const navLinks = [
  { href: "/", anchor: "#hero", label: "Home" },
  { href: "/services", anchor: "#services", label: "Services" },
  { href: "/projects", anchor: "#projects", label: "Projects" },
  { href: "/about", anchor: "#about", label: "About" },
  { href: "/contact", anchor: "#contact", label: "Contact" },
] as const

/** Scroll-spy: track which section is visible on homepage */
function useScrollSpy(isHomepage: boolean) {
  const [activeSection, setActiveSection] = React.useState<string>('hero')

  React.useEffect(() => {
    if (!isHomepage) return

    const sectionIds = ['hero', 'services', 'projects', 'how-it-works', 'about', 'contact', 'testimonials', 'trust', 'cta']
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            setActiveSection(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0px -50% 0px', threshold: 0.3 }
    )

    for (const id of sectionIds) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [isHomepage])

  return activeSection
}

/** Map anchor IDs to nav link anchors for comparison */
function sectionMatchesNav(activeSection: string, navAnchor: string): boolean {
  const anchor = navAnchor.replace('#', '')
  if (anchor === 'hero' && activeSection === 'hero') return true
  if (anchor === activeSection) return true
  return false
}

export function Header() {
  const [isOpen, setIsOpen] = React.useState(false)
  const pathname = usePathname()
  const branding = useBranding()
  const copyCtx = useCopyContext()
  const cta = getHeaderCTA(copyCtx)
  const { canAccess } = useTier()
  const showAdmin = canAccess('admin_dashboard')

  const isHomepage = pathname === '/'
  const activeSection = useScrollSpy(isHomepage)

  const isActive = (link: typeof navLinks[number]) => {
    if (isHomepage) {
      return sectionMatchesNav(activeSection, link.anchor)
    }
    return link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
  }

  const getLinkHref = (link: typeof navLinks[number]) => {
    // On homepage, use anchor links for smooth scroll; on other pages, use page links
    return isHomepage ? link.anchor : link.href
  }

  // Hide public header on admin routes
  if (pathname.startsWith('/admin')) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Mobile: Menu button */}
        <div className="flex shrink-0 md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-10 min-h-10 min-w-10"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader className="border-b pb-4">
                <SheetTitle>
                  <Logo name={branding.name} tagline={branding.tagline} logoUrl={branding.logoUrl} logoOnDark={branding.logoOnDark} />
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Navigation menu
                </SheetDescription>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-2">
                {navLinks.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={getLinkHref(link)}
                      className={`flex h-12 items-center rounded-md px-4 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${isActive(link) ? 'bg-accent text-accent-foreground' : 'text-foreground'}`}
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
                {showAdmin && (
                  <>
                    <div className="my-2 border-t border-border" />
                    <SheetClose asChild>
                      <Link
                        href="/admin"
                        className="flex h-12 items-center gap-3 rounded-md px-4 text-base font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <LayoutDashboard className="h-5 w-5" />
                        Admin Dashboard
                      </Link>
                    </SheetClose>
                  </>
                )}
                <div className="mt-4 border-t pt-4">
                  <SheetClose asChild>
                    <Button asChild size="lg" className="h-12 w-full">
                      <Link href={cta.href}>{cta.label}</Link>
                    </Button>
                  </SheetClose>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* Logo - centered on mobile via flex, left on desktop */}
        <Link
          href="/"
          className="min-w-0 flex-1 flex justify-center md:flex-initial"
        >
          <Logo name={branding.name} tagline={branding.tagline} logoUrl={branding.logoUrl} logoOnDark={branding.logoOnDark} />
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={getLinkHref(link)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-foreground ${isActive(link) ? 'text-foreground bg-accent/50' : 'text-foreground/80'}`}
            >
              {link.label}
            </Link>
          ))}
          {showAdmin && (
            <Link
              href="/admin"
              className="rounded-md border border-red-500 px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-red-50 hover:text-foreground dark:hover:bg-red-950/20 inline-flex items-center gap-1.5"
            >
              <LayoutDashboard className="h-4 w-4" />
              Admin
            </Link>
          )}
        </nav>

        {/* CTA buttons */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Mobile: Compact CTA — smaller to avoid blocking logo */}
          <Button asChild size="sm" className="h-8 px-3 text-xs md:hidden">
            <Link href={cta.href}>Get Quote</Link>
          </Button>

          {/* Desktop: Full CTA */}
          <div className="hidden items-center gap-3 md:flex">
            <Button asChild className="h-10">
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

function Logo({ name, tagline, logoUrl, logoOnDark }: { name: string; tagline: string; logoUrl?: string | undefined; logoOnDark?: boolean | undefined }) {
  if (logoUrl) {
    const img = (
      <Image
        src={logoUrl}
        alt={name}
        width={220}
        height={56}
        className="h-10 md:h-11 w-auto max-w-[120px] md:max-w-[200px]"
        priority
      />
    )
    return logoOnDark ? (
      <span className="inline-flex items-center rounded-lg bg-gray-900 px-3 py-2">
        {img}
      </span>
    ) : img
  }

  // Fallback: text-based logo
  const words = name.split(" ")
  const first = words[0]
  const rest = words.slice(1).join(" ")

  return (
    <div className="flex flex-col leading-tight min-w-0">
      <span className="text-lg md:text-2xl font-bold tracking-tight text-foreground truncate">
        {first}{rest && <> <span className="text-primary">{rest}</span></>}
      </span>
      <span className="hidden text-xs font-medium tracking-widest text-muted-foreground uppercase truncate md:block">
        {tagline}
      </span>
    </div>
  )
}
