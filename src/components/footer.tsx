"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Mail, MapPin, Phone } from "lucide-react"
import { useBranding } from "@/components/branding-provider"
import { useTier } from "@/components/tier-provider"

const quickLinks = [
  { href: "/services", label: "Our Services" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
]

export function Footer({ hideAttribution = false }: { hideAttribution?: boolean }) {
  const pathname = usePathname()
  const branding = useBranding()
  const { tier } = useTier()
  const currentYear = new Date().getFullYear()

  const serviceLinks = branding.services.length > 0
    ? branding.services.map(s => ({ href: `/services/${s.slug}`, label: s.name }))
    : []

  // Hide public footer on admin routes
  if (pathname.startsWith('/admin')) {
    return null
  }

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="grid gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Company Info */}
          <div className="col-span-2 lg:col-span-1 space-y-4">
            {branding.logoUrl ? (
              branding.logoOnDark ? (
                <span className="inline-flex items-center rounded-lg bg-gray-900 px-3 py-2">
                  <Image
                    src={branding.logoUrl}
                    alt={branding.name}
                    width={200}
                    height={50}
                    className="h-10 w-auto"
                  />
                </span>
              ) : (
                <Image
                  src={branding.logoUrl}
                  alt={branding.name}
                  width={200}
                  height={50}
                  className="h-10 w-auto"
                />
              )
            ) : (
              <div className="flex flex-col leading-tight">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {branding.name.split(" ")[0]}{" "}
                  <span className="text-primary">{branding.name.split(" ").slice(1).join(" ")}</span>
                </span>
                <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                  {branding.tagline}
                </span>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Professional renovation services for homes and businesses in {branding.city}, {branding.province} and surrounding communities.
            </p>
            {branding.socials.length > 0 && (
              <div className="flex gap-4">
                {branding.socials.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {social.label}
                  </a>
                ))}
              </div>
            )}
            {tier !== 'dominate' && !hideAttribution && (
              <p className="text-xs text-muted-foreground/40">
                Built by{' '}
                <a href="https://www.norbotsystems.com" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary transition-colors">
                  NorBot Systems
                </a>
              </p>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              Quick Links
            </h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          {serviceLinks.length > 0 && (
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
                Services
              </h3>
              <ul className="space-y-3">
                {serviceLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contact Info */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              Contact Us
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{branding.city}, {branding.province}, Canada</span>
              </li>
              <li>
                <a
                  href={`tel:${branding.phone.replace(/\D/g, '')}`}
                  className="flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  <Phone className="size-4 shrink-0 text-primary" />
                  {branding.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${branding.email}`}
                  className="flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  <Mail className="size-4 shrink-0 text-primary" />
                  {branding.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 md:mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 md:pt-8 text-sm text-muted-foreground md:flex-row">
          <p>&copy; {currentYear} {branding.name.replace(/\.\s*$/, '')}. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-muted-foreground/60 hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-muted-foreground/60 hover:text-primary transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
