/**
 * ProgrammeCards — les cartes « Mon programme Dr Lô » dans la discussion :
 * l'invitation (choisir l'axe, 3 étincelles), la proposition (j'accepte / adapter / pas maintenant)
 * et le raccourci vers les engagements du jour.
 */
import React, { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { AXES, PROG_AXES, type ProgAxis } from '../../data/programmeLibrary';
import { planFor } from '../../utils/programme';
import type { MomentPalette } from '../../utils/drloMoment';

const C = { text: '#F4EEE4', soft: '#DCD3C5', muted: '#CFC6B8', faint: '#A79E90', title: '#FBF5EA', ink: '#1C140D' };

export interface ProgCardEnv {
  palette: MomentPalette;
  /** Programme déjà en cours (les cartes deviennent inertes) */
  activeAxis: ProgAxis | null;
  busy: boolean;
  proposeCost: string;
  onPrepare: (axis: ProgAxis) => void;
  onAccept: (axis: ProgAxis, light: boolean, intro: string, order: string[]) => void;
  onAlt: (axis: ProgAxis, light: boolean) => void;
  onLater: () => void;
  onOpen: () => void;
}

const styles = (palette: MomentPalette) => {
  const box: React.CSSProperties = { marginTop: 10, textAlign: 'left', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', borderRadius: 18, border: '1px solid rgba(242,182,109,.3)', background: 'rgba(242,182,109,.07)', padding: 16 };
  const primary: React.CSSProperties = { minHeight: 44, padding: '0 16px', borderRadius: 12, border: 0, background: palette.primary, color: C.ink, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 };
  const ghost: React.CSSProperties = { ...primary, background: 'transparent', border: '1px solid rgba(255,255,255,.18)', color: C.text, fontWeight: 600 };
  const kicker: React.CSSProperties = { margin: 0, fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: palette.accent };
  return { box, primary, ghost, kicker };
};

export const ProgrammeInviteCard: React.FC<{ axes: ProgAxis[]; env: ProgCardEnv }> = ({ axes, env }) => {
  const s = styles(env.palette);
  if (env.activeAxis) return <ProgrammeDoneLine />;
  const list = axes.length ? axes : PROG_AXES;
  return (
    <div className="drl-in" style={s.box}>
      <p style={s.kicker}>Mon programme Dr Lô</p>
      <p style={{ margin: '6px 0 12px', fontSize: 14, lineHeight: 1.5, color: C.soft }}>
        28 jours, 3 petits engagements par jour. Je regarde ton profil et je te prépare le tien · {env.proposeCost}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map((a, i) => (
          <button key={a} disabled={env.busy} onClick={() => env.onPrepare(a)} className="drl-btn"
            style={{ ...(i === 0 ? s.primary : s.ghost), justifyContent: 'flex-start', opacity: env.busy ? 0.6 : 1 }}>
            {list.length > 1 ? AXES[a].name : 'Préparer mon programme'}
          </button>
        ))}
      </div>
    </div>
  );
};

export const ProgrammeOfferCard: React.FC<{ axis: ProgAxis; intro: string; order: string[]; light: boolean; fragile?: boolean; env: ProgCardEnv }> = ({ axis, intro, order, light, fragile, env }) => {
  const s = styles(env.palette);
  const [adapt, setAdapt] = useState(false);
  const [lite, setLite] = useState(light || !!fragile);
  const ax = AXES[axis];
  const day1 = planFor({ axis, order1: order, light: lite }, 1);
  if (env.activeAxis) return <ProgrammeDoneLine />;
  return (
    <div className="drl-in" style={s.box}>
      <p style={s.kicker}>Proposition de Dr Lô</p>
      <p style={{ margin: '6px 0 2px', fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: C.title }}>{ax.name}</p>
      <p style={{ margin: 0, fontSize: 13, color: C.faint }}>28 jours · 3 engagements · {lite ? '5' : '10'} min par jour</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '14px 0 16px' }}>
        {day1.map(e => (
          <div key={e.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, lineHeight: 1.45, color: C.soft }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: env.palette.accent, marginTop: 6, flexShrink: 0 }} />
            <span><b style={{ color: C.text }}>{e.title}</b>{e.duration ? ` · ${e.duration}` : ''}</span>
          </div>
        ))}
        <p style={{ margin: 0, fontSize: 13, color: C.faint }}>Les exercices changent chaque jour et chaque semaine.</p>
      </div>
      {adapt && (
        <div className="drl-in" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.12)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, minHeight: 40, cursor: fragile ? 'default' : 'pointer' }}>
            <input type="checkbox" checked={lite} disabled={!!fragile} onChange={e => setLite(e.target.checked)} style={{ width: 20, height: 20, accentColor: env.palette.accent }} />
            Version légère : 5 minutes par jour
          </label>
          <p style={{ margin: 0, fontSize: 13, color: C.faint }}>Ou un autre programme :</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PROG_AXES.filter(a => a !== axis).map(a => (
              <button key={a} onClick={() => env.onAlt(a, lite)} style={{ ...s.ghost, minHeight: 40, fontSize: 13 }}>{AXES[a].short}</button>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => env.onAccept(axis, lite, intro, order)} className="drl-btn" style={{ ...s.primary, flex: 1.3 }}>J'accepte</button>
        {!adapt && <button onClick={() => setAdapt(true)} style={{ ...s.ghost, flex: 1 }}>Adapter</button>}
      </div>
      <button onClick={env.onLater} style={{ ...s.ghost, width: '100%', marginTop: 8, border: 0, color: C.faint, minHeight: 36 }}>Pas maintenant</button>
    </div>
  );
};

export const ProgrammeOpenCard: React.FC<{ env: ProgCardEnv }> = ({ env }) => {
  const s = styles(env.palette);
  return (
    <button onClick={env.onOpen} className="drl-btn drl-in" style={{ ...s.primary, marginTop: 10, width: '100%', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
      <ClipboardCheck size={18} aria-hidden="true" />Voir mes engagements du jour
    </button>
  );
};

/** Carte d'une proposition déjà acceptée : une simple mention, pas un deuxième bouton. */
const ProgrammeDoneLine: React.FC = () => (
  <p className="drl-in" style={{ margin: '8px 0 0', fontSize: 13, color: '#9DBFAF', display: 'flex', alignItems: 'center', gap: 6 }}>
    <ClipboardCheck size={14} aria-hidden="true" />Programme lancé
  </p>
);
