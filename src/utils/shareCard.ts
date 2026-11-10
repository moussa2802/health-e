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
      // Attendre que l'image soit vraiment prête : sinon (iPhone surtout) la carte part sans l'animal
      try { await img.decode(); } catch { /* image déjà prête, ou décodage impossible */ }
    })
  );

  return () => {
    originals.forEach(({ img, src }) => { img.src = src; });
  };
}

/**
 * La carte en PNG. Safari (iPhone, iPad, Mac) dessine souvent la carte SANS ses images au premier passage
 * (défaut connu de html-to-image) : on la dessine plusieurs fois et on garde le dernier rendu.
 */
const isWebKit = () => typeof navigator !== 'undefined' && /AppleWebKit/.test(navigator.userAgent) && !/Chrome|CriOS|Android/.test(navigator.userAgent)
  || (typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent));
async function renderPng(element: HTMLElement, opts: { pixelRatio: number; backgroundColor: string }): Promise<string> {
  const o = { ...opts, cacheBust: true };
  let dataUrl = await toPng(element, o);
  const passes = isWebKit() ? 2 : 0;
  for (let i = 0; i < passes; i++) dataUrl = await toPng(element, o);
  return dataUrl;
}

export async function shareResultCard(
  element: HTMLElement,
  scaleName: string,
): Promise<void> {
  const restore = await inlineImages(element);

  try {
    const dataUrl = await renderPng(element, { pixelRatio: 2, backgroundColor: '#1B1C1A' });

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

export const SHARE_URL = 'https://health-e.sn/?ref=partage';

/** Texte d'invitation joint à la carte partagée (WhatsApp, story). */
export function shareText(testLabel: string): string {
  return `Je viens de faire le test « ${testLabel} » sur Health-e 👀 Fais le tien, c'est gratuit : ${SHARE_URL}`;
}

/**
 * Partage la carte en image par la feuille de partage du téléphone (WhatsApp, Instagram, TikTok…).
 * Sans partage de fichiers (ordinateur) : on télécharge l'image. Rend 'shared' | 'downloaded' | 'cancelled'.
 */
export async function shareCardImage(
  element: HTMLElement,
  fileName: string,
  text: string,
  opts: { pixelRatio?: number; backgroundColor?: string } = {},
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const restore = await inlineImages(element);
  try {
    const dataUrl = await renderPng(element, { pixelRatio: opts.pixelRatio ?? 2, backgroundColor: opts.backgroundColor ?? '#1B1C1A' });
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], fileName, { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
        return 'shared';
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
        throw e;
      }
    }
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.click();
    return 'downloaded';
  } finally {
    restore();
  }
}

/** Lien WhatsApp avec le texte seul (quand l'image ne peut pas être partagée). */
export function whatsappTextLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
