import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check } from "lucide-react"
import { getBranding } from "@/lib/branding"
import { getCompanyConfig } from "@/lib/ai/knowledge/company"
import { getCopyContext } from "@/lib/copy/server"
import { getServiceDetailCTA } from "@/lib/copy/site-copy"

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const config = await getCompanyConfig();
  const branding = await getBranding();
  const service = config.services.find(s => s.slug === slug);

  if (!service) return { title: 'Service Not Found' };

  return {
    title: service.name,
    description: `${service.description} Professional ${service.name.toLowerCase()} services by ${branding.name} in ${branding.city}, ${branding.province}.`,
  };
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const config = await getCompanyConfig();
  const branding = await getBranding();
  const service = config.services.find(s => s.slug === slug);

  if (!service) {
    notFound();
  }

  // Filter portfolio by service type
  const relatedProjects = config.portfolio.filter(
    p => p.serviceType.toLowerCase().includes(service.name.toLowerCase().split(' ')[0] ?? '')
  );

  return (
    <div className="flex flex-col">
      {/* Breadcrumb */}
      <nav className="container mx-auto px-4 py-4">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li><Link href="/" className="hover:text-foreground">Home</Link></li>
          <li>/</li>
          <li><Link href="/services" className="hover:text-foreground">Services</Link></li>
          <li>/</li>
          <li className="text-foreground">{service.name}</li>
        </ol>
      </nav>

      {/* Hero Section */}
      <section className="border-b border-border bg-muted/30 px-4 py-12 md:py-16">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {service.name}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground md:mt-6">
            {service.description}
          </p>
        </div>
      </section>

      {/* Features */}
      {service.features && service.features.length > 0 && (
        <section className="px-4 py-12">
          <div className="container mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              What&apos;s Included
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {service.features.map((feature) => (
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
      )}

      {/* Pricing Packages */}
      {service.packages && service.packages.length > 0 && (
        <section className="border-t border-border bg-muted/30 px-4 py-12 md:py-16">
          <div className="container mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Pricing Guide
            </h2>
            <p className="mt-2 text-muted-foreground">
              Every project is unique. These starting prices give you a general idea of investment levels.
            </p>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {service.packages.map((pkg) => (
                <Card key={pkg.name}>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-foreground">{pkg.name}</h3>
                    {pkg.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{pkg.description}</p>
                    )}
                    {pkg.startingPrice && (
                      <p className="mt-4">
                        <span className="text-sm text-muted-foreground">Starting from</span>
                        <br />
                        <span className="text-2xl font-bold text-foreground">${pkg.startingPrice}</span>
                        <span className="text-sm text-muted-foreground"> + HST</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              * Prices vary based on scope, materials, and design complexity.
            </p>
          </div>
        </section>
      )}

      {/* Related Portfolio Projects */}
      {relatedProjects.length > 0 && (
        <section className="px-4 py-12 md:py-16">
          <div className="container mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Our {service.name} Work
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProjects.map((project, i) => (
                <Card key={i} className="overflow-hidden">
                  {project.imageUrl && (
                    <div className="relative aspect-[4/3]">
                      <Image
                        src={project.imageUrl}
                        alt={project.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground">{project.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{project.location}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <ServiceDetailCTASection serviceName={service.name} slug={slug} />
    </div>
  );
}

async function ServiceDetailCTASection({ serviceName, slug }: { serviceName: string; slug: string }) {
  const cta = getServiceDetailCTA(await getCopyContext(), slug);
  return (
    <section className="border-t border-border px-4 py-12 md:py-16">
      <div className="container mx-auto text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Ready to Start Your {serviceName} Project?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          {cta.description}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="h-12 w-full px-8 sm:w-auto">
            <Link href={cta.primary.href}>{cta.primary.label}</Link>
          </Button>
          {cta.secondary && (
            <Button asChild variant="outline" size="lg" className="h-12 w-full px-8 sm:w-auto">
              <Link href={cta.secondary.href}>{cta.secondary.label}</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
