"use client";

import React from "react";

interface ElvoriMascotProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  pose?: "wave" | "welcome" | "thinking" | "happy" | "laptop";
  className?: string;
  animate?: boolean;
}

const SIZE_MAP = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 80,
  xl: 120,
};

/**
 * Elvori — Official Reusable Robot Mascot for Elvora SaaS
 *
 * Crafted in a soft, modern 3D illustration style with white chassis,
 * Elvora blue (#2563eb) & violet (#7c3aed) accents, glowing expressive cyan eyes,
 * chest emblem, and friendly welcoming postures.
 */
export function ElvoriMascot({
  size = "md",
  pose = "wave",
  className = "",
  animate = true,
}: ElvoriMascotProps) {
  const pixelSize = typeof size === "number" ? size : SIZE_MAP[size] || 48;
  const uniqueId = React.useId().replace(/:/g, "");

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
      aria-label="Elvori Assistant Mascot"
    >
      <svg
        viewBox="0 0 120 120"
        width={pixelSize}
        height={pixelSize}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        <defs>
          {/* Soft Ground Shadow */}
          <radialGradient id={`elvori-shadow-${uniqueId}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </radialGradient>

          {/* White Body 3D Ceramic Gradients */}
          <linearGradient id={`body-grad-${uniqueId}`} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#F1F5F9" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>

          <linearGradient id={`head-grad-${uniqueId}`} x1="30%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#E0E7FF" />
          </linearGradient>

          {/* Elvora Signature Blue-Violet Gradient */}
          <linearGradient id={`elvora-brand-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>

          {/* Glowing Visor Glass Gradient */}
          <linearGradient id={`visor-grad-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="60%" stopColor="#1E1B4B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          {/* Cyan Glow for Eyes */}
          <linearGradient id={`eye-glow-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0EA5E9" />
          </linearGradient>

          {/* Inner Highlight Filter */}
          <filter id={`soft-glow-${uniqueId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Base Shadow */}
        <ellipse cx="60" cy="112" rx="34" ry="5.5" fill={`url(#elvori-shadow-${uniqueId})`} />

        {/* 2. Antenna with Pulsing Glow Tip */}
        <path
          d="M60 25 V14"
          stroke={`url(#elvora-brand-${uniqueId})`}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <circle cx="60" cy="12" r="5" fill="#38BDF8" />
        <circle
          cx="60"
          cy="12"
          r="6.5"
          fill="#38BDF8"
          opacity={animate ? "0.4" : "0.2"}
          className={animate ? "animate-ping origin-center" : ""}
        />
        <circle cx="58.5" cy="10.5" r="1.5" fill="#FFFFFF" />

        {/* 3. Ear Cushions / Headphones */}
        {/* Left Ear Phone */}
        <rect
          x="19"
          y="37"
          width="8"
          height="18"
          rx="4"
          fill={`url(#elvora-brand-${uniqueId})`}
        />
        <circle cx="23" cy="46" r="2" fill="#38BDF8" />

        {/* Right Ear Phone */}
        <rect
          x="93"
          y="37"
          width="8"
          height="18"
          rx="4"
          fill={`url(#elvora-brand-${uniqueId})`}
        />
        <circle cx="97" cy="46" r="2" fill="#38BDF8" />

        {/* Headband Connection */}
        <path
          d="M27 42 C30 24, 90 24, 93 42"
          stroke={`url(#elvora-brand-${uniqueId})`}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* 4. Torso & Arms (Rendered behind Head) */}
        <g id="torso-group">
          {/* Main Body */}
          <path
            d="M38 78 C38 72, 82 72, 82 78 C84 94, 80 106, 60 106 C40 106, 36 94, 38 78 Z"
            fill={`url(#body-grad-${uniqueId})`}
            stroke="#CBD5E1"
            strokeWidth="1.2"
          />

          {/* Chest Plate with Elvora 'E' Crest */}
          <rect
            x="49"
            y="82"
            width="22"
            height="16"
            rx="5"
            fill={`url(#elvora-brand-${uniqueId})`}
          />
          {/* White 'E' Symbol on Chest */}
          <path
            d="M55 86.5 H65 V89 H58 V90.5 H63.5 V92.5 H58 V94 H65 V96.5 H55 Z"
            fill="#FFFFFF"
            className="drop-shadow-xs"
          />

          {/* Arms based on Pose */}
          {pose === "wave" && (
            <>
              {/* Left Relaxed Arm */}
              <path
                d="M38 80 C31 84, 28 92, 33 97 C35 99, 39 96, 40 92"
                stroke={`url(#body-grad-${uniqueId})`}
                strokeWidth="7"
                strokeLinecap="round"
              />
              <circle cx="33" cy="97" r="4.5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />

              {/* Right Waving Arm */}
              <g className={animate ? "origin-[78px_82px] animate-[bounce_2.5s_ease-in-out_infinite]" : ""}>
                <path
                  d="M80 80 C88 77, 98 68, 97 58 C96 54, 91 56, 88 62"
                  stroke={`url(#body-grad-${uniqueId})`}
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                <circle cx="97" cy="56" r="5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
                <path d="M96 52 L98 48" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
                <path d="M101 54 L105 52" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
              </g>
            </>
          )}

          {pose === "laptop" && (
            <>
              {/* Arms holding laptop */}
              <path
                d="M38 82 C35 90, 44 98, 48 98"
                stroke={`url(#body-grad-${uniqueId})`}
                strokeWidth="6"
                strokeLinecap="round"
              />
              <path
                d="M82 82 C85 90, 76 98, 72 98"
                stroke={`url(#body-grad-${uniqueId})`}
                strokeWidth="6"
                strokeLinecap="round"
              />
              {/* Mini Laptop */}
              <rect x="44" y="93" width="32" height="15" rx="3" fill="#1E293B" stroke="#475569" strokeWidth="1" />
              <rect x="46" y="95" width="28" height="11" rx="1.5" fill="#0EA5E9" />
              {/* Mini Chart Bars on Screen */}
              <rect x="49" y="100" width="3" height="4" fill="#FFFFFF" />
              <rect x="54" y="98" width="3" height="6" fill="#FFFFFF" />
              <rect x="59" y="96" width="3" height="8" fill="#FFFFFF" />
              <rect x="64" y="97" width="3" height="7" fill="#FFFFFF" />
              {/* Laptop Keyboard Base */}
              <path d="M40 108 L80 108 L76 111 L44 111 Z" fill="#94A3B8" />
            </>
          )}

          {(pose === "welcome" || pose === "happy" || pose === "thinking") && (
            <>
              {/* Open Welcoming Arms */}
              <path
                d="M38 80 C26 84, 22 93, 27 98 C30 101, 35 97, 37 92"
                stroke={`url(#body-grad-${uniqueId})`}
                strokeWidth="7"
                strokeLinecap="round"
              />
              <circle cx="26" cy="98" r="4.5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />

              <path
                d="M82 80 C94 84, 98 93, 93 98 C90 101, 85 97, 83 92"
                stroke={`url(#body-grad-${uniqueId})`}
                strokeWidth="7"
                strokeLinecap="round"
              />
              <circle cx="94" cy="98" r="4.5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
            </>
          )}
        </g>

        {/* 5. Head Assembly */}
        <g id="head-group">
          {/* Main Rounded Helmet */}
          <rect
            x="24"
            y="24"
            width="72"
            height="54"
            rx="27"
            fill={`url(#head-grad-${uniqueId})`}
            stroke="#CBD5E1"
            strokeWidth="1.2"
          />

          {/* Helmet Top Specular Reflection */}
          <ellipse cx="60" cy="28" rx="20" ry="3.5" fill="#FFFFFF" opacity="0.6" />

          {/* Visor Area (Glossy Dark Display) */}
          <rect
            x="31"
            y="32"
            width="58"
            height="38"
            rx="19"
            fill={`url(#visor-grad-${uniqueId})`}
          />

          {/* Visor Edge Light Border */}
          <rect
            x="31"
            y="32"
            width="58"
            height="38"
            rx="19"
            stroke={`url(#elvora-brand-${uniqueId})`}
            strokeWidth="1.2"
            strokeOpacity="0.4"
          />

          {/* Visor Diagonal Reflection Glass Sheen */}
          <path
            d="M38 36 C48 34, 72 34, 82 36 C80 39, 40 46, 38 36 Z"
            fill="#FFFFFF"
            opacity="0.12"
          />

          {/* 6. Expressive Glowing Eyes */}
          {pose === "happy" ? (
            /* Cheerful Curved Arc Eyes ^^ */
            <g>
              <path
                d="M44 51 C46 45, 52 45, 54 51"
                stroke={`url(#eye-glow-${uniqueId})`}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M66 51 C68 45, 74 45, 76 51"
                stroke={`url(#eye-glow-${uniqueId})`}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          ) : (
            /* Open Friendly Big Glowing Eyes */
            <g>
              {/* Left Eye */}
              <ellipse cx="49" cy="49" rx="6.5" ry="7.5" fill={`url(#eye-glow-${uniqueId})`} />
              <circle cx="47" cy="46.5" r="2.2" fill="#FFFFFF" />
              <circle cx="51" cy="51.5" r="1.1" fill="#FFFFFF" opacity="0.8" />

              {/* Right Eye */}
              <ellipse cx="71" cy="49" rx="6.5" ry="7.5" fill={`url(#eye-glow-${uniqueId})`} />
              <circle cx="69" cy="46.5" r="2.2" fill="#FFFFFF" />
              <circle cx="73" cy="51.5" r="1.1" fill="#FFFFFF" opacity="0.8" />
            </g>
          )}

          {/* 7. Cute Friendly Mouth */}
          <path
            d="M56 61 C58 64, 62 64, 64 61"
            stroke="#38BDF8"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Soft Blushing Cheeks */}
          <ellipse cx="38" cy="55" rx="3.5" ry="2" fill="#F43F5E" opacity="0.35" />
          <ellipse cx="82" cy="55" rx="3.5" ry="2" fill="#F43F5E" opacity="0.35" />
        </g>
      </svg>
    </div>
  );
}
