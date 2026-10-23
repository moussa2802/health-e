import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  startDefi, defiNext, flowChips, cleanDisplayName, cleanTitre, parseCompatCode, flowWantsText, startCompat, titreFor,
  toggleOptin, withPreview, previewItems, replaceQuestion, addPerso, type SocialFlow,
} from '../../src/utils/socialFlow.ts';

const cats = [{ id: 'amitie', emoji: '🫂', label: 'Amitié', subTypes: [{ id: 'meilleur_ami', emoji: '⭐', label: 'Meilleur(e) ami(e)' }] }];
const ctx = { prenom: 'Papa', categories: cats };

test('Défi : toutes les étapes de la page, dans l\'ordre', () => {
  let f: SocialFlow = { ...startDefi(), data: { availableOptins: ['gad7', 'rses'] } };
  assert.equal(flowChips(f, ctx).length, 5);
  const steps: string[] = [];
  const give: Record<string, (x: SocialFlow) => SocialFlow> = {
    defi_audience: x => ({ ...x, data: { ...x.data, audience: 'amis' } }),
    defi_titre: x => ({ ...x, data: { ...x.data, titre: titreFor('amis') } }),
    defi_name: x => ({ ...x, data: { ...x.data, displayName: 'Papa' } }),
    defi_genre: x => ({ ...x, data: { ...x.data, genre: 'masculin' } }),
    defi_optins: x => ({ ...toggleOptin(x, 'gad7'), data: { ...toggleOptin(x, 'gad7').data, optinsDone: true } }),
    defi_duree: x => ({ ...x, data: { ...x.data, duration: 72 } }),
    defi_reveal: x => ({ ...x, data: { ...x.data, devoilement: 'aucun' } }),
    defi_mots: x => ({ ...x, data: { ...x.data, petitsMots: true } }),
  };
  for (let i = 0; i < 12; i += 1) {
    const n = defiNext(f);
    steps.push(n.flow.step);
    if (n.flow.step === 'defi_creating') break;
    f = give[n.flow.step](n.flow);
  }
  assert.deepEqual(steps, ['defi_audience', 'defi_titre', 'defi_name', 'defi_genre', 'defi_optins', 'defi_duree', 'defi_reveal', 'defi_mots', 'defi_creating']);
  assert.deepEqual(f.data.optins, ['gad7']);
});

test('tests sensibles : cocher / décocher, sauté si aucun', () => {
  let f: SocialFlow = { ...startDefi(), step: 'defi_optins', data: { availableOptins: ['gad7'], optins: [] } };
  assert.equal(flowChips(f, ctx).at(-1)!.label, 'Non merci, sans');
  f = toggleOptin(f, 'gad7');
  assert.equal(flowChips(f, ctx)[0].label, '✓ Anxiété');
  assert.equal(flowChips(f, ctx).at(-1)!.label, 'Valider (1)');
  const g = defiNext({ ...startDefi(), data: { audience: 'amis', titre: 'x y z', displayName: 'Papa', genre: 'masculin' } });
  assert.equal(g.flow.step, 'defi_duree');
});

test('aperçu : 8 questions + totem = 9 ; perso remplace une question ; remplacement', () => {
  const sel = Array.from({ length: 8 }, (_, i) => ({ key: `k${i}`, text: `Q${i}` }));
  let f = withPreview({ ...startDefi(), data: { displayName: 'Papa' } }, {
    selected: sel, available: [{ key: 'a1', text: 'Alt' }],
    perso: [{ id: 'p1', stem: 'Plat préféré ?', options: [{ idx: 0, label: 'Thiéboudienne' }], allowOther: true }], totem: 'Son totem ?',
  });
  assert.equal(previewItems(f.data).length, 9);
  assert.equal(previewItems(f.data).at(-1)!.tag, 'totem');
  f = replaceQuestion(f, 2, 'a1');
  assert.equal(f.data.selected![2].text, 'Alt');
  assert.equal(f.data.replacements, 1);
  assert.equal(f.data.available![0].key, 'k2');
  f = addPerso(f, { questionId: 'p1', answerIdx: 0, displayLabel: 'Thiéboudienne' });
  const items = previewItems(f.data);
  assert.equal(items.length, 9); // 7 + 1 perso + totem
  assert.equal(items[7].tag, 'perso');
  assert.ok(flowWantsText({ ...f, step: 'defi_perso_answer', data: { ...f.data, persoId: 'p1' } }));
});

test('noms et code validés', () => {
  assert.equal(cleanDisplayName('  Papa   Moussa '), 'Papa Moussa');
  assert.equal(cleanDisplayName('x'), null);
  assert.equal(cleanTitre('Défi des potes'), 'Défi des potes');
  assert.equal(cleanTitre('ab'), null);
  assert.equal(cleanTitre('appelle 77123456'), null);
  assert.deepEqual(parseCompatCode('he-mnt-2026-ab12'), { code: 'HE-MNT-2026-AB12', type: 'mental' });
  assert.equal(parseCompatCode('bonjour'), null);
});

test('Compatibilité : catégories puis sous-types', () => {
  const f = startCompat();
  assert.equal(flowChips(f, ctx)[0].value, 'flow:cat:amitie');
  const g = { ...f, step: 'compat_sub' as const, data: { relCategory: 'amitie' } };
  assert.equal(flowChips(g, ctx)[0].value, 'flow:sub:meilleur_ami');
});
