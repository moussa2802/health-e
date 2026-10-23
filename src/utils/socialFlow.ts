/**
 * socialFlow.ts — Le Défi et la compatibilité, en conversation avec Dr Lô.
 * Logique pure (testée) : les étapes, ce que Dr Lô dit, les pastilles proposées.
 * Les appels réseau (aperçu et création du défi, calcul de compatibilité) sont faits par
 * l'interface (services/socialChat.ts), qui rappelle ensuite ces fonctions avec le résultat.
 */

export type DefiAudience = 'famille' | 'amis' | 'couple' | 'collegues' | 'tous';

export type FlowStep =
  // Défi
  | 'defi_audience' | 'defi_name' | 'defi_genre' | 'defi_duree' | 'defi_reveal' | 'defi_preview' | 'defi_creating' | 'defi_done'
  // Compatibilité
  | 'compat_rel' | 'compat_sub' | 'compat_code' | 'compat_confirm' | 'compat_running' | 'compat_done';

export interface FlowData {
  audience?: DefiAudience;
  displayName?: string;
  genre?: 'masculin' | 'feminin';
  duration?: number;
  devoilement?: 'auto' | 'aucun';
  selectedKeys?: string[];
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

export interface RelCategory { id: string; emoji: string; label: string; subTypes: { id: string; emoji: string; label: string }[] }

/** Nom affiché aux proches : 2 à 20 caractères, sans lien ni balise. */
export function cleanDisplayName(t: string): string | null {
  const n = t.trim().replace(/\s+/g, ' ');
  if (n.length < 2 || n.length > 20 || /[<>]/.test(n) || /https?:\/\//i.test(n)) return null;
  return n;
}

/** Code de compatibilité (mental ou intime), en majuscules ; null si le format ne colle pas. */
export function parseCompatCode(t: string): { code: string; type: 'mental' | 'sexual' } | null {
  const c = t.trim().toUpperCase().replace(/\s+/g, '');
  if (/^HE-MNT-\d{4}-[A-Z0-9]{4}$/.test(c) || /^SM-[A-Z0-9]{4}$/.test(c)) return { code: c, type: 'mental' };
  if (/^HE-SEX-\d{4}-[A-Z0-9]{4}$/.test(c) || /^SE-[A-Z0-9]{4}$/.test(c)) return { code: c, type: 'sexual' };
  return null;
}

/** Pastilles de l'étape en cours. */
export function flowChips(f: SocialFlow, ctx: { prenom?: string; categories: RelCategory[] }): FlowChip[] {
  switch (f.step) {
    case 'defi_audience': return AUDIENCES.map(a => ({ label: a.label, value: `flow:aud:${a.value}` }));
    case 'defi_name': return ctx.prenom ? [{ label: ctx.prenom, value: `flow:name:${ctx.prenom}` }] : [];
    case 'defi_genre': return [{ label: 'Un homme', value: 'flow:genre:masculin' }, { label: 'Une femme', value: 'flow:genre:feminin' }];
    case 'defi_duree': return [{ label: '48 heures', value: 'flow:dur:48' }, { label: '3 jours', value: 'flow:dur:72' }, { label: '7 jours', value: 'flow:dur:168' }];
    case 'defi_reveal': return [{ label: 'Oui, juste après', value: 'flow:rev:auto' }, { label: 'Non, je garde le mystère', value: 'flow:rev:aucun' }];
    case 'defi_preview': return [{ label: 'C\'est parfait, on lance ! 🚀', value: 'flow:launch' }, { label: 'Je veux personnaliser', value: 'flow:custom' }];
    case 'compat_rel': return ctx.categories.map(c => ({ label: `${c.emoji} ${c.label}`, value: `flow:cat:${c.id}` }));
    case 'compat_sub': {
      const cat = ctx.categories.find(c => c.id === f.data.relCategory);
      return (cat?.subTypes ?? []).map(s => ({ label: `${s.emoji} ${s.label}`, value: `flow:sub:${s.id}` }));
    }
    case 'compat_confirm': return [{ label: 'Oui, on compare', value: 'flow:compare' }, { label: 'Non, ce n\'est pas ça', value: 'flow:recode' }];
    default: return [];
  }
}

/** L'étape attend-elle un texte libre (nom, code) ? */
export function flowWantsText(f: SocialFlow | undefined): boolean {
  return !!f && (f.step === 'defi_name' || f.step === 'compat_code');
}

// ── Ce que dit Dr Lô à chaque étape ──────────────────────────────────────────

export const SAY = {
  defiStart: 'Le Défi « Kan moo ma gën a xam ? » : tes proches devinent tes réponses, et tu découvres qui te connaît vraiment. On le prépare ensemble, ça prend une minute. Tu joues avec qui ?',
  defiNeedTotem: (missing: number) => `Le Défi s'appuie sur ton totem : tes proches devinent ta personnalité. Il te manque encore ${missing} test${missing > 1 ? 's' : ''} pour le révéler. On en fait un maintenant ?`,
  defiRevealTotem: 'Le Défi s\'appuie sur ton totem, et il est prêt à être révélé ! Va le découvrir, puis on lance ton défi.',
  defiTooMany: 'Tu as déjà 3 défis en cours, c\'est le maximum. Attends qu\'un défi se termine, ou regarde qui a déjà joué.',
  defiName: 'Tes proches te connaissent sous quel nom ? Écris-le, ou choisis juste en dessous.',
  defiNameBad: 'Un nom entre 2 et 20 lettres, sans lien. Tu me le réécris ?',
  defiGenre: 'Pour bien accorder les questions : tu es…',
  defiDuree: 'Ils ont combien de temps pour jouer ?',
  defiReveal: 'Après avoir joué, ils voient tes vraies réponses ?',
  defiPreview: (n: number) => `Voilà les ${n} questions que tes proches vont devoir deviner. On lance ?`,
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

/** Étape suivante du Défi une fois l'information donnée (nom → genre si inconnu → durée → dévoilement). */
export function defiNext(f: SocialFlow): { flow: SocialFlow; say: string } {
  const d = f.data;
  if (!d.audience) return { flow: { ...f, step: 'defi_audience' }, say: SAY.defiStart };
  if (!d.displayName) return { flow: { ...f, step: 'defi_name' }, say: SAY.defiName };
  if (!d.genre) return { flow: { ...f, step: 'defi_genre' }, say: SAY.defiGenre };
  if (!d.duration) return { flow: { ...f, step: 'defi_duree' }, say: SAY.defiDuree };
  if (!d.devoilement) return { flow: { ...f, step: 'defi_reveal' }, say: SAY.defiReveal };
  return { flow: { ...f, step: 'defi_creating' }, say: SAY.defiPreparing };
}

export function titreFor(a: DefiAudience | undefined): string {
  return AUDIENCES.find(x => x.value === a)?.titre ?? 'Mon défi';
}
