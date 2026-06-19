import Link from 'next/link';

export default function NotFound(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f9fafb] px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-10 shadow-sm text-center">
        {/* Brand mark */}
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#96bf48]">
          <svg viewBox="0 0 24 24" fill="white" className="h-6 w-6" aria-hidden="true">
            <path d="M15.337 6.94a.5.5 0 00-.464-.31h-1.39l-.52-2.81A2.5 2.5 0 0010.5 2h-.01a2.5 2.5 0 00-2.452 1.82L7.517 6.63H6.127a.5.5 0 00-.496.435l-1 8.5A.5.5 0 005.127 16h13.746a.5.5 0 00.496-.565l-1-8.5a.5.5 0 00-.032-.085zM10.49 3.5c.69 0 1.29.477 1.45 1.148l.42 1.982H8.64l.398-1.97A1 1 0 0110.49 3.5z" />
          </svg>
        </div>

        {/* Status */}
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-gray-400">
          404
        </p>

        <h1 className="mb-3 text-2xl font-semibold text-gray-900">Page not found</h1>

        <p className="mb-8 text-sm leading-relaxed text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
