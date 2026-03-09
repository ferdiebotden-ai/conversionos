'use client';

import { useState } from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp } from '@/components/motion';
import { Button } from '@/components/ui/button';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

export function ContactFormWithMap({ branding, config, className }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  return (
    <section className={`py-16 px-4 sm:px-6 lg:px-8 ${className ?? ''}`}>
      <div className="mx-auto max-w-6xl">
        <FadeInUp>
          <h2 className="text-3xl font-bold tracking-tight text-center mb-10">
            Contact {branding.name}
          </h2>
        </FadeInUp>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Form */}
          <FadeInUp>
            <form action="/api/contact" method="POST" className="space-y-4">
              <div>
                <label htmlFor="cf-name" className="text-sm font-medium block mb-1">Name</label>
                <input id="cf-name" type="text" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label htmlFor="cf-email" className="text-sm font-medium block mb-1">Email</label>
                <input id="cf-email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label htmlFor="cf-phone" className="text-sm font-medium block mb-1">Phone</label>
                <input id="cf-phone" type="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label htmlFor="cf-message" className="text-sm font-medium block mb-1">Message</label>
                <textarea id="cf-message" rows={4} className={inputClass} value={message} onChange={(e) => setMessage(e.target.value)} required />
              </div>
              <Button type="submit" size="lg" className="w-full">Send Message</Button>
            </form>
          </FadeInUp>

          {/* Map placeholder + details */}
          <FadeInUp>
            <div className="space-y-6">
              <div className="bg-muted rounded-xl flex items-center justify-center aspect-[4/3]">
                <div className="text-center p-6">
                  <MapPin className="size-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-semibold">{config.city}, {config.province}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Serving {config.serviceArea}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {branding.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="size-4 text-primary shrink-0" />
                    <a href={`tel:${branding.phone}`} className="text-sm hover:underline">{branding.phone}</a>
                  </div>
                )}
                {branding.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="size-4 text-primary shrink-0" />
                    <a href={`mailto:${branding.email}`} className="text-sm hover:underline">{branding.email}</a>
                  </div>
                )}
                {branding.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="size-4 text-primary shrink-0" />
                    <span className="text-sm">{branding.address}, {branding.city}, {branding.province} {branding.postal}</span>
                  </div>
                )}
              </div>
            </div>
          </FadeInUp>
        </div>
      </div>
    </section>
  );
}
