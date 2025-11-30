"use client";

import * as Sentry from "@sentry/nextjs";

export default function SentryExamplePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Sentry Test Page</h1>
      <p className="text-gray-600 dark:text-gray-400">
        Click the button below to trigger a test error and verify Sentry is working.
      </p>

      <button
        type="button"
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        onClick={() => {
          throw new Error("Sentry Test Error - This is a test!");
        }}
      >
        Throw Test Error
      </button>

      <button
        type="button"
        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        onClick={() => {
          Sentry.captureMessage("Test message from Sentry Example Page");
          alert("Message sent to Sentry!");
        }}
      >
        Send Test Message
      </button>

      <p className="text-sm text-gray-500 mt-4">
        After clicking, check your Sentry dashboard for the error/message.
      </p>
    </div>
  );
}
