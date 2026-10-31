/**
 * BoxAdmin — « Boîte » dans l'espace Dr Lô : les questions anonymes déposées sur /boite-a-questions.
 * Trois issues : répondre ici (publié sur la page), répondre en vidéo (tu le notes), ou classer sans suite.
 */
import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { DC, card } from './DrLoShell';
import type { MomentPalette } from '../../utils/drloMoment';
import { adminBoxDecide, adminBoxList, adminBoxRemove, type BoxItem, type BoxStatus } from '../../services/boxService';

const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', borderRadius: 12, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: 10, fontFamily: 'inherit', fontSize: 16, lineHeight: 1.45, color: DC.text, outline: 'none' };
const small: React.CSSProperties = { minHeight: 44, padding: '0 14px', borderRadius: 12, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const LABEL: Record<BoxStatus, string> = { new: 'Nouvelle', site: 'Répondue ici', video: 'Réponse en vidéo', skipped: 'Sans suite' };
const day = (t: number) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

const Row: React.FC<{ q: BoxItem; palette: MomentPalette; onDone: () => void }> = ({ q, palette, onDone }) => {
  const [open, setOpen] = useState(false);
  const [pub, setPub] = useState(q.publicText || q.text);
  const [answer, setAnswer] = useState(q.answer);
  const [note, setNote] = useState(q.note);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const decide = async (status: BoxStatus) => {
    setBusy(true); setError('');
    try { await adminBoxDecide(q.id, { status, publicText: pub, answer, note }); setOpen(false); onDone(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await adminBoxRemove(q.id); onDone(); } catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); setBusy(false); }
  };

  return (
    <article style={{ ...card, borderColor: q.crisis ? 'rgba(232,102,79,.6)' : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, color: DC.faint }}>
        <span>{day(q.createdAt)} · {LABEL[q.status]}</span>
        {q.crisis && <b style={{ color: '#F09A7A' }}>Détresse possible</b>}
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.5, color: DC.text, whiteSpace: 'pre-line' }}>{q.text}</p>
      {q.status === 'site' && <p style={{ margin: '8px 0 0', fontSize: 14, color: DC.muted, whiteSpace: 'pre-line' }}>Ta réponse : {q.answer}</p>}
      {q.status === 'video' && q.note && <p style={{ margin: '8px 0 0', fontSize: 14, color: DC.muted }}>Note : {q.note}</p>}
      {!open ? (
        <button onClick={() => setOpen(true)} className="drl-btn" style={{ ...small, marginTop: 10 }}>{q.status === 'new' ? 'Décider' : 'Modifier'}</button>
      ) : (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: DC.soft }}>Question affichée (retire tout détail personnel)
            <textarea value={pub} onChange={e => setPub(e.target.value)} rows={2} style={{ ...field, marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 13, fontWeight: 700, color: DC.soft }}>Ta réponse écrite
            <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={4} style={{ ...field, marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 13, fontWeight: 700, color: DC.soft }}>Note pour toi (ex : vidéo TikTok du 3 nov.)
            <input value={note} onChange={e => setNote(e.target.value)} style={{ ...field, marginTop: 4, minHeight: 44 }} />
          </label>
          {error && <p role="alert" style={{ margin: 0, color: '#F09A7A', fontSize: 14 }}>{error}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button disabled={busy} onClick={() => decide('site')} className="drl-btn" style={{ ...small, background: palette.accent, color: '#1C1612', border: 'none' }}>Publier ici</button>
            <button disabled={busy} onClick={() => decide('video')} className="drl-btn" style={small}>Réponse en vidéo</button>
            <button disabled={busy} onClick={() => decide('skipped')} className="drl-btn" style={small}>Sans suite</button>
            <button disabled={busy} onClick={remove} className="drl-btn" style={{ ...small, color: '#F09A7A' }}>Supprimer</button>
            <button disabled={busy} onClick={() => setOpen(false)} className="drl-btn" style={small}>Fermer</button>
          </div>
        </div>
      )}
    </article>
  );
};

const BoxAdmin: React.FC<{ palette: MomentPalette }> = ({ palette }) => {
  const [items, setItems] = useState<BoxItem[] | null>(null);
  const [error, setError] = useState('');
  const [onlyNew, setOnlyNew] = useState(true);
  const load = () => adminBoxList().then(r => setItems(r.items)).catch(e => setError(e instanceof Error ? e.message : 'Erreur'));
  useEffect(() => { load(); }, []);

  if (error) return <p role="alert" style={{ color: '#F09A7A', marginTop: 16 }}>{error}</p>;
  if (!items) return <Loader2 className="animate-spin" style={{ marginTop: 20 }} />;
  const shown = items.filter(q => !onlyNew || q.status === 'new');
  return (
    <section style={{ marginTop: 14 }}>
      <p style={{ margin: 0, fontSize: 14, color: DC.muted, lineHeight: 1.5 }}>Questions anonymes de /boite-a-questions. Aucune réponse n'est promise. Rien n'est publié sans ton accord.</p>
      <button onClick={() => setOnlyNew(v => !v)} className="drl-btn" style={{ ...small, marginTop: 10 }}>{onlyNew ? 'Voir aussi les traitées' : 'Voir seulement les nouvelles'}</button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {shown.length === 0 && <p style={{ color: DC.faint, fontSize: 14 }}>Aucune question {onlyNew ? 'nouvelle' : ''}.</p>}
        {shown.map(q => <Row key={q.id} q={q} palette={palette} onDone={load} />)}
      </div>
    </section>
  );
};

export default BoxAdmin;
