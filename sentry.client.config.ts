import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env['NEXT_PUBLIC_SENTRY_DSN'],
  enabled: !!process.env['NEXT_PUBLIC_SENTRY_DSN'],

  // Performance monitoring
  tracesSampleRate: 0.1,

  // Session replay for error debugging
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  // Scrub PII from error reports
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
