/**
 * T-17: Performance (Lighthouse Metrics)
 * Measure Core Web Vitals on top pages across viewports.
 * ~20 tests covering LCP, CLS, image optimization, bundle size, and network requests.
 *
 * Uses the browser Performance API (PerformanceObserver) to measure real metrics.
 * Thresholds are generous to account for cold starts and shared hosting.
 */
import { test, expect } from '@playwright/test';
import { navigateAndWait, waitForNetworkIdle } from '../../fixtures/autonomous-helpers';

// ---------------------------------------------------------------------------
// Pages & viewports under test
// ---------------------------------------------------------------------------
const PERF_PAGES = [
  { path: '/', name: 'Home' },
  { path: '/services', name: 'Services' },
  { path: '/estimate', name: 'Estimate' },
  { path: '/visualizer', name: 'Visualizer' },
  { path: '/admin/leads', name: 'Admin Leads' },
] as const;

const PERF_VIEWPORTS = [
  { label: 'Mobile', width: 375, height: 812 },
  { label: 'Desktop', width: 1440, height: 900 },
] as const;

// Thresholds
const LCP_THRESHOLD_MS = 4000;
const CLS_THRESHOLD = 0.25;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Measure LCP via PerformanceObserver (buffered). Returns ms or null. */
async function measureLCP(page: import('@playwright/test').Page): Promise<number | null> {
  return page.evaluate(() => {
    return new Promise<number | null>((resolve) => {
      let lcpValue: number | null = null;
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            lcpValue = entries[entries.length - 1].startTime;
          }
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        // Give observer time to collect buffered entries
        setTimeout(() => {
          observer.disconnect();
          resolve(lcpValue);
        }, 3000);
      } catch {
        // PerformanceObserver may not be supported
        resolve(null);
      }
    });
  });
}

/** Measure CLS via PerformanceObserver (buffered). Returns score or null. */
async function measureCLS(page: import('@playwright/test').Page): Promise<number | null> {
  return page.evaluate(() => {
    return new Promise<number | null>((resolve) => {
      let clsScore = 0;
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const layoutShift = entry as any;
            if (!layoutShift.hadRecentInput) {
              clsScore += layoutShift.value || 0;
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => {
          observer.disconnect();
          resolve(clsScore);
        }, 3000);
      } catch {
        resolve(null);
      }
    });
  });
}

