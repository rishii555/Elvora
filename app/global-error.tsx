"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans text-slate-900">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-md">
          <h2 className="text-lg font-bold text-slate-900">System Interruption</h2>
          <p className="mt-2 text-xs text-slate-600">
            A critical error occurred while initializing the application.
          </p>
          <div className="mt-4">
            <button
              onClick={() => reset()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
            >
              Recover Session
            </button>
          </div>
          {error?.message && (
            <p className="mt-4 font-mono text-[10px] text-slate-400">
              {error.message}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
