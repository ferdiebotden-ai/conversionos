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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function resolveTeamMembers(config: SectionBaseProps['config']): TeamMember[] {
  const root = asRecord(config);
  if (!root) return [];

  const adminSettings = asRecord(root['admin_settings']);
  const data = asRecord(root['data']);
  const companyProfile =
    asRecord(root['company_profile']) ??
    asRecord(adminSettings?.['company_profile']) ??
    asRecord(data?.['company_profile']);

  const rawMembers =
    root['team_members'] ??
    root['teamMembers'] ??
    companyProfile?.['team_members'] ??
    companyProfile?.['teamMembers'] ??
    adminSettings?.['team_members'] ??
    adminSettings?.['teamMembers'] ??
    data?.['team_members'] ??
    data?.['teamMembers'] ??
    null;

  if (!Array.isArray(rawMembers)) return [];

  return rawMembers
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return null;

      const name =
        typeof record['name'] === 'string' && record['name'].trim()
          ? record['name'].trim()
          : null;
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

      if (!name) return null;

      return { name, role, photo_url: photoUrl, bio } satisfies TeamMember;
    })
    .filter((member): member is TeamMember => Boolean(member));
}

export function TeamRow({ branding, config, tokens, className }: SectionBaseProps) {
  void tokens;

  const sectionRef = useRef<HTMLElement | null>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const [visibleCards, setVisibleCards] = useState<number[]>([]);

  const members = resolveTeamMembers(config);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof IntersectionObserver === 'undefined'
    ) {
      requestAnimationFrame(() => setVisibleCards(members.map((_, index) => index)));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = Number((entry.target as HTMLElement).dataset['index']);
          setVisibleCards((current) =>
            current.includes(index) ? current : [...current, index],
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

  const companyName = branding.name.trim() || 'CCR Renovations';

  return (
    <section
      id="our-team"
      ref={sectionRef}
      className={`py-20 ${className ?? ''}`}
      style={{ backgroundColor: 'oklch(0.97 0.005 85)' }}
      aria-labelledby="team-row-heading"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="team-row-heading"
            className="font-[Anton,sans-serif] text-[36px] uppercase leading-[1.1] tracking-wide text-[oklch(0.35_0.06_160)] md:text-[48px]"
          >
            Our Team
          </h2>
          <p className="mt-4 font-[Open_Sans,sans-serif] text-[16px] leading-[26px] text-[oklch(0.45_0.02_85)] md:text-[18px]">
            Meet the team behind {companyName}
          </p>
        </div>

        {/* Horizontal scroll on mobile, 4-col grid on desktop */}
        <div className="mt-12 flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[oklch(0.35_0.06_160/0.2)] md:grid md:grid-cols-2 md:overflow-visible md:pb-0 lg:grid-cols-4">
          {members.map((member, index) => {
            const isVisible = visibleCards.includes(index);
            return (
              <article
                key={`${member.name}-${index}`}
                ref={(element) => {
                  cardRefs.current[index] = element;
                }}
                data-index={index}
                className={`flex min-w-[260px] shrink-0 flex-col items-center rounded-[8px] bg-white p-8 shadow-[0_2px_16px_rgba(0,0,0,0.06)] transition-all duration-700 ease-out will-change-transform md:min-w-0 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                }`}
                style={{ transitionDelay: `${index * 120}ms` }}
              >
                {/* Circular photo with hover scale */}
                <div className="relative h-[200px] w-[200px] overflow-hidden rounded-full bg-[oklch(0.93_0.005_85)] transition-transform duration-300 hover:scale-105">
                  {member.photo_url ? (
                    <Image
                      src={member.photo_url}
                      alt={`${member.name}, ${member.role || 'team member'} at ${companyName}`}
                      fill
                      sizes="200px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="h-16 w-16 text-[oklch(0.35_0.06_160/0.3)]"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="8" r="4" />
                        <path d="M5.5 21a7.5 7.5 0 0 1 13 0" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Name */}
                <h3 className="mt-6 font-[Anton,sans-serif] text-[20px] uppercase leading-[1.2] tracking-wide text-[oklch(0.35_0.06_160)]">
                  {member.name}
                </h3>

                {/* Role in green accent */}
                {member.role && (
                  <p className="mt-1 font-[Open_Sans,sans-serif] text-[14px] font-semibold text-[oklch(0.42_0.10_160)]">
                    {member.role}
                  </p>
                )}

                {/* Bio */}
                {member.bio && (
                  <p className="mt-4 text-center font-[Open_Sans,sans-serif] text-[14px] leading-[22px] text-[oklch(0.45_0.02_85)]">
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
