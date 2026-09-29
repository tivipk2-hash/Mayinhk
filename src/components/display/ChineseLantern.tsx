import React from 'react';

interface ChineseLanternProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  swayDelay?: number;
  swayDuration?: number;
  character?: string;
  className?: string;
  cordLength?: number;
  showGlow?: boolean;
}

export const ChineseLantern: React.FC<ChineseLanternProps> = ({
  size = 'md',
  swayDelay = 0,
  swayDuration = 4,
  character = '福',
  className = '',
  cordLength = 24,
  showGlow = true,
}) => {
  // Dimensions
  const sizeMap = {
    sm: { width: 50, height: 110 },
    md: { width: 68, height: 145 },
    lg: { width: 88, height: 180 },
    xl: { width: 108, height: 215 },
  };

  const { width, height } = sizeMap[size];

  return (
    <div
      className={`inline-block relative select-none pointer-events-none ${className}`}
      style={{
        transformOrigin: 'top center',
        animation: `lanternSway ${swayDuration}s ease-in-out ${swayDelay}s infinite`,
        width,
        height,
      }}
    >
      {/* Ambient Radial Warm Glow behind lantern */}
      {showGlow && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{
            width: width * 1.5,
            height: width * 1.5,
            background: 'radial-gradient(circle, rgba(239, 68, 68, 0.45) 0%, rgba(245, 158, 11, 0.25) 45%, rgba(0, 0, 0, 0) 70%)',
            filter: 'blur(10px)',
          }}
        />
      )}

      <svg
        viewBox="0 0 100 185"
        className="w-full h-full drop-shadow-[0_8px_16px_rgba(220,38,38,0.35)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gold metallic gradient */}
          <linearGradient id={`goldGrad_${character}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="30%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          {/* Deep vibrant crimson lantern gradient */}
          <radialGradient id={`redBodyGrad_${character}`} cx="50%" cy="45%" r="62%">
            <stop offset="0%" stopColor="#ff4d4f" />
            <stop offset="35%" stopColor="#dc2626" />
            <stop offset="75%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#450a0a" />
          </radialGradient>

          {/* Inner lamp light glow */}
          <radialGradient id={`innerGlow_${character}`} cx="50%" cy="45%" r="35%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Hanging Cord */}
        <line
          x1="50"
          y1="0"
          x2="50"
          y2={22 + (cordLength > 24 ? 6 : 0)}
          stroke="#eab308"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* 2. Hanging Ring */}
        <circle
          cx="50"
          cy="23"
          r="4.5"
          fill="none"
          stroke={`url(#goldGrad_${character})`}
          strokeWidth="2.5"
        />

        {/* 3. Top Pagoda Cap / Collar */}
        <rect
          x="35"
          y="27"
          width="30"
          height="5"
          rx="2"
          fill={`url(#goldGrad_${character})`}
          stroke="#78350f"
          strokeWidth="0.75"
        />
        <path
          d="M 28 35 Q 50 29 72 35 L 68 40 Q 50 35 32 40 Z"
          fill={`url(#goldGrad_${character})`}
          stroke="#78350f"
          strokeWidth="0.75"
        />

        {/* 4. Lantern Body (Lồng Đèn Đỏ Cổ Điển) */}
        <path
          d="M 33 39 C 10 56 8 98 33 118 L 67 118 C 92 98 90 56 67 39 Z"
          fill={`url(#redBodyGrad_${character})`}
          stroke="#78350f"
          strokeWidth="0.8"
        />

        {/* 4b. Inner ambient warm radiance */}
        <ellipse
          cx="50"
          cy="78"
          rx="24"
          ry="30"
          fill={`url(#innerGlow_${character})`}
        />

        {/* 5. Gold Vertical Ribs */}
        <line
          x1="50"
          y1="39"
          x2="50"
          y2="118"
          stroke="#fde047"
          strokeWidth="1.2"
          strokeOpacity="0.4"
        />
        <path
          d="M 50 39 C 31 55 31 102 50 118"
          fill="none"
          stroke="#fde047"
          strokeWidth="1.2"
          strokeOpacity="0.4"
        />
        <path
          d="M 50 39 C 69 55 69 102 50 118"
          fill="none"
          stroke="#fde047"
          strokeWidth="1.2"
          strokeOpacity="0.4"
        />
        <path
          d="M 50 39 C 17 60 17 97 50 118"
          fill="none"
          stroke="#fde047"
          strokeWidth="1"
          strokeOpacity="0.28"
        />
        <path
          d="M 50 39 C 83 60 83 97 50 118"
          fill="none"
          stroke="#fde047"
          strokeWidth="1"
          strokeOpacity="0.28"
        />

        {/* 6. Traditional Central Seal / Medallion */}
        <circle
          cx="50"
          cy="78"
          r="15"
          fill="#7f1d1d"
          stroke={`url(#goldGrad_${character})`}
          strokeWidth="1.8"
        />
        <circle
          cx="50"
          cy="78"
          r="12.5"
          fill="none"
          stroke="#fde047"
          strokeWidth="0.8"
          strokeDasharray="2.5 1.5"
        />
        <text
          x="50"
          y="84"
          textAnchor="middle"
          fill="#fde047"
          fontSize="14"
          fontWeight="bold"
          fontFamily="serif"
          className="select-none"
        >
          {character}
        </text>

        {/* 7. Bottom Gold Cap */}
        <rect
          x="35"
          y="118"
          width="30"
          height="5"
          rx="2"
          fill={`url(#goldGrad_${character})`}
          stroke="#78350f"
          strokeWidth="0.75"
        />
        <path
          d="M 32 123 Q 50 128 68 123 L 64 128 Q 50 131 36 128 Z"
          fill={`url(#goldGrad_${character})`}
          stroke="#78350f"
          strokeWidth="0.75"
        />

        {/* 8. Dangling Tassel (Tua rua vàng & đỏ may mắn) */}
        <circle
          cx="50"
          cy="134"
          r="3.5"
          fill={`url(#goldGrad_${character})`}
        />

        {/* Golden Tassel Fringe */}
        <path
          d="M 43 138 L 41 178 M 46 138 L 45 180 M 50 138 L 50 182 M 54 138 L 55 180 M 57 138 L 59 178"
          stroke="#fbbf24"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Red Silk Strands in tassel */}
        <path
          d="M 44 139 L 43 174 M 48 139 L 48 176 M 52 139 L 52 176 M 56 139 L 57 174"
          stroke="#ef4444"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />
        {/* Bottom Gold Bead Accent */}
        <circle cx="50" cy="182" r="2" fill="#f59e0b" />
      </svg>
    </div>
  );
};
