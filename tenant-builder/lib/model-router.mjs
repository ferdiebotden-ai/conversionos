/**
 * Model Router — routes AI tasks to the optimal model.
 *
 * Principle: Build-time tasks use CLI subscriptions ($0 marginal).
 * Runtime tasks use APIs (pay-per-use, must be fast).
 */

const MODELS = {
  // Build-time tasks (CLI subscriptions, $0 marginal)
  'image-classify':       { provider: 'gemini', model: 'gemini-3.1-flash',   method: 'cli', reason: 'Free vision via subscription' },
  'scrape-enrich':        { provider: 'claude', model: 'sonnet',             method: 'cli', reason: 'Good text extraction, subscription-free' },
  'architect-vision':     { provider: 'codex',  model: 'gpt-5.4',           method: 'cli', reason: 'Best vision analysis for screenshots' },
  'code-generate':        { provider: 'codex',  model: 'gpt-5.4',           method: 'cli', reason: 'Best code generation, subscription' },
  'code-review':          { provider: 'codex',  model: 'gpt-5.4',           method: 'cli', reason: 'Static analysis + fix, subscription' },
  'content-audit':        { provider: 'gemini', model: 'gemini-3.1-flash',   method: 'cli', reason: 'Fast content analysis, free' },
  'about-image-validate': { provider: 'gemini', model: 'gemini-3.1-flash',   method: 'cli', reason: 'Quick vision check, free' },

  // Runtime tasks (API, must be fast and concurrent)
  'chat':                 { provider: 'openai', model: 'gpt-5.4',                       method: 'api', reason: 'Streaming, fast, frontier reasoning' },
  'visualization':        { provider: 'google', model: 'gemini-3.1-flash-image-preview', method: 'api', reason: 'Image generation, server-side' },
  'photo-analysis':       { provider: 'openai', model: 'gpt-5.4',                       method: 'api', reason: 'Vision + spatial reasoning' },
  'quote-generation':     { provider: 'openai', model: 'gpt-4o-mini',                   method: 'api', reason: 'Structured output, cost-efficient' },
  'email-generation':     { provider: 'openai', model: 'gpt-4o-mini',                   method: 'api', reason: 'Template filling, cost-efficient' },
  'intake-extraction':    { provider: 'openai', model: 'gpt-4o-mini',                   method: 'api', reason: 'Simple extraction, cheapest' },
};

const DEFAULT_MODEL = { provider: 'claude', model: 'sonnet', method: 'cli', reason: 'Default fallback' };

/**
 * Select the optimal model for a task.
 * @param {string} task - Task identifier (e.g. 'image-classify', 'chat', 'quote-generation')
 * @returns {{ provider: string, model: string, method: 'cli'|'api', reason: string }}
 */
export function selectModel(task) {
  return MODELS[task] || DEFAULT_MODEL;
}

/**
 * Get all build-time model assignments (CLI subscription, $0 marginal cost).
 * @returns {Array<{ task: string, provider: string, model: string, method: string, reason: string }>}
 */
export function getBuildTimeModels() {
  return Object.entries(MODELS)
    .filter(([, config]) => config.method === 'cli')
    .map(([task, config]) => ({ task, ...config }));
}

/**
 * Get all runtime model assignments (API, pay-per-use).
 * @returns {Array<{ task: string, provider: string, model: string, method: string, reason: string }>}
 */
export function getRuntimeModels() {
  return Object.entries(MODELS)
    .filter(([, config]) => config.method === 'api')
    .map(([task, config]) => ({ task, ...config }));
}

/**
 * Check if a task uses a CLI subscription (free at build time).
 * @param {string} task
 * @returns {boolean}
 */
export function isBuildTimeTask(task) {
  const config = MODELS[task];
  return config ? config.method === 'cli' : false;
}
