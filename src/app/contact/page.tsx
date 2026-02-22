import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { ContactForm } from "@/components/contact-form"
import { Clock, Mail, MapPin, Phone } from "lucide-react"
import { getBranding } from "@/lib/branding"
import { getCompanyConfig } from "@/lib/ai/knowledge/company"
import { parseBusinessHours } from "@/lib/utils/hours"

export async function generateMetadata() {
  const branding = await getBranding()
  return {
    title: "Contact Us",
    description: `Get in touch with ${branding.name}. Request a free quote or ask questions about your renovation project in ${branding.city}, ${branding.province}.`,
  }
}

export default async function ContactPage() {
  const branding = await getBranding()
  const config = await getCompanyConfig()
  const businessHours = parseBusinessHours(config.hours)
  return (
    <div className="flex flex-col">
      {/* Breadcrumb */}
      <nav className="container mx-auto px-4 py-4">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
          </li>
          <li>/</li>
          <li className="text-foreground">Contact</li>
        </ol>
      </nav>

      {/* Hero Section */}
      <section className="border-b border-border bg-muted/30 px-4 py-12 md:py-16">
        <div className="container mx-auto">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Get In Touch
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Have a question about your renovation project? We&apos;re here to help.
              Send us a message or give us a call.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-4 py-12 md:py-16">
        <div className="container mx-auto">
          <div className="grid gap-12 lg:grid-cols-3">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold text-foreground">
                Send Us a Message
              </h2>
              <p className="mt-2 text-muted-foreground">
                Fill out the form below and we&apos;ll get back to you within 24
                hours.
              </p>
              <div className="mt-6">
                <ContactForm />
              </div>
            </div>

            {/* Contact Info Sidebar */}
            <div className="space-y-6">
              {/* Contact Details */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground">
                    Contact Information
                  </h3>
                  <ul className="mt-4 space-y-4">
                    <li>
                      <div className="flex items-start gap-3 text-muted-foreground">
                        <Phone className="mt-0.5 size-5 shrink-0 text-primary" />
                        <span>
                          <strong className="block text-foreground">Phone</strong>
                          <a href={`tel:${branding.phone.replace(/\D/g, '')}`} className="hover:text-primary">{branding.phone}</a>
                        </span>
                      </div>
                    </li>
                    <li>
                      <div className="flex items-start gap-3 text-muted-foreground">
                        <Mail className="mt-0.5 size-5 shrink-0 text-primary" />
                        <span>
                          <strong className="block text-foreground">Email</strong>
                          <a href={`mailto:${branding.email}`} className="hover:text-primary">{branding.email}</a>
                        </span>
                      </div>
                    </li>
                    <li className="flex items-start gap-3 text-muted-foreground">
                      <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
                      <span>
                        <strong className="block text-foreground">Location</strong>
                        {branding.city}, {branding.province}, Canada
                      </span>
                    </li>
                  </ul>
                  {config.booking && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <a
                      href={config.booking}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-sm font-medium text-primary hover:underline"
                    >
                      Book a consultation online →
                    </a>
                  </div>
                  )}
                </CardContent>
              </Card>

              {/* Business Hours */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <Clock className="size-5 text-primary" />
                    <h3 className="font-semibold text-foreground">
                      Business Hours
                    </h3>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {businessHours.map((item) => (
                      <li
                        key={item.day}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-muted-foreground">{item.day}</span>
                        <span className="font-medium text-foreground">
                          {item.hours}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Map Placeholder */}
              <Card>
                <CardContent className="p-0">
                  <div className="aspect-square w-full rounded-lg bg-muted flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      Map coming soon
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Alternative CTA */}
      <section className="border-t border-border bg-muted/30 px-4 py-12 md:py-16">
        <div className="container mx-auto text-center">
          <h2 className="text-xl font-semibold text-foreground">
            Prefer an Instant Quote?
          </h2>
          <p className="mt-2 text-muted-foreground">
            Use our AI-powered estimator for a quick ballpark estimate.
          </p>
          <Link
            href="/estimate"
            className="mt-4 inline-block text-primary underline-offset-4 hover:underline"
          >
            Get an instant quote →
          </Link>
        </div>
      </section>
    </div>
  )
}
