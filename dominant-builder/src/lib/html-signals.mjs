function escapeForRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function decodeHtmlEntities(value) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

export function stripTags(value) {
  return decodeHtmlEntities(String(value || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function stripNonContent(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
}

export function extractAttribute(attributes, name) {
  const pattern = new RegExp(`${escapeForRegex(name)}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = attributes.match(pattern);
  return match ? (match[1] || match[2] || match[3] || '').trim() : '';
}

export function extractTitle(html) {
  const match = stripNonContent(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripTags(match[1]) : '';
}

export function extractMetaMap(html) {
  const metaMap = new Map();
  const source = stripNonContent(html);
  const regex = /<meta\b([^>]+)>/gi;
  let match;
  while ((match = regex.exec(source))) {
    const attrs = match[1];
    const key = extractAttribute(attrs, 'name') || extractAttribute(attrs, 'property');
    const content = extractAttribute(attrs, 'content');
    if (key && content && !metaMap.has(key.toLowerCase())) {
      metaMap.set(key.toLowerCase(), stripTags(content));
    }
  }
  return metaMap;
}

export function extractHeadings(html) {
  const headings = [];
  const regex = /<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = regex.exec(stripNonContent(html)))) {
    const text = stripTags(match[2]);
    if (text) {
      headings.push({ level: match[1].toLowerCase(), text });
    }
  }
  return headings;
}

export function extractLinks(html, baseUrl) {
  const links = [];
  const regex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = regex.exec(stripNonContent(html)))) {
    const attrs = match[1];
    const href = extractAttribute(attrs, 'href');
    const text = stripTags(match[2]);
    if (!href || !text) {
      continue;
    }
    let resolved = href;
    try {
      resolved = new URL(href, baseUrl).href;
    } catch {
      resolved = href;
    }
    links.push({ href: resolved, text });
  }
  return links;
}

export function extractButtons(html) {
  const buttons = [];
  const regex = /<button\b[^>]*>([\s\S]*?)<\/button>/gi;
  let match;
  while ((match = regex.exec(stripNonContent(html)))) {
    const text = stripTags(match[1]);
    if (text) {
      buttons.push({ text });
    }
  }
  return buttons;
}

export function extractImages(html, baseUrl) {
  const images = [];
  const regex = /<img\b([^>]*)>/gi;
  let match;
  while ((match = regex.exec(stripNonContent(html)))) {
    const attrs = match[1];
    const src = extractAttribute(attrs, 'src');
    if (!src || src.startsWith('data:')) {
      continue;
    }
    const alt = stripTags(extractAttribute(attrs, 'alt'));
    let resolved = src;
    try {
      resolved = new URL(src, baseUrl).href;
    } catch {
      resolved = src;
    }
    images.push({ src: resolved, alt });
  }
  return images;
}

export function extractHexColours(html) {
  const colours = [];
  const seen = new Set();
  const regex = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
  const matches = String(html || '').match(regex) || [];
  for (const colour of matches) {
    const normalized = colour.toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      colours.push(normalized);
    }
  }
  return colours;
}

export function extractEmails(html) {
  const seen = new Set();
  const emails = [];
  const matches = stripNonContent(html).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  for (const email of matches) {
    const normalized = email.toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      emails.push(normalized);
    }
  }
  return emails;
}

export function extractPhones(html) {
  const phonesByDigits = new Map();
  const matches = stripNonContent(html).match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?){2}\d{4}/g) || [];
  for (const phone of matches) {
    const normalized = phone.replace(/\s+/g, ' ').trim();
    const digits = normalized.replace(/\D/g, '');
    const existing = phonesByDigits.get(digits);
    const currentScore = (/[()]/.test(normalized) ? 2 : 0) + (/\s/.test(normalized) ? 1 : 0) + normalized.length;
    const existingScore = existing
      ? (/[()]/.test(existing) ? 2 : 0) + (/\s/.test(existing) ? 1 : 0) + existing.length
      : -1;

    if (!existing || currentScore > existingScore) {
      phonesByDigits.set(digits, normalized);
    }
  }
  return [...phonesByDigits.values()];
}

export function extractTextLines(html) {
  const prepared = stripNonContent(html)
    .replace(/<(?:\/p|\/div|\/section|\/article|\/li|\/h[1-6]|br\s*\/?)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  return decodeHtmlEntities(prepared)
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length >= 12);
}

export function uniqueStrings(values) {
  const result = [];
  const seen = new Set();
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (!normalized || seen.has(normalized.toLowerCase())) {
      continue;
    }
    seen.add(normalized.toLowerCase());
    result.push(normalized);
  }
  return result;
}

export function extractSocialLinks(links) {
  const socialHosts = ['facebook.com', 'instagram.com', 'houzz.com', 'linkedin.com', 'youtube.com', 'tiktok.com', 'pinterest.com'];
  return links.filter((link) => socialHosts.some((host) => link.href.includes(host)));
}
