import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ProjectGallery } from "@/components/project-gallery"
import { getBranding } from "@/lib/branding"
import { getCompanyConfig } from "@/lib/ai/knowledge/company"
import type { Project } from "@/components/project-card"

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding()
  return {
    title: "Our Projects",
    description: `Browse our portfolio of kitchen, bathroom, basement, and flooring renovations in ${branding.city}, ${branding.province} and surrounding areas.`,
  }
}

export default async function ProjectsPage() {
  const config = await getCompanyConfig()

  const dbProjects: Project[] = config.portfolio.map((p, i) => ({
    id: String(i + 1),
    title: p.title,
    type: p.serviceType.toLowerCase().split(' ')[0] as Project["type"],
    description: p.description,
    location: p.location,
    image: p.imageUrl,
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
          <ProjectGallery {...(dbProjects.length > 0 ? { projects: dbProjects } : {})} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border bg-muted/30 px-4 py-12 md:py-16">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Ready to Start Your Project?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Let&apos;s create something amazing together. Get a personalized quote
            and see what your renovation could look like.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="h-12 w-full px-8 sm:w-auto">
              <Link href="/estimate">Get a Quote</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 w-full px-8 sm:w-auto"
            >
              <Link href="/visualizer">Try the Visualizer</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
