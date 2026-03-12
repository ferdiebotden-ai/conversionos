/**
 * Visual Refinement — compares original vs generated site screenshots
 * and produces per-section fix instructions.
 *
 * Uses Anthropic SDK directly (not claude -p subprocess) to avoid
 * the CLAUDECODE env var nested session issue.
 */

import { callClaude, parseJsonResponse } from '../lib/anthropic-client.mjs';
import { existsSync } from 'node:fs';
import * as logger from '../lib/logger.mjs';

/**
 * Compare original and generated site screenshots.
 * @param {object} options
 * @param {string[]} options.originalScreenshots - Paths to original site screenshots
 * @param {string[]} options.generatedScreenshots - Paths to generated site screenshots
 * @param {string} options.siteId - Tenant site ID
 * @param {string[]} options.sectionIds - List of custom section IDs in the build
 * @param {boolean} [options.bespokeMode=false] - Use Opus 4.6 for bespoke builds (higher visual reasoning)
 * @param {string} [options.designLanguage=''] - Design Language Document for context
 * @returns {Promise<Array<{ sectionId: string, severity: 'high'|'medium'|'low', issues: string[], suggestedFixes: string[] }>>}
 */
export async function visualCompare({ originalScreenshots, generatedScreenshots, siteId, sectionIds, bespokeMode = false, designLanguage = '' }) {
  const images = [];

  // Add original screenshots
  for (const path of originalScreenshots) {
    if (existsSync(path)) {
      images.push({ path });
    }
  }

  // Add generated screenshots
  for (const path of generatedScreenshots) {
    if (existsSync(path)) {
      images.push({ path });
    }
  }

  if (images.length < 2) {
    logger.warn('Visual refine: Need at least 1 original + 1 generated screenshot');
    return [];
  }

  const designLanguageContext = designLanguage
    ? `\n\nDESIGN LANGUAGE (reference for what the rebuild should match):\n${designLanguage.slice(0, 1500)}\n`
    : '';

  const prompt = `You are comparing a contractor's ORIGINAL website (first ${originalScreenshots.length} image(s)) with a GENERATED rebuild (remaining image(s)).

The generated site should match the original's visual DNA — same layout structure, similar spacing, matching colour scheme, comparable typography hierarchy.

Tenant: ${siteId}
Custom sections in this build: ${sectionIds.join(', ')}
${designLanguageContext}

Score 1-5 on each dimension:
1. Layout fidelity (section order, grid structure, visual hierarchy)
2. Colour accuracy (primary/accent usage, background rhythm, overlay treatments)
3. Typography match (font weights, sizes, spacing, hierarchy)
4. Content completeness (all sections present, no missing text, no placeholder content)
5. Spacing & rhythm (padding consistency, card gaps, visual breathing room)
6. Premium polish (animations, hover effects, modern design touches)
7. Overall visual similarity (would someone recognise this as the "same" website?)

For any dimension scoring <3, provide:
- Which section has the issue
- Severity: high (layout completely wrong), medium (noticeable differences), low (minor polish)
- Specific issues (e.g., "hero is 50vh instead of 100vh", "services grid uses 2 columns instead of 3")
- Suggested fixes as code-level instructions (e.g., "change py-12 to py-24 in hero section")

Return ONLY valid JSON:
[
  {
    "sectionId": "custom:${siteId}-hero",
    "severity": "high",
    "issues": ["Hero height is too short — original is full-viewport, generated is ~60vh", "Missing gradient overlay"],
    "suggestedFixes": ["Set section to min-h-screen", "Add bg-gradient-to-t from-black/60 to-transparent overlay"]
  }
]

If the sites match well (all dimensions >=3), return an empty array [].`;

  // Use Opus for bespoke builds (highest visual reasoning), Sonnet for template builds
  const model = bespokeMode ? 'claude-opus-4-6-20250514' : 'claude-sonnet-4-6-20250514';

  try {
    const response = await callClaude(prompt, {
      model,
      maxTokens: 4096,
      images,
    });

    return parseJsonResponse(response);
  } catch (err) {
    logger.warn(`Visual refine failed: ${err.message}`);
    return [];
  }
}

/**
 * Generate a Codex fix prompt from visual comparison results.
 * @param {object} comparison - Single comparison result
 * @param {string} existingCode - Current section file content
 * @returns {string} Codex prompt for fixing the section
 */
export function buildFixPrompt(comparison, existingCode) {
  return `IMPORTANT: Fix this file IMMEDIATELY. Do NOT read other project files.

Fix the following issues in this React section component:

ISSUES:
${comparison.issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

SUGGESTED FIXES:
${comparison.suggestedFixes.map((fix, i) => `${i + 1}. ${fix}`).join('\n')}

CURRENT CODE:
\`\`\`tsx
${existingCode}
\`\`\`

Rules:
- Keep the same component name and exports
- Keep 'use client' directive
- Keep SectionBaseProps interface
- Only change what's needed to fix the listed issues
- Use Tailwind CSS classes
- Maintain mobile-first responsive design`;
}
