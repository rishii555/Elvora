import React from "react";

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-3 animate-pulse p-4">
      <div className="h-8 bg-slate-200/70 rounded-lg w-full mb-4" />
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex gap-4 items-center">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <div
              key={cIdx}
              className={`h-5 bg-slate-100 rounded ${
                cIdx === 0 ? "w-1/4" : cIdx === cols - 1 ? "w-1/6" : "w-1/5"
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs animate-pulse">
          <div className="h-3 bg-slate-200 rounded w-1/3 mb-3" />
          <div className="h-7 bg-slate-300 rounded w-1/2 mb-2" />
          <div className="h-3 bg-slate-100 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function CatalogGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 p-3 bg-white animate-pulse">
          <div className="h-3 bg-slate-200 rounded w-1/4 mb-2" />
          <div className="h-4 bg-slate-300 rounded w-3/4 mb-4" />
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-3 bg-slate-100 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
