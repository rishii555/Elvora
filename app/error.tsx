"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from "lucide-react";
import { ElvoraLogo } from "@/components/logo";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Log the error to console for debugging
    console.error("Next.js Client Application Error caught by boundary:", error);
  }, [error]);

  const handleHardReload = () => {
    // Clear cache reload
    if (typeof window !== "undefined") {
      window.location.reload();
    } else {
      reset();
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-4 py-12">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Brand */}
        <div className="inline-flex justify-center">
          <ElvoraLogo size="lg" showTagline />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <h1 className="mt-4 text-lg font-bold text-slate-900">
            Temporary Loading Glitch
          </h1>

          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            A stale browser asset cache or client connection interruption occurred while loading this page. Reloading the latest production bundle usually resolves this immediately.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleHardReload}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:bg-blue-800 transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reload Page
            </button>

            <Link
              href="/"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Home className="h-3.5 w-3.5" />
              Go to Home
            </Link>
          </div>

          {/* Technical Diagnostics Accordion */}
          <div className="mt-6 border-t border-slate-100 pt-4 text-left">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex w-full items-center justify-between text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span>Diagnostic Details</span>
              {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showDetails && (
              <div className="mt-2 rounded-lg bg-slate-900 p-3 font-mono text-[10px] text-slate-200 overflow-x-auto">
                <p className="font-bold text-rose-400">Error: {error.message || "Unknown client exception"}</p>
                {error.digest && <p className="mt-1 text-slate-400">Digest: {error.digest}</p>}
                {error.stack && (
                  <pre className="mt-2 text-[9px] text-slate-500 max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-[11px] text-slate-400">
          Tip: In your browser, press <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-semibold text-slate-600">Ctrl + Shift + R</kbd> to bypass stale cache.
        </p>
      </div>
    </div>
  );
}
