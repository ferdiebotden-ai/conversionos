/**
 * Turso (libsql) client wrapper for the pipeline CRM database.
 * Reads TURSO_DATABASE_URL and TURSO_AUTH_TOKEN from env.
 */

import { createClient } from '@libsql/client';

let client = null;

/**
 * Get or create the Turso client singleton.
 * Converts libsql:// URLs to https:// for HTTP mode.
 */
function getClient() {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
  }

  // Convert libsql:// to https:// for HTTP transport
  const httpUrl = url.replace(/^libsql:\/\//, 'https://');

  client = createClient({ url: httpUrl, authToken });
  return client;
}

/**
 * Execute a read query and return rows.
 * @param {string} sql - SQL query
 * @param {any[]} [params] - positional parameters
 * @returns {Promise<Array<Record<string, any>>>}
 */
export async function query(sql, params = []) {
  const c = getClient();
  const result = await c.execute({ sql, args: params });
  return result.rows;
}

/**
 * Execute a write statement (INSERT, UPDATE, DELETE, ALTER).
 * @param {string} sql - SQL statement
 * @param {any[]} [params] - positional parameters
 * @returns {Promise<{ rowsAffected: number, lastInsertRowid: BigInt }>}
 */
export async function execute(sql, params = []) {
  const c = getClient();
  const result = await c.execute({ sql, args: params });
  return { rowsAffected: result.rowsAffected, lastInsertRowid: result.lastInsertRowid };
}

/**
 * Execute multiple statements in a batch (transaction).
 * @param {Array<{ sql: string, args?: any[] }>} statements
 */
export async function batch(statements) {
  const c = getClient();
  return c.batch(statements, 'write');
}
