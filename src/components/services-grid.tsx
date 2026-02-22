'use client';

import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { StaggerContainer, StaggerItem } from "@/components/motion"
import { ChefHat, Bath, Sofa, TreeDeciduous, Wrench, Paintbrush, Home, Building2, Hammer, Leaf, Accessibility, type LucideIcon } from "lucide-react"

// Icon mapping by keyword for dynamic services
const SERVICE_ICON_MAP: Record<string, LucideIcon> = {
  kitchen: ChefHat,
  bathroom: Bath,
  bath: Bath,
  basement: Sofa,
  outdoor: TreeDeciduous,
  deck: TreeDeciduous,
  patio: TreeDeciduous,
  flooring: Hammer,
  cabinetry: Wrench,
  cabinet: Wrench,
  painting: Paintbrush,
  drywall: Paintbrush,
  addition: Building2,
  commercial: Building2,
  heritage: Home,
  restoration: Home,
  'whole home': Home,
  accessibility: Accessibility,
  'net-zero': Leaf,
  netzero: Leaf,
};

function getServiceIcon(name: string): LucideIcon {
  const lower = name.toLowerCase();
  for (const [keyword, icon] of Object.entries(SERVICE_ICON_MAP)) {
    if (lower.includes(keyword)) return icon;
  }
  return Wrench; // default
}

export interface ServiceItem {
  name: string;
  slug: string;
  description: string;
  imageUrl?: string;
  iconHint?: string;
}

interface ServicesGridProps {
  showLinks?: boolean;
  services?: ServiceItem[];
}

// Hardcoded fallback (backward compat)
const DEFAULT_SERVICES: ServiceItem[] = [
  { slug: "kitchen-renovation", name: "Kitchen Renovation", description: "The heart of your home. Plumbing, electrical, lighting, flooring, cabinets, countertops, and more.", imageUrl: "/images/demo/kitchen-modern.png" },
  { slug: "bathroom-renovation", name: "Bathroom Renovation", description: "Transform your functional space into something much more. Plumbing, tile, vanities, and complete renovations.", imageUrl: "/images/demo/bathroom-spa.png" },
  { slug: "basement-finishing", name: "Basement Finishing", description: "Transform your perspective on an entire floor of your home. Insulation, drywall, flooring, and more.", imageUrl: "/images/demo/basement-entertainment.png" },
  { slug: "outdoor-living", name: "Outdoor Living", description: "Increase your curb appeal. Decks, fences, porches, concrete driveways and sidewalks, painting.", imageUrl: "/images/demo/outdoor-deck.png" },
];

export function ServicesGrid({ showLinks = true, services }: ServicesGridProps) {
  const displayServices = services && services.length > 0 ? services : DEFAULT_SERVICES;

  return (
    <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {displayServices.map((service) => (
        <StaggerItem key={service.slug}>
          <ServiceCard service={service} showLink={showLinks} />
        </StaggerItem>
      ))}
    </StaggerContainer>
  )
}

function ServiceCard({
  service,
  showLink,
}: {
  service: ServiceItem;
  showLink: boolean;
}) {
  const Icon = getServiceIcon(service.name);

  const content = (
    <Card className="group h-full overflow-hidden border-2 border-transparent transition-all hover:border-primary/20 hover:shadow-md">
      {service.imageUrl && (
        <div className="relative aspect-[3/2] overflow-hidden">
          <Image
            src={service.imageUrl}
            alt={`${service.name}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </div>
      )}
      <CardContent className="flex h-full flex-col p-6">
        <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="size-6" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          {service.name}
        </h3>
        <p className="mt-2 flex-1 text-sm text-muted-foreground">
          {service.description}
        </p>
        {showLink && (
          <span className="mt-4 text-sm font-medium text-primary">
            Learn more →
          </span>
        )}
      </CardContent>
    </Card>
  )

  if (showLink) {
    return (
      <Link href={`/services/${service.slug}`} className="block h-full">
        {content}
      </Link>
    )
  }

  return content
}

export { DEFAULT_SERVICES as services };
