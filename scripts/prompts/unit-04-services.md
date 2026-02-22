# Unit 04: Services — Dynamic Grid, [slug] Route, Delete Static Pages

## Scope
Make the services system fully DB-driven: update ServicesGrid to accept an optional prop, create a server component wrapper, create a dynamic `[slug]` route, delete the 4 static service pages, and add redirects.

**Files to modify:**
- `src/components/services-grid.tsx`
- `src/app/services/page.tsx`
- `next.config.ts`

**Files to create:**
- `src/components/services-grid-server.tsx`
- `src/app/services/[slug]/page.tsx`

**Files to delete:**
- `src/app/services/kitchen/page.tsx`
- `src/app/services/bathroom/page.tsx`
- `src/app/services/basement/page.tsx`
- `src/app/services/outdoor/page.tsx`

---

## Task 1: Update ServicesGrid to Accept Optional Prop

**File:** `src/components/services-grid.tsx`

Currently the component has a hardcoded `services` array (lines 9-42) and renders only those. Add an optional `services` prop so it can render DB-driven services when provided, falling back to the hardcoded list otherwise.

### Updated interface and imports:

```typescript
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
```

### Updated component:

```typescript
interface ServiceItem {
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
  );
}
```

### Updated ServiceCard:

```typescript
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
  );

  if (showLink) {
    return (
      <Link href={`/services/${service.slug}`} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}
```

Keep exporting the `services` const but rename to `DEFAULT_SERVICES` and also export the `ServiceItem` type:
```typescript
export { DEFAULT_SERVICES as services, type ServiceItem };
```

---

## Task 2: Create Server Component Wrapper

**Create file:** `src/components/services-grid-server.tsx`

This server component fetches `getCompanyConfig()` and passes `config.services[]` to `ServicesGrid`:

```tsx
import { getCompanyConfig } from '@/lib/ai/knowledge/company';
import { ServicesGrid } from '@/components/services-grid';

interface ServicesGridServerProps {
  showLinks?: boolean;
}

export async function ServicesGridServer({ showLinks = true }: ServicesGridServerProps) {
  const config = await getCompanyConfig();

  const services = config.services.map(s => ({
    name: s.name,
    slug: s.slug,
    description: s.description,
    imageUrl: s.imageUrl,
    iconHint: s.iconHint,
  }));

  return <ServicesGrid services={services} showLinks={showLinks} />;
}
```

---

## Task 3: Create Dynamic [slug] Service Page

**Create file:** `src/app/services/[slug]/page.tsx`

This replaces the 4 static service pages. It reads `params.slug`, finds the matching service from `getCompanyConfig().services`, and renders a rich service detail page.

```tsx
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check } from "lucide-react"
import { getBranding } from "@/lib/branding"
import { getCompanyConfig } from "@/lib/ai/knowledge/company"

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
    p => p.serviceType.toLowerCase().includes(service.name.toLowerCase().split(' ')[0])
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
      <section className="border-t border-border px-4 py-12 md:py-16">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Ready to Start Your {service.name} Project?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Get a personalized quote or visualize your space with our AI tools.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="h-12 w-full px-8 sm:w-auto">
              <Link href={`/estimate?service=${slug}`}>Get a Quote</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 w-full px-8 sm:w-auto">
              <Link href="/visualizer">Try Visualizer</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
```

**IMPORTANT:** In Next.js 16, `params` is a Promise. Use `const { slug } = await params;`.

---

## Task 4: Update Services Index Page

**File:** `src/app/services/page.tsx`

Replace the import of `ServicesGrid` with `ServicesGridServer`:

```tsx
import { ServicesGridServer } from "@/components/services-grid-server"
```

Replace `<ServicesGrid />` on line 51 with:
```tsx
<ServicesGridServer />
```

Since `ServicesGridServer` is an async server component and `ServicesPage` is already an async server component, this works directly.

---

## Task 5: Delete Static Service Pages

Delete these 4 files:
- `src/app/services/kitchen/page.tsx`
- `src/app/services/bathroom/page.tsx`
- `src/app/services/basement/page.tsx`
- `src/app/services/outdoor/page.tsx`

Use `rm` to delete them.

---

## Task 6: Add Redirects for Old Service Paths

**File:** `next.config.ts`

Add redirects so old paths still work:

```typescript
const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/services/kitchen', destination: '/services/kitchen-renovation', permanent: true },
      { source: '/services/bathroom', destination: '/services/bathroom-renovation', permanent: true },
      { source: '/services/basement', destination: '/services/basement-finishing', permanent: true },
      { source: '/services/outdoor', destination: '/services/outdoor-living', permanent: true },
    ];
  },
  async headers() {
    // ... existing headers
  },
};
```

---

## Verification

After completing all changes:
1. `npm run build` — must pass with zero TypeScript errors
2. `/services` page renders the grid from DB
3. `/services/kitchen-renovation` renders the dynamic page
4. `/services/kitchen` redirects to `/services/kitchen-renovation`
5. Static service page files are deleted
6. The `ServiceItem` type is exported from `services-grid.tsx`

**Do NOT modify any files outside the scope listed above.**
