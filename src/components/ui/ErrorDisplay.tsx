"use client";
import Link from "next/link";

type ErrorDisplayProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorDisplay({ error, reset }: ErrorDisplayProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
          <p className="text-sm text-gray-500">
            An unexpected error occurred. You can try again or return to the dashboard.
          </p>
        </div>

        {process.env.NODE_ENV === "development" && (
          <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-left">
            <p className="mb-1.5 text-xs font-medium text-red-700">Error details (dev only)</p>
            <code className="block whitespace-pre-wrap break-all text-xs text-red-600">
              {error.message}
              {error.digest ? `\nDigest: ${error.digest}` : ""}
            </code>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="rounded-lg border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
