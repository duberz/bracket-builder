import domToImage from "dom-to-image-more";

export async function exportPng(
  element: HTMLElement,
  filename = "bracket.png",
  scale = 2
): Promise<void> {
  const width = element.scrollWidth;
  const height = element.scrollHeight;

  const dataUrl = await domToImage.toPng(element, {
    width: width * scale,
    height: height * scale,
    style: {
      transform: `scale(${scale})`,
      transformOrigin: "top left",
      width: `${width}px`,
      height: `${height}px`,
    },
    bgcolor: "#ffffff",
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
