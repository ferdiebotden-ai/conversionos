"use client"

import * as React from "react"
import Image from "next/image"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Project } from "@/components/project-card"

interface GalleryLightboxProps {
  projects: Project[]
  initialIndex: number
  open: boolean
  onClose: () => void
}

export function GalleryLightbox({
  projects,
  initialIndex,
  open,
  onClose,
}: GalleryLightboxProps) {
  const [index, setIndex] = React.useState(initialIndex)
  const touchStartX = React.useRef(0)
  const touchDeltaX = React.useRef(0)

  // Sync index when lightbox opens with a new initialIndex
  React.useEffect(() => {
    if (open) setIndex(initialIndex)
  }, [open, initialIndex])

  // Keyboard navigation
  React.useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") setIndex(i => (i > 0 ? i - 1 : projects.length - 1))
      if (e.key === "ArrowRight") setIndex(i => (i < projects.length - 1 ? i + 1 : 0))
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, onClose, projects.length])

  // Lock body scroll when open
  React.useEffect(() => {
    if (!open) return
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [open])

  if (!open || projects.length === 0) return null

  const project = projects[index]
  if (!project) return null

  const goNext = () => setIndex(i => (i < projects.length - 1 ? i + 1 : 0))
  const goPrev = () => setIndex(i => (i > 0 ? i - 1 : projects.length - 1))

  // Touch handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0]) touchStartX.current = e.touches[0].clientX
    touchDeltaX.current = 0
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) touchDeltaX.current = e.touches[0].clientX - touchStartX.current
  }
  const onTouchEnd = () => {
    if (Math.abs(touchDeltaX.current) > 50) {
      if (touchDeltaX.current > 0) goPrev()
      else goNext()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={`Project: ${project.title}`}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        aria-label="Close lightbox"
      >
        <X className="size-6" />
      </button>

      {/* Counter */}
      <div className="absolute left-4 top-4 z-10 text-sm text-white/60">
        {index + 1} of {projects.length}
      </div>

      {/* Navigation arrows — hidden on mobile (use swipe) */}
      {projects.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-white/80 transition-colors hover:bg-white/20 hover:text-white md:block"
            aria-label="Previous project"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-white/80 transition-colors hover:bg-white/20 hover:text-white md:block"
            aria-label="Next project"
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      )}

      {/* Main content */}
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col px-4 md:px-12"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Image */}
        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg bg-muted/10 md:aspect-[16/9]">
          {project.image ? (
            <Image
              key={project.id}
              src={project.image}
              alt={project.title}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 80vw"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-white/40">
              No image available
            </div>
          )}
        </div>

        {/* Project info */}
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary" className="bg-white/10 text-white/80">
              {project.type.charAt(0).toUpperCase() + project.type.slice(1)}
            </Badge>
            {project.location && (
              <span className="text-sm text-white/50">{project.location}</span>
            )}
          </div>
          <h2 className="mt-2 text-lg font-semibold text-white md:text-xl">
            {project.title}
          </h2>
          {project.description && (
            <p className="mx-auto mt-2 max-w-2xl text-sm text-white/60">
              {project.description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
