interface NukhbaLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function NukhbaLogo({ size = "md", showText = true }: NukhbaLogoProps) {
  const dim = size === "sm" ? 28 : size === "md" ? 36 : 48;

  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="شعار نُخبة"
      >
        <defs>
          <linearGradient id="lg-border" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FDE68A" />
            <stop offset="0.45" stopColor="#F59E0B" />
            <stop offset="1" stopColor="#92400E" />
          </linearGradient>
          <linearGradient id="lg-bg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1e1730" />
            <stop offset="1" stopColor="#0c0a1a" />
          </linearGradient>
          <linearGradient id="lg-letter" x1="0" y1="10" x2="48" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FDE68A" />
            <stop offset="0.6" stopColor="#F59E0B" />
            <stop offset="1" stopColor="#D97706" />
          </linearGradient>
          <radialGradient id="lg-glow" cx="24" cy="24" r="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F59E0B" stopOpacity="0.12" />
            <stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
          <filter id="lg-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#F59E0B" floodOpacity="0.35" />
          </filter>
          <filter id="lg-dot-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="lg-clip">
            <rect x="1.5" y="1.5" width="45" height="45" rx="13.5" />
          </clipPath>
        </defs>

        {/* Outer border frame with gradient */}
        <rect x="0.75" y="0.75" width="46.5" height="46.5" rx="14.25" fill="url(#lg-border)" filter="url(#lg-shadow)" />

        {/* Inner dark background */}
        <rect x="2.5" y="2.5" width="43" height="43" rx="12.5" fill="url(#lg-bg)" />

        {/* Subtle inner glow */}
        <rect x="2.5" y="2.5" width="43" height="43" rx="12.5" fill="url(#lg-glow)" />

        {/* Decorative thin border line inside */}
        <rect x="4" y="4" width="40" height="40" rx="11" fill="none" stroke="#F59E0B" strokeWidth="0.4" strokeOpacity="0.25" />

        {/* Subtle geometric star/compass lines */}
        <line x1="24" y1="8" x2="24" y2="40" stroke="#F59E0B" strokeWidth="0.35" strokeOpacity="0.1" />
        <line x1="8" y1="24" x2="40" y2="24" stroke="#F59E0B" strokeWidth="0.35" strokeOpacity="0.1" />
        <line x1="11" y1="11" x2="37" y2="37" stroke="#F59E0B" strokeWidth="0.35" strokeOpacity="0.08" />
        <line x1="37" y1="11" x2="11" y2="37" stroke="#F59E0B" strokeWidth="0.35" strokeOpacity="0.08" />

        {/* The Arabic "ن" character */}
        <text
          x="24"
          y="33"
          textAnchor="middle"
          fontFamily="'Tajawal', 'Cairo', 'Arial', sans-serif"
          fontSize="26"
          fontWeight="900"
          fill="url(#lg-letter)"
          clipPath="url(#lg-clip)"
        >
          ن
        </text>

        {/* Accent dot — top-right, references the diacritic dot of ن */}
        <circle cx="32" cy="12" r="3.5" fill="#F59E0B" filter="url(#lg-dot-glow)" />
        <circle cx="32" cy="12" r="1.8" fill="#FFFBEB" />
      </svg>

      {showText && (
        <span
          className="font-black tracking-wider leading-none"
          style={{
            fontSize: size === "sm" ? "1rem" : size === "md" ? "1.25rem" : "1.5rem",
            background: "linear-gradient(135deg, #FDE68A 0%, #F59E0B 55%, #D97706 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          نُخبة
        </span>
      )}
    </div>
  );
}
