/**
 * Envelope Enforcer — validates SiteBlueprintV2 against hard/soft limits.
 * Ensures no blueprint exceeds platform constraints.
 */

/** Hard limits — violations cause rejection */
const HARD_LIMITS = {
  maxPages: 15,
  maxCustomSections: 3,
  maxComplexity: 7,
  excludedFeatures: ['voice_phone'],  // Can't auto-enable Twilio
};

/** Soft limits — violations produce warnings */
const SOFT_LIMITS = {
  complexityWarning: 6,
  customSectionWarning: 2,
};

/**
 * Validate a blueprint against envelope constraints.
 * @param {object} blueprint - SiteBlueprintV2
 * @returns {{ valid: boolean, violations: string[], warnings: string[] }}
 */
export function validateEnvelope(blueprint) {
  const violations = [];
  const warnings = [];

  // Page count
  if (blueprint.pages?.length > HARD_LIMITS.maxPages) {
    violations.push(`Page count ${blueprint.pages.length} exceeds max ${HARD_LIMITS.maxPages}`);
  }

  // Custom section count
  const customCount = blueprint.customSectionCount ?? 0;
  if (customCount > HARD_LIMITS.maxCustomSections) {
    violations.push(`Custom section count ${customCount} exceeds max ${HARD_LIMITS.maxCustomSections}`);
  } else if (customCount >= SOFT_LIMITS.customSectionWarning) {
    warnings.push(`Custom section count ${customCount} is near limit (max ${HARD_LIMITS.maxCustomSections})`);
  }

  // Complexity score
  const complexity = blueprint.complexityScore ?? 0;
  if (complexity > HARD_LIMITS.maxComplexity) {
    violations.push(`Complexity score ${complexity} exceeds max ${HARD_LIMITS.maxComplexity}`);
  } else if (complexity >= SOFT_LIMITS.complexityWarning) {
    warnings.push(`Complexity score ${complexity} is near limit (max ${HARD_LIMITS.maxComplexity})`);
  }

  // Excluded features
  if (blueprint.platformIntegration) {
    for (const feature of HARD_LIMITS.excludedFeatures) {
      const integration = blueprint.platformIntegration[feature];
      if (integration?.enabled) {
        violations.push(`Feature "${feature}" cannot be auto-enabled via blueprint`);
      }
    }
  }

  // Section references — validate format
  if (blueprint.pages) {
    for (const page of blueprint.pages) {
      for (const section of page.sections ?? []) {
        if (section.componentId !== 'CUSTOM' && !section.componentId.includes(':')) {
          violations.push(`Invalid section ID "${section.componentId}" on page "${page.slug}" — must be "category:variant" or "CUSTOM"`);
        }
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
  };
}

export { HARD_LIMITS, SOFT_LIMITS };
