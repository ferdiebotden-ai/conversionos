/**
 * Shared quality gate functions for onboarding provisioning.
 * Used by provision.mjs and tested in provision-quality-gates.test.mjs.
 */

/** Infer a Lucide icon hint from a service name. */
export function inferServiceIcon(serviceName) {
  const name = serviceName.toLowerCase();
  if (name.includes('kitchen')) return 'chef-hat';
  if (name.includes('bathroom') || name.includes('bath')) return 'bath';
  if (name.includes('basement')) return 'home';
  if (name.includes('flooring') || name.includes('floor')) return 'layers';
  if (name.includes('outdoor') || name.includes('deck') || name.includes('patio')) return 'trees';
  if (name.includes('painting') || name.includes('paint')) return 'paintbrush';
  if (name.includes('plumbing')) return 'droplets';
  if (name.includes('electrical')) return 'zap';
  if (name.includes('roofing') || name.includes('roof')) return 'warehouse';
  if (name.includes('window') || name.includes('door')) return 'door-open';
  if (name.includes('addition') || name.includes('extension')) return 'building';
  if (name.includes('custom') || name.includes('renovation') || name.includes('remodel')) return 'hammer';
  return 'wrench';
}

/** Infer a Lucide icon hint from a trust badge label. */
export function inferBadgeIcon(label) {
  const l = label.toLowerCase();
  if (l.includes('licensed') || l.includes('insured') || l.includes('bonded')) return 'shield-check';
  if (l.includes('bbb') || l.includes('accredit')) return 'badge-check';
  if (l.includes('wsib') || l.includes('safety')) return 'hard-hat';
  if (l.includes('ontario') || l.includes('local') || l.includes('based')) return 'map-pin';
  if (l.includes('guarantee') || l.includes('warranty')) return 'shield';
  if (l.includes('eco') || l.includes('green') || l.includes('energy')) return 'leaf';
  if (l.includes('renomark') || l.includes('certified')) return 'award';
  if (l.includes('member') || l.includes('association')) return 'users';
  if (l.includes('year') || l.includes('experience')) return 'calendar';
  return 'award';
}

/** Quality gate for hero headlines. Rejects generic/short/long/business-name-only headlines. */
export function isStrongHero(headline, businessName = '') {
  if (!headline || headline.length < 10 || headline.length > 100) return false;
  const generic = ['welcome', 'home page', 'about us', 'home', 'our company', 'main page'];
  const lower = headline.toLowerCase().trim();
  if (generic.some(g => lower === g || lower.startsWith(g + ' '))) return false;
  const bizName = businessName.toLowerCase();
  if (bizName && lower === bizName) return false;
  return true;
}

// ─── Testimonial Normalization (Issue #2 — Mar 8, 2026) ─────────────────────

/** Normalize testimonial field names from scraper variants to canonical form. */
export function normalizeTestimonial(t) {
  return {
    author: t.author || t.name || t.reviewer || '',
    quote: t.quote || t.text || t.content || t.review || '',
    project_type: t.project_type || t.type || t.project || '',
    rating: t.rating || null,
    platform: t.platform || '',
  };
}

/** Filter testimonials: normalize field names, require author > 2 chars, quote > 20 chars, min 2 valid. */
export function filterTestimonials(raw) {
  const normalized = raw.map(normalizeTestimonial);
  const valid = normalized.filter(t =>
    t.author && t.author.length > 2 &&
    t.quote && t.quote.length > 20
  );
  return valid.length >= 2 ? valid : [];
}

// ─── aboutCopy Type Coercion (Issue #5 — Mar 8, 2026) ───────────────────────

/** Coerce aboutCopy to a string array. Handles string, string[], null/undefined. */
export function normalizeAboutCopy(raw) {
  if (!raw) return [];
  if (typeof raw === 'string') return raw.trim() ? [raw.trim()] : [];
  if (Array.isArray(raw)) return raw.filter(p => typeof p === 'string' && p.trim());
  return [];
}

// ─── Portfolio Title Diversification (Issue #4 — Mar 8, 2026) ────────────────

const GENERIC_PORTFOLIO_TITLES = [
  'custom renovation', 'renovation', 'project', 'renovation project',
  'home renovation', 'recent project', 'our work', 'portfolio',
  'completed project', 'finished project', 'undefined',
];

/**
 * Diversify portfolio titles: if >50% share the same title or are generic,
 * replace with service_type/room_type-specific titles.
 */
