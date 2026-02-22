import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check, Bath } from "lucide-react"
import { getBranding } from "@/lib/branding"

export async function generateMetadata() {
  const branding = await getBranding()
  return {
    title: "Bathroom Renovation",
    description: `Create your dream bathroom with ${branding.name}. Showers, tubs, vanities, and complete bathroom remodels in ${branding.city}, ${branding.province}.`,
  }
}

const features = [
  "Custom shower design and installation",
  "Bathtub replacement and refinishing",
  "Vanity and cabinet installation",
  "Tile work (floor, walls, shower)",
  "Plumbing fixture upgrades",
  "Heated floor installation",
  "Lighting and ventilation",
  "Accessibility modifications",
  "Glass shower enclosures",
  "Storage solutions",
]

const packages = [
  {
    name: "Fixture Refresh",
    starting: "5,000",
    description: "New fixtures, faucets, and accessories",
  },
  {
    name: "Bathroom Update",
    starting: "15,000",
    description: "New vanity, tile, and shower updates",
  },
  {
    name: "Complete Remodel",
    starting: "30,000",
    description: "Full bathroom transformation with custom design",
  },
]

export default function BathroomPage() {
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
          <li className="text-foreground">Bathroom</li>
        </ol>
      </nav>

      {/* Hero Section */}
      <section className="border-b border-border bg-muted/30 px-4 py-12 md:py-16">
        <div className="container mx-auto">
          <div className="flex items-center justify-center gap-3 md:justify-start">
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
              <Bath className="size-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Bathroom Renovation
            </h1>
          </div>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground md:mt-6">
            You don&apos;t have to stay in a fancy hotel to enjoy a beautiful
            bathroom. We can transform this functional space into something
            much more. Choose the perfect toilet, tub or shower stall, vanity,
            tile, lighting, and paint colour, and we&apos;ll create the bathroom
            you&apos;ve always wanted.
          </p>
        </div>
      </section>

      {/* Gallery */}
      <section className="px-4 py-8">
        <div className="container mx-auto">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg sm:col-span-2 sm:row-span-2 sm:aspect-auto">
              <Image
                src="/images/demo/bathroom-spa.png"
                alt="Luxurious spa-inspired master bathroom with frameless glass shower and freestanding tub"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 66vw"
              />
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
              <Image
                src="/images/demo/bathroom-accessible.png"
                alt="Modern accessible barrier-free bathroom with curbless shower"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
              <Image
                src="/images/demo/bathroom-tub.png"
                alt="Elegant bathroom with matte white freestanding oval tub"
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
            Our bathroom renovation services cover everything from simple
            updates to luxury transformations.
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
            Ready to Transform Your Bathroom?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Use our AI visualizer to see your new bathroom before construction
            begins, or get an instant quote to understand your investment.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="h-12 w-full px-8 sm:w-auto">
              <Link href="/estimate?service=bathroom">
                Get Bathroom Quote
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 w-full px-8 sm:w-auto"
            >
              <Link href="/visualizer">Try Bathroom Visualizer</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
