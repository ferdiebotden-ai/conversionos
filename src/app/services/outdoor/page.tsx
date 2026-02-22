import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check, TreeDeciduous } from "lucide-react"
import { getBranding } from "@/lib/branding"

export async function generateMetadata() {
  const branding = await getBranding()
  return {
    title: "Outdoor Renovation",
    description: `Transform your outdoor living space with ${branding.name}. Decks, fences, porches, driveways, and exterior painting in ${branding.city}, ${branding.province}.`,
  }
}

const features = [
  "Deck building and repair",
  "Fence installation and repair",
  "Porch repair and rebuilding",
  "Concrete sidewalk repair",
  "Driveway repair and replacement",
  "Exterior painting",
  "Curb appeal improvements",
  "Outdoor living spaces",
]

const packages = [
  {
    name: "Repair & Refresh",
    starting: "2,500",
    description: "Deck/fence repairs, painting, minor fixes",
  },
  {
    name: "New Build",
    starting: "8,000",
    description: "New deck, fence, or porch construction",
  },
  {
    name: "Complete Exterior",
    starting: "15,000",
    description: "Multiple outdoor projects and improvements",
  },
]

export default function OutdoorPage() {
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
          <li className="text-foreground">Outdoor</li>
        </ol>
      </nav>

      {/* Hero Section */}
      <section className="border-b border-border bg-muted/30 px-4 py-12 md:py-16">
        <div className="container mx-auto">
          <div className="flex items-center justify-center gap-3 md:justify-start">
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
              <TreeDeciduous className="size-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Outdoor Renovation
            </h1>
          </div>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground md:mt-6">
            We don&apos;t only renovate the inside of your home. We can transform
            your outdoor living space as well. Increase your home&apos;s curb
            appeal and create your own personal getaway right outside your door.
          </p>
        </div>
      </section>

      {/* Gallery */}
      <section className="px-4 py-8">
        <div className="container mx-auto">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
              <Image
                src="/images/demo/outdoor-deck.png"
                alt="Beautiful backyard composite deck with outdoor kitchen and pergola"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
              <Image
                src="/images/demo/outdoor-patio.png"
                alt="Professionally landscaped backyard stone patio with fire pit"
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
            What We Do
          </h2>
          <p className="mt-2 text-muted-foreground">
            From deck building to driveway repair, we handle all your outdoor
            renovation needs.
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

      {/* Service Details */}
      <section className="border-t border-border bg-muted/30 px-4 py-12 md:py-16">
        <div className="container mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Our Outdoor Services
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground">
                  Decks & Porches
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Whether you want to add a new deck or repair your existing one,
                  we&apos;ve got you covered. Does your porch need repair — or maybe
                  a complete rebuild? We can help with that too.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground">
                  Fences
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Are your fences in need of help? We handle fence installation
                  and repairs to give your property the privacy and security it
                  deserves.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground">
                  Concrete Work
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Has your concrete sidewalk or driveway seen better days? We can
                  fix that. Restore your home&apos;s curb appeal with professional
                  concrete repair and replacement.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground">
                  Exterior Painting
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  A fresh coat of paint can transform your home&apos;s exterior.
                  We handle all exterior painting projects to protect and
                  beautify your property.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Packages */}
      <section className="px-4 py-12 md:py-16">
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
            * Prices vary based on scope, materials, and project complexity. Get
            a personalized quote for your specific project.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border bg-muted/30 px-4 py-12 md:py-16">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Ready to Transform Your Outdoor Space?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Get an instant quote to understand your investment, or contact us
            to discuss your outdoor renovation needs.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="h-12 w-full px-8 sm:w-auto">
              <Link href="/estimate?service=outdoor">
                Get Outdoor Quote
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 w-full px-8 sm:w-auto"
            >
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
