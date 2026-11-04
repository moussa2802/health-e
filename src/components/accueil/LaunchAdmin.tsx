/**
 * LaunchAdmin — « Lancement par vagues » dans l'Espace pro (onglet Accueil, Dr Lô seulement).
 * Choisir la vague ouverte pour tout le monde (1 à 4), et au besoin ouvrir ou fermer une fonctionnalité à part.
 * Rien n'est supprimé : une fonctionnalité cachée reste accessible par son lien.
 */
import React, { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { DC, card } from './DrLoShell';
import type { MomentPalette } from '../../utils/drloMoment';
import { getHomeFeed, setLaunch } from '../../services/homeFeedService';
import { DEFAULT_LAUNCH, FEATURE_KEYS, FEATURES, openForAll, UNLOCK_LABEL, WAVES, type FeatureKey, type LaunchCfg } from '../../utils/launch';

const LaunchAdmin: React.FC<{ palette: MomentPalette }> = ({ palette }) => {
  const [cfg, setCfg] = useState<LaunchCfg | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { getHomeFeed(true).then(f => setCfg(f.launch ?? DEFAULT_LAUNCH)).catch(() => setCfg(DEFAULT_LAUNCH)); }, []);
  if (!cfg) return <Loader2 className="animate-spin" style={{ marginTop: 20 }} aria-label="Chargement" />;

  const save = async (next: LaunchCfg) => {
    setBusy(true); setError(''); setMsg('');
    try { setCfg(await setLaunch(next.wave, next.open, next.closed)); setMsg('Enregistré (une minute pour apparaître chez tout le monde).'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  };
  const mode = (k: FeatureKey): 'auto' | 'open' | 'closed' => (cfg.open.includes(k) ? 'open' : cfg.closed.includes(k) ? 'closed' : 'auto');
  const setMode = (k: FeatureKey, m: 'auto' | 'open' | 'closed') => save({
    wave: cfg.wave,
    open: m === 'open' ? [...cfg.open.filter(x => x !== k), k] : cfg.open.filter(x => x !== k),
    closed: m === 'closed' ? [...cfg.closed.filter(x => x !== k), k] : cfg.closed.filter(x => x !== k),
  });
  const chip = (on: boolean): React.CSSProperties => ({ minHeight: 36, padding: '0 12px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: on ? 700 : 600, border: `1px solid ${on ? palette.accent : DC.line}`, background: on ? `${palette.accent}22` : 'transparent', color: on ? palette.accent : DC.muted });

  return (
    <section style={{ ...card, marginTop: 14 }}>
      <h2 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: DC.title }}>Lancement par vagues</h2>
      <p style={{ margin: '6px 0 12px', fontSize: 14, lineHeight: 1.5, color: DC.muted }}>On n'ouvre la vague suivante que quand la boucle tient (retour à J+7, part qui atteint l'animal). Une vague ouverte se débloque ensuite pour chacun selon sa progression.</p>
      <div role="radiogroup" aria-label="Vague ouverte" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {WAVES.map(w => {
          const on = cfg.wave === w.n;
          return (
            <button key={w.n} type="button" role="radio" aria-checked={on} disabled={busy} onClick={() => save({ ...cfg, wave: w.n })} className="drl-btn"
              style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${on ? palette.accent : DC.line}`, background: on ? `${palette.accent}1A` : 'transparent', color: DC.text }}>
              <b style={{ display: 'block', fontSize: 15, color: on ? palette.accent : DC.title }}>Vague {w.n} · {w.name}</b>
              <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: DC.muted, lineHeight: 1.45 }}>{w.text}</span>
            </button>
          );
        })}
      </div>
      <p style={{ margin: '18px 0 8px', fontSize: 13, fontWeight: 700, color: DC.soft }}>Exceptions, fonctionnalité par fonctionnalité</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FEATURE_KEYS.map(k => {
          const f = FEATURES[k];
          const visible = openForAll(k, cfg);
          return (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 10, borderBottom: `1px solid ${DC.line}` }}>
              <span style={{ fontSize: 15, color: DC.text }}><b>{f.label}</b> <span style={{ fontSize: 13, color: DC.faint }}>· vague {f.wave}{f.unlock ? ` · ${UNLOCK_LABEL[f.unlock]}` : ''} · {visible ? 'ouverte' : 'cachée'}</span></span>
              <div role="radiogroup" aria-label={`${f.label} : réglage`} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {([['auto', 'Selon la vague'], ['open', 'Toujours ouverte'], ['closed', 'Toujours cachée']] as const).map(([m, l]) => (
                  <button key={m} type="button" role="radio" aria-checked={mode(k) === m} disabled={busy} onClick={() => setMode(k, m)} style={chip(mode(k) === m)}>{l}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {msg && <p role="status" style={{ margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: DC.ok }}><Check size={15} aria-hidden="true" />{msg}</p>}
      {error && <p role="alert" style={{ margin: '12px 0 0', fontSize: 14, color: '#F09A7A' }}>{error}</p>}
    </section>
  );
};

export default LaunchAdmin;
