import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ServicesGrid } from "@/components/services-grid"
import { Testimonials } from "@/components/testimonials"
import {
  FadeInUp,
  StaggerContainer,
  StaggerItem,
} from "@/components/motion"
import {
  MessageSquare,
  Sparkles,
  Clock,
  Shield,
  Award,
  Users,
  ClipboardList,
  FileCheck,
  Hammer,
  CheckCircle,
} from "lucide-react"
import { getBranding } from "@/lib/branding"
import { getCompanyConfig } from "@/lib/ai/knowledge/company"

export default async function Home() {
  const branding = await getBranding()
  const config = await getCompanyConfig()

  // Map testimonials for the component
  const testimonials = config.testimonials.map((t, i) => ({
    id: i + 1,
    quote: t.quote,
    author: t.author,
    projectType: t.projectType,
    rating: 5,
    image: `/images/demo/${['kitchen-modern', 'bathroom-spa', 'basement-entertainment'][i % 3]}.png`,
  }))
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="relative h-[500px] md:h-[600px] lg:h-[650px]">
          <Image
            src="/images/demo/hero-kitchen.png"
            alt="Stunning modern kitchen renovation with white cabinetry and waterfall quartz island"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 flex h-full items-center">
            <div className="container mx-auto px-4">
              <StaggerContainer className="mx-auto max-w-3xl text-center">
                <StaggerItem>
                  <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                    Dream. Plan.{" "}
                    <span className="text-primary">Build.</span>
                  </h1>
                </StaggerItem>
                <StaggerItem>
                  <p className="mt-6 text-lg leading-8 text-white/85 md:text-xl">
                    With a focus on quality craftsmanship and integrity, {branding.name}
                    {" "}provides superior construction and renovation services in {branding.city}, {branding.province}
                    {" "}and surrounding areas, dedicated to bringing your dream projects to fruition.
                  </p>
                </StaggerItem>
                <StaggerItem>
                  <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <Button asChild size="lg" className="h-14 w-full px-8 text-lg sm:w-auto">
                      <Link href="/estimate">Get a Free Quote</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="h-14 w-full border-white/30 bg-transparent px-8 text-lg text-white hover:bg-white/10 sm:w-auto"
                    >
                      <Link href="/visualizer">Visualize Your Space</Link>
                    </Button>
                  </div>
                </StaggerItem>
                <StaggerItem>
                  {/* Trust Indicators */}
                  <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-white/80">
                    <div className="flex items-center gap-2">
                      <Award className="size-5 text-primary" />
                      <span>RenoMark Certified</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="size-5 text-primary" />
                      <span>13 Service Categories</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="size-5 text-primary" />
                      <span>NetZero Home Certified</span>
                    </div>
                  </div>
                </StaggerItem>
              </StaggerContainer>
            </div>
          </div>
        </div>
      </section>

      {/* AI Features Section */}
      <section className="border-y border-border bg-muted/30 px-4 py-16 md:py-20">
        <div className="container mx-auto">
          <FadeInUp className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              AI-Powered Renovation Experience
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Get instant estimates and visualize your renovation before the
              first hammer swings.
            </p>
          </FadeInUp>

          <StaggerContainer className="mt-12 grid gap-6 md:grid-cols-2 lg:gap-8">
            <StaggerItem>
              <Card className="relative h-full overflow-hidden border-2 border-transparent transition-colors hover:border-primary/20">
                <CardContent className="p-6 md:p-8">
                  <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                    <MessageSquare className="size-6 text-primary" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-foreground">
                    Get Instant Estimates
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    Chat with our AI assistant to describe your project. Get
                    ballpark estimates in minutes instead of waiting days for a
                    callback.
                  </p>
                  <Button asChild variant="link" className="mt-4 h-auto p-0">
                    <Link href="/estimate">Start a conversation →</Link>
                  </Button>
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card className="relative h-full overflow-hidden border-2 border-transparent transition-colors hover:border-primary/20">
                <CardContent className="p-6 md:p-8">
                  <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                    <Sparkles className="size-6 text-primary" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-foreground">
                    See Your Renovation First
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    Upload a photo of your space and watch AI transform it with
                    your chosen finishes and fixtures. Make confident decisions.
                  </p>
                  <Button asChild variant="link" className="mt-4 h-auto p-0">
                    <Link href="/visualizer">Try the visualizer →</Link>
                  </Button>
                </CardContent>
              </Card>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      {/* Services Section */}
      <section className="px-4 py-16 md:py-20">
        <div className="container mx-auto">
          <FadeInUp className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Our Services
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From kitchens to net-zero homes, {branding.name} handles every aspect
              of your renovation with expertise and care.
            </p>
          </FadeInUp>

          <div className="mt-12">
            <ServicesGrid />
          </div>

          <FadeInUp className="mt-10 text-center">
            <Button asChild variant="outline" size="lg">
              <Link href="/services">View All Services</Link>
            </Button>
          </FadeInUp>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="border-t border-border bg-muted/30 px-4 py-16 md:py-20">
        <div className="container mx-auto">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <FadeInUp>
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
                <Image
                  src="/images/demo/craftsmanship-detail.png"
                  alt="Expert renovation craftsmanship showing perfectly mitered crown molding"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </FadeInUp>
            <div>
              <FadeInUp>
                <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Why Choose {branding.name}?
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  We combine traditional craftsmanship with modern technology to
                  deliver exceptional results.
                </p>
              </FadeInUp>

              <StaggerContainer className="mt-8 space-y-6">
                <StaggerItem>
                  <WhyUsCard
                    icon={<Award className="size-6" />}
                    title="RenoMark Certified"
                    description="Minimum 2-year warranty on all work, $2M liability insurance, and strict Code of Conduct compliance."
                  />
                </StaggerItem>
                <StaggerItem>
                  <WhyUsCard
                    icon={<Shield className="size-6" />}
                    title="Quality Guaranteed"
                    description="Written contracts required on every project. Code of Conduct compliance ensures your renovation meets the highest standards."
                  />
                </StaggerItem>
                <StaggerItem>
                  <WhyUsCard
                    icon={<Clock className="size-6" />}
                    title="2-Day Response Time"
                    description="RenoMark's 2-business-day response commitment means you'll never be left waiting. Quick answers, clear communication."
                  />
                </StaggerItem>
              </StaggerContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Our Process Section */}
      <section className="px-4 py-16 md:py-20">
        <div className="container mx-auto">
          <FadeInUp className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Our Process
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From first conversation to final walkthrough, we keep things clear
              and organized.
            </p>
          </FadeInUp>

          <StaggerContainer className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <StaggerItem>
              <ProcessStep
                step={1}
                icon={<ClipboardList className="size-6" />}
                title="Design Consultation"
                description="Collaborate with experts to refine your vision"
              />
            </StaggerItem>
            <StaggerItem>
              <ProcessStep
                step={2}
                icon={<FileCheck className="size-6" />}
                title="Planning & Approval"
                description="Finalize detailed plans and obtain necessary permits"
              />
            </StaggerItem>
            <StaggerItem>
              <ProcessStep
                step={3}
                icon={<Hammer className="size-6" />}
                title="Construction Phase"
                description="Skilled crew executes with precision and quality materials"
              />
            </StaggerItem>
            <StaggerItem>
              <ProcessStep
                step={4}
                icon={<CheckCircle className="size-6" />}
                title="Final Inspection"
                description="Review completed project for quality assurance"
              />
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="border-t border-border bg-muted/30 px-4 py-16 md:py-20">
        <div className="container mx-auto">
          <FadeInUp className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              What Our Clients Say
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Don&apos;t just take our word for it. Here&apos;s what local
              homeowners have to say.
            </p>
          </FadeInUp>

          <div className="mt-12">
            <Testimonials items={testimonials} />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border bg-primary px-4 py-16 md:py-20">
        <FadeInUp className="container mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
            Ready to Transform Your Home?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
            Get started with a free estimate today. No pressure, no obligation —
            just honest advice and transparent pricing.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="h-14 w-full px-8 text-lg sm:w-auto"
            >
              <Link href="/estimate">Get Your Free Quote</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 w-full border-primary-foreground/20 bg-transparent px-8 text-lg text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto"
            >
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </FadeInUp>
      </section>
    </div>
  )
}

function ProcessStep({
  step,
  icon,
  title,
  description,
}: {
  step: number
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-primary">
        Step {step}
      </div>
      <h3 className="mt-2 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function WhyUsCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex gap-4">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
