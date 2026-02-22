import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check, ChefHat } from "lucide-react"
import { getBranding } from "@/lib/branding"

export async function generateMetadata() {
  const branding = await getBranding()
  return {
    title: "Kitchen Renovation",
    description: `Transform your kitchen with ${branding.name}. Custom cabinets, countertops, appliance installation, and complete kitchen remodels in ${branding.city}, ${branding.province}.`,
  }
}

const features = [
  "Custom cabinet design and installation",
  "Countertop replacement (granite, quartz, marble)",
  "Appliance installation and integration",
  "Kitchen island design and build",
  "Lighting and electrical upgrades",
  "Plumbing fixture replacement",
  "Flooring installation",
  "Backsplash tile work",
  "Pantry organization systems",
  "Open concept conversions",
]

const packages = [
  {
    name: "Cabinet Refresh",
    starting: "8,000",
    description: "Cabinet refacing and hardware replacement",
  },
  {
    name: "Kitchen Update",
    starting: "25,000",
    description: "New countertops, backsplash, and fixtures",
  },
  {
    name: "Complete Remodel",
    starting: "45,000",
    description: "Full kitchen transformation with custom design",
  },
]

export default function KitchenPage() {
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
          <li>
            <Link href="/services" className="hover:text-foreground">
              Services
            </Link>
          </li>
          <li>/</li>
          <li className="text-foreground">Kitchen</li>
        </ol>
      </nav>

      {/* Hero Section */}
      <section className="border-b border-border bg-muted/30 px-4 py-12 md:py-16">
        <div className="container mx-auto">
          <div className="flex items-center justify-center gap-3 md:justify-start">
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
              <ChefHat className="size-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Kitchen Renovation
            </h1>
          </div>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground md:mt-6">
            The kitchen. For many, the heart of their home. A place to gather,
            to visit, to unwind — and, of course, to prepare and eat your
            favourite meals. Let us make your kitchen the place to be.
          </p>
        </div>
      </section>

      {/* Gallery */}
      <section className="px-4 py-8">
        <div className="container mx-auto">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg sm:col-span-2 sm:row-span-2 sm:aspect-auto">
              <Image
                src="/images/demo/kitchen-modern.png"
                alt="Modern renovated kitchen with flat-panel white cabinets and waterfall island"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 66vw"
              />
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
              <Image
                src="/images/demo/kitchen-farmhouse.png"
                alt="Charming farmhouse kitchen with two-tone cabinetry and Edison bulb pendants"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
              <Image
                src="/images/demo/kitchen-detail.png"
                alt="Close-up of veined quartz countertop with brushed gold faucet"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="px-4 py-12">
        <div className="container mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            What&apos;s Included
          </h2>
          <p className="mt-2 text-muted-foreground">
            Our kitchen renovation services cover everything from minor updates
            to complete remodels.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Check className="size-3.5 text-primary" />
                </div>
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Packages */}
      <section className="border-t border-border bg-muted/30 px-4 py-12 md:py-16">
        <div className="container mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Pricing Guide
          </h2>
          <p className="mt-2 text-muted-foreground">
            Every project is unique. These starting prices give you a general
            idea of investment levels.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {packages.map((pkg) => (
              <Card key={pkg.name}>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground">
                    {pkg.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {pkg.description}
                  </p>
                  <p className="mt-4">
                    <span className="text-sm text-muted-foreground">
                      Starting from
                    </span>
                    <br />
                    <span className="text-2xl font-bold text-foreground">
                      ${pkg.starting}
                    </span>
                    <span className="text-sm text-muted-foreground"> + HST</span>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            * Prices vary based on scope, materials, and design complexity. Get
            a personalized quote for your specific project.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-12 md:py-16">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Ready to Transform Your Kitchen?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Use our AI visualizer to see your new kitchen before construction
            begins, or get an instant quote to understand your investment.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="h-12 w-full px-8 sm:w-auto">
              <Link href="/estimate?service=kitchen">
                Get Kitchen Quote
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 w-full px-8 sm:w-auto"
            >
              <Link href="/visualizer">Try Kitchen Visualizer</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
