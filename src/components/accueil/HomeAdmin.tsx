/**
 * HomeAdmin — « Accueil » dans l'espace Dr Lô : choisir le test mis à la une sur l'accueil
 * (en général, celui de ta dernière vidéo) et son accroche. Sans choix, l'accueil montre l'anxiété.
 */
import React, { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { DC, card } from './DrLoShell';
import type { MomentPalette } from '../../utils/drloMoment';
import { ALL_SCALES } from '../../data/scales';
import { getScaleMeta } from '../../utils/scaleMeta';
import { DEFAULT_FEATURED, getHomeFeed, setFeatured, type Featured } from '../../services/homeFeedService';

const MAX_LABEL = 60;
const field: React.CSSProperties = { width: '100%', minHeight: 48, boxSizing: 'border-box', borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '0 14px', fontFamily: 'inherit', fontSize: 16, color: DC.text, outline: 'none' };
const lab: React.CSSProperties = { margin: '16px 0 6px', fontSize: 13, fontWeight: 700, color: DC.soft };

/** Les tests proposés : tous sauf ceux de la partie intime (l'accueil est public). */
const CHOICES = ALL_SCALES.filter(s => getScaleMeta(s.id).category !== 'sexual').map(s => ({ id: s.id, label: `${s.code ? `${s.code} · ` : ''}${getScaleMeta(s.id).label}` }));

const HomeAdmin: React.FC<{ palette: MomentPalette }> = ({ palette }) => {
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<Featured | null>(null);
  const [scaleId, setScaleId] = useState(DEFAULT_FEATURED.scaleId);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getHomeFeed(true).then(f => {
      setCurrent(f.featured);
      if (f.featured) { setScaleId(f.featured.scaleId); setLabel(f.featured.label); }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async (clear: boolean) => {
    setBusy(true); setError(''); setMsg('');
    try {
      const f = await setFeatured(clear ? null : scaleId, clear ? '' : label.trim());
      setCurrent(f);
      if (clear) { setScaleId(DEFAULT_FEATURED.scaleId); setLabel(''); }
      setMsg(clear ? 'C\'est retiré : l\'accueil montre le test par défaut.' : 'C\'est en ligne sur l\'accueil (compte une minute pour apparaître chez tout le monde).');
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  };

  if (loading) return <Loader2 className="animate-spin" style={{ marginTop: 20 }} />;
  const inChoices = CHOICES.some(c => c.id === scaleId);
  return (
    <section style={{ ...card, marginTop: 14 }}>
      <h2 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: DC.title }}>Test à la une</h2>
      <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.5, color: DC.muted }}>
        C'est la grande carte tout en haut de l'accueil, pour les visiteurs qui arrivent de ta vidéo. Mets le test dont tu parles en ce moment.
        {current ? <> En ligne : <b style={{ color: DC.text }}>{getScaleMeta(current.scaleId).label}</b>.</> : ' Rien de choisi : l\'accueil montre l\'anxiété.'}
      </p>

      <p style={lab}>Le test</p>
      <select value={inChoices ? scaleId : ''} onChange={e => setScaleId(e.target.value)} aria-label="Le test" style={field}>
        {!inChoices && <option value="">Choisis un test</option>}
        {CHOICES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>

      <p style={lab}>L'accroche (facultatif)</p>
      <input value={label} maxLength={MAX_LABEL} onChange={e => setLabel(e.target.value)} placeholder="Es-tu hypersensible ?" aria-label="L'accroche" style={field} />
      <p style={{ margin: '6px 0 0', fontSize: 13, color: DC.faint }}>
        Avec une accroche, la carte affiche « Vu dans la vidéo » et ta phrase. Sans, elle affiche « Commence ici » et le nom du test.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        <button onClick={() => save(false)} disabled={busy || !inChoices} className="drl-btn"
          style={{ minHeight: 46, padding: '0 20px', borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 15, fontWeight: 700, cursor: busy || !inChoices ? 'default' : 'pointer', opacity: busy || !inChoices ? 0.6 : 1 }}>
          {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : 'Mettre à la une'}
        </button>
        {current && (
          <button onClick={() => save(true)} disabled={busy} className="drl-btn"
            style={{ minHeight: 46, padding: '0 18px', borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Retirer
          </button>
        )}
      </div>
      {msg && <p role="status" style={{ margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: DC.ok }}><Check size={15} aria-hidden="true" />{msg}</p>}
      {error && <p role="alert" style={{ margin: '12px 0 0', fontSize: 14, color: '#F09A7A' }}>{error}</p>}
    </section>
  );
};

export default HomeAdmin;
