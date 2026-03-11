#!/usr/bin/env node
/**
 * Image URL validator — pre-flight checks on scraped image URLs.
 * Validates URLs are accessible, correct content-type, and catches common issues.
 */

/**
 * Validate all image URLs in provisioned data.
 * @param {object} data - Scraped/provisioned data with image fields
 * @returns {Promise<{ valid: string[], invalid: Array<{field: string, url: string, reason: string}>, heroIsLogo: boolean }>}
 */
export async function validateImageUrls(data) {
  const results = { valid: [], invalid: [], heroIsLogo: false };

  const imageFields = [
    { field: 'hero_image_url', url: data.hero_image_url },
    { field: 'logo_url', url: data.logo_url },
    { field: 'about_image_url', url: data.about_image_url },
    { field: '_og_image_url', url: data._og_image_url },
  ];

  // Add portfolio images
  (data.portfolio || []).forEach((p, i) => {
    if (p.image_url) imageFields.push({ field: `portfolio[${i}].image_url`, url: p.image_url });
  });

  // Add service images
  (data.services || []).forEach((s, i) => {
    const imgUrl = s.image_urls?.[0] || s.imageUrl;
    if (imgUrl) imageFields.push({ field: `services[${i}].imageUrl`, url: imgUrl });
  });

  for (const { field, url } of imageFields) {
    if (!url || url.trim() === '') {
      results.invalid.push({ field, url: '', reason: 'empty_url' });
      continue;
    }

    // Reject base64 data URIs
    if (url.startsWith('data:')) {
      results.invalid.push({ field, url: url.slice(0, 50), reason: 'base64_data_uri' });
      continue;
    }

    // Reject non-HTTP URLs
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
      results.invalid.push({ field, url, reason: 'invalid_protocol' });
      continue;
    }

    // Skip relative URLs (these are Supabase Storage paths, assumed valid)
    if (url.startsWith('/')) {
      results.valid.push(url);
      continue;
    }

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000),
        headers: { 'Accept': 'image/jpeg,image/png,image/webp,*/*;q=0.8' }
      });

      if (!response.ok) {
        results.invalid.push({ field, url, reason: `http_${response.status}` });
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        results.invalid.push({ field, url, reason: `wrong_content_type: ${contentType}` });
        continue;
      }

      results.valid.push(url);
    } catch (err) {
      results.invalid.push({ field, url, reason: `fetch_error: ${err.message?.slice(0, 100)}` });
    }
  }

  // Hero-is-logo detection
  if (data.hero_image_url && data.logo_url && data.hero_image_url === data.logo_url) {
    results.heroIsLogo = true;
    results.invalid.push({ field: 'hero_image_url', url: data.hero_image_url, reason: 'hero_same_as_logo' });
  }

  return results;
}

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  import('node:util').then(({ parseArgs }) => {
    const { values: args } = parseArgs({
      options: { data: { type: 'string' } },
    });
    if (!args.data) {
      console.error('Usage: node image-validator.mjs --data /path/to/scraped.json');
      process.exit(1);
    }
    import('node:fs').then(({ readFileSync }) => {
      const data = JSON.parse(readFileSync(args.data, 'utf-8'));
      validateImageUrls(data).then(result => {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.invalid.length > 0 ? 1 : 0);
      });
    });
  });
}
