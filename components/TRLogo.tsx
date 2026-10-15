import React from 'react';

interface TRLogoProps {
  className?: string;
  size?: number;
  color?: string;
}

export const TRLogo: React.FC<TRLogoProps> = ({
  className = "h-8 w-auto",
  size
}) => {
  return (
    <div
      className={`inline-flex items-center justify-center select-none ${className}`}
      style={size ? { height: size, width: size } : undefined}
      title="tr"
    >
      <svg
        viewBox="0 0 32 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto"
      >
        {/* Lowercase 't' */}
        <path
          d="M 11 5 V 18.5 C 11 20.6 12.4 22 14.5 22 H 16"
          stroke="currentColor"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="6.5"
          y1="11"
          x2="15.5"
          y2="11"
          stroke="currentColor"
          strokeWidth="2.8"
          strokeLinecap="round"
        />

        {/* Lowercase 'r' */}
        <path
          d="M 20.5 11 V 22"
          stroke="currentColor"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d="M 20.5 14.5 C 21.8 11.8 24.2 11 27 11.5"
          stroke="currentColor"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export const F1CarLogo = TRLogo;
export const F1Logo = TRLogo;
