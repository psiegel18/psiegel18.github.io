// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only send errors in production (or preview deployments)
  enabled: process.env.NODE_ENV === 'production',

  // Set environment for filtering in Sentry dashboard
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,

  // Enable Sentry logging
  enableLogs: true,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      // Disable blanket masking - this site has mostly public content
      // Only mask elements explicitly marked as sensitive
      maskAllText: false,
      blockAllMedia: false,

      // Still mask password inputs for safety
      maskAllInputs: true,

      // Explicitly mask elements with these selectors (add more as needed)
      mask: ['.sentry-mask', '[data-sentry-mask]', '.sensitive', '[data-sensitive]'],

      // Block specific elements if needed
      block: ['.sentry-block', '[data-sentry-block]'],

      // Ignore input events on these elements
      ignore: ['.sentry-ignore', '[data-sentry-ignore]', 'input[type="password"]'],
    }),
    // Send console.log, console.warn, and console.error calls as logs to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
  ],
});
