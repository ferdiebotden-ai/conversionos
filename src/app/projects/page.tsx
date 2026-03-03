import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ProjectGallery } from "@/components/project-gallery"
import { getBranding } from "@/lib/branding"
import { getCompanyConfig } from "@/lib/ai/knowledge/company"
import type { Project } from "@/components/project-card"
import { getCopyContext } from "@/lib/copy/server"
import { getProjectsCTA } from "@/lib/copy/site-copy"
import { Sparkles } from "lucide-react"

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding()
  return {
    title: "Our Projects",
    description: `Browse our portfolio of kitchen, bathroom, basement, and flooring renovations in ${branding.city}, ${branding.province} and surrounding areas.`,
  }
}

export default async function ProjectsPage() {
  const config = await getCompanyConfig()
  const cta = getProjectsCTA(await getCopyContext())

  const dbProjects: Project[] = config.portfolio.map((p, i) => ({
    id: String(i + 1),
    title: p.title,
    type: (p.serviceType ?? 'renovation').toLowerCase().split(' ')[0] ?? 'renovation',
    description: p.description,
    location: p.location,
    image: p.imageUrl,
    beforeImage: (p as Record<string, string>)['beforeImageUrl'] as string | undefined,
  }))

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
          <li className="text-foreground">Projects</li>
        </ol>
      </nav>

      {/* Hero Section */}
      <section className="border-b border-border bg-muted/30 px-4 py-12 md:py-16">
        <div className="container mx-auto">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Our Work
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Browse our portfolio of completed renovations. Each project
              showcases our commitment to quality craftsmanship and attention to
              detail.
            </p>
          </div>
        </div>
      </section>

      {/* Project Gallery */}
      <section className="px-4 py-12 md:py-16">
        <div className="container mx-auto">
          <ProjectGallery projects={dbProjects} />
        </div>
      </section>

      {/* Visualizer CTA — only when gallery has 3+ projects */}
      {dbProjects.length >= 3 && (
        <section className="border-t border-border bg-muted/30 px-4 py-12 md:py-16">
          <div className="container mx-auto text-center">
            <div className="mx-auto max-w-xl">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="size-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Inspired by Our Work?
              </h2>
              <p className="mt-3 text-muted-foreground">
                See what your own room could look like. Upload a photo and get four AI-generated design concepts in seconds.
              </p>
              <Button asChild size="lg" className="mt-6 h-12 rounded-full px-8">
                <Link href="/visualizer">Try the AI Visualizer</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="border-t border-border px-4 py-12 md:py-16">
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
