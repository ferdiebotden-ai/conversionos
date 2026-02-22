import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check, Sofa } from "lucide-react"
import { getBranding } from "@/lib/branding"

export async function generateMetadata() {
  const branding = await getBranding()
  return {
    title: "Basement Finishing",
    description: `Unlock your basement's potential with ${branding.name}. Family rooms, home offices, rental suites, and complete basement finishing in ${branding.city}, ${branding.province}.`,
  }
}

const features = [
  "Custom layout and design planning",
  "Framing and drywall installation",
  "Electrical and lighting systems",
  "Plumbing for bathrooms and wet bars",
  "HVAC extension and ductwork",
  "Flooring installation",
  "Ceiling finishing (drywall or drop)",
  "Egress window installation",
  "Bathroom additions",
  "Soundproofing solutions",
]

const packages = [
  {
    name: "Basic Finish",
    starting: "25,000",
    description: "Framing, drywall, flooring, and lighting",
  },
  {
    name: "Family Space",
    starting: "40,000",
    description: "Complete living space with bathroom",
  },
  {
    name: "Rental Suite",
    starting: "60,000",
    description: "Full apartment with kitchen and separate entrance",
  },
]

export default function BasementPage() {
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
          <li className="text-foreground">Basement</li>
        </ol>
      </nav>

      {/* Hero Section */}
      <section className="border-b border-border bg-muted/30 px-4 py-12 md:py-16">
        <div className="container mx-auto">
          <div className="flex items-center justify-center gap-3 md:justify-start">
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
              <Sofa className="size-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Basement Finishing
            </h1>
          </div>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground md:mt-6">
            You may not spend a lot of time in your basement, but that may
            change after we complete your renovation. We do plumbing and
            electrical. We install vents, insulation, and drywall. And we paint.
            Add your decorating style to our renovations and transform your
            perspective on an entire floor of your home.
          </p>
        </div>
      </section>

      {/* Gallery */}
      <section className="px-4 py-8">
        <div className="container mx-auto">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
              <Image
                src="/images/demo/basement-entertainment.png"
                alt="Fully finished basement entertainment room with sectional sofa and wall-mounted TV"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
              <Image
                src="/images/demo/basement-walkout.png"
                alt="Modern walkout basement apartment with sliding glass patio door"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
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
            Our basement finishing services cover everything from basic
            finishing to complete rental suite development.
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
            * Prices vary based on square footage, scope, and design complexity.
            Get a personalized quote for your specific project.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-12 md:py-16">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Ready to Finish Your Basement?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Use our AI visualizer to see your finished basement before
            construction begins, or get an instant quote to understand your
            investment.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="h-12 w-full px-8 sm:w-auto">
              <Link href="/estimate?service=basement">
                Get Basement Quote
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 w-full px-8 sm:w-auto"
            >
              <Link href="/visualizer">Try Basement Visualizer</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
