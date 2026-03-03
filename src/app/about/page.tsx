import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Shield,
  Heart,
  Target,
  MapPin,
  Award,
  CheckCircle,
  FileText,
  Clock,
} from "lucide-react"
import { getBranding } from "@/lib/branding"
import { getCompanyConfig } from "@/lib/ai/knowledge/company"
import { getCopyContext } from "@/lib/copy/server"
import { getAboutCTA } from "@/lib/copy/site-copy"

export async function generateMetadata() {
  const branding = await getBranding()
  return {
    title: "About Us",
    description: `Learn about ${branding.name} — ${branding.city}, ${branding.province}'s trusted renovation contractor. Quality craftsmanship for residential and commercial projects.`,
  }
}

export default async function AboutPage() {
  const config = await getCompanyConfig()
  const branding = await getBranding()
  const aboutCta = getAboutCTA(await getCopyContext())
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
          <li className="text-foreground">About</li>
        </ol>
      </nav>

      {/* Hero Section */}
      <section className="border-b border-border bg-muted/30 px-4 py-12 md:py-16">
        <div className="container mx-auto">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {config.heroHeadline || `About ${branding.name}`}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {branding.name} transforms homes in {branding.city}, {branding.province}
              {" "}with quality craftsmanship and modern building techniques.
              Taking care of our clients is what we do best.
            </p>
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="px-4 py-12 md:py-16">
        <div className="container mx-auto">
          <div className={`grid gap-8 ${config.aboutImageUrl || config.heroImageUrl ? 'md:grid-cols-2' : ''} md:items-center`}>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                What We Do
              </h2>
              <div className="mt-4 space-y-4 text-muted-foreground">
                {config.aboutCopy.length > 0 ? (
                  config.aboutCopy.map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))
                ) : (
                  <>
                    <p>
                      Founded in {config.founded} by {config.principals}, {branding.name}
                      {" "}has quickly become one of {branding.city}&apos;s most trusted renovation
                      contractors. Our past projects include both commercial and
                      residential spaces.
                    </p>
                    <p>
                      We offer an end-to-end client experience that includes
                      seamless communication, budgeting, on-site organization, and
                      solid, quality handiwork every time. From the design phase to
                      the last touch-ups, we&apos;ll be there working hard to finish on
                      time and on budget.
                    </p>
                  </>
                )}
              </div>
            </div>
            {(config.aboutImageUrl || config.heroImageUrl) && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
              <Image
                src={config.aboutImageUrl || config.heroImageUrl}
                alt={`${branding.name} renovation work`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            )}
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      {config.mission && (
        <section className="border-y border-border bg-primary px-4 py-12 md:py-16">
          <div className="container mx-auto text-center">
            <h2 className="text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl">
              Our Mission
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/90">
              {config.mission}
            </p>
          </div>
        </section>
      )}

      {/* Our Values */}
      {config.values.length > 0 && (
        <section className="px-4 py-12 md:py-16">
          <div className="container mx-auto">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Our Values
              </h2>
              <p className="mt-2 text-muted-foreground">
                The principles that guide every project we undertake.
              </p>
            </div>

            {(() => {
              const iconMap: Record<string, typeof Heart> = {
                heart: Heart, target: Target, shield: Shield,
                award: Award, clock: Clock, check: CheckCircle,
              };

              return (
                <div className="mt-10 grid gap-8 md:grid-cols-3">
                  {config.values.map((value) => {
                    const Icon = iconMap[value.iconHint?.toLowerCase() || ''] || Heart;
                    return (
                      <div key={value.title} className="text-center">
                        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Icon className="size-6" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-foreground">
                          {value.title}
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {value.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* Certifications */}
      {config.certifications.length > 0 && (
      <section className="border-y border-border bg-muted/30 px-4 py-12 md:py-16">
        <div className="container mx-auto">
          <div className="mx-auto max-w-2xl text-center">
            <div className="flex items-center justify-center gap-3">
              <Award className="size-6 text-primary" />
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Certifications & Memberships
              </h2>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {config.certifications.map((cert) => (
                <span
                  key={cert}
                  className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
                >
                  {cert}
                </span>
              ))}
            </div>

            {/* RenoMark Guarantee Details — only shown for RenoMark members */}
            {config.certifications.some(c => /renomark/i.test(c)) && (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-left max-w-4xl mx-auto">
              <div className="flex gap-3 rounded-lg border border-border p-4">
                <Shield className="size-5 shrink-0 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Minimum 2-Year Warranty</p>
                  <p className="text-xs text-muted-foreground">All RenoMark members guarantee a minimum 2-year warranty on workmanship</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg border border-border p-4">
                <Award className="size-5 shrink-0 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">$2M Liability Insurance</p>
                  <p className="text-xs text-muted-foreground">Full $2 million liability insurance coverage for your peace of mind</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg border border-border p-4">
                <CheckCircle className="size-5 shrink-0 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Code of Conduct</p>
                  <p className="text-xs text-muted-foreground">Strict adherence to RenoMark&apos;s professional Code of Conduct</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg border border-border p-4">
                <FileText className="size-5 shrink-0 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Written Contracts</p>
                  <p className="text-xs text-muted-foreground">Detailed written contracts required on every project — no surprises</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg border border-border p-4 sm:col-span-2 lg:col-span-1">
                <Clock className="size-5 shrink-0 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">2-Day Response</p>
                  <p className="text-xs text-muted-foreground">RenoMark commitment to respond within 2 business days</p>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </section>
      )}

      {/* Team Section — only shown when there is real team data */}
      {(config.teamMembers.length > 0 || config.principals) && <section className="px-4 py-12 md:py-16">
        <div className="container mx-auto">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Meet the Team
            </h2>
            <p className="mt-2 text-muted-foreground">
              The team dedicated to your project&apos;s success.
            </p>
          </div>

          {(() => {
            const members = config.teamMembers.length > 0
              ? config.teamMembers
              : [{ name: config.principals, role: 'Principals', photoUrl: '' }];

            function getInitials(name: string): string {
              if (!name) return '?';
              const parts = name.trim().split(/\s+/).filter(Boolean);
              const first = parts[0];
              const last = parts[parts.length - 1];
              if (!first) return '?';
              if (parts.length === 1) return first[0]?.toUpperCase() ?? '?';
              return ((first[0] ?? '') + (last?.[0] ?? '')).toUpperCase();
            }

            return (
              <div className={`mt-10 grid gap-6 ${members.length === 1 ? 'max-w-sm' : members.length <= 2 ? 'sm:grid-cols-2 max-w-2xl' : 'sm:grid-cols-2 lg:grid-cols-3 max-w-4xl'} mx-auto`}>
                {members.map((member, i) => (
                  <Card key={i}>
                    <CardContent className="p-6 text-center">
                      <div className="relative mx-auto size-24 overflow-hidden rounded-full">
                        {member.photoUrl ? (
                          <Image
                            src={member.photoUrl}
                            alt={member.name}
                            fill
                            className="object-cover"
                            sizes="96px"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center bg-primary text-primary-foreground">
                            <span className="text-2xl font-bold">{getInitials(member.name)}</span>
                          </div>
                        )}
                      </div>
                      <p className="mt-4 font-semibold text-foreground">
                        {member.name}
                      </p>
                      <p className="text-sm text-primary">{member.role}</p>
                      {member.bio && (
                        <p className="mt-2 text-xs text-muted-foreground">{member.bio}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}
        </div>
      </section>}

      {/* Service Area */}
      <section className="border-t border-border bg-muted/30 px-4 py-12 md:py-16">
        <div className="container mx-auto">
          <div className="max-w-2xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3">
              <MapPin className="size-6 text-primary" />
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Service Area
              </h2>
            </div>
            <p className="mt-4 text-muted-foreground">
              We proudly serve homeowners and businesses throughout {config.serviceArea}.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-12 md:py-16">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {aboutCta.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            {aboutCta.description}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="h-12 w-full px-8 sm:w-auto">
              <Link href={aboutCta.primary.href}>{aboutCta.primary.label}</Link>
            </Button>
            {aboutCta.secondary && (
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 w-full px-8 sm:w-auto"
              >
                <Link href={aboutCta.secondary.href}>{aboutCta.secondary.label}</Link>
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
