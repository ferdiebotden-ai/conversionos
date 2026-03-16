import {
  extractButtons,
  extractEmails,
  extractHeadings,
  extractHexColours,
  extractImages,
  extractLinks,
  extractMetaMap,
  extractPhones,
  extractSocialLinks,
  extractTextLines,
  extractTitle,
  uniqueStrings,
} from './html-signals.mjs';

const SERVICE_KEYWORDS = [
  ['kitchen', 'Kitchen renovations'],
  ['bathroom', 'Bathroom renovations'],
  ['basement', 'Basement renovations'],
  ['addition', 'Home additions'],
  ['whole home', 'Whole-home renovations'],
  ['custom home', 'Custom homes'],
  ['design build', 'Design-build'],
  ['carpentry', 'Custom carpentry'],
];

const TRUST_KEYWORDS = [
  'licensed',
  'insured',
  'wsib',
  'warranty',
  'family',
  'craftsmanship',
  'years',
  'reviews',
  'testimonial',
  'award',
  'trusted',
];

const CTA_KEYWORDS = [
  'estimate',
  'quote',
  'consult',
  'call',
  'contact',
  'book',
  'visualize',
  'design',
  'get started',
];

function cleanBusinessName({ title, headings, metaMap, domain }) {
  const ogName = metaMap.get('og:site_name') || '';
  if (ogName) {
    return ogName.trim();
  }

  const h1 = headings.find((item) => item.level === 'h1')?.text || '';
  if (h1 && h1.length <= 60) {
    return h1.trim();
  }

  if (title) {
    return title.split(/\||-|::/)[0].trim();
  }

  return domain.replace(/^www\./, '');
}

function inferTone(lines, ctas) {
  const sample = uniqueStrings([...lines.slice(0, 4), ...ctas.map((item) => item.label).slice(0, 2)]).slice(0, 5);
  const haystack = sample.join(' ').toLowerCase();
  const descriptors = [];

  if (/luxury|premium|bespoke|custom/.test(haystack)) descriptors.push('premium');
  if (/family|local|neighbour|community/.test(haystack)) descriptors.push('local-trust');
  if (/design|visualize|inspiration|dream/.test(haystack)) descriptors.push('design-forward');
  if (/craftsmanship|quality|detail|build/.test(haystack)) descriptors.push('craft-led');
  if (descriptors.length === 0) descriptors.push('practical-owner-led');

  return { descriptors, sampleLines: sample };
}

function collectServices(candidates) {
  const services = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const lower = candidate.toLowerCase();
    for (const [needle, name] of SERVICE_KEYWORDS) {
      if (!lower.includes(needle) || seen.has(name.toLowerCase())) {
        continue;
      }
      seen.add(name.toLowerCase());
      services.push({
        name,
        confidence: candidate.length <= 60 ? 'high' : 'medium',
        evidence: candidate,
      });
    }
  }
  return services.slice(0, 6);
}

function collectTrustMarkers(lines) {
  return uniqueStrings(
    lines.filter((line) => TRUST_KEYWORDS.some((needle) => line.toLowerCase().includes(needle)))
  ).slice(0, 8);
}

function collectTestimonials(lines) {
  return uniqueStrings(
    lines.filter((line) => /"|review|testimonial|stars?/.test(line.toLowerCase()) && line.length <= 220)
  ).slice(0, 5);
}

function collectCallsToAction(links, buttons) {
  const raw = [
    ...links.map((link) => ({ label: link.text, href: link.href, placement: 'unknown' })),
    ...buttons.map((button) => ({ label: button.text, href: null, placement: 'unknown' })),
  ];

  const filtered = [];
  const seen = new Set();
  for (const item of raw) {
    const label = item.label.trim();
    if (!CTA_KEYWORDS.some((needle) => label.toLowerCase().includes(needle))) {
      continue;
    }
    const key = label.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    filtered.push({ ...item });
  }
  return filtered.slice(0, 6);
}

export function buildBrandResearchBundle({ html, sourceUrl, siteId, capturedAt, sourceType }) {
  const title = extractTitle(html);
  const metaMap = extractMetaMap(html);
  const headings = extractHeadings(html);
  const links = extractLinks(html, sourceUrl);
  const buttons = extractButtons(html);
  const images = extractImages(html, sourceUrl);
  const textLines = extractTextLines(html);
  const phone = extractPhones(html)[0] || null;
  const email = extractEmails(html)[0] || null;
  const ctas = collectCallsToAction(links, buttons);
  const socialLinks = extractSocialLinks(links).map((item) => ({ label: item.text, href: item.href }));
  const heroImages = images.slice(0, 2).map((image) => image.src);
  const galleryImages = images.slice(0, 8).map((image) => image.src);
  const logoCandidates = images
    .filter((image) => /logo|brand|header/.test(`${image.alt} ${image.src}`.toLowerCase()))
    .map((image) => image.src)
    .slice(0, 3);
  const domain = new URL(sourceUrl).hostname;
  const metaDescription = metaMap.get('description') || metaMap.get('og:description') || textLines[0] || '';
  const heroHeading = headings.find((item) => item.level === 'h1')?.text || title;
  const services = collectServices([
    ...headings.map((item) => item.text),
    ...links.map((item) => item.text),
    ...textLines,
  ]);

  return {
    version: '0.1.0',
    siteId,
    sourceUrl,
    capturedAt,
    sourceType,
    identity: {
      name: cleanBusinessName({ title, headings, metaMap, domain }),
      domain,
      titleTag: title,
      heroHeading,
      metaDescription,
      phone,
      email,
    },
    visualTokens: {
      colours: extractHexColours(html).slice(0, 6),
      logoCandidates,
      heroImages,
    },
    layoutPatterns: {
      navigationLabels: uniqueStrings(links.map((item) => item.text).filter((text) => text.length <= 24)).slice(0, 8),
      sectionHeadings: uniqueStrings(headings.map((item) => item.text)).slice(0, 10),
      preferredHeroLayout: heroImages.length > 0 ? 'full-bleed-image-overlay' : 'editorial-split',
    },
    copyTone: inferTone([heroHeading, metaDescription, ...textLines], ctas),
    trustMarkers: collectTrustMarkers(textLines),
    services,
    proofAssets: {
      heroImages,
      galleryImages,
      testimonialSnippets: collectTestimonials(textLines),
      socialLinks,
    },
    ctaPatterns: ctas,
  };
}
