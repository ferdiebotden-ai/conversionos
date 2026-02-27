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

/** Filter testimonials: require author > 2 chars, quote > 20 chars, min 2 valid. */
export function filterTestimonials(raw) {
  const valid = raw.filter(t =>
    t.author && t.author.length > 2 &&
    t.quote && t.quote.length > 20
  );
  return valid.length >= 2 ? valid : [];
}

/** Filter portfolio items: require valid image URL and non-empty title. */
export function filterPortfolio(raw) {
  return raw.filter(p =>
    p.image_url && (p.image_url.startsWith('http') || p.image_url.startsWith('/'))
    && p.title && p.title.length > 0
  );
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
