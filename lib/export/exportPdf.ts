import domToImage from "dom-to-image-more";

export async function exportPdf(
  element: HTMLElement,
  filename = "bracket.pdf"
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const width = element.scrollWidth;
  const height = element.scrollHeight;

  // Render to PNG at 2x scale
  const dataUrl = await domToImage.toPng(element, {
    width: width * 2,
    height: height * 2,
    style: {
      transform: "scale(2)",
      transformOrigin: "top left",
      width: `${width}px`,
      height: `${height}px`,
    },
    bgcolor: "#ffffff",
  });

  // Determine orientation
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