/** Measure TBT approximation using Long Task observer. Returns ms or null. */
async function measureTBT(page: import('@playwright/test').Page): Promise<number | null> {
  return page.evaluate(() => {
    return new Promise<number | null>((resolve) => {
      let tbt = 0;
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // TBT = sum of (duration - 50ms) for tasks > 50ms
            if (entry.duration > 50) {
              tbt += entry.duration - 50;
            }
          }
        });
        observer.observe({ type: 'longtask', buffered: true });
        setTimeout(() => {
          observer.disconnect();
          resolve(tbt);
        }, 3000);
      } catch {
        resolve(null);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// 1. Core Web Vitals — Top 5 Pages x 2 Viewports (10 tests)
// ---------------------------------------------------------------------------
test.describe('T-17.1 — Core Web Vitals', () => {
  for (const pageInfo of PERF_PAGES) {
    for (const vp of PERF_VIEWPORTS) {
      test(`${pageInfo.name} @ ${vp.label} — LCP < ${LCP_THRESHOLD_MS / 1000}s, CLS < ${CLS_THRESHOLD}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        // For admin pages, handle auth redirect gracefully
        if (pageInfo.path.startsWith('/admin')) {
          await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
          // If redirected to login, still measure the login page performance
        } else {
          await navigateAndWait(page, pageInfo.path);
        }

        // Collect metrics in parallel
        const [lcp, cls, tbt] = await Promise.all([
          measureLCP(page),
          measureCLS(page),
          measureTBT(page),
        ]);

        console.log(
          `  ${pageInfo.name} @ ${vp.label}: LCP=${lcp ? `${Math.round(lcp)}ms` : 'N/A'}, ` +
            `CLS=${cls !== null ? cls.toFixed(4) : 'N/A'}, ` +
            `TBT=${tbt !== null ? `${Math.round(tbt)}ms` : 'N/A'}`,
        );

        // LCP assertion (allow null — observer may not fire on simple pages)
        if (lcp !== null) {
          expect(lcp, `LCP for ${pageInfo.name} @ ${vp.label} should be < ${LCP_THRESHOLD_MS}ms`).toBeLessThan(
            LCP_THRESHOLD_MS,
          );
        }

        // CLS assertion
        if (cls !== null) {
          expect(cls, `CLS for ${pageInfo.name} @ ${vp.label} should be < ${CLS_THRESHOLD}`).toBeLessThan(
            CLS_THRESHOLD,
          );
        }
      });
    }
  }
});

// ---------------------------------------------------------------------------
// 2. Image Optimization (5 tests)
// ---------------------------------------------------------------------------
test.describe('T-17.2 — Image Optimization', () => {
  test('Home page — all images have width/height or aspect-ratio', async ({ page }) => {
    await navigateAndWait(page, '/');

    const imagesWithoutDimensions = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs
        .filter((img) => {
          const hasWidth = img.hasAttribute('width') || img.style.width || img.naturalWidth > 0;
          const hasHeight = img.hasAttribute('height') || img.style.height || img.naturalHeight > 0;
          const hasAspectRatio = window.getComputedStyle(img).aspectRatio !== 'auto';
          return !(hasWidth && hasHeight) && !hasAspectRatio;
        })
        .map((img) => img.src || img.getAttribute('data-src') || 'unknown');
    });

    if (imagesWithoutDimensions.length > 0) {
      console.warn(
        `  Images without dimensions:\n` +
          imagesWithoutDimensions.map((src) => `    - ${src}`).join('\n'),
      );
    }

    // Allow a few images (icons, SVGs) to lack explicit dimensions
    expect(imagesWithoutDimensions.length).toBeLessThanOrEqual(5);
  });

  test('Home page — no images larger than 500KB', async ({ page }) => {
    const largeImages: { src: string; sizeKB: number }[] = [];

    // Intercept image responses to check sizes
    page.on('response', (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('image')) {
        const contentLength = parseInt(response.headers()['content-length'] || '0', 10);
        if (contentLength > 500 * 1024) {
          largeImages.push({ src: url, sizeKB: Math.round(contentLength / 1024) });
        }
      }
    });

    await page.goto('/', { waitUntil: 'load', timeout: 30000 });
    await waitForNetworkIdle(page);

    // Also check via performance entries for transferred sizes
    const perfImages = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return entries
        .filter((e) => /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i.test(e.name))
        .filter((e) => e.transferSize > 500 * 1024)
        .map((e) => ({ src: e.name, sizeKB: Math.round(e.transferSize / 1024) }));
    });

    const allLarge = [...largeImages, ...perfImages];
    // Deduplicate
    const unique = new Map<string, number>();
    for (const img of allLarge) {
      unique.set(img.src, img.sizeKB);
    }

    if (unique.size > 0) {
      console.warn(
        `  Large images (>500KB):\n` +
          Array.from(unique.entries())
            .map(([src, kb]) => `    - ${src} (${kb}KB)`)
            .join('\n'),
      );
    }

    expect(unique.size, 'No images should exceed 500KB').toBe(0);
  });

  test('Home page — images use lazy loading or next/image', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    const imageAudit = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      // Exclude tiny icons and SVGs from lazy loading requirement
      const contentImages = imgs.filter((img) => {
        const width = img.naturalWidth || img.width || parseInt(img.getAttribute('width') || '0');
        return width > 50;
      });

      const results = contentImages.map((img) => {
        const hasLazy = img.loading === 'lazy';
        const isNextImage =
          img.hasAttribute('data-nimg') ||
          img.closest('[data-nimg]') !== null ||
          img.srcset?.includes('_next/image');
        const isAboveFold = img.getBoundingClientRect().top < window.innerHeight;
        return {
          src: img.src?.slice(-80) || 'unknown',
          hasLazy,
          isNextImage,
          isAboveFold,
        };
      });

      // Below-fold images should be lazy or use next/image
      const belowFoldNoLazy = results.filter(
        (r) => !r.isAboveFold && !r.hasLazy && !r.isNextImage,
      );

      return {
        total: contentImages.length,
        nextImageCount: results.filter((r) => r.isNextImage).length,
        lazyCount: results.filter((r) => r.hasLazy).length,
        belowFoldNoLazy,
      };
    });

    console.log(
      `  Images: ${imageAudit.total} total, ${imageAudit.nextImageCount} next/image, ` +
        `${imageAudit.lazyCount} lazy, ${imageAudit.belowFoldNoLazy.length} below-fold without lazy`,
    );

    if (imageAudit.belowFoldNoLazy.length > 0) {
      console.warn(
        `  Below-fold images without lazy loading:\n` +
          imageAudit.belowFoldNoLazy.map((img) => `    - ${img.src}`).join('\n'),
      );
    }

    // Allow some images — next/image handles optimization automatically
    expect(imageAudit.belowFoldNoLazy.length).toBeLessThanOrEqual(5);
  });

  test('Home page — no layout shift from image loading', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    const cls = await measureCLS(page);
    console.log(`  Home page image-load CLS: ${cls !== null ? cls.toFixed(4) : 'N/A'}`);

    if (cls !== null) {
      expect(cls, 'CLS from image loading should be minimal').toBeLessThan(0.1);
    }
  });

  test('Images use modern formats (WebP/AVIF) where available', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load', timeout: 30000 });
    await waitForNetworkIdle(page);

    const imageFormats = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const images = entries.filter((e) =>
        /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i.test(e.name),
      );

      const formats: Record<string, number> = {};
      for (const img of images) {
        const ext = img.name.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)/i)?.[1]?.toLowerCase() || 'unknown';
        formats[ext] = (formats[ext] || 0) + 1;
      }

      return { formats, total: images.length };
    });

    // Also check for next/image which auto-serves WebP/AVIF
    const nextImageCount = await page.evaluate(() => {
      return document.querySelectorAll('img[data-nimg], img[srcset*="_next/image"]').length;
    });

    console.log(
      `  Image formats: ${JSON.stringify(imageFormats.formats)}, ` +
        `next/image count: ${nextImageCount}`,
    );

    // If no raster images on the page, pass — site may use CSS backgrounds/SVGs
    if (imageFormats.total === 0 && nextImageCount === 0) {
      console.log('  No raster images detected — skipping format check');
      return;
    }

    // If using next/image, modern formats are handled automatically
    const hasModernStrategy =
      nextImageCount > 0 ||
      (imageFormats.formats['webp'] || 0) + (imageFormats.formats['avif'] || 0) > 0;

    expect(hasModernStrategy, 'Should use modern image formats or next/image').toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Bundle Size Checks (3 tests)
// ---------------------------------------------------------------------------
test.describe('T-17.3 — Bundle Size', () => {
  test('Page JS bundle is not excessively large', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load', timeout: 30000 });
    await waitForNetworkIdle(page);

    const jsStats = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const jsEntries = entries.filter(
        (e) => e.initiatorType === 'script' || /\.js(\?|$)/i.test(e.name),
      );

      let totalTransferred = 0;
      const files: { name: string; sizeKB: number }[] = [];

      for (const entry of jsEntries) {
        totalTransferred += entry.transferSize;
        files.push({
          name: entry.name.split('/').pop()?.split('?')[0] || entry.name,
          sizeKB: Math.round(entry.transferSize / 1024),
        });
      }

      return {
        totalKB: Math.round(totalTransferred / 1024),
        fileCount: jsEntries.length,
        largest: files.sort((a, b) => b.sizeKB - a.sizeKB).slice(0, 5),
      };
    });

    console.log(
      `  JS bundle: ${jsStats.totalKB}KB total (${jsStats.fileCount} files)\n` +
        `  Largest: ${jsStats.largest.map((f) => `${f.name} (${f.sizeKB}KB)`).join(', ')}`,
    );

    // Total JS should be under 2MB transferred (generous for Next.js + AI features)
    expect(jsStats.totalKB, 'Total JS should be under 2MB').toBeLessThan(2048);
  });

  test('No duplicate library loading', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load', timeout: 30000 });
    await waitForNetworkIdle(page);

    const duplicates = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const jsEntries = entries.filter(
        (e) => e.initiatorType === 'script' || /\.js(\?|$)/i.test(e.name),
      );

      // Extract library names from chunk filenames
      const libPattern = /(?:node_modules|chunks)\/([@\w.-]+)/;
      const libs = new Map<string, string[]>();

      for (const entry of jsEntries) {
        const match = entry.name.match(libPattern);
        if (match) {
          const lib = match[1];
          if (!libs.has(lib)) libs.set(lib, []);
          libs.get(lib)!.push(entry.name.split('/').pop() || entry.name);
        }
      }

      // Find libs loaded more than once with different file names
      const dupes: { lib: string; files: string[] }[] = [];
      for (const [lib, files] of libs) {
        const uniqueFiles = [...new Set(files)];
        if (uniqueFiles.length > 1) {
          dupes.push({ lib, files: uniqueFiles });
        }
      }

      return dupes;
    });

    if (duplicates.length > 0) {
      console.warn(
        `  Potential duplicate libraries:\n` +
          duplicates.map((d) => `    - ${d.lib}: ${d.files.join(', ')}`).join('\n'),
      );
    }

    // Allow a few duplicates (common with code splitting)
    expect(duplicates.length, 'Should not have many duplicate libraries').toBeLessThanOrEqual(3);
  });

  test('CSS is not excessively large', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load', timeout: 30000 });
    await waitForNetworkIdle(page);

    const cssStats = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const cssEntries = entries.filter(
        (e) =>
          /\.css(\?|$)/i.test(e.name) ||
          (e.initiatorType === 'link' && !(/\.(woff2?|ttf|otf|eot|js)(\?|$)/i.test(e.name))),
      );

      let totalTransferred = 0;
      const files: { name: string; sizeKB: number }[] = [];

      for (const entry of cssEntries) {
        totalTransferred += entry.transferSize;
        files.push({
          name: entry.name.split('/').pop()?.split('?')[0] || entry.name,
          sizeKB: Math.round(entry.transferSize / 1024),
        });
      }

      return {
        totalKB: Math.round(totalTransferred / 1024),
        fileCount: cssEntries.length,
        files,
      };
    });

    console.log(
      `  CSS: ${cssStats.totalKB}KB total (${cssStats.fileCount} files)\n` +
        `  Files: ${cssStats.files.map((f) => `${f.name} (${f.sizeKB}KB)`).join(', ')}`,
    );

    // Total CSS should be under 500KB transferred
    expect(cssStats.totalKB, 'Total CSS should be under 500KB').toBeLessThan(512);
  });
});

// ---------------------------------------------------------------------------
// 4. Network Request Count (2 tests)
// ---------------------------------------------------------------------------
test.describe('T-17.4 — Network Requests', () => {
  test('Home page loads in < 80 requests', async ({ page }) => {
    const requests: string[] = [];

    page.on('request', (req) => {
      requests.push(req.url());
    });

    await page.goto('/', { waitUntil: 'load', timeout: 30000 });
    await waitForNetworkIdle(page);

    // Categorize requests
    const categories: Record<string, number> = {};
    for (const url of requests) {
      let cat = 'other';
      if (/\.js(\?|$)/i.test(url)) cat = 'js';
      else if (/\.css(\?|$)/i.test(url)) cat = 'css';
      else if (/\.(jpg|jpeg|png|gif|webp|avif|svg|ico)(\?|$)/i.test(url)) cat = 'image';
      else if (/\.(woff2?|ttf|otf|eot)(\?|$)/i.test(url)) cat = 'font';
      else if (url.includes('/api/')) cat = 'api';
      categories[cat] = (categories[cat] || 0) + 1;
    }

    console.log(
      `  Home page requests: ${requests.length} total\n` +
        `  Breakdown: ${Object.entries(categories)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')}`,
    );

    // Next.js code-splitting produces many small JS chunks — 80 is a reasonable ceiling
    expect(requests.length, 'Home page should load in < 80 requests').toBeLessThan(80);
  });

  test('No failed requests on page load', async ({ page }) => {
    const failedRequests: { url: string; status: number; type: string }[] = [];

    page.on('response', (response) => {
      const status = response.status();
      const url = response.url();
      // Ignore expected non-200s: redirects, favicons, analytics, SW
      if (
        status >= 400 &&
        !url.includes('favicon') &&
        !url.includes('analytics') &&
        !url.includes('sw.js') &&
        !url.includes('_vercel') &&
        !url.includes('chrome-extension')
      ) {
        failedRequests.push({
          url: url.slice(-100),
          status,
          type: response.request().resourceType(),
        });
      }
    });

    await page.goto('/', { waitUntil: 'load', timeout: 30000 });
    await waitForNetworkIdle(page);

    if (failedRequests.length > 0) {
      console.warn(
        `  Failed requests:\n` +
          failedRequests
            .map((r) => `    - [${r.status}] ${r.type}: ${r.url}`)
            .join('\n'),
      );
    }

    expect(failedRequests.length, 'No failed requests on page load').toBe(0);
  });
});
