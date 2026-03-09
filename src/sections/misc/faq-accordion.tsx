'use client';

import { useState, useCallback } from 'react';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp, StaggerContainer, StaggerItem } from '@/components/motion';
import { ChevronDown } from 'lucide-react';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

function buildFAQs(config: CompanyConfig, brandName: string) {
  const faqs: { question: string; answer: string }[] = [];

  const serviceNames = config.services.map((s) => s.name).join(', ');
  if (serviceNames) {
    faqs.push({
      question: 'What services do you offer?',
      answer: `${brandName} offers: ${serviceNames}. Each project is tailored to your specific needs and budget.`,
    });
  }

  faqs.push({
    question: 'What areas do you serve?',
    answer: config.serviceArea
      ? `We serve ${config.serviceArea}. Contact us to confirm we cover your area.`
      : `Contact us to confirm we serve your area.`,
  });

  faqs.push({
    question: 'How do I get a quote?',
    answer:
      'Use our AI Design Studio to upload a photo of your space and see design concepts instantly. From there, you can request a detailed estimate. You can also reach out via our contact page.',
  });

  faqs.push({
    question: 'Are you licensed and insured?',
    answer: config.certifications.length > 0
      ? `Yes. Our certifications include: ${config.certifications.join(', ')}. We carry full liability insurance for your protection.`
      : `Yes. We carry full liability insurance and meet all local licensing requirements for your protection.`,
  });

  faqs.push({
    question: 'How long does a typical renovation take?',
    answer:
      'Timelines vary by project scope. A bathroom renovation may take 2-4 weeks, while a full kitchen remodel could be 6-10 weeks. We provide a detailed timeline during the quoting process.',
  });

  return faqs;
}

export function MiscFAQAccordion({ branding, config, className }: Props) {
  const faqs = buildFAQs(config, branding.name);
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggle = useCallback((index: number) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  return (
    <section className={`py-12 md:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-3xl px-4">
        <FadeInUp>
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
            Frequently Asked Questions
          </h2>
        </FadeInUp>

        <StaggerContainer className="mt-10 divide-y">
          {faqs.map((faq, i) => {
            const isOpen = openItems.has(i);
            return (
              <StaggerItem key={i}>
                <button
                  onClick={() => toggle(i)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-medium">{faq.question}</span>
                  <ChevronDown
                    className={`size-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="pb-5 text-sm text-muted-foreground">
                    {faq.answer}
                  </p>
                )}
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
