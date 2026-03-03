"use client"

import * as React from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export interface Project {
  id: string
  title: string
  type: string
  description: string
  location: string
  image?: string | undefined
  beforeImage?: string | undefined
}

interface ProjectCardProps {
  project: Project
  onClick?: () => void
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const typeLabel = project.type.charAt(0).toUpperCase() + project.type.slice(1)

  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.() }}
      aria-label={`View ${project.title}`}
    >
      <div className="relative aspect-[3/2] bg-muted">
        {project.image ? (
          <Image
            src={project.image}
            alt={project.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            Project Photo
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-4">
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-white/90 text-foreground"
            >
              {typeLabel}
            </Badge>
            {project.beforeImage && (
              <Badge
                variant="secondary"
                className="bg-primary/90 text-primary-foreground"
              >
                Before & After
              </Badge>
            )}
          </div>
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground transition-colors group-hover:text-primary">
          {project.title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {project.location}
        </p>
      </CardContent>
    </Card>
  )
}
