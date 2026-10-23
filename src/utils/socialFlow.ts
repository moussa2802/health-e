/**
 * socialFlow.ts — Le Défi et la compatibilité, en conversation avec Dr Lô.
 * Logique pure (testée) : les étapes, ce que Dr Lô dit, les choix proposés.
 * Les appels réseau (aperçu et création du défi, calcul de compatibilité) sont faits par
 * l'interface (services/socialChat.ts), qui rappelle ensuite ces fonctions avec le résultat.
 *
 * Le Défi reprend TOUTES les étapes de la page /defi/creer : public, nom du défi, nom affiché,
 * genre, tests sensibles (au choix), durée, dévoilement, petits mots, puis l'aperçu où l'on
 * peut remplacer des questions (3 fois) et ajouter jusqu'à 3 questions perso.
 */

export type DefiAudience = 'famille' | 'amis' | 'couple' | 'collegues' | 'tous';

export type FlowStep =
  // Défi
  | 'defi_audience' | 'defi_titre' | 'defi_name' | 'defi_genre' | 'defi_optins' | 'defi_duree' | 'defi_reveal' | 'defi_mots'
  | 'defi_creating' | 'defi_preview' | 'defi_replace_pick' | 'defi_replace_with' | 'defi_perso_pick' | 'defi_perso_answer' | 'defi_done'
  // Compatibilité
  | 'compat_rel' | 'compat_sub' | 'compat_code' | 'compat_confirm' | 'compat_running' | 'compat_done';

export interface DefiQuestion { key: string; text: string }
export interface PersoQuestion { id: string; stem: string; options: { idx: number; label: string }[]; allowOther?: boolean }
export interface SelectedPerso { questionId: string; answerIdx?: number; customAnswer?: string; displayLabel: string }

export interface FlowData {
  // Défi
  audience?: DefiAudience;
  titre?: string;
  displayName?: string;
  genre?: 'masculin' | 'feminin';
  /** Tests sensibles que la personne peut ajouter (déjà faits). */
  availableOptins?: string[];
  optins?: string[];
  optinsDone?: boolean;
  duration?: number;
  devoilement?: 'auto' | 'aucun';
  petitsMots?: boolean;
  /** Aperçu renvoyé par le serveur */
  selected?: DefiQuestion[];
  fullTraits?: DefiQuestion[];
  available?: DefiQuestion[];
  persoPool?: PersoQuestion[];
  selectedPerso?: SelectedPerso[];
  totemText?: string | null;
  replacements?: number;
  replaceIdx?: number | null;
  persoId?: string | null;
  /** @deprecated ancienne version (avant les questions perso) */
  selectedKeys?: string[];
  // Compatibilité
  relCategory?: string;
  relType?: string;
  partnerCode?: string;
  partnerPrenom?: string;
  /** Mon code de compatibilité (à partager). */
  myCode?: string;
}

export interface SocialFlow {
  kind: 'defi' | 'compat';
  step: FlowStep;
  data: FlowData;
}

export interface FlowChip { label: string; value: string }

export const AUDIENCES: { value: DefiAudience; label: string; titre: string }[] = [
  { value: 'amis', label: 'Mes amis 🫂', titre: 'Défi entre amis' },
  { value: 'famille', label: 'Ma famille 👨‍👩‍👧', titre: 'Défi famille' },
  { value: 'couple', label: 'Mon/ma partenaire 💕', titre: 'Défi couple' },
  { value: 'collegues', label: 'Mes collègues 💼', titre: 'Défi collègues' },
  { value: 'tous', label: 'Tout le monde 🌍', titre: 'Mon défi' },
];

/** Tests sensibles possibles dans un Défi public (cochés par la personne seulement). */
export const OPTIN_LABELS: Record<string, string> = {
  gad7: 'Anxiété',
  rses: 'Estime de soi',
  pss10: 'Stress',
  social_pressure: 'Pression sociale',
  bonus_burnout: 'Burnout',
  bonus_dependance: 'Dépendance affective',
};

