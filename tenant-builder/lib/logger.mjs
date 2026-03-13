/**
 * Structured logger with [PROGRESS] and [SUMMARY] line formats
 * for machine parsing by Mission Control BuildProgressPanel.
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
let currentLevel = LEVELS.info;

/**
 * Set the minimum log level. Messages below this level are suppressed.
 * @param {'debug' | 'info' | 'warn' | 'error'} level
 */
export function setLogLevel(level) {
  currentLevel = LEVELS[level] ?? LEVELS.info;
}

function timestamp() {
  return new Date().toISOString();
}

function log(level, message, data) {
  if (LEVELS[level] < currentLevel) return;
  const prefix = `[${timestamp()}] [${level.toUpperCase()}]`;
  const out = (level === 'warn' || level === 'error') ? console.error : console.log;
  if (data !== undefined) {
    out(`${prefix} ${message}`, typeof data === 'object' ? JSON.stringify(data) : data);
  } else {
    out(`${prefix} ${message}`);
  }
}

export function debug(message, data) { log('debug', message, data); }
export function info(message, data) { log('info', message, data); }
export function warn(message, data) { log('warn', message, data); }
export function error(message, data) { log('error', message, data); }

/**
 * Emit a [PROGRESS] line for Mission Control to parse.
 * @param {{ stage: string, target_id?: number, site_id?: string, status: 'start' | 'complete' | 'error', detail?: string }} progress
 */
export function progress(progress) {
  console.log(`[PROGRESS] ${JSON.stringify(progress)}`);
}

/**
 * Emit a [SUMMARY] line at the end of a batch run.
 * @param {{ total: number, succeeded: number, failed: number, skipped: number }} summary
 */
export function summary(summary) {
  console.log(`[SUMMARY] ${JSON.stringify(summary)}`);
}
