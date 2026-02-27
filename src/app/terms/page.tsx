import type { Metadata } from 'next';
import { getBranding } from '@/lib/branding';

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return {
    title: `Terms of Service | ${branding.name}`,
    description: `Terms of service for ${branding.name}. Read our terms for using AI-powered renovation visualization and quoting services.`,
  };
}

export default async function TermsPage() {
  const branding = await getBranding();

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">
        {branding.name} &mdash; Last updated: February 27, 2026
      </p>

      <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using the {branding.name} website and services, you agree to be bound
            by these Terms of Service. If you do not agree, please do not use our services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Service Description</h2>
          <p className="text-muted-foreground leading-relaxed">
            {branding.name} provides an AI-powered renovation platform that includes:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
            <li>AI renovation visualization (photo-based design concepts)</li>
            <li>Automated cost estimation and quoting</li>
            <li>AI chat and voice assistants for project guidance</li>
            <li>Lead capture and project management tools</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. AI-Generated Content</h2>
          <p className="text-muted-foreground leading-relaxed">
            Our platform uses artificial intelligence to generate renovation visualizations, cost
            estimates, and project recommendations. You acknowledge that:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
            <li>AI-generated visualizations are conceptual renderings, not exact representations of final results</li>
            <li>Cost estimates are approximate and may vary from final project costs by &plusmn;15% or more</li>
            <li>AI recommendations are for informational purposes and do not constitute professional engineering or architectural advice</li>
            <li>Final project scope, pricing, and specifications are subject to an in-person assessment</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">
            You agree not to:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Use automated tools or scripts to scrape or extract data from our platform</li>
            <li>Upload content that is illegal, harmful, or infringes on third-party rights</li>
            <li>Attempt to reverse-engineer, decompile, or misuse our AI features</li>
            <li>Use the service to generate misleading or fraudulent content</li>
            <li>Interfere with or disrupt the service or servers</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Intellectual Property</h2>
          <p className="text-muted-foreground leading-relaxed">
            AI-generated visualizations created through our platform are provided for your personal
            use in evaluating renovation projects. The underlying AI models, platform code, and
            branding remain the intellectual property of {branding.name} and its technology providers.
            You may share generated visualizations for personal or project planning purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Limitation of Liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            To the maximum extent permitted by applicable law, {branding.name} shall not be liable
            for any indirect, incidental, special, consequential, or punitive damages arising from
            your use of the service. Our total liability for any claim shall not exceed the amount
            you have paid to us in the 12 months preceding the claim.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            AI-generated estimates and visualizations are provided &quot;as is&quot; without warranty.
            Actual renovation costs, timelines, and outcomes may differ from AI projections.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. Privacy</h2>
          <p className="text-muted-foreground leading-relaxed">
            Your use of our services is also governed by our{' '}
            <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>,
            which describes how we collect, use, and protect your personal information.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">8. Termination</h2>
          <p className="text-muted-foreground leading-relaxed">
            We reserve the right to suspend or terminate your access to the service at any time
            for violation of these terms. You may stop using the service at any time. Upon
            termination, your right to use the service ceases immediately.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">9. Governing Law</h2>
          <p className="text-muted-foreground leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of the
            Province of Ontario and the federal laws of Canada applicable therein, without regard
            to conflict of law principles. Any disputes arising from these Terms shall be resolved
            in the courts of Ontario, Canada.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">10. Changes to These Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update these Terms from time to time. We will notify you of any material changes
            by posting the updated Terms on this page with a revised &quot;Last updated&quot; date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have questions about these Terms, please contact us:
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
