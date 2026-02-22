import { getCompanyConfig } from '@/lib/ai/knowledge/company';
import { ServicesGrid } from '@/components/services-grid';

interface ServicesGridServerProps {
  showLinks?: boolean;
}

export async function ServicesGridServer({ showLinks = true }: ServicesGridServerProps) {
  const config = await getCompanyConfig();

  const services = config.services.map(s => ({
    name: s.name,
    slug: s.slug,
    description: s.description,
    ...(s.imageUrl ? { imageUrl: s.imageUrl } : {}),
    ...(s.iconHint ? { iconHint: s.iconHint } : {}),
  }));

  return <ServicesGrid services={services} showLinks={showLinks} />;
}
