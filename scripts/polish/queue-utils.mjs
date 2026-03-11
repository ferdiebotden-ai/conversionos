#!/usr/bin/env node
/**
 * Shared helpers for the Codex tenant polish queue.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEMO_ROOT = resolve(import.meta.dirname, '../..');
const QUEUE_ROOT = resolve(DEMO_ROOT, 'codex-polish/queue');
const PENDING_DIR = resolve(QUEUE_ROOT, 'pending');
const DONE_DIR = resolve(QUEUE_ROOT, 'done');

export function ensureQueueDirs() {
  mkdirSync(PENDING_DIR, { recursive: true });
  mkdirSync(DONE_DIR, { recursive: true });
}

export function getQueuePaths(siteId) {
  return {
    root: QUEUE_ROOT,
    pendingDir: PENDING_DIR,
    doneDir: DONE_DIR,
    pendingPath: resolve(PENDING_DIR, `${siteId}.json`),
    donePath: resolve(DONE_DIR, `${siteId}.json`),
  };
}

export function hasActivePolishQueue(siteId) {
  const { pendingPath } = getQueuePaths(siteId);
  return existsSync(pendingPath);
}

export function readPendingQueueItem(siteId) {
  const { pendingPath } = getQueuePaths(siteId);
  if (!existsSync(pendingPath)) return null;
  return JSON.parse(readFileSync(pendingPath, 'utf-8'));
}

export function writePendingQueueItem(item) {
  if (!item?.site_id) {
    throw new Error('Queue item must include site_id');
  }

  ensureQueueDirs();
  const { pendingPath } = getQueuePaths(item.site_id);
  writeFileSync(pendingPath, JSON.stringify(item, null, 2), 'utf-8');
  return pendingPath;
}

export function archiveQueueItem(siteId, metadata = {}) {
  ensureQueueDirs();
  const { pendingPath, donePath } = getQueuePaths(siteId);
  if (!existsSync(pendingPath)) return null;

  const existing = JSON.parse(readFileSync(pendingPath, 'utf-8'));
  const archived = {
    ...existing,
    completed_at: new Date().toISOString(),
    ...metadata,
  };

  writeFileSync(donePath, JSON.stringify(archived, null, 2), 'utf-8');
  rmSync(pendingPath, { force: true });
  return donePath;
}
