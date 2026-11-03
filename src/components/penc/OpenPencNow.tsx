/**
 * OpenPencNow — « Ouvrir un Pénc maintenant » (Dr Lô et les pros) : un sujet, pour qui, et on entre dans la salle.
 * Rien à programmer. Pour un Pénc à l'avance : l'onglet « Pénc » de l'Espace pro.
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Radio } from 'lucide-react';
import { DC, card } from '../accueil/DrLoShell';
import type { MomentPalette } from '../../utils/drloMoment';
import { getProMe } from '../../services/proService';
import { listAdminChannels, type AdminChannel } from '../../services/drloChannelService';
import { openPencNow } from '../../services/pencService';

const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', minHeight: 48, borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '0 14px', fontFamily: 'inherit', fontSize: 16, color: DC.text, outline: 'none' };

const OpenPencNow: React.FC<{ palette: MomentPalette }> = ({ palette }) => {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [forWho, setForWho] = useState<'all' | 'channel'>('all');
  const [channels, setChannels] = useState<AdminChannel[] | null>(null);
  const [channelId, setChannelId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { getProMe().then(m => setAllowed(m.role === 'owner' || m.role === 'pro')).catch(() => {}); }, []);
  useEffect(() => {
    if (forWho !== 'channel' || channels) return;
    listAdminChannels().then(r => { const a = r.items.filter(c => c.status === 'active'); setChannels(a); if (a[0]) setChannelId(a[0].id); }).catch(() => setChannels([]));
  }, [forWho, channels]);
  if (!allowed) return null;

  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await openPencNow(title, forWho, forWho === 'channel' ? channelId : undefined);
      navigate(`/penc/${r.penc.id}`, { state: { autoEnter: true } });
    } catch (er) { setError(er instanceof Error ? er.message : 'Erreur'); setBusy(false); }
  };
  const chip = (on: boolean): React.CSSProperties => ({ minHeight: 42, padding: '0 14px', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: on ? 700 : 600, border: `1px solid ${on ? palette.accent : DC.line}`, background: on ? `${palette.accent}26` : 'transparent', color: on ? palette.accent : DC.text });

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="drl-btn" style={{ marginTop: 16, width: '100%', minHeight: 54, borderRadius: 18, border: 0, background: palette.primary, color: DC.ink, fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Radio size={20} aria-hidden="true" />Ouvrir un Pénc maintenant
      </button>
    );
  }
  return (
    <form onSubmit={go} style={{ ...card, marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12, borderColor: `${palette.accent}88` }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 15, fontWeight: 700, color: DC.title }}>De quoi on parle ?
        <input value={title} maxLength={90} onChange={e => { setTitle(e.target.value); setError(''); }} placeholder="Ex. : La jalousie dans le couple" autoFocus className="drl-input" style={field} />
      </label>
      <div role="radiogroup" aria-label="Pour qui" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" role="radio" aria-checked={forWho === 'all'} onClick={() => setForWho('all')} style={chip(forWho === 'all')}>Tout le monde</button>
        <button type="button" role="radio" aria-checked={forWho === 'channel'} onClick={() => setForWho('channel')} style={chip(forWho === 'channel')}>Une de mes chaînes</button>
      </div>
      {forWho === 'channel' && (channels === null ? <Loader2 size={18} className="animate-spin" aria-label="Chargement" />
        : channels.length === 0 ? <p style={{ margin: 0, fontSize: 14, color: DC.muted }}>Tu n'as pas encore de chaîne.</p>
        : <select value={channelId} onChange={e => setChannelId(e.target.value)} aria-label="Chaîne" style={field}>{channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>)}
      {forWho === 'channel' && <p style={{ margin: 0, fontSize: 13, color: DC.faint }}>Les membres de la chaîne sont prévenus tout de suite.</p>}
      {error && <p role="alert" style={{ margin: 0, color: '#F09A7A', fontSize: 14 }}>{error}</p>}
      <button type="submit" disabled={busy || title.trim().length < 6 || (forWho === 'channel' && !channelId)} className="drl-btn"
        style={{ minHeight: 50, borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 16, fontWeight: 700, cursor: 'pointer', opacity: busy || title.trim().length < 6 ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {busy ? <Loader2 size={18} className="animate-spin" aria-label="Ouverture" /> : <><Radio size={18} aria-hidden="true" />Démarrer et entrer</>}
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 0, color: DC.muted, fontSize: 14, cursor: 'pointer', minHeight: 36, padding: 0 }}>Annuler</button>
        <Link to="/drlo" style={{ fontSize: 14, color: palette.accent, fontWeight: 700, minHeight: 36, display: 'inline-flex', alignItems: 'center' }}>Programmer pour plus tard</Link>
      </div>
    </form>
  );
};

export default OpenPencNow;
