import React from 'react';

export function StatCardSkeleton() {
  return (
    <div className="p-6 bg-white border border-slate-100 rounded-2xl animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-20 bg-slate-200 rounded"></div>
          <div className="h-8 w-16 bg-slate-200 rounded"></div>
          <div className="h-3 w-28 bg-slate-100 rounded"></div>
        </div>
        <div className="w-12 h-12 bg-slate-100 rounded-2xl"></div>
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="animate-pulse border-b border-slate-50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4">
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
        </td>
      ))}
    </tr>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stat Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 bg-white rounded-2xl border border-slate-100 animate-pulse space-y-4">
          <div className="h-5 w-40 bg-slate-200 rounded"></div>
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-50 rounded-xl"></div>
            ))}
          </div>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-slate-100 animate-pulse space-y-4">
          <div className="h-5 w-32 bg-slate-200 rounded"></div>
          <div className="space-y-3 pt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-slate-50 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
