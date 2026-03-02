export const revalidate = 3600

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ServicesGrid, type ServiceItem } from "@/components/services-grid"
import { Testimonials } from "@/components/testimonials"
import {
  FadeInUp,
  StaggerContainer,
  StaggerItem,
} from "@/components/motion"
import {
  Award,
  Clock,
  Shield,
  MapPin,
  Sparkles,
  Phone,
} from "lucide-react"
import { getBranding } from "@/lib/branding"
import { getCompanyConfig } from "@/lib/ai/knowledge/company"
import { AuroraBackground } from "@/components/home/aurora-background"
import { VisualizerTeaser } from "@/components/home/visualizer-teaser"
import { SocialProofBar } from "@/components/home/social-proof-bar"
import { getCopyContext } from "@/lib/copy/server"
import {
  getHowItWorksSubtitle,
  getDefaultProcessStep3,
  getHomepageFinalCTA,
} from "@/lib/copy/site-copy"

export default async function Home() {
  const branding = await getBranding()
  const config = await getCompanyConfig()
  const copyCtx = await getCopyContext()
  const step3 = getDefaultProcessStep3(copyCtx, branding.name)
  const finalCTA = getHomepageFinalCTA(copyCtx)

  // Map testimonials for the component
  const testimonials = config.testimonials.map((t, i) => ({
    id: i + 1,
    quote: t.quote,
    author: t.author,
    projectType: t.projectType,
    rating: 5,
  }))

  // Map trust badge icon hints to components
  const badgeIcons: Record<string, React.ReactNode> = {
    'map-pin': <MapPin className="size-5 text-primary" />,
    'sparkles': <Sparkles className="size-5 text-primary" />,
    'shield': <Shield className="size-5 text-primary" />,
    'award': <Award className="size-5 text-primary" />,
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="relative h-[500px] md:h-[600px] lg:h-[650px]">
          {config.heroImageUrl ? (
            <Image
              src={config.heroImageUrl}
              alt={`${branding.name} — ${config.heroHeadline || branding.tagline}`}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
          ) : (
            <AuroraBackground />
          )}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 70%, rgba(0,0,0,0.15) 100%)',
            }}
          />
          <div className="relative z-10 flex h-full items-center">
            <div className="container mx-auto px-4">
              <StaggerContainer className="mx-auto max-w-3xl text-center">
                <StaggerItem>
                  <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                    {config.heroHeadline || (
                      <>Dream. Plan. <span className="text-primary">Build.</span></>
                    )}
                  </h1>
                </StaggerItem>
                <StaggerItem>
                  <p className="mt-6 text-lg leading-8 text-white/85 md:text-xl">
                    {config.heroSubheadline || `With a focus on quality craftsmanship and integrity, ${branding.name} provides superior construction and renovation services in ${branding.city}, ${branding.province} and surrounding areas.`}
                  </p>
                </StaggerItem>
                <StaggerItem>
                  <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <Button asChild size="lg" className="h-14 w-full rounded-full px-8 text-lg sm:w-auto">
                      <Link href="/visualizer">Visualise Your Dream Space</Link>
                    </Button>
                    <a
                      href={`tel:${branding.phone.replace(/\D/g, '')}`}
                      className="flex items-center gap-2 text-white/80 transition-colors hover:text-white"
                    >
                      <Phone className="size-4" />
                      <span className="text-base">{branding.phone}</span>
                    </a>
                  </div>
                </StaggerItem>
                {(() => {
                  const badges = config.trustBadges.length > 0
                    ? config.trustBadges
                    : config.certifications.map(c => ({ label: c, iconHint: 'award' }));
                  if (badges.length === 0) return null;
                  return (
                    <StaggerItem>
                      <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-white/80">
                        {badges.slice(0, 3).map((badge, i) => (
                          <div key={i} className="flex items-center gap-2">
                            {badgeIcons[badge.iconHint] || <Award className="size-5 text-primary" />}
                            <span>{badge.label}</span>
                          </div>
                        ))}
                      </div>
                    </StaggerItem>
                  );
                })()}
              </StaggerContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <SocialProofBar metrics={config.trustMetrics} />

      {/* Visualizer Teaser */}
      <section className="px-4 py-10 md:py-20">
        <div className="container mx-auto">
          <FadeInUp>
            <VisualizerTeaser portfolioImages={config.portfolio} />
          </FadeInUp>
        </div>
      </section>

      {/* Services Section */}
      {config.services.length > 0 && (
        <section className="border-t border-border px-4 py-10 md:py-20">
          <div className="container mx-auto">
            <FadeInUp className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Our Services
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                From kitchens to whole-home transformations, {branding.name} handles every aspect
                of your renovation with AI-powered precision.
              </p>
            </FadeInUp>

            <div className="mt-12">
              <ServicesGrid services={config.services as ServiceItem[]} />
            </div>

            <FadeInUp className="mt-10 text-center">
              <Button asChild variant="outline" size="lg" className="rounded-full">
                <Link href="/services">View All Services</Link>
              </Button>
            </FadeInUp>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="border-t border-border bg-muted/30 px-4 py-10 md:py-20">
        <div className="container mx-auto">
          <FadeInUp className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {getHowItWorksSubtitle(copyCtx)}
            </p>
          </FadeInUp>

          {(() => {
            const dbSteps = config.processSteps.length > 0 ? config.processSteps : [
              { title: 'Upload a Photo', description: 'Snap a picture of your room with your phone or upload an existing photo.' },
              { title: 'Get AI Design Concepts', description: 'Choose a style and receive four unique AI-generated visualizations.' },
              { title: '', description: '' },
            ];
            // Always override step 3 with copy registry — it's inherently
            // about the next action (estimate vs contact) so it must adapt to quoteMode
            const steps = dbSteps.map((s, i) => i === dbSteps.length - 1 ? step3 : s);
            return (
              <StaggerContainer className="mt-12 grid gap-8 sm:grid-cols-3">
                {steps.map((step, i) => (
                  <StaggerItem key={i}>
                    <ProcessStep
                      step={i + 1}
                      title={step.title}
                      description={step.description}
                    />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            );
          })()}
        </div>
      </section>

      {/* Why Choose Us */}
      {config.whyChooseUs.length > 0 && (
        <section className="border-t border-border px-4 py-10 md:py-20">
          <div className="container mx-auto">
            <div className={`grid gap-12 ${config.aboutImageUrl || config.heroImageUrl ? 'md:grid-cols-2' : ''} md:items-center`}>
              {(config.aboutImageUrl || config.heroImageUrl) && (
              <FadeInUp>
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                  <Image
                    src={config.aboutImageUrl || config.heroImageUrl}
                    alt={`${branding.name} expert craftsmanship`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </FadeInUp>
              )}
              <div>
                <FadeInUp>
                  <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    Why Choose {branding.name}?
                  </h2>
                  <p className="mt-4 text-lg text-muted-foreground">
                    We combine AI technology with real Ontario renovation data to
                    deliver exceptional results.
                  </p>
                </FadeInUp>

                {(() => {
                  const icons = [
                    <Award key="0" className="size-6" />,
                    <Shield key="1" className="size-6" />,
                    <Clock key="2" className="size-6" />,
                  ];
                  return (
                    <StaggerContainer className="mt-8 space-y-6">
                      {config.whyChooseUs.map((item, i) => (
                        <StaggerItem key={i}>
                          <WhyUsCard
                            icon={icons[i % icons.length]}
                            title={item.title}
                            description={item.description}
                          />
                        </StaggerItem>
                      ))}
                    </StaggerContainer>
                  );
                })()}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      {testimonials.length >= 2 && (
        <section className="border-t border-border bg-muted/30 px-4 py-10 md:py-20">
          <div className="container mx-auto">
            <FadeInUp className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                What Our Clients Say
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Real feedback from {branding.name.replace(/\.\s*$/, '')} clients across {config.serviceArea || 'Ontario'}.
              </p>
            </FadeInUp>

            <div className="mt-12">
              <Testimonials items={testimonials} />
            </div>
          </div>
        </section>
      )}

      {/* Final CTA Section */}
      <section className="border-t border-border bg-primary px-4 py-10 md:py-20">
        <FadeInUp className="container mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
            Ready to See Your Renovation?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
            {finalCTA.description}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="h-14 w-full rounded-full px-8 text-lg sm:w-auto"
            >
              <Link href="/visualizer">Try the AI Visualizer</Link>
            </Button>
            <Link
              href={finalCTA.secondaryHref}
              className="text-primary-foreground/80 underline underline-offset-4 transition-colors hover:text-primary-foreground"
            >
              {finalCTA.secondaryLabel}
            </Link>
          </div>
          <p className="mt-4">
            <Link
              href={finalCTA.chatHref}
              className="text-sm text-primary-foreground/60 underline underline-offset-4 transition-colors hover:text-primary-foreground/90"
            >
              {finalCTA.chatLabel}
            </Link>
          </p>
        </FadeInUp>
      </section>
    </div>
  )
}

function ProcessStep({
  step,
  title,
  description,
}: {
  step: number
  title: string
  description: string
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <span className="text-xl font-bold">{step}</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
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
