interface Props {
  /** light = white logo (for dark header); dark = blue logo (for light bg) */
  variant?: "light" | "dark";
  className?: string;
  style?: React.CSSProperties;
  height?: number;
}

export default function FanDuelLogo({ variant = "light", className = "", style, height = 32 }: Props) {
  const src = variant === "light" ? "/fanduel-logo-white.png" : "/fanduel-logo-blue.png";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="FanDuel Research"
      height={height}
      style={{ height, width: "auto", display: "block", ...style }}
      className={className}
    />
  );
}
