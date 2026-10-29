import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Charte (CHARTE.md) : aucun texte sous 13 px, une seule famille serif (Fraunces), pas de police mono, pas de Georgia seule.
function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(f)) out.push(p);
  }
  return out;
}
const FILES = walk('src').filter(f => !f.includes('/admin/'));
// Cartes exportées en IMAGE à taille fixe (partage WhatsApp/Instagram) : leur mise en page est calculée pour l'image.
const IMAGE_CARDS = ['ResultShareCard.tsx', 'ShareableCompatibilityCard.tsx'];

test('aucun texte sous 13 px (styles et classes Tailwind)', () => {
  const bad: string[] = [];
  for (const f of FILES.filter(f => !IMAGE_CARDS.some(c => f.endsWith(c)))) {
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/fontSize: *([0-9]+(?:\.[0-9]+)?)(?=[ ,}])/g)) {
        if (Number(m[1]) < 13) bad.push(`${f}:${i + 1}: fontSize ${m[1]}`);
      }
      for (const m of line.matchAll(/text-\[([0-9.]+)px\]/g)) {
        if (Number(m[1]) < 13) bad.push(`${f}:${i + 1}: text-[${m[1]}px]`);
      }
    });
  }
  assert.deepEqual(bad, [], `Textes trop petits :\n${bad.join('\n')}`);
});

test('pas de Georgia seule ni de police mono', () => {
  const bad: string[] = [];
  for (const f of FILES) {
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (/fontFamily: *'Georgia/.test(line) || /JetBrains|ui-monospace|\bfont-mono\b|fontFamily: *'monospace'/.test(line)) bad.push(`${f}:${i + 1}: ${line.trim().slice(0, 80)}`);
    });
  }
  assert.deepEqual(bad, [], bad.join('\n'));
});
