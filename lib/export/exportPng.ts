import domToImage from "dom-to-image-more";

export async function exportPng(
  element: HTMLElement,
  filename = "bracket.png",
  scale = 2
): Promise<void> {
  const width = element.scrollWidth;
  const height = element.scrollHeight;

  // Inline CSS custom properties so dom-to-image renders them correctly.
  // Using the style option on a wrapper isn't reliable for CSS vars; instead
  // we temporarily set them on the element itself and restore after.
  const cssVars: Record<string, string> = {
    "--brand-primary": "#1066E5",
    "--brand-secondary": "#0a1929",
    "--brand-bg": "#f5f7fa",
    "--brand-surface": "#ffffff",
    "--brand-text": "#0a1929",
    "--brand-muted": "#6b7280",
    "--brand-accent": "#00d4aa",
  };
  for (const [k, v] of Object.entries(cssVars)) {
    element.style.setProperty(k, v);
  }

  try {
    // Use pixelRatio instead of CSS transform — this scales the canvas
    // output without scaling CSS borders (avoids the "thick lines" artifact).
    const dataUrl = await domToImage.toPng(element, {
      width,
      height,
      bgcolor: "#ffffff",
      // @ts-ignore — dom-to-image-more supports scale/pixelRatio
      scale,
    });

    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } finally {
    // Remove the temporarily inlined vars
    for (const k of Object.keys(cssVars)) {
      element.style.removeProperty(k);
    }
  }
}
