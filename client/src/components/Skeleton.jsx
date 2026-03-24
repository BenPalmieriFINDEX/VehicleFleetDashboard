import React from 'react';

export function SkeletonLine({ className = '' }) {
  return <div className={`skeleton h-4 rounded ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="card space-y-3">
      <SkeletonLine className="w-1/3" />
      <SkeletonLine className="w-2/3 h-8" />
      <SkeletonLine className="w-1/2" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="space-y-2">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} className="h-6" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonLine key={j} className={j === 0 ? 'w-3/4' : j === cols - 1 ? 'w-1/2' : ''} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Skeleton({ className = '', height = 'h-4' }) {
  return <div className={`skeleton ${height} rounded ${className}`} />;
}
