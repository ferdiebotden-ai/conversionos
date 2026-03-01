import { VisualizerForm } from '@/components/visualizer/visualizer-form';
import {
  FadeInUp,
  StaggerContainer,
  StaggerItem,
} from '@/components/motion';
import { UserX, Zap, DollarSign } from 'lucide-react';

export async function generateMetadata() {
  return {
    title: 'AI Design Visualizer',
    description:
      'See your renovation vision come to life. Upload a photo, choose a style, and let our AI show you the possibilities.',
  };
}

export default function VisualizerPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-primary/3 to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/8 via-transparent to-transparent" />
        <div className="relative container mx-auto px-4 py-14 sm:py-16 text-center">
          <FadeInUp>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Visualise Your{' '}
              <span className="text-primary">Dream Space</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload a photo of your room and our AI will show you what it could
              look like with a professional renovation. Try different styles in
              seconds.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* Form section */}
      <section className="container mx-auto px-4 py-8 sm:py-12">
        <VisualizerForm />
      </section>

      {/* Trust indicators */}
      <section className="border-t border-border bg-muted/30 py-10">
        <div className="container mx-auto px-4">
          <StaggerContainer className="flex flex-wrap justify-center gap-10 sm:gap-16">
            <StaggerItem>
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <DollarSign className="size-5 text-primary" />
                </div>
                <div>
                  <span className="font-semibold text-foreground">100%</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Free to use</p>
                </div>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <Zap className="size-5 text-primary" />
                </div>
                <div>
                  <span className="font-semibold text-foreground">~30 sec</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Generation time</p>
                </div>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <UserX className="size-5 text-primary" />
                </div>
                <div>
                  <span className="font-semibold text-foreground">No Sign-Up</span>
                  <p className="text-xs text-muted-foreground mt-0.5">No account needed</p>
                </div>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>
    </main>
  );
}
