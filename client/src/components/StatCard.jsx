import React from 'react';

export default function StatCard({ label, value, sub, color = 'default', icon, onClick }) {
  const colorMap = {
    default: 'border-findex-midnight-border',
    orange:  'border-findex-orange/50 bg-findex-orange/5',
    red:     'border-red-700/50 bg-red-900/10',
    green:   'border-emerald-700/50 bg-emerald-900/10',
  };

  return (
    <div
      className={`card border ${colorMap[color]} ${onClick ? 'cursor-pointer hover:border-findex-orange/60 transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-semibold mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-findex-midnight-lighter flex items-center justify-center text-gray-500">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
