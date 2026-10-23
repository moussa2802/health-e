/**
 * _drloRoute.js — Dr Lô comprend ce que la personne écrit librement sur le premier écran
 * et choisit où l'emmener (logique pure, testée dans _tests/_drloRoute.test.js).
 *
 * L'IA ne fait que TRIER et répondre en une ou deux phrases : elle ne diagnostique pas,
 * ne donne pas de traitement, et toute détresse part vers « crisis ».
 */

const ACTIONS = [
  'test',          // proposer un test précis (scaleId obligatoire)
  'defi',          // « Kan moo ma gën a xam ? » : ses proches devinent qui il/elle est
  'compat',        // comparer son profil avec quelqu'un (partenaire, crush, ami·e) via un code
  'mood',          // noter son humeur du jour
  'confier',       // écrire / vider son sac dans son journal privé
  'breath',        // se calmer maintenant (1 minute de respiration)
  'chat',          // discuter librement avec Dr Lô (IA) d'une question ou d'une situation
  'question_drlo', // écrire au vrai Dr Lô (le médecin)
  'totem',         // voir son totem / son profil
  'catalogue',     // voir tous les tests
  'explain',       // pendant un test : reformuler la question en cours
  'pause',         // pendant un test : arrêter / faire autre chose
  'continue',      // pendant un test : petit mot puis on reprend
  'crisis',        // idées suicidaires, automutilation, danger immédiat, violence subie en cours
  'reply',         // simple réponse (salut, merci, question sur le site…), on reste où on est
];

const MAX_TEXT = 500;

function clean(s, max) {
  return String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').slice(0, max).trim();
}

/** Nettoie le contexte envoyé par le navigateur (rien n'y est fiable : il ne sert qu'au ton). */
function sanitizeContext(body) {
  const scales = Array.isArray(body.scales) ? body.scales : [];
  return {
    text: clean(body.text, MAX_TEXT),
    step: clean(body.step, 20),
    prenom: clean(body.prenom, 30),
    genre: body.genre === 'femme' || body.genre === 'homme' ? body.genre : null,
    isAuthenticated: !!body.isAuthenticated,
    done: (Array.isArray(body.done) ? body.done : []).map(x => clean(x, 40)).filter(x => /^[a-z0-9_]+$/i.test(x)).slice(0, 60),
    scales: scales
      .map(x => ({ id: clean(x && x.id, 40), label: clean(x && x.label, 60) }))
      .filter(x => /^[a-z0-9_]+$/i.test(x.id) && x.label)
      .slice(0, 60),
    activeTest: body.activeTest && typeof body.activeTest === 'object'
      ? { label: clean(body.activeTest.label, 60), question: clean(body.activeTest.question, 400), options: (Array.isArray(body.activeTest.options) ? body.activeTest.options : []).map(o => clean(o, 60)).slice(0, 8) }
      : null,
    lastDrlo: clean(body.lastDrlo, 400),
  };
}

function buildSystemPrompt() {
  return `Tu es Dr Lô, compagnon de bien-être de Health-e (health-e.sn), plateforme sénégalaise de santé mentale et de vie intime.
Tu es sur le premier écran : la personne t'écrit librement. Ton rôle : COMPRENDRE ce qu'elle veut vraiment et l'emmener au bon endroit, avec une réponse courte et chaleureuse.

Ton style : tutoiement, chaleureux, direct, simple, jamais de jargon. 1 ou 2 phrases courtes, 180 caractères maximum. Français impeccable : relis les accords et les pronoms (ex. « s'il te connaît », jamais « s'il vous connaît » quand tu parles à une seule personne). Reprends en quelques mots ce que la personne a dit (elle doit se sentir comprise). Si elle écrit en wolof, tu peux glisser quelques mots de wolof, mais réponds surtout en français. Accorde au genre connu (sinon formule neutre, sans « (e) »). Pas d'emoji, sauf éventuellement un seul.

Interdits : diagnostic, médicament, conseil médical, promesse de guérison, jugement. Tu n'inventes aucune fonction.

Destinations possibles (champ "action") :
- "test" : un test du site aide à y voir clair. Donne "scaleId", choisi UNIQUEMENT dans la liste fournie. Si la personne a déjà fait le test idéal, propose-le quand même pour voir l'évolution, ou un test voisin pas encore fait.
  Repères : inquiétude/nervosité → gad7 ; pression/surmenage/sommeil → pss10 ; moral bas/tristesse → phq9 ; image de soi → rses ; encaisser les coups durs → brs ; personnalité → big_five ; façon d'aimer/peur d'être quitté(e) → ecr_r ; deuil → pg13 ; jalousie → bonus_jalousie ; trop attaché(e) à quelqu'un → bonus_dependance ; épuisement au travail → bonus_burnout ; concentration/agitation → bonus_tdah ; sensibilité forte → bonus_hsp ; confiance en soi → bonus_confiance.
- "defi" : la personne veut savoir si ses proches/ami(e)s la connaissent vraiment, jouer avec ses amis, un quiz entre amis, « kan moo ma gën a xam ». C'est le Défi : ses proches devinent ses réponses.
- "compat" : comparer sa personnalité/compatibilité avec quelqu'un (partenaire, crush, fiancé(e), ami(e)), savoir si on est fait l'un pour l'autre. Fonctionne avec un code à partager.
- "mood" : noter son humeur du jour.
- "confier" : elle veut raconter, vider son sac, écrire ce qu'elle a sur le cœur sans être interrompue (journal privé).
- "breath" : angoisse, crise de panique, cœur qui bat vite, souffle court MAINTENANT, sans idée de mort ni danger : on respire ensemble tout de suite.
- "chat" : elle pose une vraie question (santé, couple, sexualité, situation précise) ou veut discuter en profondeur.
- "question_drlo" : elle veut parler au vrai Dr Lô, le médecin. Attention : ce n'est PAS un appel ni un chat en direct. Elle lui écrit une question (gratuit, une à la fois) et il répond par écrit quand il peut. Ne promets jamais une mise en contact immédiate.
- "totem" : voir son animal-totem ou son profil complet.
- "catalogue" : voir la liste de tous les tests.
- "crisis" : idées de mort ou de suicide (y compris « à quoi bon vivre ») (même en wolof : « dama bëgg dee », « rey sama bopp », « xaru »…), se faire du mal, danger immédiat, violence subie en ce moment. Dans le doute, choisis "crisis". La réponse dit qu'on prend ça au sérieux et qu'elle a besoin d'une vraie personne maintenant.
- "reply" : simple échange (bonjour, merci, ça va et toi, question sur le fonctionnement du site, prénom donné…). Réponds et relance doucement sur ce qui l'amène.
Pendant un test (étape "testing") :
- "explain" : elle ne comprend pas la question → "reply" = la question reformulée très simplement, avec un exemple concret de la vie de tous les jours (sans orienter la réponse).
- "pause" : elle veut arrêter, faire autre chose, ou elle demande une autre destination → précise aussi "then" avec la destination voulue (defi, compat, mood, confier, chat, question_drlo, totem, catalogue, test) si elle en a une.
- "continue" : simple remarque ou émotion → un mot d'écoute, puis on reprend la question.

Réponds UNIQUEMENT avec un objet JSON sur une ligne, sans texte autour :
{"action":"...","scaleId":"... ou null","then":"... ou null","reply":"..."}`;
}

