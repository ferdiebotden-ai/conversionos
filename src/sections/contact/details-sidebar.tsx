'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp } from '@/components/motion';
import { Button } from '@/components/ui/button';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

export function ContactDetailsSidebar({ branding, config, className }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const details = [
    branding.phone && {
      icon: Phone,
      label: 'Phone',
      value: branding.phone,
      href: `tel:${branding.phone}`,
    },
    branding.email && {
      icon: Mail,
      label: 'Email',
      value: branding.email,
      href: `mailto:${branding.email}`,
    },
    branding.address && {
      icon: MapPin,
      label: 'Address',
      value: `${branding.address}, ${branding.city}, ${branding.province} ${branding.postal}`,
    },
    config.hours && {
      icon: Clock,
      label: 'Hours',
      value: config.hours,
    },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string; href?: string }[];

  return (
    <section className={`py-16 px-4 sm:px-6 lg:px-8 ${className ?? ''}`}>
      <div className="mx-auto max-w-6xl">
        <FadeInUp>
          <h2 className="text-3xl font-bold tracking-tight text-center mb-10">
            Contact Us
          </h2>
        </FadeInUp>

        <div className="grid md:grid-cols-[2fr_1fr] gap-8">
          {/* Form */}
          <FadeInUp>
            <form action="/api/contact" method="POST" className="space-y-4">
              <div>
                <label htmlFor="ds-name" className="text-sm font-medium block mb-1">Name</label>
                <input id="ds-name" type="text" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label htmlFor="ds-email" className="text-sm font-medium block mb-1">Email</label>
                <input id="ds-email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label htmlFor="ds-phone" className="text-sm font-medium block mb-1">Phone</label>
                <input id="ds-phone" type="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label htmlFor="ds-message" className="text-sm font-medium block mb-1">Message</label>
                <textarea id="ds-message" rows={4} className={inputClass} value={message} onChange={(e) => setMessage(e.target.value)} required />
              </div>
              <Button type="submit" size="lg" className="w-full">Send Message</Button>
            </form>
          </FadeInUp>

          {/* Sidebar */}
          <FadeInUp>
            <div className="space-y-6">
              {details.map((detail, i) => {
                const Icon = detail.icon;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <Icon className="size-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{detail.label}</p>
                      {detail.href ? (
                        <a href={detail.href} className="text-sm text-muted-foreground hover:underline">
                          {detail.value}
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground">{detail.value}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Social links */}
              {branding.socials.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-3">Follow Us</p>
                  <div className="flex flex-wrap gap-2">
                    {branding.socials.map((social, i) => (
                      <Link
                        key={i}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {social.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </FadeInUp>
        </div>
      </div>
    </section>
  );
}
