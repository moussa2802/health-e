/**
 * CompanionGrowth — le compagnon qui grandit (lot 2) :
 *  - GrewCard (accueil) : « Ton compagnon a grandi », une seule fois par stade, puis disparaît ;
 *  - CompanionCard (Moi) : son nom, son stade et ce qui le fera grandir ensuite.
 * Il grandit avec ce que la personne fait pour elle ; il ne rapetisse jamais et n'est jamais triste.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import CompanionMark from './CompanionMark';
import { DC, card } from './DrLoShell';
import type { MomentPalette } from '../../utils/drloMoment';
import { companionLabel } from '../../utils/companion';
import { STAGES, nextStageHint } from '../../utils/companionStage';
import { markStageSeen, syncCompanion, type CompanionData } from '../../services/companionService';
import { trackAccueil } from '../../utils/accueilTracking';

function useCompanionData(): CompanionData | null {
  const [d, setD] = useState<CompanionData | null>(null);
  useEffect(() => {
    let off = false;
    syncCompanion().then(x => { if (!off) setD(x); }).catch(() => {});
    return () => { off = true; };
  }, []);
  return d;
}

export const GrewCard: React.FC<{ palette: MomentPalette }> = ({ palette }) => {
  const d = useCompanionData();
  const [closing, setClosing] = useState(false);
  if (!d || d.stage < 1 || d.stage <= d.seenStage || closing) return null;
  const s = STAGES[d.stage];
  const hint = nextStageHint(d.stage);
  const ok = () => { setClosing(true); trackAccueil('go', { to: 'companion_grew', from: 'accueil' }); markStageSeen().catch(() => {}); };
  return (
    <section aria-label="Ton compagnon a grandi" style={{ ...card, marginTop: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8,
      borderColor: `${palette.accent}88`, background: `radial-gradient(70% 60% at 50% 30%, ${palette.accent}2E, transparent 70%), rgba(255,255,255,.04)` }}>
      <CompanionMark size={104} live stage={d.stage} mood="joie" ring={palette.accent} />
      <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 800, letterSpacing: '.12em', color: palette.accent }}>{s.name.toUpperCase()}</p>
      <h2 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 22, lineHeight: 1.25, fontWeight: 600, color: DC.title }}>{companionLabel()} a grandi</h2>
      <p style={{ margin: 0, maxWidth: 340, fontSize: 15, lineHeight: 1.5, color: DC.soft }}>{s.grew}</p>
      {hint && <p style={{ margin: 0, fontSize: 13, color: DC.muted }}>Prochaine étape : {hint}.</p>}
      <button onClick={ok} className="drl-btn"
        style={{ marginTop: 4, minHeight: 46, padding: '0 22px', borderRadius: 999, border: `1px solid ${palette.accent}`, background: 'transparent', color: DC.text, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        Jërëjëf
      </button>
    </section>
  );
};

export const CompanionCard: React.FC<{ palette: MomentPalette }> = ({ palette }) => {
  const d = useCompanionData();
  const stage = d?.stage ?? 0;
  const hint = nextStageHint(stage);
  return (
    <Link to="/compagnon" state={{ naming: true }} aria-label={`${companionLabel()} : le personnaliser`} className="drl-btn"
      style={{ ...card, marginTop: 14, display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: DC.text }}>
      <CompanionMark size={64} live stage={stage} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 700, letterSpacing: '.1em', color: palette.accent }}>MON COMPAGNON · {STAGES[stage].name.toUpperCase()}</span>
        <span style={{ display: 'block', fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: DC.title }}>{companionLabel()}</span>
        <span style={{ display: 'block', fontSize: 13, lineHeight: 1.4, color: DC.muted }}>{hint ? `Il deviendra ${hint}.` : 'Il est arrivé à son plus beau feu.'}</span>
      </span>
      <ArrowRight size={18} color={DC.muted} aria-hidden="true" style={{ flexShrink: 0 }} />
    </Link>
  );
};
