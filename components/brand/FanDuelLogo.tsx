interface Props {
  /** light = white horizontal; dark = blue horizontal; vertical-blue / vertical-white = stacked logo */
  variant?: "light" | "dark" | "vertical-blue" | "vertical-white";
  className?: string;
  style?: React.CSSProperties;
  height?: number;
}

export default function FanDuelLogo({ variant = "light", className = "", style, height = 32 }: Props) {
  const src =
    variant === "vertical-blue" ? "/fanduel-vertical-blue.png" :
    variant === "vertical-white" ? "/fanduel-vertical-white.png" :
    variant === "light" ? "/fanduel-logo-white.png" : "/fanduel-logo-blue.png";
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
