import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from "next/font/google";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ReceptionistWidgetLoader } from "@/components/receptionist/receptionist-widget-loader";
import { MobileCTABar } from "@/components/mobile-cta-bar";
import { BrandingProvider } from "@/components/branding-provider";
import { TierProvider } from "@/components/tier-provider";
import { getBranding } from "@/lib/branding";
import { getTier } from "@/lib/entitlements.server";
import { getQuoteAssistanceConfig } from "@/lib/quote-assistance";
import { getDesignTokens } from "@/lib/theme";
import { getLayoutFlags } from "@/lib/page-layout";
import { getGlobalsOverride } from "@/lib/globals-override";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return {
    title: {
      default: `${branding.name} | ${branding.city} ${branding.province} Renovation Contractor`,
      template: `%s | ${branding.name}`,
    },
    description: `Professional renovation services in ${branding.city}, ${branding.province}. ${branding.tagline}. Kitchen, bathroom, basement, and whole-home renovations with AI-powered project visualization.`,
    keywords: [
      "renovation",
      "contractor",
      `${branding.city} ${branding.province}`,
      "kitchen renovation",
      "bathroom renovation",
      "home improvement",
      branding.name,
    ],
    authors: [{ name: branding.name }],
    openGraph: {
      type: "website",
      locale: "en_CA",
      siteName: branding.name,
      ...(branding.ogImageUrl ? {
        images: [{ url: branding.ogImageUrl, width: 1200, height: 630, alt: `${branding.name} — ${branding.tagline}` }],
      } : {}),
    },
    ...(branding.faviconUrl ? {
      icons: {
        icon: branding.faviconUrl,
        apple: branding.faviconUrl,
      },
    } : {}),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [branding, tier, qaConfig, tokens, layoutFlags, globalsOverride] = await Promise.all([
    getBranding(), getTier(), getQuoteAssistanceConfig(), getDesignTokens(), getLayoutFlags(), getGlobalsOverride(),
  ]);
  const quoteMode = tier === 'elevate' ? 'none' : qaConfig.mode;

  return (
    <html lang="en">
      <head>
        {(() => {
          const oklchRegex = /^\d+(\.\d+)?\s+\d+(\.\d+)?\s+\d+(\.\d+)?$/;
          const safeOklch = branding.primaryOklch && oklchRegex.test(branding.primaryOklch)
            ? branding.primaryOklch
            : null;

          // Use theme tokens primary colour, falling back to branding
          const primaryOklch = safeOklch ?? tokens.colors.primary;
          const oklchParts = primaryOklch.split(/\s+/);
          const L = parseFloat(oklchParts[0]!);
          // L > 0.6 = light colour -> dark text; L <= 0.6 = dark colour -> white text
          const primaryForeground = L > 0.6 ? 'oklch(0.145 0 0)' : 'oklch(0.985 0 0)';

          const spacingScale = tokens.spacing === 'compact' ? '0.75' : tokens.spacing === 'spacious' ? '1.25' : '1';

          const isCustomHeadingFont = tokens.typography.headingFont !== 'Plus Jakarta Sans';
          const isCustomBodyFont = tokens.typography.bodyFont !== 'DM Sans';

          const css = [
            `:root{`,
            `--primary:oklch(${primaryOklch});`,
            `--primary-foreground:${primaryForeground};`,
            `--heading-font:'${tokens.typography.headingFont}',var(--font-plus-jakarta-sans);`,
            `--body-font:'${tokens.typography.bodyFont}',var(--font-dm-sans);`,
            `--border-radius:${tokens.borderRadius};`,
            `--spacing-scale:${spacingScale};`,
            `--color-secondary:oklch(${tokens.colors.secondary});`,
            `--color-accent:oklch(${tokens.colors.accent});`,
            `}`,
          ].join('');

          return (
            <>
              <style dangerouslySetInnerHTML={{ __html: css }} />
              {isCustomHeadingFont && (
                <link
                  rel="stylesheet"
                  href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(tokens.typography.headingFont)}:wght@400;500;600;700&display=swap`}
                />
              )}
              {isCustomBodyFont && (
                <link
                  rel="stylesheet"
                  href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(tokens.typography.bodyFont)}:wght@400;500&display=swap`}
                />
              )}
            </>
          );
        })()}
        {/* Per-tenant globals_override from admin_settings — overrides any CSS variable */}
        {globalsOverride && (
          <style dangerouslySetInnerHTML={{ __html: globalsOverride }} />
        )}
      </head>
      <body
        className={`${plusJakartaSans.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}
        data-site-id={process.env['NEXT_PUBLIC_SITE_ID'] || ''}
      >
        <BrandingProvider initial={branding}>
          <TierProvider tier={tier} quoteMode={quoteMode}>
            {!layoutFlags.custom_nav && <Header />}
            <main className="min-h-[calc(100vh-4rem)]">{children}</main>
            {!layoutFlags.custom_footer && <Footer />}
            <ReceptionistWidgetLoader />
            <MobileCTABar />
          </TierProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
