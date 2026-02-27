import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env['SENTRY_DSN'] || process.env['NEXT_PUBLIC_SENTRY_DSN'],
  enabled: !!(process.env['SENTRY_DSN'] || process.env['NEXT_PUBLIC_SENTRY_DSN']),

  // Performance monitoring
  tracesSampleRate: 0.1,

  // Scrub PII
  beforeSend(event) {
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    return event;
  },
});
