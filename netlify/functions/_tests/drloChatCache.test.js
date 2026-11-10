// Lancer : node --test netlify/functions/_tests/drloChatCache.test.js
// A1 : ordre du prompt pour le cache (règles fixes d'abord), sans changer un mot. Réglages du modèle du compagnon.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const chat = require('../dr-lo-chat');
const LA = require('../_launch');
const { HAIKU_4_5, HAIKU_5_5 } = require('../_aiModel');

const open = { ...Object.fromEntries(Object.keys(LA.FEATURES).map((k) => [k, true])), routine: false, chaines: false };
const awa = {
  prenom: 'Awa', age: 23, genre: 'Femme', situation: 'Étudiante', companion: 'Jàmm', companion_style: 'douce', companion_lang: 'mix',
  scores_mentaux: { gad7: { scaleName: 'Anxiété', label: 'légère', score: 8, scoreMax: 21, completedAt: Date.now() - 3 * 86400000, subscaleScores: { a: 1.5 } } },
  scores_intimes: { fsfi: { scaleName: 'Désir', label: 'moyen', score: 3, scoreMax: 10 } }, tests_bonus: { som: { scaleName: 'Sommeil', label: 'bon' } },
  tests_compatibilite: [{ date: '2026-10-01', type_relation: 'couple', code_partenaire: 'AB12', score_global: 70 }],
  journal_recent: [{ date: '2026-10-20', humeur: 'triste', themes: ['famille'], contenu: 'Ma démarche de papiers me ronge' }],
  memoire: [{ text: 'Vit à Thiès', cat: 'vie' }, { text: 'Parle de difficultés d\'érection', cat: 'intime' }, 'Doit régulariser ses papiers'],
  analyse_mentale: 'Profil plutôt anxieux', totem_resume: 'Gazelle', tests_dispo: [{ id: 'gad7', label: 'Anxiété' }],
  chaines_txt: 'Pas encore ouvert : n\'en parle pas.', outils_txt: 'Pas encore ouvert : n\'en parle pas.', launch_txt: LA.launchBlock(open), open_features: open,
};
const MESSAGES = ['Salut', 'Quel est mon score ?', 'Relis mon journal', 'Le stress au travail me pèse', 'J\'ai un souci avec mes papiers'];
const lines = (s) => s.split('\n').filter((l) => l.trim()).sort();

test('A1 : mêmes blocs, mêmes mots que l\'ancien ordre (on déplace, on ne réécrit pas)', () => {
  for (const ctx of [awa, { genre: 'Homme' }, { ...awa, genre: 'Homme', companion: '', companion_style: '' }]) {
    for (const message of MESSAGES) {
      const old = chat._buildSystemPrompt(ctx, { message });
      const L = chat._buildPromptLayers(ctx, { message });
      assert.deepEqual(lines(`${L.fixed}\n${L.personal}\n${L.dynamic}`), lines(old), message);
    }
  }
});

test('A1 : les règles fixes viennent en premier et sont les mêmes pour deux personnes différentes', () => {
  const modou = { ...awa, prenom: 'Modou', age: 31, companion: '', memoire: [], scores_mentaux: {}, journal_recent: [] };
  const a = chat._buildPromptLayers(awa, { message: 'Salut' });
  const b = chat._buildPromptLayers(modou, { message: 'Je suis fatigué de tout' });
  assert.equal(a.fixed, b.fixed);
  assert.ok(a.fixed.startsWith('QUI TU ES'));
  assert.ok(a.fixed.includes('━━━ RÈGLES ━━━') && a.fixed.includes('PRINCIPE N°4'));
  assert.ok(!a.fixed.includes('Awa') && !a.fixed.includes('Jàmm'));
});

test('A1 : la partie de la personne ne change pas d\'un message à l\'autre ; ce qui change va après le dernier point de cache', () => {
  const ref = chat._buildPromptLayers(awa, { message: MESSAGES[0] });
  for (const message of MESSAGES) {
    const L = chat._buildPromptLayers(awa, { message });
    assert.equal(L.personal, ref.personal, message);
    assert.equal(L.fixed, ref.fixed, message);
  }
  // Dates (« il y a 3 jours »), chiffres, journal, carnet et DISCRÉTION : seulement dans la partie variable
  for (const k of ['fait il y a 3 jours', '8/21', 'démarche de papiers', 'Vit à Thiès', 'DISCRÉTION']) {
    assert.ok(!ref.fixed.includes(k) && !ref.personal.includes(k), k);
  }
  assert.ok(ref.dynamic.includes('fait il y a 3 jours') && ref.dynamic.includes('DISCRÉTION') && ref.dynamic.includes('Vit à Thiès'));
});

