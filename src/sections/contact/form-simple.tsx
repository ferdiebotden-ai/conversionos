'use client';

import { useState } from 'react';
import { Phone, Mail } from 'lucide-react';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp } from '@/components/motion';
import { Button } from '@/components/ui/button';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

export function ContactFormSimple({ branding, className }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  return (
    <section className={`py-16 px-4 sm:px-6 lg:px-8 ${className ?? ''}`}>
      <div className="mx-auto max-w-lg">
        <FadeInUp>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight">Get in Touch</h2>
            <p className="text-muted-foreground mt-2">
              Reach out to {branding.name} to discuss your project.
            </p>
          </div>
        </FadeInUp>

        <FadeInUp>
          <form action="/api/contact" method="POST" className="space-y-4">
            <div>
              <label htmlFor="cs-name" className="text-sm font-medium block mb-1">Name</label>
              <input id="cs-name" type="text" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="cs-email" className="text-sm font-medium block mb-1">Email</label>
              <input id="cs-email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="cs-phone" className="text-sm font-medium block mb-1">Phone</label>
              <input id="cs-phone" type="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label htmlFor="cs-message" className="text-sm font-medium block mb-1">Message</label>
              <textarea id="cs-message" rows={4} className={inputClass} value={message} onChange={(e) => setMessage(e.target.value)} required />
            </div>
            <Button type="submit" size="lg" className="w-full">Send Message</Button>
          </form>
        </FadeInUp>

        <FadeInUp>
          <div className="flex items-center justify-center gap-6 mt-8 text-sm">
            {branding.phone && (
              <a href={`tel:${branding.phone}`} className="flex items-center gap-2 hover:underline">
                <Phone className="size-4 text-primary" />
                {branding.phone}
              </a>
            )}
            {branding.email && (
              <a href={`mailto:${branding.email}`} className="flex items-center gap-2 hover:underline">
                <Mail className="size-4 text-primary" />
                {branding.email}
              </a>
            )}
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
