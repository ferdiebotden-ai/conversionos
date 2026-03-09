'use client';

import Image from 'next/image';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { StaggerContainer, StaggerItem } from '@/components/motion';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function AboutTeamGrid({ config, className }: Props) {
  const members = config.teamMembers;
  if (!members || members.length === 0) return null;

  const isSingle = members.length === 1;

  return (
    <section className={`py-16 px-4 sm:px-6 lg:px-8 ${className ?? ''}`}>
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold tracking-tight text-center mb-10">
          Meet Our Team
        </h2>

        <StaggerContainer
          className={
            isSingle
              ? 'flex justify-center'
              : 'grid md:grid-cols-2 lg:grid-cols-3 gap-6'
          }
        >
          {members.map((member, i) => (
            <StaggerItem
              key={i}
              {...(isSingle ? { className: 'max-w-sm' } : {})}
            >
              <div className="flex flex-col items-center text-center p-6">
                {member.photoUrl ? (
                  <div className="relative w-32 h-32 rounded-full overflow-hidden mb-4">
                    <Image
                      src={member.photoUrl}
                      alt={member.name}
                      fill
                      className="object-cover"
                      sizes="128px"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center mb-4">
                    <span className="text-3xl font-semibold text-muted-foreground">
                      {member.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </span>
                  </div>
                )}

                <h3 className="text-lg font-semibold">{member.name}</h3>
                <p className="text-sm text-muted-foreground">{member.role}</p>

                {member.bio && (
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                    {member.bio}
                  </p>
                )}
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