export const MAX_REPLACEMENTS = 3;
export const MAX_PERSO = 3;

export interface RelCategory { id: string; emoji: string; label: string; subTypes: { id: string; emoji: string; label: string }[] }

/** Nom affiché aux proches : 2 à 20 caractères, sans lien ni balise. */
export function cleanDisplayName(t: string): string | null {
  const n = t.trim().replace(/\s+/g, ' ');
  if (n.length < 2 || n.length > 20 || /[<>]/.test(n) || /https?:\/\//i.test(n)) return null;
  return n;
}

/** Nom du défi : 3 à 30 caractères, sans lien, balise ni long numéro (mêmes règles que la page). */
export function cleanTitre(t: string): string | null {
  const n = t.trim().replace(/\s+/g, ' ');
  if (n.length < 3 || n.length > 30 || /[<>]/.test(n) || /https?:\/\//i.test(n) || /\d{4,}/.test(n)) return null;
  return n;
}

/** Réponse perso libre (« Autre ») : 1 à 30 caractères. */
export function cleanCustom(t: string): string | null {
  const n = t.trim().replace(/\s+/g, ' ');
  if (n.length < 1 || n.length > 30 || /[<>]/.test(n)) return null;
  return n;
}

/** Code de compatibilité (mental ou intime), en majuscules ; null si le format ne colle pas. */
export function parseCompatCode(t: string): { code: string; type: 'mental' | 'sexual' } | null {
  const c = t.trim().toUpperCase().replace(/\s+/g, '');
  if (/^HE-MNT-\d{4}-[A-Z0-9]{4}$/.test(c) || /^SM-[A-Z0-9]{4}$/.test(c)) return { code: c, type: 'mental' };
  if (/^HE-SEX-\d{4}-[A-Z0-9]{4}$/.test(c) || /^SE-[A-Z0-9]{4}$/.test(c)) return { code: c, type: 'sexual' };
  return null;
}

const short = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

// ── L'aperçu : questions de personnalité, questions perso, question totem ──

export interface PreviewItem { text: string; tag?: 'perso' | 'totem'; note?: string }

export function previewItems(d: FlowData): PreviewItem[] {
  const items: PreviewItem[] = (d.selected ?? []).map(q => ({ text: q.text }));
  for (const sp of d.selectedPerso ?? []) {
    const p = d.persoPool?.find(x => x.id === sp.questionId);
    if (p) items.push({ text: p.stem, tag: 'perso', note: `Ta réponse : ${sp.displayLabel}` });
  }
  if (d.totemText) items.push({ text: d.totemText, tag: 'totem' });
  return items;
}

/** Comme la page : 8 questions de personnalité, une de moins par question perso (minimum 5). */
export function traitsFor(fullTraits: DefiQuestion[], persoCount: number): DefiQuestion[] {
  const target = Math.max(5, 8 - persoCount);
  return fullTraits.slice(0, target);
}

/** Applique l'aperçu du serveur. */
export function withPreview(f: SocialFlow, p: { selected: DefiQuestion[]; available: DefiQuestion[]; perso: PersoQuestion[]; totem: string | null }): SocialFlow {
  return {
    ...f, step: 'defi_preview',
    data: { ...f.data, selected: p.selected, fullTraits: p.selected, available: p.available, persoPool: p.perso, totemText: p.totem, selectedPerso: [], replacements: 0, replaceIdx: null, persoId: null },
  };
}

export function replaceQuestion(f: SocialFlow, idx: number, newKey: string): SocialFlow {
  const d = f.data;
  const nq = d.available?.find(q => q.key === newKey);
  const old = d.selected?.[idx];
  if (!nq || !old) return { ...f, step: 'defi_preview', data: { ...d, replaceIdx: null } };
  const swap = (arr: DefiQuestion[] = []) => arr.map(q => (q.key === old.key ? nq : q));
  return {
    ...f, step: 'defi_preview',
    data: { ...d, selected: swap(d.selected), fullTraits: swap(d.fullTraits), available: [...(d.available ?? []).filter(q => q.key !== newKey), old], replacements: (d.replacements ?? 0) + 1, replaceIdx: null },
  };
}

export function addPerso(f: SocialFlow, sp: SelectedPerso): SocialFlow {
  const d = f.data;
  const selectedPerso = [...(d.selectedPerso ?? []).filter(x => x.questionId !== sp.questionId), sp].slice(0, MAX_PERSO);
  return { ...f, step: 'defi_preview', data: { ...d, selectedPerso, selected: traitsFor(d.fullTraits ?? [], selectedPerso.length), persoId: null } };
}

// ── Choix proposés à chaque étape ───────────────────────────────────────────

export function flowChips(f: SocialFlow, ctx: { prenom?: string; categories: RelCategory[] }): FlowChip[] {
  const d = f.data;
  switch (f.step) {
    case 'defi_audience': return AUDIENCES.map(a => ({ label: a.label, value: `flow:aud:${a.value}` }));
    case 'defi_titre': return [{ label: `Garder « ${titreFor(d.audience)} »`, value: 'flow:titre:keep' }];
    case 'defi_name': return ctx.prenom ? [{ label: ctx.prenom, value: `flow:name:${ctx.prenom}` }] : [];
    case 'defi_genre': return [{ label: 'Un homme', value: 'flow:genre:masculin' }, { label: 'Une femme', value: 'flow:genre:feminin' }];
    case 'defi_optins': {
      const chosen = d.optins ?? [];
      return [
        ...(d.availableOptins ?? []).map(id => ({ label: `${chosen.includes(id) ? '✓ ' : ''}${OPTIN_LABELS[id] ?? id}`, value: `flow:opt:${id}` })),
        { label: chosen.length ? `Valider (${chosen.length})` : 'Non merci, sans', value: 'flow:optdone' },
      ];
    }
    case 'defi_duree': return [{ label: '48 heures', value: 'flow:dur:48' }, { label: '3 jours', value: 'flow:dur:72' }, { label: '7 jours', value: 'flow:dur:168' }];
    case 'defi_reveal': return [{ label: 'Non, je garde le mystère', value: 'flow:rev:aucun' }, { label: 'Oui, juste après avoir joué', value: 'flow:rev:auto' }];
    case 'defi_mots': return [{ label: 'Oui 💌', value: 'flow:mots:1' }, { label: 'Non', value: 'flow:mots:0' }];
    case 'defi_preview': {
      const out: FlowChip[] = [{ label: 'C\'est parfait, on lance ! 🚀', value: 'flow:launch' }];
      if ((d.replacements ?? 0) < MAX_REPLACEMENTS && (d.available?.length ?? 0) > 0) out.push({ label: 'Changer une question', value: 'flow:rep' });
      const persoLeft = (d.persoPool ?? []).filter(p => !(d.selectedPerso ?? []).some(s => s.questionId === p.id));
      if ((d.selectedPerso?.length ?? 0) < MAX_PERSO && persoLeft.length) out.push({ label: 'Ajouter une question perso ✍️', value: 'flow:perso' });
      return out;
    }
    case 'defi_replace_pick':
      return [...(d.selected ?? []).map((q, i) => ({ label: `${i + 1}. ${short(q.text, 34)}`, value: `flow:repi:${i}` })), { label: 'Annuler', value: 'flow:back' }];
    case 'defi_replace_with':
      return [...(d.available ?? []).slice(0, 6).map(q => ({ label: short(q.text, 48), value: `flow:repw:${q.key}` })), { label: 'Annuler', value: 'flow:back' }];
    case 'defi_perso_pick':
      return [...(d.persoPool ?? []).filter(p => !(d.selectedPerso ?? []).some(s => s.questionId === p.id)).map(p => ({ label: short(p.stem.replace(/\{prenom\}/g, d.displayName ?? ''), 52), value: `flow:pp:${p.id}` })), { label: 'Annuler', value: 'flow:back' }];
    case 'defi_perso_answer': {
      const p = d.persoPool?.find(x => x.id === d.persoId);
      return [...(p?.options ?? []).map(o => ({ label: o.label, value: `flow:pa:${o.idx}` })), { label: 'Annuler', value: 'flow:back' }];
    }
    case 'compat_rel': return ctx.categories.map(c => ({ label: `${c.emoji} ${c.label}`, value: `flow:cat:${c.id}` }));
    case 'compat_sub': {
      const cat = ctx.categories.find(c => c.id === d.relCategory);
      return (cat?.subTypes ?? []).map(s => ({ label: `${s.emoji} ${s.label}`, value: `flow:sub:${s.id}` }));
    }
    case 'compat_confirm': return [{ label: 'Oui, on compare', value: 'flow:compare' }, { label: 'Non, ce n\'est pas ça', value: 'flow:recode' }];
    default: return [];
  }
}

/** L'étape attend-elle un texte libre (nom, titre, code, réponse perso « autre ») ? */
export function flowWantsText(f: SocialFlow | undefined): boolean {
  if (!f) return false;
  if (f.step === 'defi_perso_answer') return !!f.data.persoPool?.find(p => p.id === f.data.persoId)?.allowOther;
  return f.step === 'defi_name' || f.step === 'defi_titre' || f.step === 'compat_code';
}

// ── Ce que dit Dr Lô à chaque étape ──────────────────────────────────────────

export const SAY = {
  defiStart: 'Le Défi « Kan moo ma gën a xam ? » : tes proches devinent tes réponses, et tu découvres qui te connaît vraiment. On le prépare ensemble, étape par étape. D\'abord : tu joues avec qui ?',
  defiNeedTotem: (missing: number) => `Le Défi s'appuie sur ton totem : tes proches devinent ta personnalité. Il te manque encore ${missing} test${missing > 1 ? 's' : ''} pour le révéler. On en fait un maintenant ?`,
  defiRevealTotem: 'Le Défi s\'appuie sur ton totem, et il est prêt à être révélé ! Va le découvrir, puis on lance ton défi.',
  defiTooMany: 'Tu as déjà 3 défis en cours, c\'est le maximum. Attends qu\'un défi se termine, ou regarde qui a déjà joué.',
  defiTitre: (t: string) => `Ton défi va s'appeler « ${t} ». Ça te va, ou tu préfères un autre nom ? Écris-le (30 caractères maximum).`,
  defiTitreBad: 'Un nom entre 3 et 30 caractères, sans lien ni long numéro. Tu me le réécris ?',
  defiName: 'Tes proches te connaissent sous quel nom ? Écris-le, ou choisis juste en dessous.',
  defiNameBad: 'Un nom entre 2 et 20 lettres, sans lien. Tu me le réécris ?',
  defiGenre: 'Pour bien accorder les questions : tu es…',
  defiOptins: 'Tu veux ajouter des questions sur des sujets plus sensibles ? Ils viennent de tests que tu as faits, et ne seront dans le défi que si tu les coches. Touche ceux que tu veux, puis valide.',
  defiDuree: 'Ils ont combien de temps pour jouer ?',
  defiReveal: 'Après avoir joué, ils voient tes vraies réponses ?',
  defiMots: 'Tes proches peuvent aussi t\'écrire un petit mot en jouant. Tu acceptes ?',
  defiPreview: (n: number) => `Voilà les ${n} questions que tes proches vont devoir deviner. Tu peux en changer, ajouter des questions perso, ou lancer.`,
  defiPreviewAgain: (n: number) => `C'est noté. Ton défi compte maintenant ${n} questions.`,
  defiReplacePick: 'Laquelle tu veux changer ?',
  defiReplaceWith: 'Par quoi la remplacer ?',
  defiPersoPick: 'Choisis une question perso : c\'est toi qui donnes la vraie réponse, tes proches devront la deviner.',
  defiPersoAnswer: (stem: string, other: boolean) => `« ${stem} » Quelle est ta vraie réponse ?${other ? ' Choisis, ou écris la tienne (30 caractères maximum).' : ''}`,
  defiPreparing: 'Je prépare tes questions…',
  defiCreated: 'Ton défi est lancé 🎉 Envoie le lien sur WhatsApp : je te dirai qui te connaît le mieux.',
  defiError: (e?: string) => `Je n'ai pas pu préparer le défi${e ? ` (${e})` : ''}. Réessaie dans un instant.`,
  compatStart: 'On regarde votre compatibilité ! C\'est qui pour toi ?',
  compatSub: 'Et plus précisément ?',
  compatNeedProfile: (missing: number) => `Pour comparer, il me faut d'abord ton portrait : encore ${missing} test${missing > 1 ? 's' : ''}. On en fait un ?`,
  compatCode: 'Tu as son code de compatibilité ? Écris-le ici. Sinon, envoie-lui le tien : quand cette personne aura fait ses tests, elle t\'enverra le sien.',
  compatCodeBad: 'Ce code ne ressemble pas à un code Health-e (exemple : HE-MNT-2026-AB12). Tu peux me le réécrire ?',
  compatConfirm: (prenom: string, cost: string) => `C'est le code de ${prenom}. On compare vos profils ? (${cost})`,
  compatRunning: 'Je compare vos deux profils…',
  compatDone: (prenom: string) => `Voilà ce que je vois entre toi et ${prenom}.`,
  compatError: (e?: string) => `${e ?? 'Je n\'ai pas pu faire la comparaison.'} Rien n'a été débité si ça n'a pas abouti.`,
};

export function startDefi(): SocialFlow { return { kind: 'defi', step: 'defi_audience', data: {} }; }
export function startCompat(): SocialFlow { return { kind: 'compat', step: 'compat_rel', data: {} }; }

export function titreFor(a: DefiAudience | undefined): string {
  return AUDIENCES.find(x => x.value === a)?.titre ?? 'Mon défi';
}

/** Étape suivante du Défi une fois l'information donnée. */
export function defiNext(f: SocialFlow): { flow: SocialFlow; say: string } {
  const d = f.data;
  if (!d.audience) return { flow: { ...f, step: 'defi_audience' }, say: SAY.defiStart };
  if (!d.titre) return { flow: { ...f, step: 'defi_titre' }, say: SAY.defiTitre(titreFor(d.audience)) };
  if (!d.displayName) return { flow: { ...f, step: 'defi_name' }, say: SAY.defiName };
  if (!d.genre) return { flow: { ...f, step: 'defi_genre' }, say: SAY.defiGenre };
  if ((d.availableOptins?.length ?? 0) > 0 && !d.optinsDone) return { flow: { ...f, step: 'defi_optins', data: { ...d, optins: d.optins ?? [] } }, say: SAY.defiOptins };
  if (!d.duration) return { flow: { ...f, step: 'defi_duree' }, say: SAY.defiDuree };
  if (!d.devoilement) return { flow: { ...f, step: 'defi_reveal' }, say: SAY.defiReveal };
  if (d.petitsMots === undefined) return { flow: { ...f, step: 'defi_mots' }, say: SAY.defiMots };
  return { flow: { ...f, step: 'defi_creating' }, say: SAY.defiPreparing };
}

/** Coche ou décoche un test sensible (reste à l'étape). */
export function toggleOptin(f: SocialFlow, id: string): SocialFlow {
  const cur = f.data.optins ?? [];
  return { ...f, data: { ...f.data, optins: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] } };
}
