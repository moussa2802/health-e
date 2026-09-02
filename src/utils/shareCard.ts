import { toPng } from 'html-to-image';

async function inlineImages(element: HTMLElement): Promise<() => void> {
  const imgs = element.querySelectorAll('img');
  const originals: { img: HTMLImageElement; src: string }[] = [];

  await Promise.all(
    Array.from(imgs).map(async (img) => {
      if (img.src.startsWith('data:')) return;
      try {
        const res = await fetch(img.src);
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        originals.push({ img, src: img.src });
        img.src = dataUrl;
      } catch {
        // leave original src
      }
    })
  );

  return () => {
    originals.forEach(({ img, src }) => { img.src = src; });
  };
}

export async function shareResultCard(
  element: HTMLElement,
  scaleName: string,
): Promise<void> {
  const restore = await inlineImages(element);

  try {
    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      backgroundColor: '#1B1C1A',
      cacheBust: true,
    });

    const fileName = `health-e-${scaleName}.png`;

    if (navigator.share) {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        restore();
        return;
      }
    }

    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  } finally {
    restore();
  }
}
