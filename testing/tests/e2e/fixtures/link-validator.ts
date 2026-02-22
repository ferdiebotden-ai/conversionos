/**
 * Link validation helpers for autonomous E2E tests.
 */
import { type Page } from '@playwright/test';

interface LinkResult {
  url: string;
  status: number;
  isExternal: boolean;
}

interface ValidationResult {
  passed: LinkResult[];
  failed: LinkResult[];
}

export async function validatePageLinks(
  page: Page,
  path: string,
  options: { skipExternal?: boolean } = {},
): Promise<ValidationResult> {
  const { skipExternal = true } = options;
  const baseUrl = new URL(page.url()).origin;

  const hrefs: string[] = await page.$$eval('a[href]', (anchors) =>
    anchors.map((a) => (a as HTMLAnchorElement).href).filter((h) => h.startsWith('http')),
  );

  const unique = [...new Set(hrefs)];
  const passed: LinkResult[] = [];
  const failed: LinkResult[] = [];

  for (const url of unique) {
    const isExternal = !url.startsWith(baseUrl);
    if (skipExternal && isExternal) continue;

    try {
      const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      const result = { url, status: response.status, isExternal };
      if (response.ok) {
        passed.push(result);
      } else {
        failed.push(result);
      }
    } catch {
      failed.push({ url, status: 0, isExternal });
    }
  }

  return { passed, failed };
}

export async function validateCTAs(
  page: Page,
): Promise<{ found: { text: string; href: string }[] }> {
  const ctas = await page.$$eval(
    'a[href*="estimate"], a[href*="contact"], a[href*="visualizer"], button[type="submit"]',
    (els) =>
      els.map((el) => ({
        text: el.textContent?.trim() || '',
        href: (el as HTMLAnchorElement).href || '',
      })),
  );
  return { found: ctas };
}

export async function validateMetaTags(
  page: Page,
): Promise<{ hasTitle: boolean; hasViewport: boolean; title: string }> {
  const title = await page.title();
  const hasViewport = (await page.locator('meta[name="viewport"]').count()) > 0;
  return {
    hasTitle: title.length > 0,
    hasViewport,
    title,
  };
}
