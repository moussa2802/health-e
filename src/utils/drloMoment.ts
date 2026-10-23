/**
 * drloMoment.ts — L'ambiance du premier écran selon le moment de la journée.
 * Logique pure (testable avec node --test). Les salutations en wolof sont
 * À VALIDER par Dr Lô avant la mise en ligne.
 */

export type Moment = 'matin' | 'aprem' | 'soir';

export function getMoment(d: Date = new Date()): Moment {
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'matin';
  if (h >= 12 && h < 18) return 'aprem';
  return 'soir';
}

/** Salutation du titre. Sans prénom : « Na nga def ? » ; avec : « Na nga def, Awa ? ». */
export function greetingFor(moment: Moment, prenom?: string): string {
  const base = moment === 'matin' ? 'Jàmm nga fanaane' : moment === 'aprem' ? 'Na nga def' : 'Na nga yendoo';
  return prenom ? `${base}, ${prenom} ?` : `${base} ?`;
}

export interface MomentPalette {
  bg: string;
  accent: string;
  accentSoft: string;
  bokeh1: string;
  bokeh2: string;
  primary: string;
  glow: string;
}

export const PALETTES: Record<Moment, MomentPalette> = {
  matin: {
    bg: 'radial-gradient(120% 55% at 50% -8%, rgba(240,186,104,.40), rgba(240,186,104,0) 62%), linear-gradient(180deg, #221B14 0%, #15110D 100%)',
    accent: '#F2B66D', accentSoft: 'rgba(242,182,109,.55)',
    bokeh1: 'rgba(240,186,104,.30)', bokeh2: 'rgba(255,214,150,.18)',
    primary: 'linear-gradient(180deg, #F7C27F 0%, #EBA45E 100%)', glow: 'rgba(240,170,95,.38)',
  },
  aprem: {
    bg: 'radial-gradient(110% 52% at 50% 0%, rgba(234,150,88,.34), rgba(234,150,88,0) 60%), linear-gradient(180deg, #1F1712 0%, #140F0C 100%)',
    accent: '#F0A35E', accentSoft: 'rgba(240,163,94,.55)',
    bokeh1: 'rgba(234,150,88,.28)', bokeh2: 'rgba(250,190,120,.16)',
    primary: 'linear-gradient(180deg, #F5B472 0%, #E8964F 100%)', glow: 'rgba(235,150,80,.38)',
  },
  soir: {
    bg: 'radial-gradient(100% 48% at 50% 4%, rgba(214,120,70,.26), rgba(214,120,70,0) 60%), radial-gradient(90% 40% at 50% 112%, rgba(120,70,150,.22), rgba(120,70,150,0) 70%), linear-gradient(180deg, #17121A 0%, #0F0C10 100%)',
    accent: '#E9A36F', accentSoft: 'rgba(233,163,111,.5)',
    bokeh1: 'rgba(214,120,70,.22)', bokeh2: 'rgba(140,90,170,.20)',
    primary: 'linear-gradient(180deg, #F0B07E 0%, #DC8E58 100%)', glow: 'rgba(220,140,90,.34)',
  },
};
