// @ts-nocheck
"use client";

import Image from "next/image";
import Link from "next/link";

import type { SectionBaseProps } from "@/lib/section-types";

type BusinessInfo = {
  business_name?: string;
  tagline?: string;
  phone?: string;
  email?: string;
  address?: string;
};

type SocialLinks = {
  facebook?: string;
  instagram?: string;
};

function FacebookIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.6 1.6-1.6H16V4.8c-.3 0-1.1-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.7V11H8v3h2.3v7h3.2Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current">
      <rect x="3" y="3" width="18" height="18" rx="5" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" strokeWidth="1.8" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Footer({ branding, config: rawConfig, tokens, className }: SectionBaseProps) {
  const config = rawConfig as unknown as Record<string, unknown>;
  const businessInfo = (config as { business_info?: BusinessInfo })?.business_info;
  const companyProfile = (config as { company_profile?: { social_links?: SocialLinks } })?.company_profile;
  const socialLinks = companyProfile?.social_links;
  const rawLogo = (branding as { logo?: string | { src?: string } } | undefined)?.logo;

  const businessName = businessInfo?.business_name ?? branding?.name;
  const tagline = businessInfo?.tagline ?? "Renovations Made Easy";
  const phone = businessInfo?.phone;
  const email = businessInfo?.email;
  const address = businessInfo?.address ?? "Kitchener, ON N2H 4X8";
  const logoSrc = typeof rawLogo === "string" ? rawLogo : rawLogo?.src ?? null;

  if (!businessName || !phone || !email || !address) return null;

  const phoneHref = `tel:${phone.replace(/[^+\d]/g, "")}`;
  const quickLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/services", label: "Services" },
    { href: "/gallery", label: "Gallery" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <footer
      className={`bg-[oklch(var(--contrast,0.141_0_0))] text-muted-foreground ${className ?? ""}`}
      style={{
        fontFamily: "Mulish, sans-serif",
      }}
    >
      <section className="px-4 pb-[24px] pt-[60px] md:px-6 md:pb-[24px] md:pt-[60px]">
        <div className="mx-auto max-w-[1700px]">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
            <article className="space-y-5">
              <Link
                href="/"
                aria-label={`${businessName} home`}
                className="inline-flex max-w-[240px] items-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black"
              >
                {logoSrc ? (
                  <Image
                    src={logoSrc}
                    alt={businessName}
                    width={220}
                    height={72}
                    className="h-auto w-auto max-w-full brightness-0 invert"
                  />
                ) : (
                  <span
                    className="text-2xl font-bold tracking-[0.12em] text-primary-foreground"
                    style={{ fontFamily: "Raleway, sans-serif" }}
                  >
                    {businessName}
                  </span>
                )}
              </Link>

              <p className="text-[14px] font-normal leading-6 text-[oklch(var(--contrast-4,0.596_0_0))]">
                {tagline}
              </p>

              <nav aria-label="Social media links" className="flex items-center gap-4">
                {socialLinks?.facebook ? (
                  <a
                    href={socialLinks.facebook}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Facebook"
                    className="text-[oklch(var(--contrast-5,0.771_0_0))] transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <FacebookIcon />
                  </a>
                ) : null}

                {socialLinks?.instagram ? (
                  <a
                    href={socialLinks.instagram}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram"
                    className="text-[oklch(var(--contrast-5,0.771_0_0))] transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <InstagramIcon />
                  </a>
                ) : null}
              </nav>
            </article>

            <nav aria-label="Quick links" className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-foreground">
                Quick Links
              </h2>
              <div className="flex flex-col gap-3">
                {quickLinks.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="w-fit text-[14px] font-normal leading-6 text-[oklch(var(--contrast-4,0.596_0_0))] transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>

            <article className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-foreground">
                Contact Info
              </h2>
              <address className="not-italic">
                <div className="flex flex-col gap-3 text-[14px] font-normal leading-6 text-[oklch(var(--contrast-4,0.596_0_0))]">
                  <p>{address}</p>
                  <a
                    href={phoneHref}
                    className="w-fit transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {phone}
                  </a>
                  <a
                    href={`mailto:${email}`}
                    className="w-fit transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {email}
                  </a>
                </div>
              </address>
            </article>
          </div>

          <div className="mt-10 border-t border-[oklch(var(--contrast-3,0.414_0.01_326))] pt-5">
            <p className="text-center text-[12px] font-normal leading-5 text-[oklch(var(--contrast-4,0.596_0_0))]">
              © 2026 {businessName}. All rights reserved.
            </p>
          </div>
        </div>
      </section>
    </footer>
  );
}
