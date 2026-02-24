"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { Branding } from "@/lib/branding"

const DEMO_BRANDING: Branding = {
  name: "ConversionOS Demo",
  tagline: "AI-Powered Renovation Platform",
  phone: "(226) 444-3478",
  email: "ferdie@norbotsystems.com",
  website: "conversionos-demo.norbotsystems.com",
  address: "1 Ontario Street",
  city: "Stratford",
  province: "ON",
  postal: "N5A 3H1",
  socials: [
    { label: "LinkedIn", href: "https://www.linkedin.com/company/norbot-systems" },
    { label: "GitHub", href: "https://github.com/norbot-systems" },
  ],
  paymentEmail: "ferdie@norbotsystems.com",
  quotesEmail: "ferdie@norbotsystems.com",
  primaryColor: "#0D9488",
  primaryOklch: "0.588 0.108 180",
  logoUrl: "/brand/logo-full/norbot-full-teal.svg",
  services: [],
}

const BrandingContext = createContext<Branding>(DEMO_BRANDING)

export function useBranding() {
  return useContext(BrandingContext)
}

/**
 * Provides tenant branding to client components.
 * If server-fetched branding is passed as `initial`, no client fetch occurs.
 * Otherwise, fetches from /api/admin/settings on mount.
 */
export function BrandingProvider({
  children,
  initial,
}: {
  children: ReactNode
  initial?: Branding
}) {
  const [branding, setBranding] = useState<Branding>(initial ?? DEMO_BRANDING)

  useEffect(() => {
    // Skip fetch if server already provided branding
    if (initial) return

    async function load() {
      try {
        const res = await fetch("/api/admin/settings")
        if (!res.ok) return
        const json = await res.json()
        const info = json.data?.business_info?.value as Record<string, unknown> | undefined
        const brand = json.data?.branding?.value as Record<string, unknown> | undefined
        const profileData = json.data?.company_profile?.value as Record<string, unknown> | undefined
        if (!info) return

        const colors = (brand?.["colors"] as Record<string, string>) || {}
        const rawServices = (profileData?.["services"] as { name: string; slug?: string }[]) || []
        setBranding({
          name: (info["name"] as string) || DEMO_BRANDING.name,
          tagline: (brand?.["tagline"] as string) || (info["tagline"] as string) || DEMO_BRANDING.tagline,
          phone: (info["phone"] as string) || DEMO_BRANDING.phone,
          email: (info["email"] as string) || DEMO_BRANDING.email,
          website: (info["website"] as string) || DEMO_BRANDING.website,
          address: (info["address"] as string) || DEMO_BRANDING.address,
          city: (info["city"] as string) || DEMO_BRANDING.city,
          province: (info["province"] as string) || DEMO_BRANDING.province,
          postal: (info["postal"] as string) || DEMO_BRANDING.postal,
          socials: (brand?.["socials"] as Branding["socials"]) || DEMO_BRANDING.socials,
          paymentEmail: (info["payment_email"] as string) || DEMO_BRANDING.paymentEmail,
          quotesEmail: (info["quotes_email"] as string) || DEMO_BRANDING.quotesEmail,
          primaryColor: colors["primary_hex"] || DEMO_BRANDING.primaryColor,
          primaryOklch: colors["primary_oklch"] || DEMO_BRANDING.primaryOklch,
          logoUrl: (profileData?.["logoUrl"] as string) || (brand?.["logoUrl"] as string) || undefined,
          services: rawServices.map(s => ({
            name: s.name,
            slug: s.slug || s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          })),
        })
      } catch {
        // Keep defaults on failure
      }
    }

    load()
  }, [initial])

  return <BrandingContext value={branding}>{children}</BrandingContext>
}