function buildUserPrompt(ctx) {
  const lines = [];
  lines.push(`Étape actuelle : ${ctx.step || 'need'}`);
  lines.push(`Connecté(e) : ${ctx.isAuthenticated ? 'oui' : 'non (invité)'}`);
  if (ctx.prenom) lines.push(`Prénom : ${ctx.prenom}`);
  lines.push(`Genre : ${ctx.genre ?? 'inconnu'}`);
  if (ctx.done.length) lines.push(`Tests déjà faits : ${ctx.done.join(', ')}`);
  if (ctx.scales.length) lines.push(`Tests disponibles (scaleId = nom) : ${ctx.scales.map(s => `${s.id} = ${s.label}`).join(' ; ')}`);
  if (ctx.activeTest) {
    lines.push(`Test en cours : ${ctx.activeTest.label}`);
    lines.push(`Question en cours : ${ctx.activeTest.question}`);
    if (ctx.activeTest.options.length) lines.push(`Réponses possibles : ${ctx.activeTest.options.join(' / ')}`);
  }
  if (ctx.lastDrlo) lines.push(`Dernier message de Dr Lô : ${ctx.lastDrlo}`);
  lines.push('');
  lines.push(`Message de la personne : """${ctx.text}"""`);
  return lines.join('\n');
}

const TEST_ONLY = new Set(['explain', 'pause', 'continue']);

/** Lit la réponse de l'IA et la rend sûre (action connue, test existant, texte court). */
function parseDecision(raw, ctx) {
  let obj = null;
  const m = String(raw ?? '').match(/\{[\s\S]*\}/);
  if (m) { try { obj = JSON.parse(m[0]); } catch { obj = null; } }
  if (!obj || typeof obj !== 'object') return null;
  let action = ACTIONS.includes(obj.action) ? obj.action : null;
  if (!action) return null;
  const inTest = ctx.step === 'testing';
  if (TEST_ONLY.has(action) && !inTest) action = 'reply';
  const ids = new Set(ctx.scales.map(s => s.id));
  let scaleId = typeof obj.scaleId === 'string' && ids.has(obj.scaleId) ? obj.scaleId : null;
  if (action === 'test' && !scaleId) action = 'catalogue';
  let then = typeof obj.then === 'string' && ACTIONS.includes(obj.then) && !TEST_ONLY.has(obj.then) && obj.then !== 'crisis' && obj.then !== 'reply' ? obj.then : null;
  if (then === 'test' && !scaleId) then = null;
  // Pendant un test, une autre destination passe d'abord par la pause
  if (inTest && !TEST_ONLY.has(action) && action !== 'crisis' && action !== 'reply') {
    then = action;
    action = 'pause';
  }
  let reply = clean(obj.reply, 600).replace(/\s*\(e\)/g, '');
  if (!reply) return null;
  if (reply.length > 420) reply = `${reply.slice(0, 417).replace(/\s+\S*$/, '')}…`;
  return { action, scaleId: (action === 'test' || then === 'test') ? scaleId : null, then, reply };
}

module.exports = { ACTIONS, MAX_TEXT, sanitizeContext, buildSystemPrompt, buildUserPrompt, parseDecision };
