import { toPng } from "html-to-image";

export async function exportPng(
  element: HTMLElement,
  filename = "bracket.png",
  scale = 2
): Promise<void> {
  const dataUrl = await toPng(element, {
    pixelRatio: scale,
    backgroundColor: "#ffffff",
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
