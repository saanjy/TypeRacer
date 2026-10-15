import React from 'react';

interface F1CarLogoProps {
  className?: string;
  size?: number;
}

export const F1CarLogo: React.FC<F1CarLogoProps> = ({ className = "w-9 h-9", size }) => {
  return (
    <div
      className={`relative flex items-center justify-center rounded-xl bg-black/30 dark:bg-white/5 border border-white/15 p-1.5 shadow-sm ${className}`}
      style={size ? { width: size, height: size } : undefined}
    >
      <svg
        viewBox="0 0 36 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Rear Wing Endplate and Spoiler */}
        <rect x="2" y="3" width="2" height="11" rx="0.8" fill="var(--active-color)" />
        <path
          d="M3 4H8.5V11"
          stroke="var(--primary-color)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Engine Cover Fin */}
        <path
          d="M7 11L12 6H17L18.5 10"
          fill="var(--primary-color)"
          fillOpacity="0.25"
          stroke="var(--primary-color)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Driver Helmet & Cockpit Halo */}
        <circle cx="19.5" cy="8.2" r="1.8" fill="var(--active-color)" />
        <path
          d="M17.5 9.5C18.5 7.8 21 7.8 22 10"
          stroke="var(--primary-color)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Main Solid Chassis Body & Nose */}
        <path
          d="M7 14C12 13 18 13 22 13.5L30 15.5C32.5 16.2 34.5 16.8 35 17.2L33 18.2H9.5L7 14Z"
          fill="var(--primary-color)"
        />

        {/* Front Wing Assembly */}
        <path
          d="M29.5 16.5L35.5 17.5L33.5 19H28.5"
          stroke="var(--active-color)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="34"
          y1="16"
          x2="34"
          y2="19"
          stroke="var(--primary-color)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        {/* Bold Rear Slick Tyre */}
        <rect
          x="5"
          y="10.5"
          width="6"
          height="9.5"
          rx="2"
          fill="#111215"
          stroke="var(--active-color)"
          strokeWidth="1.4"
        />
        <circle cx="8" cy="15.2" r="1.3" fill="var(--primary-color)" />

        {/* Bold Front Slick Tyre */}
        <rect
          x="24"
          y="12"
          width="5.5"
          height="8.5"
          rx="1.8"
          fill="#111215"
          stroke="var(--active-color)"
          strokeWidth="1.4"
        />
        <circle cx="26.7" cy="16.2" r="1.2" fill="var(--primary-color)" />
      </svg>
    </div>
  );
};
