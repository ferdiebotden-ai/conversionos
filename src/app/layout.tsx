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
  const [branding, tier, qaConfig] = await Promise.all([
    getBranding(), getTier(), getQuoteAssistanceConfig(),
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
          return safeOklch ? (
            <style dangerouslySetInnerHTML={{
              __html: `:root{--primary:oklch(${safeOklch})}`
            }} />
          ) : null;
        })()}
      </head>
      <body
        className={`${plusJakartaSans.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}
        data-site-id={process.env['NEXT_PUBLIC_SITE_ID'] || ''}
      >
        <BrandingProvider initial={branding}>
          <TierProvider tier={tier} quoteMode={quoteMode}>
            <Header />
            <main className="min-h-[calc(100vh-4rem)]">{children}</main>
            <Footer />
            <ReceptionistWidgetLoader />
            <MobileCTABar />
          </TierProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
