import React from 'react';

export const CardSkeleton = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="h-4 bg-slate-200 rounded w-1/3"></div>
      <div className="h-6 bg-slate-200 rounded-full w-16"></div>
    </div>
    <div className="h-7 bg-slate-200 rounded w-2/3 mb-2"></div>
    <div className="h-3 bg-slate-200 rounded w-1/2 mb-4"></div>
    <div className="h-2 bg-slate-200 rounded-full w-full mb-3"></div>
    <div className="flex justify-between pt-3 border-t border-slate-100">
      <div className="h-4 bg-slate-200 rounded w-1/4"></div>
      <div className="h-4 bg-slate-200 rounded w-1/4"></div>
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
    <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between">
      <div className="h-5 bg-slate-200 rounded w-1/4"></div>
      <div className="h-5 bg-slate-200 rounded w-1/6"></div>
    </div>
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center justify-between space-x-4">
          <div className="h-4 bg-slate-200 rounded w-1/5"></div>
          <div className="h-4 bg-slate-200 rounded w-1/6"></div>
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="h-6 bg-slate-200 rounded-full w-20"></div>
          <div className="h-4 bg-slate-200 rounded w-16"></div>
        </div>
      ))}
    </div>
  </div>
);

export default CardSkeleton;

