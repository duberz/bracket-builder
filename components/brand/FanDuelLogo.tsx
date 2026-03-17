interface Props {
  /** light = white text (for dark header); dark = brand-color text (for light bg) */
  variant?: "light" | "dark";
  className?: string;
  style?: React.CSSProperties;
}

export default function FanDuelLogo({ variant = "light", className = "", style }: Props) {
  const wordmark = variant === "light" ? "#ffffff" : "#0a1929";
  const sub = variant === "light" ? "rgba(255,255,255,0.55)" : "#6b7280";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 148 36"
      fill="none"
      aria-label="FanDuel Research"
      className={className}
      style={{ height: 36, width: "auto", ...style }}
    >
      {/* Badge background */}
      <rect width="36" height="36" rx="6" fill="#1066E5" />

      {/* Crown shape */}
      <path
        d="M9 24 L9 14 L13 19 L18 12 L23 19 L27 14 L27 24 Z"
        fill="white"
        opacity="0.95"
      />
      {/* Crown base bar */}
      <rect x="9" y="24" width="18" height="3" rx="1" fill="white" opacity="0.95" />

      {/* FanDuel wordmark */}
      <text
        x="44"
        y="22"
        fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
        fontWeight="800"
        fontSize="15"
        fill={wordmark}
        letterSpacing="0.3"
      >
        FanDuel
      </text>

      {/* Research subtitle */}
      <text
        x="44"
        y="32"
        fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
        fontWeight="500"
        fontSize="9"
        fill={sub}
        letterSpacing="2.5"
      >
        RESEARCH
      </text>
    </svg>
  );
}
