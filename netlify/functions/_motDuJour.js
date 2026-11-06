/**
 * _motDuJour — « Ton mot du jour » : chaque jour, le compagnon laisse UN petit mot à la personne,
 * comme un post-it collé sur son miroir. Logique pure (testée dans _tests/motDuJour.test.js).
 *
 * Il s'appuie sur ce qu'on sait d'elle (son carnet, hors tiroir intime ; son animal intérieur),
 * change de forme chaque jour (une force, un petit pas, une question, de la douceur, de la fierté),
 * et ne répète pas les mots des jours précédents.
 */
const { catOf } = require('./_drloMemory');

/** Les formes, dans l'ordre des jours (une par jour, puis on recommence). */
const KINDS = [
  { id: 'force', how: 'rappelle-lui une force qu\'elle a vraiment (d\'après ce que tu sais d\'elle), et comment s\'en servir aujourd\'hui' },
  { id: 'petit_pas', how: 'propose UN petit geste concret de 2 minutes, faisable aujourd\'hui, qui lui ressemble' },
  { id: 'question', how: 'pose-lui une seule question douce, pour réfléchir dans la journée (pas de réponse attendue)' },
  { id: 'douceur', how: 'donne-lui la permission de ralentir, de s\'accorder du repos ou de l\'indulgence' },
  { id: 'fierte', how: 'reconnais un effort ou un chemin parcouru, sans exagérer' },
];

/** Les catégories du carnet qu'on peut utiliser (jamais l'intime, jamais ce qui pèse : un post-it reste léger). */
const SAFE_CATS = ['vie', 'aide', 'envies', 'parler', 'proches'];

function dayIndex(day) {
  return Math.floor(Date.parse(`${day}T12:00:00Z`) / 86400000);
}
const kindFor = (day) => KINDS[((dayIndex(day) % KINDS.length) + KINDS.length) % KINDS.length];

/** Les notes utilisables, en texte court. */
function safeNotes(memory) {
  return (Array.isArray(memory) ? memory : [])
    .map((n) => ({ t: typeof n === 'string' ? n : (n && n.text) || '', c: typeof n === 'string' ? 'vie' : n && n.cat }))
    .map((n) => ({ t: n.t, c: catOf(n.t, n.c) }))
    .filter((n) => n.t && SAFE_CATS.includes(n.c))
    .slice(0, 12)
    .map((n) => `- ${String(n.t).slice(0, 160)}`);
}

/**
 * ctx = { day, prenom, genre ('homme'|'femme'|''), companion, animal, memory, recent: string[] }
 */
function buildMotPrompt(ctx) {
  const k = kindFor(ctx.day);
  const notes = safeNotes(ctx.memory);
  const fem = ctx.genre === 'femme';
  return {
    kind: k.id,
    system: `Tu es ${ctx.companion || 'le compagnon'}, le compagnon de bien-être de ${ctx.prenom || 'cette personne'} sur Health-e (public surtout sénégalais). Chaque jour, tu lui laisses UN petit mot, comme un post-it qu'on colle sur son miroir et qu'on relit le matin.

LE MOT D'AUJOURD'HUI : ${k.how}.

RÈGLES
- 1 ou 2 phrases, 160 caractères au plus. Tutoiement. Français simple et chaleureux ; un mot de wolof seulement s'il vient naturellement (« ndank ndank », « jàmm »).
- ${fem ? 'Elle est une femme : accorde au féminin.' : ctx.genre === 'homme' ? 'C\'est un homme : accorde au masculin.' : 'Genre inconnu : évite les accords (pas de « prêt/prête », « fier/fière »).'}
- Personnel : appuie-toi sur UNE chose de ce que tu sais d'elle${ctx.animal ? ` ou sur son animal intérieur (${ctx.animal})` : ''}, sans la recopier ni la réciter. Si tu ne sais rien, un mot simple et concret, valable pour tout le monde.
- Jamais : diagnostic, maladie, médicament, nom de test, score, sexualité ou vie intime, deuil, argent, religion imposée, conseil médical ; jamais « tu dois », jamais de promesse (« tout va s'arranger »), jamais de positivité forcée.
- Pas d'émoji, pas de guillemets, pas de signature, pas de « Bonjour ».
- Ne reprends pas l'idée ni la formule des mots récents.
Réponds UNIQUEMENT par le mot.`,
    user: JSON.stringify({
      ce_que_tu_sais: notes.length ? notes : ['(rien encore)'],
      animal_interieur: ctx.animal || null,
      mots_recents: (ctx.recent || []).slice(0, 7),
    }),
  };
}

/** Nettoie la réponse de l'IA ; null si inutilisable. */
function cleanMot(raw) {
  let t = String(raw || '').replace(/[\u0000-\u001f]+/g, ' ').trim();
  t = t.replace(/^["«“'\s]+|["»”'\s]+$/g, '').replace(/\s+/g, ' ').trim();
  if (!t || t.length < 12) return null;
  if (t.length > 220) {
    const cut = t.slice(0, 220);
    const end = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
    t = end > 60 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(' '))}…`;
  }
  // Garde-fou : un mot qui parle de choses sensibles n'est pas affiché (on prend le mot de secours)
  if (/sexu|érect|erect|libido|suicid|mourir|diagnost|dépress|depress|anxiété généralis|médicament|traitement/i.test(t)) return null;
  return t;
}

/** Un mot de secours (IA indisponible), qui change avec le jour. */
const FALLBACK = [
  'Aujourd\'hui, une seule chose à la fois. Le reste peut attendre un peu.',
  'Prends deux minutes pour respirer lentement avant de te lancer dans ta journée.',
  'Qu\'est-ce qui te ferait du bien aujourd\'hui, même un tout petit peu ?',
  'Tu n\'as pas besoin d\'être parfait aujourd\'hui. Avancer ndank ndank, ça compte.',
  'Regarde le chemin déjà fait : tu es encore là, et ça dit beaucoup de toi.',
];
const FALLBACK_F = FALLBACK.map((t) => t.replace('parfait', 'parfaite'));
const fallbackFor = (day, genre) => (genre === 'femme' ? FALLBACK_F : genre === 'homme' ? FALLBACK : FALLBACK.map((t) => t.replace('Tu n\'as pas besoin d\'être parfait aujourd\'hui. ', 'Pas besoin que tout soit parfait aujourd\'hui. ')))[((dayIndex(day) % 5) + 5) % 5];

module.exports = { KINDS, kindFor, safeNotes, buildMotPrompt, cleanMot, fallbackFor };
