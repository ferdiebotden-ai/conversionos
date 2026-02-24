'use client';

import { Card, CardContent } from "@/components/ui/card"
import { StaggerContainer, StaggerItem } from "@/components/motion"
import { Star, Quote } from "lucide-react"

interface Testimonial {
  id: number;
  quote: string;
  author: string;
  projectType: string;
  rating: number;
  image?: string;
}

interface TestimonialsProps {
  items?: Testimonial[];
}

export function Testimonials({ items }: TestimonialsProps) {
  const displayTestimonials = items && items.length > 0 ? items : []

  // Only render when 2+ testimonials
  if (displayTestimonials.length < 2) {
    return null
  }

  return (
    <StaggerContainer className={`grid gap-6 ${displayTestimonials.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
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
    <Card className="h-full">
      <CardContent className="flex h-full flex-col p-6">
        {/* Stars + Quote icon */}
        <div className="flex items-center justify-between">
          <div className="flex gap-0.5">
            {Array.from({ length: testimonial.rating }).map((_, i) => (
              <Star
                key={i}
                className="size-4 fill-yellow-400 text-yellow-400"
              />
            ))}
          </div>
          <Quote className="size-5 text-primary/30" />
        </div>

        {/* Quote */}
        <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
          &ldquo;{testimonial.quote}&rdquo;
        </blockquote>

        {/* Author */}
        <div className="mt-4 border-t border-border pt-4">
          <p className="font-semibold text-foreground text-sm">{testimonial.author}</p>
          <p className="text-xs text-muted-foreground">
            {testimonial.projectType}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
