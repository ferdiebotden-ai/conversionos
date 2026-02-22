# Unit 05: Gallery — Dynamic Project Gallery and Testimonials

## Scope
Make the project gallery and testimonials components accept optional props for DB-driven content, while maintaining backward compatibility with existing hardcoded fallbacks.

**Files to modify:**
- `src/components/project-gallery.tsx`
- `src/components/testimonials.tsx`
- `src/app/projects/page.tsx` (if it exists — wire up the server-side data)

---

## Task 1: Dynamic Project Gallery

**File:** `src/components/project-gallery.tsx`

Currently has a hardcoded `projects` array (lines 8-81) with 8 demo projects. Add an optional `projects` prop. When provided, render from prop. When absent, use the hardcoded fallback.

### Changes:

1. Add a prop interface:

```typescript
interface ProjectGalleryProps {
  projects?: Project[];
}

export function ProjectGallery({ projects: propProjects }: ProjectGalleryProps) {
  const displayProjects = propProjects && propProjects.length > 0 ? propProjects : defaultProjects;
```

2. Rename the existing hardcoded `projects` const to `defaultProjects` (keep as fallback).

3. Derive filter tabs dynamically from the `displayProjects` data instead of hardcoding:

```typescript
// Derive unique project types for filter tabs
const projectTypes = Array.from(new Set(displayProjects.map(p => p.type)));
```

Replace the hardcoded `TabsTrigger` elements with dynamic ones:

```tsx
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
```

4. Update the filter logic:

```typescript
const filteredProjects =
  filter === "all"
    ? displayProjects
    : displayProjects.filter((project) => project.type === filter);
```

5. Keep exporting both the component and the default projects:
```typescript
export { defaultProjects as projects };
```

---

## Task 2: Testimonials — Optional Image

**File:** `src/components/testimonials.tsx`

Currently the `Testimonial` interface requires `image: string` (line 14). Make it optional since scraped testimonials may not have an associated image.

### Changes:

1. Update the interface:
```typescript
interface Testimonial {
  id: number;
  quote: string;
  author: string;
  projectType: string;
  rating: number;
  image?: string;  // Make optional
}
```

2. Update `TestimonialCard` to handle missing images. When `image` is missing, render a gradient placeholder instead:

```tsx
function TestimonialCard({
  testimonial,
}: {
  testimonial: Testimonial
}) {
  return (
    <Card className="h-full overflow-hidden">
      <div className="relative h-32">
        {testimonial.image ? (
          <>
            <Image
              src={testimonial.image}
              alt={testimonial.projectType}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/50" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
        <div className="absolute bottom-3 left-4 flex gap-1">
          {Array.from({ length: testimonial.rating }).map((_, i) => (
            <Star
              key={i}
              className="size-4 fill-yellow-400 text-yellow-400 drop-shadow"
            />
          ))}
        </div>
      </div>
      <CardContent className="flex h-full flex-col p-6">
        <blockquote className="flex-1 text-muted-foreground">
          &ldquo;{testimonial.quote}&rdquo;
        </blockquote>
        <div className="mt-4 border-t border-border pt-4">
          <p className="font-semibold text-foreground">{testimonial.author}</p>
          <p className="text-sm text-muted-foreground">
            {testimonial.projectType}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Task 3: Wire Up Projects Page (if needed)

Check if `src/app/projects/page.tsx` exists. If it does and it uses `<ProjectGallery />`, update it to pass `config.portfolio` as the `projects` prop.

If the projects page exists and imports `ProjectGallery`:
1. Add `import { getCompanyConfig } from '@/lib/ai/knowledge/company';`
2. Fetch config: `const config = await getCompanyConfig();`
3. Map portfolio to Project format:

```typescript
const dbProjects = config.portfolio.map((p, i) => ({
  id: String(i + 1),
  title: p.title,
  type: p.serviceType.toLowerCase().split(' ')[0],
  description: p.description,
  location: p.location,
  image: p.imageUrl,
}));
```

4. Pass to component: `<ProjectGallery projects={dbProjects.length > 0 ? dbProjects : undefined} />`

If the projects page doesn't exist or doesn't use ProjectGallery, skip this task.

---

## Verification

After completing all changes:
1. `npm run build` — must pass with zero TypeScript errors
2. `ProjectGallery` accepts optional `projects` prop
3. Filter tabs are derived dynamically from project types
4. `Testimonials` component renders gracefully when `image` is missing
5. Existing fallback data still renders correctly when no props provided

**Do NOT modify any files outside the scope listed above.**
