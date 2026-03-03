"use client"

import * as React from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ProjectCard, type Project } from "@/components/project-card"
import { GalleryLightbox } from "@/components/gallery-lightbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ProjectGalleryProps {
  projects?: Project[];
}

export function ProjectGallery({ projects: propProjects }: ProjectGalleryProps) {
  const [filter, setFilter] = React.useState<string>("all")
  const [lightboxIndex, setLightboxIndex] = React.useState(-1)
  const shouldReduce = useReducedMotion()

  const displayProjects = propProjects ?? []

  // Count per type for badges — must be before early return (hooks rule)
  const typeCounts = React.useMemo(() => {
    const counts = new Map<string, number>()
    counts.set("all", displayProjects.length)
    for (const p of displayProjects) {
      counts.set(p.type, (counts.get(p.type) || 0) + 1)
    }
    return counts
  }, [displayProjects])

  if (displayProjects.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-muted-foreground">
          Our portfolio is being updated. Check back soon to see our latest work.
        </p>
      </div>
    );
  }

  const isSparse = displayProjects.length < 3;

  // Derive unique project types for filter tabs — hide when only 1 type
  const projectTypes = Array.from(new Set(displayProjects.map(p => p.type)))
  const showFilterTabs = projectTypes.length > 1

  const filteredProjects =
    filter === "all"
      ? displayProjects
      : displayProjects.filter((project) => project.type === filter)

  return (
    <div>
      {/* Filter Tabs — hidden when only 1 service type */}
      {showFilterTabs && (
      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value)}
        className="w-full"
      >
        <TabsList className="mb-8 flex h-auto flex-wrap justify-center gap-2 bg-transparent p-0">
          <TabsTrigger
            value="all"
            className="rounded-full border border-border bg-background px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            All Projects
            <span className="ml-1.5 text-xs opacity-60">{typeCounts.get("all") || 0}</span>
          </TabsTrigger>
          {projectTypes.map((type) => (
            <TabsTrigger
              key={type}
              value={type}
              className="rounded-full border border-border bg-background px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
              <span className="ml-1.5 text-xs opacity-60">{typeCounts.get(type) || 0}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      )}

      {/* Project Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={filter}
          initial={shouldReduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={isSparse
            ? "grid gap-8 sm:grid-cols-2 max-w-3xl mx-auto"
            : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          }
        >
          {filteredProjects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={shouldReduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                delay: shouldReduce ? 0 : i * 0.06,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <ProjectCard
                project={project}
                onClick={() => setLightboxIndex(i)}
              />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {filteredProjects.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            No projects found in this category.
          </p>
        </div>
      )}

      {/* Sparse portfolio CTA */}
      {isSparse && (
        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">
            Want to see more of our work?{" "}
            <Link href="/contact" className="font-medium text-primary hover:underline underline-offset-4">
              Contact us
            </Link>
            {" "}to discuss your project and view additional examples.
          </p>
        </div>
      )}

      {/* Lightbox */}
      <GalleryLightbox
        projects={filteredProjects}
        initialIndex={lightboxIndex >= 0 ? lightboxIndex : 0}
        open={lightboxIndex >= 0}
        onClose={() => setLightboxIndex(-1)}
      />
    </div>
  )
}
