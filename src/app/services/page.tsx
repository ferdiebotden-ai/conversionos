import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ServicesGridServer } from "@/components/services-grid-server"
import { getBranding } from "@/lib/branding"
import { getCopyContext } from "@/lib/copy/server"
import { getServicesCTA } from "@/lib/copy/site-copy"

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding()
  return {
    title: "Our Services",
    description: `Professional renovation services in ${branding.city}, ${branding.province}. Kitchen, bathroom, basement, and flooring renovations with expert craftsmanship.`,
  }
}

export default async function ServicesPage() {
  const branding = await getBranding()
  const cta = getServicesCTA(await getCopyContext())
  return (
    <div className="flex flex-col">
      {/* Breadcrumb */}
      <nav className="container mx-auto px-4 py-4">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
          </li>
          <li>/</li>
          <li className="text-foreground">Services</li>
        </ol>
      </nav>

      {/* Hero Section */}
      <section className="border-b border-border bg-muted/30 px-4 py-12 md:py-16">
        <div className="container mx-auto">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Our Renovation Services
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              From complete kitchen remodels to basement finishing, we provide
              comprehensive renovation services for homeowners in {branding.city}, {branding.province}{" "}
              and surrounding areas.
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="px-4 py-12 md:py-16">
        <div className="container mx-auto">
          <ServicesGridServer />
        </div>
      </section>

      {/* Why Choose Us for Services */}
      <section className="border-t border-border bg-muted/30 px-4 py-12 md:py-16">
        <div className="container mx-auto">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center md:text-left">
              <h3 className="text-lg font-semibold text-foreground">
                Free Consultations
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Every project starts with a free, no-obligation consultation.
                We&apos;ll discuss your vision and provide honest pricing.
              </p>
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-lg font-semibold text-foreground">
                Transparent Pricing
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                No hidden fees or surprise charges. Our detailed quotes include
                materials, labor, and all associated costs.
              </p>
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-lg font-semibold text-foreground">
                Quality Materials
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                We source materials from trusted Canadian suppliers, ensuring
                durability and lasting value for your investment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-12 md:py-16">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {cta.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            {cta.description}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="h-12 w-full px-8 sm:w-auto">
              <Link href={cta.primary.href}>{cta.primary.label}</Link>
            </Button>
            {cta.secondary && (
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 w-full px-8 sm:w-auto"
              >
                <Link href={cta.secondary.href}>{cta.secondary.label}</Link>
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
