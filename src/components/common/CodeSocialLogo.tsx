import React from 'react';

interface CodeSocialLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'mark' | 'full';
  showText?: boolean;
}

export const CodeSocialLogo: React.FC<CodeSocialLogoProps> = ({
  className = '',
  size = 32,
  showText = false,
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Bespoke Geometric Mark */}
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 group-hover:scale-105"
      >
        <defs>
          {/* Rich Royal-to-Electric Blue Gradient */}
          <linearGradient id="csBrandGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="50%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>

          {/* Glowing Social Vertex Gradient */}
          <linearGradient id="csVertexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>

          {/* Glass Highlight */}
          <linearGradient id="csGlassStroke" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* 1. Base Squircle with Subtle Depth */}
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx="26"
          fill="url(#csBrandGrad)"
        />
        <rect
          x="2.5"
          y="2.5"
          width="95"
          height="95"
          rx="25.5"
          stroke="url(#csGlassStroke)"
          strokeWidth="1.5"
        />

        {/* 2. Geometric Code Bracket / Stylized "C" Arc */}
        <path
          d="M66 28 H42 C30 28 22 36 22 50 C22 64 30 72 42 72 H66"
          stroke="#FFFFFF"
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 3. Central Commit Vertex & Dynamic Social Link */}
        {/* Connection track from bracket center to right node */}
        <line
          x1="38"
          y1="50"
          x2="65"
          y2="50"
          stroke="#93C5FD"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="1 10"
        />
        <line
          x1="38"
          y1="50"
          x2="68"
          y2="50"
          stroke="#93C5FD"
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* Active Commit / Social Vertex Node */}
        <circle
          cx="68"
          cy="50"
          r="7.5"
          fill="#FFFFFF"
        />
        <circle
          cx="68"
          cy="50"
          r="3.5"
          fill="#2563EB"
        />

        {/* Micro prompt accent: Terminal cursor tick at the bottom right */}
        <line
          x1="52"
          y1="64"
          x2="62"
          y2="64"
          stroke="#BFDBFE"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.8"
        />
      </svg>

      {/* Optional Brand Typography */}
      {showText && (
        <div className="flex flex-col text-left">
          <span className="text-sm font-bold tracking-tight text-slate-900 font-sans leading-none">
            CODE SOCIAL
          </span>
          <span className="text-[10px] text-slate-400 font-medium mt-1">
            Your code is your profile.
          </span>
        </div>
      )}
    </div>
  );
};
