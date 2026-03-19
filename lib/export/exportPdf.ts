import { toPng } from "html-to-image";

export async function exportPdf(
  element: HTMLElement,
  filename = "bracket.pdf"
): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const hidden = hideLogos(element);
  try {
    // offsetWidth/offsetHeight of the inline-flex element = content size, no viewport padding
    const width = element.offsetWidth;
    const height = element.offsetHeight;

    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });

    const landscape = width > height;
    const pdf = new jsPDF({
      orientation: landscape ? "landscape" : "portrait",
      unit: "px",
      format: [width, height],
      compress: true,
    });

    pdf.addImage(dataUrl, "PNG", 0, 0, width, height, undefined, "FAST");
    pdf.save(filename);
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
