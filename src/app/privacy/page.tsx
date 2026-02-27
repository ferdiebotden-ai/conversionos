import type { Metadata } from 'next';
import Link from 'next/link';
import { getBranding } from '@/lib/branding';

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return {
    title: `Privacy Policy | ${branding.name}`,
    description: `Privacy policy for ${branding.name}. Learn how we collect, use, and protect your personal information.`,
  };
}

export default async function PrivacyPage() {
  const branding = await getBranding();

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">
        {branding.name} &mdash; Last updated: February 27, 2026
      </p>

      <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
          <p className="text-muted-foreground leading-relaxed">
            {branding.name} (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting your
            personal information. This Privacy Policy explains how we collect, use, disclose, and
            safeguard your information when you use our website and AI-powered renovation services.
            We comply with the Personal Information Protection and Electronic Documents Act (PIPEDA)
            and Canada&apos;s Anti-Spam Legislation (CASL).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            We may collect the following types of personal information:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong>Contact information:</strong> Name, email address, phone number</li>
            <li><strong>Project details:</strong> Room type, renovation preferences, style choices, project descriptions</li>
            <li><strong>Photos:</strong> Images you upload for AI visualization and analysis</li>
            <li><strong>Usage data:</strong> Pages visited, features used, interaction patterns</li>
            <li><strong>Device information:</strong> Browser type, operating system, screen resolution</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. AI Features and Third-Party Services</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Our platform uses AI-powered features that process your data through trusted third-party services:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong>OpenAI:</strong> Photo analysis and chatbot conversations (GPT models)</li>
            <li><strong>Google Gemini:</strong> AI-generated renovation visualizations</li>
            <li><strong>ElevenLabs:</strong> Voice agent interactions</li>
            <li><strong>Supabase:</strong> Secure data storage (hosted in Canada)</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            Photos and project details you provide may be sent to these services for processing.
            We do not sell or share your personal information for advertising purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. How We Use Your Information</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>To generate AI renovation visualizations and cost estimates</li>
            <li>To respond to your enquiries and provide customer service</li>
            <li>To send project-related communications (quotes, follow-ups)</li>
            <li>To send marketing communications (only with your explicit consent)</li>
            <li>To improve our services and AI accuracy</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Data Retention</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong>Lead information:</strong> Retained for 2 years from last interaction</li>
            <li><strong>AI visualizations:</strong> Retained for 1 year from creation</li>
            <li><strong>Quotes and invoices:</strong> Retained for 7 years (tax compliance)</li>
            <li><strong>Marketing preferences:</strong> Retained until you withdraw consent</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Your Rights Under PIPEDA</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            You have the right to:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
            <li><strong>Correction:</strong> Request correction of inaccurate personal information</li>
            <li><strong>Deletion:</strong> Request deletion of your personal information</li>
            <li><strong>Withdraw consent:</strong> Withdraw your consent for marketing communications at any time</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            To exercise any of these rights, please{' '}
            <Link href="/data-deletion" className="text-primary hover:underline">submit a data deletion request</Link>{' '}
            or contact us directly.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. CASL Compliance</h2>
          <p className="text-muted-foreground leading-relaxed">
            We comply with Canada&apos;s Anti-Spam Legislation (CASL). We will only send you commercial
            electronic messages if you have provided express consent. Every marketing email includes
            an unsubscribe link. We honour all unsubscribe requests within 10 business days.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">8. Data Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            We implement appropriate technical and organisational measures to protect your personal
            information, including encryption in transit (TLS), secure database hosting, and access
            controls. However, no method of electronic transmission or storage is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">9. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have questions about this Privacy Policy or wish to exercise your privacy rights,
            please contact us:
          </p>
          <ul className="list-none pl-0 text-muted-foreground space-y-1 mt-3">
            <li><strong>{branding.name}</strong></li>
            <li>{branding.address}, {branding.city}, {branding.province} {branding.postal}</li>
            <li>Email: <a href={`mailto:${branding.email}`} className="text-primary hover:underline">{branding.email}</a></li>
            <li>Phone: <a href={`tel:${branding.phone.replace(/\D/g, '')}`} className="text-primary hover:underline">{branding.phone}</a></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
