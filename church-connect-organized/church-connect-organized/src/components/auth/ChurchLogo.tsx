import React from "react";

export const ChurchLogo: React.FC<{
  size?: "sm" | "md" | "lg";
  className?: string;
}> = ({ size = "lg", className = "" }) => {
  const sizeMap = { sm: "h-10 w-10", md: "h-14 w-14", lg: "h-24 w-24" };
  const iconSize = size === "sm" ? 24 : size === "md" ? 32 : 54;

  return (
    <div
      className={`relative flex items-center justify-center rounded-full border-2 border-emerald-400/40 bg-emerald-700/50 shadow-inner backdrop-blur-md transition-transform hover:scale-105 ${sizeMap[size]} ${className}`}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 64 64" fill="none" className="text-white">
        <path d="M32 8V20M26 13H38" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M20 25L32 17L44 25V54H20V25Z" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 32L12 37V54H20M44 32L52 37V54H44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M27 54V43C27 40.2 29.2 38 32 38C34.8 38 37 40.2 37 43V54" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
};