export function diversifyPortfolioTitles(portfolio) {
  if (portfolio.length < 2) return portfolio;

  // Count generic titles
  let genericCount = 0;
  const titleCounts = {};
  for (const p of portfolio) {
    const key = (p.title || '').toLowerCase().trim();
    titleCounts[key] = (titleCounts[key] || 0) + 1;
    if (GENERIC_PORTFOLIO_TITLES.includes(key) || !key) genericCount++;
  }

  // Also count duplicates (same title repeated)
  const maxCount = Math.max(...Object.values(titleCounts));
  const needsDiversification = genericCount > portfolio.length * 0.5 || maxCount > portfolio.length * 0.5;

  if (!needsDiversification) return portfolio;

  const usedTitles = new Set();
  let fallbackCounter = 1;

  return portfolio.map(p => {
    const titleLower = (p.title || '').toLowerCase().trim();
    const isGeneric = GENERIC_PORTFOLIO_TITLES.includes(titleLower) || !titleLower;
    const isDuplicate = titleCounts[titleLower] > 1;

    if (!isGeneric && !isDuplicate) {
      usedTitles.add(p.title);
      return p;
    }

    // Generate a better title from service_type or room_type
    const roomType = p.service_type || p.room_type || '';
    let newTitle;
    if (roomType) {
      newTitle = `${roomType} Renovation`;
      // Avoid duplicates within generated titles
      if (usedTitles.has(newTitle)) {
        newTitle = `${roomType} Project`;
      }
      if (usedTitles.has(newTitle)) {
        newTitle = `${roomType} Transformation`;
      }
    }
    if (!newTitle || usedTitles.has(newTitle)) {
      newTitle = `Project ${fallbackCounter++}`;
    }

    usedTitles.add(newTitle);
    return { ...p, title: newTitle };
  });
}

/** Filter portfolio items: require valid image URL and non-empty title. Diversify generic titles. */
export function filterPortfolio(raw) {
  const filtered = raw.filter(p =>
    p.image_url && (p.image_url.startsWith('http') || p.image_url.startsWith('/'))
    && p.title && p.title.length > 0
  );
  return diversifyPortfolioTitles(filtered);
}

// ─── Brand Name Leakage Detection (Issue #5 — Mar 8, 2026) ──────────────────

/** Business name suffixes that indicate a contractor name. */
const BIZ_SUFFIXES_RE = /\b(\w[\w\s'-]*?)\s+(contracting|renovations?|construction|homes?|builders?|carpentry|interiors?|craftsmen|inc\.?|ltd\.?|corp\.?)\b/gi;

/**
 * Extract text from a data field. Handles string, string[], or array of objects with description/title.
 */
function extractText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        return [item.title, item.description].filter(Boolean).join(' ');
      }
      return '';
    }).join(' ');
  }
  return '';
}

/**
 * Detect foreign brand names in scraped text fields.
 * Returns warnings (not blocking) for contractor-name patterns that don't match expectedName.
 */
export function detectForeignBrandNames(data, expectedName) {
  if (!expectedName) return [];
  const warnings = [];
  const normalizedExpected = expectedName.toLowerCase().trim();
  // Build word set from expected name for partial matching
  const expectedWords = normalizedExpected.split(/\s+/).filter(w => w.length > 2);

  const textFields = [
    { key: 'about_copy', label: 'About copy' },
    { key: 'why_choose_us', label: 'Why choose us' },
    { key: 'mission', label: 'Mission' },
  ];

  for (const { key, label } of textFields) {
    const text = extractText(data[key]);
    if (!text) continue;

    // Find contractor-name-like patterns
    let match;
    const re = new RegExp(BIZ_SUFFIXES_RE.source, 'gi');
    while ((match = re.exec(text)) !== null) {
      const candidateName = match[0].trim();
      const candidateLower = candidateName.toLowerCase();
      const prefix = match[1].trim();

      // Skip very short prefix matches (e.g., "do construction", "we homes")
      if (prefix.length < 3) continue;
      // Skip common false positives (articles, pronouns before suffix)
      if (/^(the|our|my|a|an|in|or|we|is|of|no|do|to)\b/i.test(prefix)) continue;
      // Skip if prefix ends with a preposition/article (e.g., "trusted partner for renovations")
      if (/\b(the|our|my|a|an|in|or|for|we|is|of|no|do|to|with|and|your|at|by|as|its)\s*$/i.test(prefix)) continue;

      // Skip if candidate is part of the expected business name or vice versa
      if (normalizedExpected.includes(candidateLower) || candidateLower.includes(normalizedExpected)) {
        continue;
      }
      // Skip if the candidate shares significant words with the expected name
      const candidateWords = candidateLower.split(/\s+/).filter(w => w.length > 2);
      const overlap = candidateWords.filter(w => expectedWords.includes(w));
      if (overlap.length >= candidateWords.length * 0.5) continue;

      const contextStart = Math.max(0, match.index - 30);
      const contextEnd = Math.min(text.length, match.index + match[0].length + 30);
      warnings.push({
        field: key,
        label,
        foreignName: candidateName,
        context: text.slice(contextStart, contextEnd).trim(),
      });
    }
  }

  return warnings;
}

/** Filter services: require name >= 3 chars, description >= 10 chars, no placeholders. */
export function filterServices(raw) {
  const placeholder = ['service 1', 'service 2', 'tbd', 'placeholder', 'coming soon'];
  return raw.filter(s => {
    if (!s.name || s.name.length < 3) return false;
    if (!s.description || s.description.length < 10) return false;
    if (placeholder.includes(s.name.toLowerCase().trim())) return false;
    return true;
  });
}
