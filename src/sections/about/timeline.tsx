'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp } from '@/components/motion';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

interface TimelineEntry {
  year: string;
  title: string;
  description: string;
}

function buildTimeline(config: CompanyConfig): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  if (config.founded) {
    entries.push({
      year: config.founded,
      title: 'Founded',
      description: `${config.name} was established in ${config.location || 'Ontario'}.`,
    });
  }

  // Derive entries from about copy paragraphs
  config.aboutCopy.forEach((paragraph, i) => {
    if (i === 0 && entries.length > 0) return; // skip if we already have a founded entry
    entries.push({
      year: '',
      title: i === 0 ? 'Our Story' : `Chapter ${entries.length + 1}`,
      description: paragraph,
    });
  });

  if (entries.length === 0 && config.mission) {
    entries.push({ year: '', title: 'Our Mission', description: config.mission });
  }

  return entries;
}

export function AboutTimeline({ config, className }: Props) {
  const entries = buildTimeline(config);
  if (entries.length === 0) return null;

  return (
    <section className={`py-16 px-4 sm:px-6 lg:px-8 ${className ?? ''}`}>
      <div className="mx-auto max-w-4xl">
        <FadeInUp>
          <h2 className="text-3xl font-bold tracking-tight text-center mb-12">
            Our Journey
          </h2>
        </FadeInUp>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 md:left-1/2 md:-translate-x-px top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-12">
            {entries.map((entry, i) => {
              const isLeft = i % 2 === 0;
              return (
                <FadeInUp key={i}>
                  <div className="relative flex items-start md:justify-center">
                    {/* Dot */}
                    <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background mt-1.5 z-10" />

                    {/* Card */}
                    <div
                      className={`ml-10 md:ml-0 md:w-[calc(50%-2rem)] bg-card rounded-xl p-5 border ${
                        isLeft ? 'md:mr-auto md:text-right' : 'md:ml-auto'
                      }`}
                    >
                      {entry.year && (
                        <span className="text-sm font-semibold text-primary">
                          {entry.year}
                        </span>
                      )}
                      <h3 className="text-lg font-semibold mt-1">{entry.title}</h3>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        {entry.description}
                      </p>
                    </div>
                  </div>
                </FadeInUp>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
