'use client';

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { StaggerContainer, StaggerItem } from "@/components/motion"
import { Star } from "lucide-react"

interface Testimonial {
  id: number;
  quote: string;
  author: string;
  projectType: string;
  rating: number;
  image: string;
}

// Fallback testimonials when none are configured in admin_settings
const DEFAULT_TESTIMONIALS: Testimonial[] = []

interface TestimonialsProps {
  items?: Testimonial[];
}

export function Testimonials({ items }: TestimonialsProps) {
  const displayTestimonials = items && items.length > 0 ? items : DEFAULT_TESTIMONIALS

  if (displayTestimonials.length === 0) {
    return null
  }

  return (
    <StaggerContainer className="grid gap-6 md:grid-cols-2">
      {displayTestimonials.map((testimonial) => (
        <StaggerItem key={testimonial.id}>
          <TestimonialCard testimonial={testimonial} />
        </StaggerItem>
      ))}
    </StaggerContainer>
  )
}

function TestimonialCard({
  testimonial,
}: {
  testimonial: Testimonial
}) {
  return (
    <Card className="h-full overflow-hidden">
      <div className="relative h-32">
        <Image
          src={testimonial.image}
          alt={testimonial.projectType}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/50" />
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
        {/* Quote */}
        <blockquote className="flex-1 text-muted-foreground">
          &ldquo;{testimonial.quote}&rdquo;
        </blockquote>

        {/* Author */}
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
