/**
 * auraShape — la silhouette de l'aura du compagnon, calculée point par point (sans bibliothèque).
 * Une forme = N rayons autour d'un centre ; on passe d'une forme à l'autre en interpolant les rayons
 * (c'est ce qui permettra, au lot 3, de transformer l'aura en animal intérieur).
 * Logique pure : testée sans navigateur.
 */
export const AURA_N = 72;
export const AURA_CX = 100;
export const AURA_CY = 112;
const TOP = -Math.PI / 2;

/** La goutte de lumière de base (avant l'animal intérieur). */
export function baseRadius(th: number): number {
  return 50 + 28 * Math.pow(Math.max(0, -Math.sin(th)), 5);
}
/** Rayons de la forme de base, de -π à π. */
export function baseRadii(n = AURA_N): number[] {
  return Array.from({ length: n }, (_, i) => baseRadius((i / n) * 2 * Math.PI - Math.PI));
}

/** Le contour vivant à l'instant t (secondes) : petites ondulations, respiration, échelle selon l'humeur. */
export function livePoints(radii: number[], t: number, opts: { speed?: number; scale?: number; jitter?: number } = {}): [number, number][] {
  const { speed = 1, scale = 1, jitter = 0 } = opts;
  const n = radii.length;
  const breath = 1 + 0.025 * Math.sin(t * speed * 1.6);
  return radii.map((r, i) => {
    const th = (i / n) * 2 * Math.PI - Math.PI;
    const live = 1.6 * Math.sin(3 * th + t * speed * 1.3) + 1.2 * Math.sin(5 * th - t * speed * 1.7) + jitter * Math.sin(9 * th + t * 4);
    const R = (r + live) * scale * breath;
    return [AURA_CX + Math.cos(th) * R, AURA_CY + Math.sin(th) * R];
  });
}

/** Contour fermé et lisse (Catmull-Rom → Bézier). */
export function smoothPath(pts: [number, number][]): string {
  const n = pts.length;
  if (n < 3) return '';
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i += 1) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
}

/** La goutte au repos (sans ondulation) : pour les petites tailles, dessinée une fois. */
export const STILL_PATH = smoothPath(livePoints(baseRadii(), 0, { speed: 0 }));

/** Mélange une couleur #rrggbb avec du blanc (k > 0) ou du noir (k < 0). */
export function shade(hex: string, k: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k)));
  return `#${ch.map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

export { TOP as AURA_TOP };
