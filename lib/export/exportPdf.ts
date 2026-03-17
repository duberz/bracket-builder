import { toPng } from "html-to-image";

export async function exportPdf(
  element: HTMLElement,
  filename = "bracket.pdf"
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const width = element.scrollWidth;
  const height = element.scrollHeight;

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
}
