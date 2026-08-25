import { toPng } from 'html-to-image';

export async function shareResultCard(
  element: HTMLElement,
  scaleName: string,
): Promise<void> {
  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    backgroundColor: '#1B1C1A',
  });

  const fileName = `health-e-${scaleName}.png`;

  if (navigator.share) {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], fileName, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
      return;
    }
  }

  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}
