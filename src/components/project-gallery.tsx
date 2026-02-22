"use client"

import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ProjectCard, type Project } from "@/components/project-card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const defaultProjects: Project[] = [
  {
    id: "1",
    title: "Modern Kitchen Transformation",
    type: "kitchen",
    description:
      "Complete kitchen remodel featuring custom white shaker cabinets, quartz countertops, and a large center island. The open concept design connects seamlessly to the dining area.",
    location: "London, ON",
    image: "/images/demo/kitchen-modern.png",
  },
  {
    id: "2",
    title: "Spa-Inspired Master Bathroom",
    type: "bathroom",
    description:
      "Luxurious master bathroom renovation with walk-in shower, freestanding tub, heated floors, and custom double vanity. Features large format porcelain tiles throughout.",
    location: "St. Marys, ON",
    image: "/images/demo/bathroom-spa.png",
  },
  {
    id: "3",
    title: "Family Entertainment Basement",
    type: "basement",
    description:
      "Full basement finishing with home theater, wet bar, and guest bedroom. Includes soundproofing, custom built-ins, and a full bathroom.",
    location: "London, ON",
    image: "/images/demo/basement-entertainment.png",
  },
  {
    id: "4",
    title: "Hardwood Flooring Installation",
    type: "flooring",
    description:
      "Whole-home hardwood flooring installation. White oak throughout main floor with coordinating engineered hardwood on upper level.",
    location: "Mitchell, ON",
    image: "/images/demo/flooring-hardwood.png",
  },
  {
    id: "5",
    title: "Farmhouse Kitchen Renovation",
    type: "kitchen",
    description:
      "Charming farmhouse-style kitchen with two-tone cabinets, butcher block island, and apron-front sink. Exposed beam ceiling adds character.",
    location: "Listowel, ON",
    image: "/images/demo/kitchen-farmhouse.png",
  },
  {
    id: "6",
    title: "Accessible Bathroom Remodel",
    type: "bathroom",
    description:
      "Barrier-free bathroom renovation with curbless shower, grab bars, and accessible vanity. Combines safety features with modern aesthetics.",
    location: "London, ON",
    image: "/images/demo/bathroom-accessible.png",
  },
  {
    id: "7",
    title: "Rental Suite Basement",
    type: "basement",
    description:
      "Legal basement apartment with separate entrance, full kitchen, living area, bedroom, and bathroom. Includes egress windows and fire separation.",
    location: "London, ON",
    image: "/images/demo/basement-walkout.png",
  },
  {
    id: "8",
    title: "Luxury Vinyl Throughout",
    type: "flooring",
    description:
      "Waterproof luxury vinyl plank installation in basement and main floor bathrooms. Features realistic oak wood look with enhanced durability.",
    location: "St. Marys, ON",
    image: "/images/demo/flooring-vinyl.png",
  },
]

interface ProjectGalleryProps {
  projects?: Project[];
}

export function ProjectGallery({ projects: propProjects }: ProjectGalleryProps) {
  const [filter, setFilter] = React.useState<string>("all")
  const shouldReduce = useReducedMotion()

  const displayProjects = propProjects && propProjects.length > 0 ? propProjects : defaultProjects

  // Derive unique project types for filter tabs
  const projectTypes = Array.from(new Set(displayProjects.map(p => p.type)))

  const filteredProjects =
    filter === "all"
      ? displayProjects
      : displayProjects.filter((project) => project.type === filter)

  return (
    <div>
      {/* Filter Tabs */}
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
          </TabsTrigger>
          {projectTypes.map((type) => (
            <TabsTrigger
              key={type}
              value={type}
              className="rounded-full border border-border bg-background px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Project Grid — animate on filter change */}
      <AnimatePresence mode="wait">
        <motion.div
          key={filter}
          initial={shouldReduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
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
              <ProjectCard project={project} />
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
    </div>
  )
}

export { defaultProjects as projects }
