'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { StaggerContainer, StaggerItem } from '@/components/motion';
import {
  Wrench, ChefHat, Bath, Home, Layers, Trees, Paintbrush,
  Droplets, Zap, Warehouse, DoorOpen, Building, Hammer,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  wrench: Wrench, 'chef-hat': ChefHat, bath: Bath, home: Home,
  layers: Layers, trees: Trees, paintbrush: Paintbrush,
  droplets: Droplets, zap: Zap, warehouse: Warehouse,
  'door-open': DoorOpen, building: Building, hammer: Hammer,
};

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function ServicesGrid3Cards({ branding, config, className }: Props) {
  if (!config.services || config.services.length === 0) return null;

  return (
    <section className={`py-16 md:py-20 ${className ?? ''}`}>
      <div className="container mx-auto px-4">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Our Services
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Explore the renovation services offered by {branding.name} in {branding.city} and surrounding areas.
          </p>
        </div>

        <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {config.services.map((service) => (
            <StaggerItem key={service.slug}>
              <Link href={`/services/${service.slug}`} className="group block h-full">
                <div
                  data-slot="card"
                  className="h-full overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/20 hover:shadow-lg"
                >
                  {service.imageUrl ? (
                    <div className="relative aspect-[3/2] overflow-hidden">
                      <Image
                        src={service.imageUrl}
                        alt={service.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[3/2] items-center justify-center bg-primary/5 rounded-t-xl">
                      {(() => {
                        const IconComp = ICON_MAP[service.iconHint ?? ''] ?? Wrench;
                        return <IconComp className="h-12 w-12 text-primary/25" />;
                      })()}
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-foreground">
                      {service.name}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {service.description}
                    </p>
                    <span className="mt-4 inline-block text-sm font-medium text-primary">
                      Learn More &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
