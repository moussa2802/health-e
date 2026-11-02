/**
 * ProsAdmin — onglet « Pros » de Dr Lô : les demandes d'accès des professionnels de santé.
 * C'est la seule validation : un pro validé crée ensuite librement ses chaînes. Suspendre lui retire la gestion (ses chaînes restent).
 */
import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { DC, card } from '../accueil/DrLoShell';
import type { MomentPalette } from '../../utils/drloMoment';
import { approvePro, listPros, PROFESSIONS, rejectPro, suspendPro, type ProRow } from '../../services/proService';

const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: '#F2B66D' }, approved: { label: 'Validé', color: '#9DBFAF' },
  rejected: { label: 'Refusé', color: '#BFB3A3' }, suspended: { label: 'Suspendu', color: '#F09A7A' },
};
const profLabel = (id: string) => PROFESSIONS.find(p => p.id === id)?.label ?? id;

const ProsAdmin: React.FC<{ palette: MomentPalette; onCount?: (n: number) => void }> = ({ palette, onCount }) => {
  const [items, setItems] = useState<ProRow[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const load = () => listPros().then(r => { setItems(r.items); onCount?.(r.pending); setError(''); }).catch(e => setError(e instanceof Error ? e.message : 'Erreur'));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const act = async (uid: string, f: () => Promise<unknown>) => {
    setBusy(uid); setError('');
    try { await f(); setRejecting(null); setReason(''); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); } finally { setBusy(''); }
  };
  const btn = (primary: boolean): React.CSSProperties => ({ minHeight: 42, padding: '0 14px', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: 700, border: primary ? 0 : `1px solid ${DC.line}`, background: primary ? palette.primary : DC.glass, color: primary ? DC.ink : DC.text });

  if (!items) return error ? <p role="alert" style={{ color: '#F09A7A', fontSize: 14 }}>{error}</p> : <Loader2 className="animate-spin" style={{ marginTop: 20 }} aria-label="Chargement" />;
  return (
    <section aria-label="Professionnels" style={{ marginTop: 14 }}>
      <p style={{ margin: 0, fontSize: 14, color: DC.muted, lineHeight: 1.5 }}>Vérifie le numéro d'inscription ou le diplôme avant de valider. Un pro validé crée ses chaînes sans autre accord ; tu peux le suspendre à tout moment.</p>
      {error && <p role="alert" style={{ color: '#F09A7A', fontSize: 14 }}>{error}</p>}
      {items.length === 0 && <p style={{ marginTop: 14, color: DC.faint, fontSize: 14 }}>Aucune demande pour l'instant.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {items.map(p => {
          const st = STATUS[p.status] ?? STATUS.pending;
          return (
            <article key={p.uid} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <b style={{ fontSize: 16, color: DC.text }}>{p.fullName}</b>
                <span style={{ fontSize: 13, fontWeight: 700, color: st.color }}>{st.label}</span>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: DC.soft, lineHeight: 1.5 }}>{p.title || profLabel(p.profession)} · {p.city}<br />Inscription ou diplôme : <b style={{ color: DC.text }}>{p.license}</b><br />{p.email}</p>
              <p style={{ margin: 0, fontSize: 14, color: DC.muted, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{p.bio}</p>
              {p.status === 'rejected' && p.rejectReason && <p style={{ margin: 0, fontSize: 13, color: DC.faint }}>Raison donnée : {p.rejectReason}</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(p.status === 'pending' || p.status === 'rejected') && <button type="button" disabled={busy === p.uid} onClick={() => act(p.uid, () => approvePro(p.uid))} style={btn(true)}>Valider</button>}
                {p.status === 'pending' && rejecting !== p.uid && <button type="button" onClick={() => setRejecting(p.uid)} style={btn(false)}>Refuser</button>}
                {p.status === 'approved' && <button type="button" disabled={busy === p.uid} onClick={() => act(p.uid, () => suspendPro(p.uid, true))} style={btn(false)}>Suspendre</button>}
                {p.status === 'suspended' && <button type="button" disabled={busy === p.uid} onClick={() => act(p.uid, () => suspendPro(p.uid, false))} style={btn(true)}>Rétablir</button>}
              </div>
              {rejecting === p.uid && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={300} rows={2} aria-label="Raison du refus (vue par la personne)" placeholder="Raison du refus (la personne la verra)" className="drl-input"
                    style={{ width: '100%', boxSizing: 'border-box', borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '10px 14px', fontFamily: 'inherit', fontSize: 15, color: DC.text, resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" disabled={busy === p.uid} onClick={() => act(p.uid, () => rejectPro(p.uid, reason))} style={btn(true)}>Confirmer le refus</button>
                    <button type="button" onClick={() => setRejecting(null)} style={btn(false)}>Annuler</button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default ProsAdmin;
