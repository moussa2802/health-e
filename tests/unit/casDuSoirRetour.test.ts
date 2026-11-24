// Lancer : node --test tests/unit/*.test.ts
// Cas du soir : rappel dans l'agenda pour l'épisode suivant, et retour sur le cas après « Crée ton espace ».
import { test } from 'node:test';
import assert from 'node:assert/strict';

const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null), setItem: (k: string, v: string) => { mem.set(k, String(v)); }, removeItem: (k: string) => { mem.delete(k); },
};
const { icsDe, lienGoogleAgenda } = await import('../../src/utils/rappelCalendrier.ts');
const { retenirRetour, prendreRetour } = await import('../../src/utils/retourInscription.ts');

const DEMAIN_20H = Date.parse('2026-11-25T20:00:00Z');

test('rappel : fichier agenda à 20 h (heure de Dakar = UTC), alerte à l\'ouverture, texte échappé', () => {
  const ics = icsDe({ titre: 'Le cas du soir : Goumin, épisode 2', debut: DEMAIN_20H, url: 'https://health-e.sn/cas-du-soir/goumin' }, DEMAIN_20H - 3600000);
  assert.match(ics, /DTSTART:20261125T200000Z/);
  assert.match(ics, /DTEND:20261125T201500Z/);
  assert.match(ics, /SUMMARY:Le cas du soir : Goumin\\, épisode 2/);
  assert.match(ics, /TRIGGER:PT0M/);
  assert.ok(ics.includes('\r\n'));
  const g = new URL(lienGoogleAgenda({ titre: 'Épisode 2', debut: DEMAIN_20H, url: 'https://health-e.sn/cas-du-soir/goumin' }));
  assert.equal(g.hostname, 'calendar.google.com');
  assert.equal(g.searchParams.get('dates'), '20261125T200000Z/20261125T201500Z');
});

test('retour après inscription : la page du cas est rendue une seule fois, jamais une adresse externe ni trop ancienne', () => {
  retenirRetour('/cas-du-soir/goumin');
  assert.equal(prendreRetour(), '/cas-du-soir/goumin');
  assert.equal(prendreRetour(), null); // une seule fois
  retenirRetour('//evil.example'); assert.equal(prendreRetour(), null);
  retenirRetour('https://evil.example'); assert.equal(prendreRetour(), null);
  retenirRetour('/cas-du-soir/goumin'); assert.equal(prendreRetour(Date.now() + 2 * 3600000), null); // plus d'une heure
});
