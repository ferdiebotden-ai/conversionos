#!/usr/bin/env node
/**
 * Quick IMAP connectivity test.
 */

import { resolve } from 'node:path';
import * as tls from 'node:tls';

const DEMO_ROOT = resolve(import.meta.dirname, '../../../');
const { loadEnv } = await import(resolve(DEMO_ROOT, 'tenant-builder/lib/env-loader.mjs'));
loadEnv();

const user = process.env.GMAIL_USER;
const pass = process.env.GMAIL_APP_PASSWORD;
console.log('GMAIL_USER:', user ? user.substring(0, 5) + '***' : 'NOT SET');
console.log('GMAIL_APP_PASSWORD:', pass ? pass.substring(0, 4) + '***' : 'NOT SET');

if (!user || !pass) {
  console.log('Skipping IMAP test — credentials missing');
  process.exit(0);
}

const socket = tls.connect(993, 'imap.gmail.com', { rejectUnauthorized: false }, () => {
  let buffer = '';
  let state = 'greeting';
  let tag = 0;

  socket.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\r\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (state === 'greeting' && line.startsWith('* OK')) {
        state = 'login';
        tag++;
        const qu = user.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const qp = pass.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        socket.write(`A${tag} LOGIN "${qu}" "${qp}"\r\n`);
      } else if (state === 'login' && line.startsWith(`A${tag}`)) {
        if (line.includes('OK')) {
          console.log('IMAP login: SUCCESS');
          state = 'logout';
          tag++;
          socket.write(`A${tag} LOGOUT\r\n`);
        } else {
          console.log('IMAP login: FAILED -', line);
          socket.destroy();
          process.exit(1);
        }
      } else if (state === 'logout') {
        socket.destroy();
        console.log('IMAP test complete');
        process.exit(0);
      }
    }
  });

  setTimeout(() => {
    socket.destroy();
    console.log('IMAP timeout');
    process.exit(1);
  }, 10000);
});
