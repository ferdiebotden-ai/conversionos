export type ContentRecord = Record<string, unknown>;

export function str(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

export function asRecord(value: unknown): ContentRecord {
  return value && typeof value === 'object' ? (value as ContentRecord) : {};
}

export function asRecordArray(value: unknown): ContentRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is ContentRecord => !!item && typeof item === 'object')
    : [];
}

export function textList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        const record = asRecord(item);
        return (
          str(record['title']) ||
          str(record['name']) ||
          str(record['description']) ||
          str(record['text'])
        );
      })
      .filter(Boolean);
  }

  const text = str(value);
  if (!text) return [];

  return text
    .split(/\n{2,}|\r\n\r\n|(?<=[.!?])\s{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = Array.isArray(value) ? textList(value).join(' ') : str(value);
    if (text) return text;
  }
  return '';
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface ServiceContent {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  features: string[];
}

export function normalizeServices(value: unknown): ServiceContent[] {
  return asRecordArray(value)
    .map((item) => {
      const name = str(item['name']) || str(item['title']) || str(item['service']);
      if (!name) return null;

      const rawFeatures = Array.isArray(item['features']) ? item['features'] : [];
      const features = rawFeatures
        .map((feature) => {
          if (typeof feature === 'string') return feature.trim();
          const record = asRecord(feature);
          return str(record['label']) || str(record['title']) || str(record['name']);
        })
        .filter(Boolean);

      return {
        name,
        slug: str(item['slug']) || slugify(name),
        description:
          str(item['shortDescription']) ||
          str(item['short_description']) ||
          str(item['description']) ||
          str(item['summary']),
        imageUrl:
          str(item['imageUrl']) ||
          str(item['image_url']) ||
          str(item['image']) ||
          str(item['photo']) ||
          str(item['src']),
        features,
      } satisfies ServiceContent;
    })
    .filter((item): item is ServiceContent => Boolean(item));
}

export interface PortfolioContent {
  title: string;
  category: string;
  location: string;
  description: string;
  imageUrl: string;
}

export function normalizePortfolio(value: unknown): PortfolioContent[] {
  return asRecordArray(value)
    .map((item, index) => {
      const title = str(item['title']) || str(item['name']) || `Featured Project ${index + 1}`;
      const category =
        str(item['category']) ||
        str(item['serviceType']) ||
        str(item['service_type']) ||
        str(item['type']) ||
        'Renovation';

      return {
        title,
        category,
        location: str(item['location']) || str(item['serviceArea']) || '',
        description: str(item['description']) || str(item['copy']),
        imageUrl:
          str(item['imageUrl']) ||
          str(item['image_url']) ||
          str(item['image']) ||
          str(item['photo']) ||
          str(item['src']) ||
          str(item['url']),
      } satisfies PortfolioContent;
    })
    .filter((item) => item.imageUrl);
}

export interface TestimonialContent {
  author: string;
  quote: string;
  rating: number;
  projectType: string;
}

export function normalizeTestimonials(value: unknown): TestimonialContent[] {
  return asRecordArray(value)
    .map((item) => {
      const author = str(item['author']) || str(item['name']);
      const quote = str(item['quote']) || str(item['text']) || str(item['testimonial']);
      if (!author || !quote) return null;

      const rawRating = Number(item['rating']);

      return {
        author,
        quote,
        rating: Number.isFinite(rawRating) ? Math.max(1, Math.min(5, rawRating)) : 5,
        projectType:
          str(item['projectType']) ||
          str(item['project_type']) ||
          str(item['role']) ||
          'Renovation Client',
      } satisfies TestimonialContent;
    })
    .filter((item): item is TestimonialContent => Boolean(item));
}
