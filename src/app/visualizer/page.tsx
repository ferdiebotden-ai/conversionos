import { VisualizerForm } from '@/components/visualizer/visualizer-form';
import { getBranding } from '@/lib/branding';

export async function generateMetadata() {
  const branding = await getBranding();
  return {
    title: `AI Design Visualizer | ${branding.name}`,
    description:
      'See your renovation vision come to life. Upload a photo, choose a style, and let our AI show you the possibilities.',
  };
}

export default function VisualizerPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero section */}
      <section className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Visualize Your{' '}
            <span className="text-primary">Dream Space</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload a photo of your room and our AI will show you what it could
            look like with a professional renovation. Try different styles in
            seconds.
          </p>
        </div>
      </section>

      {/* Form section */}
      <section className="container mx-auto px-4 py-8 sm:py-12">
        <VisualizerForm />
      </section>

      {/* Trust indicators */}
      <section className="border-t border-border bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">100%</span>
              Free to use
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">~30 sec</span>
              Generation time
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">Private</span>
              Your photos stay private
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