test('requête A1 sur Haiku 4.5 : 3 points de cache, contexte dans le message, rien d\'autre ajouté', () => {
  const historique = [{ role: 'user', content: 'Bonjour' }, { role: 'assistant', content: 'Salut Awa' }];
  const r = chat._buildChatRequest({ context: awa, message: 'Je dors mal', historique, model: HAIKU_4_5 });
  assert.equal(r.model, HAIKU_4_5);
  assert.equal(r.max_tokens, 800);
  for (const k of ['thinking', 'output_config', 'temperature', 'top_p', 'top_k']) assert.ok(!(k in r), k);
  assert.equal(r.system.length, 2);
  assert.ok(r.system.every((b) => b.cache_control && b.cache_control.type === 'ephemeral'));
  assert.deepEqual(r.messages[0], { role: 'user', content: 'Bonjour' });
  assert.deepEqual(r.messages[1].content[0].cache_control, { type: 'ephemeral' });
  const last = r.messages[r.messages.length - 1];
  assert.equal(last.role, 'user');
  assert.ok(last.content[0].text.includes('━━━ CE QUE TU SAIS D\'ELLE'));
  assert.equal(last.content[1].text, 'Awa : Je dors mal');
  assert.ok(!r.messages.some((m) => m.role === 'system'));
  const points = JSON.stringify(r).split('"cache_control"').length - 1;
  assert.ok(points <= 4, `${points} points de cache`);
});

test('requête A1 sur Haiku 5.5 : contexte en message système à la fin, réflexion réglée, pas de préremplissage', () => {
  const r = chat._buildChatRequest({ context: awa, message: 'Je dors mal', historique: [], model: HAIKU_5_5 });
  assert.deepEqual(r.thinking, { type: 'disabled' });
  assert.equal(r.max_tokens, 800);
  assert.equal(r.messages.length, 2);
  assert.deepEqual(r.messages[0], { role: 'user', content: 'Awa : Je dors mal' });
  assert.equal(r.messages[1].role, 'system');
  assert.ok(r.messages[1].content.includes('DISCRÉTION'));
  assert.ok(!r.messages.some((m) => m.role === 'assistant'));
  const low = chat._buildChatRequest({ context: awa, message: 'x', model: HAIKU_5_5, thinking: 'low' });
  assert.deepEqual(low.output_config, { effort: 'low' });
  assert.equal(low.max_tokens, 2000);
  assert.ok(!('thinking' in low));
  for (const k of ['temperature', 'top_p', 'top_k']) assert.ok(!(k in r) && !(k in low), k);
});

test('ancien ordre (retour en arrière) : la requête d\'avant, un seul bloc', () => {
  const historique = [{ role: 'user', content: 'Bonjour' }, { role: 'assistant', content: 'Salut' }];
  const r = chat._buildChatRequest({ context: awa, message: 'Je dors mal', historique, model: HAIKU_4_5, layout: 'ancien' });
  assert.deepEqual(r.system, [{ type: 'text', text: chat._buildSystemPrompt(awa, { message: 'Je dors mal' }), cache_control: { type: 'ephemeral' } }]);
  assert.deepEqual(r.messages, [...historique, { role: 'user', content: 'Awa : Je dors mal' }]);
});

test('compagnon : Haiku 5.5 effort low par défaut, retour en arrière par variables', () => {
  assert.deepEqual(chat._chatSettings({}), { model: HAIKU_5_5, layout: 'a1', thinking: 'low' });
  assert.deepEqual(chat._chatSettings({ DRLO_CHAT_MODEL: ' ', DRLO_CHAT_THINKING: 'n\'importe', DRLO_CHAT_PROMPT: '' }), { model: HAIKU_5_5, layout: 'a1', thinking: 'low' });
  assert.deepEqual(chat._chatSettings({ DRLO_CHAT_MODEL: HAIKU_4_5, DRLO_CHAT_THINKING: 'off', DRLO_CHAT_PROMPT: 'ancien' }), { model: HAIKU_4_5, layout: 'ancien', thinking: 'off' });
  // La requête par défaut : Haiku 5.5, réflexion légère, place pour la réponse
  const s = chat._chatSettings({});
  const r = chat._buildChatRequest({ context: awa, message: 'Je dors mal', model: s.model, layout: s.layout, thinking: s.thinking });
  assert.equal(r.model, 'claude-haiku-5-5');
  assert.deepEqual(r.output_config, { effort: 'low' });
  assert.equal(r.max_tokens, 2000);
  // Haiku 4.5 (retour en arrière) : la requête d'avant, même si DRLO_CHAT_THINKING reste à low
  const old = chat._buildChatRequest({ context: awa, message: 'x', model: HAIKU_4_5, thinking: 'low' });
  assert.ok(!('output_config' in old) && !('thinking' in old) && old.max_tokens === 800);
});

test('compagnon : texte lu par type de bloc, banc « sonnet » gardé', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'dr-lo-chat.js'), 'utf8');
  assert.match(src, /const settings = chatSettings\(\)/);
  assert.match(src, /const raw = textOf\(data\)/);
  assert.ok(!/content\?\.\[0\]/.test(src));
  assert.match(src, /body\.model === 'sonnet'/);
  assert.match(src, /DRLO_CHAT_PROMPT/);
});
