import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Règle du projet : jamais d'écriture inclusive (« (e) », « (ve) », « (rice)… ») dans ce que la personne lit.
// Les textes de tests s'accordent par gabarits {{masculin|féminin}}.
const FORMS = /[A-Za-zÀ-ÿ]\((?:e|ée|ve|ne|se|le|rice|euse|ère|ière)\)|[a-zà-ÿ]·e\b/;

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}

const ROOTS = ['src/data', 'src/components/assessment', 'src/components/accueil', 'src/pages/drlo', 'src/pages/assessment'];
const FILES = ['src/utils/optionHints.ts', 'src/utils/sexualHealthFilter.ts', 'src/utils/journalPrompts.ts', 'src/utils/relationshipTypes.ts', 'src/utils/onboardingProfile.ts', 'src/utils/scaleVisibility.ts', 'src/utils/scaleMeta.ts', 'src/utils/moodInsights.ts'];

test('aucune écriture inclusive dans les tests, l\'accueil et les pages publiques', () => {
  const bad: string[] = [];
  for (const f of [...ROOTS.flatMap(r => walk(r)), ...FILES]) {
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      // le moteur de journal garde ses anciens gabarits « (e) » : il les accorde lui-même
      if (f.endsWith('journalPrompts.ts')) return;
      // appels de code comme push(e), catch(e)… : pas du texte
      const text = line.replace(/\b(?:push|then|catch|map|filter|forEach|find|some|every|reduce|handle\w*|on\w*)\((?:e|ée)\)/g, '');
      if (FORMS.test(text)) bad.push(`${f}:${i + 1}: ${line.trim().slice(0, 90)}`);
    });
  }
  assert.deepEqual(bad, []);
});
