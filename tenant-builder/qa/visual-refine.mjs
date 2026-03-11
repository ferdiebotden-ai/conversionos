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
 * @returns {Promise<Array<{ sectionId: string, severity: 'high'|'medium'|'low', issues: string[], suggestedFixes: string[] }>>}
 */
export async function visualCompare({ originalScreenshots, generatedScreenshots, siteId, sectionIds }) {
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

  const prompt = `You are comparing a contractor's ORIGINAL website (first ${originalScreenshots.length} image(s)) with a GENERATED rebuild (remaining image(s)).

The generated site should match the original's visual DNA — same layout structure, similar spacing, matching colour scheme, comparable typography hierarchy.

Tenant: ${siteId}
Custom sections in this build: ${sectionIds.join(', ')}

For each section that has significant visual differences, provide:
1. Which section it is (match to the sectionId list above)
2. Severity: high (layout completely wrong), medium (noticeable differences), low (minor polish)
3. Specific issues (e.g., "hero is 50vh instead of 100vh", "services grid uses 2 columns instead of 3")
4. Suggested fixes as code-level instructions

Return ONLY valid JSON:
[
  {
    "sectionId": "custom:${siteId}-hero",
    "severity": "high",
    "issues": ["Hero height is too short — original is full-viewport, generated is ~60vh", "Missing gradient overlay"],
    "suggestedFixes": ["Set section to min-h-screen", "Add bg-gradient-to-t from-black/60 to-transparent overlay"]
  }
]

If the sites match well, return an empty array [].`;

  try {
    const response = await callClaude(prompt, {
      model: 'claude-sonnet-4-6-20250514',
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
