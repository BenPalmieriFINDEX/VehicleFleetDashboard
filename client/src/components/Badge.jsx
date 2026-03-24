import React from 'react';

const COLORS = {
  green:  'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40',
  orange: 'bg-orange-900/40 text-orange-400 border border-orange-700/40',
  red:    'bg-red-900/40 text-red-400 border border-red-700/40',
  blue:   'bg-blue-900/40 text-blue-400 border border-blue-700/40',
  gray:   'bg-gray-800 text-gray-400 border border-gray-700/40',
  yellow: 'bg-yellow-900/40 text-yellow-400 border border-yellow-700/40',
  purple: 'bg-purple-900/40 text-purple-400 border border-purple-700/40',
};

export default function Badge({ color = 'gray', children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${COLORS[color] || COLORS.gray} ${className}`}>
      {children}
    </span>
  );
}
