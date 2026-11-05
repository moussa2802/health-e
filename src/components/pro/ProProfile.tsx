/**
 * ProProfile — onglet « Mon profil » d'un professionnel : ce que les membres voient de lui (titre, ville, présentation).
 */
import React, { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { DC, card } from '../accueil/DrLoShell';
import type { MomentPalette } from '../../utils/drloMoment';
import { getProMe, updateProProfile } from '../../services/proService';

const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '12px 14px', fontFamily: 'inherit', fontSize: 16, color: DC.text, outline: 'none' };
const lab: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700, color: DC.soft };

const ProProfile: React.FC<{ palette: MomentPalette }> = ({ palette }) => {
  const [p, setP] = useState<{ fullName: string; title: string; city: string; bio: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { getProMe().then(m => setP(m.profile ?? { fullName: '', title: '', city: '', bio: '' })).catch(e => setError(e instanceof Error ? e.message : 'Erreur')); }, []);
  if (!p) return error ? <p role="alert" style={{ color: '#F09A7A', fontSize: 14 }}>{error}</p> : <Loader2 className="animate-spin" style={{ marginTop: 20 }} aria-label="Chargement" />;
  const set = (k: 'title' | 'city' | 'bio', v: string) => { setP({ ...p, [k]: v }); setSaved(false); };
  const save = async () => {
    setBusy(true); setError('');
    try { await updateProProfile({ title: p.title, city: p.city, bio: p.bio }); setSaved(true); } catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); } finally { setBusy(false); }
  };
  return (
    <section aria-label="Mon profil" style={{ ...card, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ margin: 0, fontSize: 15, color: DC.text }}><b>{p.fullName}</b> <span style={{ color: DC.faint, fontSize: 13 }}>(pour changer ton nom, écris à l'équipe Health-e)</span></p>
      <label style={lab}>Titre affiché sur tes chaînes<input value={p.title} maxLength={60} onChange={e => set('title', e.target.value)} className="drl-input" style={field} /></label>
      <label style={lab}>Ville<input value={p.city} maxLength={40} onChange={e => set('city', e.target.value)} className="drl-input" style={field} /></label>
      <label style={lab}>Présentation<textarea value={p.bio} maxLength={600} rows={4} onChange={e => set('bio', e.target.value)} className="drl-input" style={{ ...field, resize: 'vertical' }} /></label>
      {error && <p role="alert" style={{ margin: 0, color: '#F09A7A', fontSize: 14 }}>{error}</p>}
      <button type="button" onClick={save} disabled={busy} className="drl-btn" style={{ minHeight: 48, borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {busy ? <Loader2 size={18} className="animate-spin" aria-label="Enregistrement" /> : saved ? <><Check size={18} aria-hidden="true" /> Enregistré</> : 'Enregistrer'}
      </button>
    </section>
  );
};

export default ProProfile;
