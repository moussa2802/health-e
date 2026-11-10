/**
 * PencAdmin — onglet « Pénc » de l'Espace pro : programmer, entrer dans la salle (démarrer), terminer (avec les idées à retenir), annuler.
 * Dr Lô voit tous les Pénc ; un pro, les siens. Aucune validation : un pro programme librement.
 */
import React, { useEffect, useState } from 'react';
import { PENC_PRIX_PAR_DEFAUT } from '../../config/contenusPayants';
import { Link } from 'react-router-dom';
import { Loader2, Plus } from 'lucide-react';
import { DC, card } from '../accueil/DrLoShell';
import type { MomentPalette } from '../../utils/drloMoment';
import { SCALE_META } from '../../utils/scaleMeta';
import { listAdminChannels, type AdminChannel } from '../../services/drloChannelService';
import { cancelPenc, hidePenc, DURATIONS, endPenc, managePencs, savePenc, whenLabel, type Penc, type PencAccess } from '../../services/pencService';

const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '12px 14px', fontFamily: 'inherit', fontSize: 16, color: DC.text, outline: 'none' };
const lab: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700, color: DC.soft };
const pad = (n: number) => String(n).padStart(2, '0');
// Les heures se saisissent à l'heure de Dakar (UTC, sans heure d'été), même quand le pro est à l'étranger.
const toDate = (t: number) => { const d = new Date(t); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
const toTime = (t: number) => { const d = new Date(t); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
const dakarToMs = (date: string, time: string) => { const [y, m, d] = date.split('-').map(Number); const [h, mi] = time.split(':').map(Number); return Date.UTC(y, (m || 1) - 1, d || 1, h || 0, mi || 0); };
const SCALES = Object.entries(SCALE_META).map(([id, m]) => ({ id, label: m.label })).sort((a, b) => a.label.localeCompare(b.label, 'fr'));

type Form = { id?: string; title: string; description: string; date: string; time: string; durationMin: number; access: PencAccess; channelId: string; price: number; testScaleId: string; repeatWeekly: boolean };
const empty = (): Form => { const t = Date.now() + 2 * 86400000; return { title: '', description: '', date: toDate(t), time: '21:00', durationMin: 45, access: 'all', channelId: '', price: PENC_PRIX_PAR_DEFAUT, testScaleId: '', repeatWeekly: false }; };

const PencAdmin: React.FC<{ palette: MomentPalette }> = ({ palette }) => {
  const [items, setItems] = useState<Penc[] | null>(null);
  const [channels, setChannels] = useState<AdminChannel[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [ending, setEnding] = useState<string | null>(null);
  const [summary, setSummary] = useState(['', '', '']);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = () => managePencs().then(r => { setItems(r.items); setError(''); }).catch(e => setError(e instanceof Error ? e.message : 'Erreur'));
  useEffect(() => { load(); listAdminChannels().then(r => setChannels(r.items.filter(c => c.status === 'active'))).catch(() => {}); }, []);

  const run = async (f: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await f(); await load(); return true; } catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); return false; } finally { setBusy(false); }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const startAt = dakarToMs(form.date, form.time);
    const ok = await run(() => savePenc({ id: form.id, title: form.title, description: form.description, startAt, durationMin: form.durationMin, access: form.access, channelId: form.channelId, price: form.price, testScaleId: form.testScaleId, repeatWeekly: form.repeatWeekly }));
    if (ok) setForm(null);
  };
  const btn = (primary: boolean): React.CSSProperties => ({ minHeight: 42, padding: '0 14px', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: 700, border: primary ? 0 : `1px solid ${DC.line}`, background: primary ? palette.primary : DC.glass, color: primary ? DC.ink : DC.text });
  const chip = (on: boolean): React.CSSProperties => ({ minHeight: 42, padding: '0 14px', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: on ? 700 : 600, border: `1px solid ${on ? palette.accent : DC.line}`, background: on ? 'rgba(242,182,109,.16)' : 'transparent', color: on ? palette.accent : DC.text });

  if (!items) return error ? <p role="alert" style={{ color: '#F09A7A', fontSize: 14 }}>{error}</p> : <Loader2 className="animate-spin" style={{ marginTop: 20 }} aria-label="Chargement" />;

  if (form) {
    const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm({ ...form, [k]: v });
    return (
      <form onSubmit={submit} style={{ ...card, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 22, color: DC.title }}>{form.id ? 'Modifier le Pénc' : 'Programmer un Pénc'}</h2>
        <label style={lab}>Sujet<input value={form.title} maxLength={90} onChange={e => set('title', e.target.value)} placeholder="Ex. : Pression du mariage, on en parle ?" className="drl-input" style={field} /></label>
        <label style={lab}>Présentation (facultatif)<textarea value={form.description} maxLength={500} rows={3} onChange={e => set('description', e.target.value)} className="drl-input" style={{ ...field, resize: 'vertical' }} /></label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          <label style={lab}>Jour<input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="drl-input" style={field} /></label>
          <label style={lab}>Heure de Dakar<input type="time" value={form.time} onChange={e => set('time', e.target.value)} className="drl-input" style={field} /></label>
        </div>
        <label style={lab}>Durée<select value={form.durationMin} onChange={e => set('durationMin', Number(e.target.value))} style={{ ...field, minHeight: 48 }}>{DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}</select></label>
        <div style={lab}>Qui peut entrer
          <div role="radiogroup" aria-label="Qui peut entrer" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {([['all', 'Tout le monde'], ['channel', 'Membres d\'une chaîne'], ['paid', 'Étincelles']] as const).map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={form.access === k} onClick={() => set('access', k)} style={chip(form.access === k)}>{l}</button>
            ))}
          </div>
        </div>
        {form.access === 'channel' && (
          channels.length === 0 ? <p style={{ margin: 0, fontSize: 14, color: DC.muted }}>Crée d'abord une chaîne dans l'onglet « Chaînes ».</p>
            : <label style={lab}>Chaîne<select value={form.channelId} onChange={e => set('channelId', e.target.value)} style={{ ...field, minHeight: 48 }}><option value="">Choisis…</option>{channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        )}
        {form.access === 'paid' && <label style={lab}>Prix en étincelles<input type="number" min={1} max={500} value={form.price} onChange={e => set('price', Number(e.target.value))} className="drl-input" style={field} /></label>}
        <label style={lab}>Test à proposer à la fin (facultatif)<select value={form.testScaleId} onChange={e => set('testScaleId', e.target.value)} style={{ ...field, minHeight: 48 }}><option value="">Aucun</option>{SCALES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, fontSize: 15, color: DC.text, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.repeatWeekly} onChange={e => set('repeatWeekly', e.target.checked)} style={{ width: 20, height: 20, accentColor: palette.accent }} />
          <span>Chaque semaine, même jour, même heure<span style={{ display: 'block', fontSize: 13, color: DC.faint }}>La séance suivante se programme toute seule. Décoche pour arrêter.</span></span>
        </label>
        <p style={{ margin: 0, fontSize: 13, color: DC.faint, lineHeight: 1.5 }}>Le Pénc paraît tout de suite dans l'agenda. Les inscrits sont prévenus 10 minutes avant et au démarrage.</p>
        {error && <p role="alert" style={{ margin: 0, color: '#F09A7A', fontSize: 14 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={busy} style={{ ...btn(true), flex: 1, minHeight: 48 }}>{busy ? <Loader2 size={16} className="animate-spin" aria-label="Enregistrement" /> : form.id ? 'Enregistrer' : 'Programmer'}</button>
          <button type="button" onClick={() => { setForm(null); setError(''); }} style={btn(false)}>Annuler</button>
        </div>
      </form>
    );
  }

  return (
    <section aria-label="Mes Pénc" style={{ marginTop: 14 }}>
      <button type="button" onClick={() => setForm(empty())} className="drl-btn" style={{ ...btn(true), width: '100%', minHeight: 48, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Plus size={18} aria-hidden="true" />Programmer un Pénc</button>
      {error && <p role="alert" style={{ color: '#F09A7A', fontSize: 14 }}>{error}</p>}
      {items.length === 0 && <p style={{ marginTop: 14, fontSize: 14, color: DC.faint }}>Aucun Pénc pour l'instant.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {items.map(p => (
          <article key={p.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', color: p.status === 'live' ? palette.accent : DC.muted }}>{p.status === 'live' ? 'EN DIRECT' : p.status === 'ended' ? 'TERMINÉ' : 'PROGRAMMÉ'} · {p.registeredCount} inscrit{p.registeredCount > 1 ? 's' : ''}</span>
            <b style={{ fontSize: 16, color: DC.title }}>{p.title}</b>
            <span style={{ fontSize: 14, color: DC.soft }}>{whenLabel(p.startAt)}{p.repeatWeekly ? ' · chaque semaine' : ''} · {p.durationMin} min · {p.access === 'channel' ? `membres de « ${p.channelName} »` : p.access === 'paid' ? `${p.price} étincelles` : 'ouvert à tous'}{p.host.name !== 'Dr Lô' ? ` · ${p.host.name}` : ''}</span>
            {p.status === 'ended' && p.summary.length > 0 && <span style={{ fontSize: 13, color: DC.faint }}>À retenir : {p.summary.join(' · ')}</span>}
            {ending === p.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: DC.soft }}>Ce qu'on retient (3 idées, vues par les participants)</span>
                {summary.map((s, i) => <input key={i} value={s} maxLength={200} onChange={e => setSummary(summary.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Idée ${i + 1}`} placeholder={`Idée ${i + 1}`} className="drl-input" style={field} />)}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" disabled={busy} onClick={async () => { if (await run(() => endPenc(p.id, summary))) { setEnding(null); setSummary(['', '', '']); } }} style={btn(true)}>Terminer</button>
                  <button type="button" onClick={() => setEnding(null)} style={btn(false)}>Retour</button>
                </div>
              </div>
            ) : confirmCancel === p.id ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
                <span style={{ fontSize: 14, color: DC.text }}>Annuler ce Pénc ? Les inscrits sont prévenus{p.access === 'paid' ? ' et remboursés' : ''}.</span>
                <button type="button" disabled={busy} onClick={async () => { if (await run(() => cancelPenc(p.id))) setConfirmCancel(null); }} style={btn(true)}>Oui, annuler</button>
                <button type="button" onClick={() => setConfirmCancel(null)} style={btn(false)}>Non</button>
              </div>
            ) : p.status === 'ended' ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" disabled={busy} onClick={() => run(() => hidePenc(p.id))} style={btn(false)}>Retirer de l'agenda</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                <Link to={`/penc/${p.id}`} className="drl-btn" style={{ ...btn(true), display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>{p.status === 'live' ? 'Ouvrir la salle' : 'Démarrer et entrer'}</Link>
                <button type="button" onClick={() => setEnding(p.id)} style={btn(p.status === 'live')}>Terminer</button>
                {p.status === 'scheduled' && <button type="button" onClick={() => setForm({ id: p.id, title: p.title, description: p.description, date: toDate(p.startAt), time: toTime(p.startAt), durationMin: p.durationMin, access: p.access, channelId: p.channelId ?? '', price: p.price || PENC_PRIX_PAR_DEFAUT, testScaleId: p.testScaleId ?? '', repeatWeekly: !!p.repeatWeekly })} style={btn(false)}>Modifier</button>}
                {p.status === 'scheduled' && <button type="button" onClick={() => setConfirmCancel(p.id)} style={btn(false)}>Annuler</button>}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};

export default PencAdmin;
