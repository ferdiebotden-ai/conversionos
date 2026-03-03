"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface GalleryProject {
  title: string
  imageUrl: string
  serviceType: string
}

interface GalleryTeaserProps {
  projects: GalleryProject[]
  companyName: string
}

export function GalleryTeaser({ projects, companyName }: GalleryTeaserProps) {
  // Show max 4 featured projects
  const featured = projects.slice(0, 4)
  if (featured.length < 2) return null

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Recent Projects
          </h2>
          <p className="mt-2 text-lg text-muted-foreground">
            See what {companyName.replace(/\s+(Inc\.?|Ltd\.?|Corp\.?|Co\.)$/i, '')} has built for homeowners like you.
          </p>
        </div>
        <Link
          href="/projects"
          className="group hidden items-center gap-1 text-sm font-medium text-primary hover:underline underline-offset-4 sm:flex"
        >
          View all projects
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((project, i) => (
          <Link
            key={i}
            href="/projects"
            className="group relative aspect-[3/2] overflow-hidden rounded-xl bg-muted"
          >
            {project.imageUrl ? (
              <Image
                src={project.imageUrl}
                alt={project.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {project.title}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="absolute inset-x-0 bottom-0 translate-y-2 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <Badge variant="secondary" className="bg-white/90 text-xs text-foreground">
                {project.serviceType}
              </Badge>
              <p className="mt-1 text-sm font-medium text-white">{project.title}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Mobile "View all" link */}
      <div className="mt-6 text-center sm:hidden">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline underline-offset-4"
        >
          View all projects
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  )
}
