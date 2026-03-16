'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

type TeamMember = {
  name: string;
  role: string;
  photo_url: string;
  bio: string;
};

function parseTeamMembers(c: Record<string, unknown>): TeamMember[] {
  const raw =
    c['team_members'] ?? c['teamMembers'] ?? c['team'] ?? c['staff'] ?? [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => {
      if (typeof entry !== 'object' || entry === null) return null;
      const record = entry as Record<string, unknown>;

      const name =
        typeof record['name'] === 'string' && record['name'].trim()
          ? record['name'].trim()
          : null;
      if (!name) return null;

      const role =
        typeof (record['role'] ?? record['title'] ?? record['position']) === 'string'
          ? String(record['role'] ?? record['title'] ?? record['position']).trim()
          : '';
      const photoUrl =
        typeof (record['photo_url'] ?? record['photoUrl'] ?? record['image'] ?? record['avatar']) === 'string'
          ? String(record['photo_url'] ?? record['photoUrl'] ?? record['image'] ?? record['avatar']).trim()
          : '';
      const bio =
        typeof (record['bio'] ?? record['description'] ?? record['about']) === 'string'
          ? String(record['bio'] ?? record['description'] ?? record['about']).trim()
          : '';

      return { name, role, photo_url: photoUrl, bio } satisfies TeamMember;
    })
    .filter((m): m is TeamMember => m !== null);
}

export function WarmLeadTeam({ branding, config, className }: SectionBaseProps) {
  const c = (config ?? {}) as Record<string, unknown>;
  const members = parseTeamMembers(c);

  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const [visibleCards, setVisibleCards] = useState<number[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || members.length === 0) return;

    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof IntersectionObserver === 'undefined'
    ) {
      requestAnimationFrame(() => setVisibleCards(members.map((_, i) => i)));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = Number((entry.target as HTMLElement).dataset['index']);
          requestAnimationFrame(() =>
            setVisibleCards((current) =>
              current.includes(index) ? current : [...current, index],
            ),
          );
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px' },
    );

    cardRefs.current.forEach((card) => card && observer.observe(card));
    return () => observer.disconnect();
  }, [members]);

  if (members.length === 0) return null;

  const companyName = branding?.name?.trim() || 'Our Company';

  return (
    <section
      ref={sectionRef}
      className={['bg-[rgb(248,247,245)] py-20 md:py-28', className].filter(Boolean).join(' ')}
      aria-labelledby="wl-team-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mx-auto mb-14 max-w-2xl text-center">
          <p className="mb-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Meet the Team
          </p>
          <h2
            id="wl-team-heading"
            className="font-heading text-4xl uppercase leading-tight tracking-wide text-foreground md:text-5xl"
          >
            Our Team
          </h2>
          <p className="mt-4 font-body text-lg leading-relaxed text-muted-foreground">
            The people behind {companyName}
          </p>
        </header>

        {/* Grid: 2 col mobile, 4 col desktop */}
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-8">
          {members.map((member, index) => {
            const isVisible = visibleCards.includes(index);

            return (
              <article
                key={`${member.name}-${index}`}
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
                data-index={index}
                className={[
                  'flex flex-col items-center rounded-lg bg-white p-6 shadow-sm transition-all duration-700 ease-out will-change-transform sm:p-8',
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
                ].join(' ')}
                style={{ transitionDelay: `${index * 120}ms` }}
              >
                {/* Circular photo */}
                <div className="relative h-[140px] w-[140px] overflow-hidden rounded-full bg-muted transition-transform duration-300 hover:scale-105 sm:h-[180px] sm:w-[180px]">
                  {member.photo_url ? (
                    <Image
                      src={member.photo_url}
                      alt={`${member.name}, ${member.role || 'team member'} at ${companyName}`}
                      fill
                      sizes="180px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="h-14 w-14 text-muted-foreground/30"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="8" r="4" />
                        <path d="M5.5 21a7.5 7.5 0 0 1 13 0" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Name */}
                <h3 className="mt-5 font-heading text-lg uppercase leading-tight tracking-wide text-foreground sm:text-xl">
                  {member.name}
                </h3>

                {/* Role */}
                {member.role && (
                  <p className="mt-1 font-body text-sm font-semibold text-primary">
                    {member.role}
                  </p>
                )}

                {/* Bio */}
                {member.bio && (
                  <p className="mt-3 text-center font-body text-sm leading-relaxed text-muted-foreground">
                    {member.bio}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
