import React from 'react';

interface TechBadgeProps {
  name: string;
  size?: 'xs' | 'sm' | 'md';
  onClick?: () => void;
  selected?: boolean;
}

export const TechBadge: React.FC<TechBadgeProps> = ({
  name,
  size = 'sm',
  onClick,
  selected = false,
}) => {
  const sizeClasses = {
    xs: 'text-[11px] px-2 py-0.5 font-medium',
    sm: 'text-xs px-2.5 py-0.5 font-medium',
    md: 'text-xs px-3 py-1 font-medium',
  };

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border transition-all ${sizeClasses[size]} ${
        selected
          ? 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/20 shadow-xs'
          : 'bg-slate-50 hover:bg-slate-100/80 text-slate-600 border-slate-200/80'
      } ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-blue-500' : 'bg-slate-400'}`} />
      <span>{name}</span>
    </span>
  );
};
