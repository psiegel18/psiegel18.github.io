"use client";

import * as Sentry from "@sentry/nextjs";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const { logger } = Sentry;

export default function SentryExamplePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user || session.user.role !== "ADMIN") {
      router.push("/");
    }
  }, [session, status, router]);

  // Show loading state while checking auth
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  // Don't render content if not admin
  if (!session?.user || session.user.role !== "ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Redirecting...</div>
      </div>
    );
  }

  const handleTestError = () => {
    Sentry.startSpan(
      {
        op: "ui.click",
        name: "Test Error Button Click",
      },
      (span) => {
        span.setAttribute("test_type", "error");
        span.setAttribute("page", "sentry-example-page");

        logger.info("User clicked test error button", { page: "sentry-example-page" });

        throw new Error("Sentry Test Error - This is a test!");
      }
    );
  };

  const handleTestMessage = () => {
    Sentry.startSpan(
      {
        op: "ui.click",
        name: "Test Message Button Click",
      },
      (span) => {
        span.setAttribute("test_type", "message");
        span.setAttribute("page", "sentry-example-page");

        logger.info("Sending test message to Sentry", { page: "sentry-example-page" });

        Sentry.captureMessage("Test message from Sentry Example Page");
        alert("Message sent to Sentry!");
      }
    );
  };

  const handleTestLog = () => {
    Sentry.startSpan(
      {
        op: "ui.click",
        name: "Test Log Button Click",
      },
      (span) => {
        span.setAttribute("test_type", "logging");

        logger.trace("Trace level log", { level: "trace" });
        logger.debug(logger.fmt`Debug level log from ${"sentry-example-page"}`);
        logger.info("Info level log", { page: "sentry-example-page" });
        logger.warn("Warning level log", { testWarning: true });
        logger.error("Error level log", { testError: true });

        alert("Logs sent to Sentry!");
      }
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Sentry Test Page</h1>
      <p className="text-gray-600 dark:text-gray-400">
        Click the buttons below to test Sentry integration.
      </p>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          onClick={handleTestError}
        >
          Throw Test Error
        </button>

        <button
          type="button"
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          onClick={handleTestMessage}
        >
          Send Test Message
        </button>

        <button
          type="button"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          onClick={handleTestLog}
        >
          Test Logging
        </button>
      </div>

      <p className="text-sm text-gray-500 mt-4">
        After clicking, check your Sentry dashboard for the error/message/logs.
      </p>
    </div>
  );
}
