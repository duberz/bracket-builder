import { toPng } from "html-to-image";

export async function exportPng(
  element: HTMLElement,
  filename = "bracket.png",
  scale = 2
): Promise<void> {
  const hidden = hideLogos(element);
  try {
    const width = element.scrollWidth;
    const height = element.scrollHeight;
    const dataUrl = await toPng(element, {
      pixelRatio: scale,
      backgroundColor: "#ffffff",
      width,
      height,
    });
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } finally {
    restoreLogos(hidden);
  }
}

function hideLogos(root: HTMLElement): Array<[HTMLElement, string]> {
  const els = Array.from(root.querySelectorAll<HTMLElement>("[data-print-hide]"));
  return els.map((el) => {
    const prev = el.style.display;
    el.style.display = "none";
    return [el, prev];
  });
}

function restoreLogos(saved: Array<[HTMLElement, string]>) {
  for (const [el, prev] of saved) el.style.display = prev;
}
