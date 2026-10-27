/**
 * CommunityPanel — « Ma communauté » dans l'espace Dr Lô : écrire un message à ses abonnés.
 * On ne voit jamais de noms : seulement le nombre de personnes visées. Ciblage fin : au moins 5 personnes.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Loader2, Mic, Send, Square, Trash2 } from 'lucide-react';
import { blobToBase64, MAX_VOICE_SEC, useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { DC, card } from './DrLoShell';
import type { MomentPalette } from '../../utils/drloMoment';
import { SCALE_META } from '../../utils/scaleMeta';
import {
  countAudience, createBroadcast, hideBroadcast, listBroadcasts,
  adminComments, adminCommentAct, replyComment, setCommentsOpen,
  type AdminComment, type Audience, type BroadcastRow, type Level,
} from '../../services/drloBroadcastService';

const MAX = 1200;
const TOTEMS = ['lion', 'loup', 'cerf', 'dauphin', 'tortue', 'hibou', 'aigle', 'éléphant', 'panthère', 'renard', 'cheval', 'ours'];
const TOTEM_IDS: Record<string, string> = { 'éléphant': 'elephant', 'panthère': 'panthere' };
const LEVELS: { id: Level; label: string }[] = [
  { id: 'bon', label: 'Tout va bien' }, { id: 'leger', label: 'Léger' }, { id: 'modere', label: 'Modéré' }, { id: 'eleve', label: 'Élevé' },
];
const PROGS = [{ id: 'stress', label: 'Stress' }, { id: 'humeur', label: 'Humeur' }, { id: 'sommeil', label: 'Sommeil' }];
const fmt = (t: number) => (t ? new Date(t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const STATUS: Record<string, string> = { scheduled: 'Programmé', launching: 'Envoi…', sending: 'Envoi en cours', sent: 'Envoyé' };

const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '12px 14px', fontFamily: 'inherit', fontSize: 16, color: DC.text, outline: 'none' };

/** Commentaires d'un message : ouvrir/fermer, masquer, épingler, répondre. Jamais d'identité réelle. */
const CommentsAdmin: React.FC<{ row: BroadcastRow; palette: MomentPalette; onChange: () => void }> = ({ row, palette, onChange }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminComment[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const load = () => adminComments(row.id).then(r => setItems(r.items)).catch(e => setErr(e instanceof Error ? e.message : 'Erreur'));
  useEffect(() => { if (open) load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const act = (p: Promise<unknown>) => p.then(load).catch(e => setErr(e instanceof Error ? e.message : 'Erreur'));
  const distress = (items ?? []).filter(c => c.status === 'distress').length;
  const btn: React.CSSProperties = { minHeight: 34, padding: '0 10px', borderRadius: 10, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.muted, cursor: 'pointer', fontSize: 12.5 };
  return (
    <div style={{ marginTop: 10, borderTop: `1px solid ${DC.line}`, paddingTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: DC.soft, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!row.commentsOpen} onChange={e => setCommentsOpen(row.id, e.target.checked).then(onChange).catch(x => setErr(x instanceof Error ? x.message : 'Erreur'))} /> Commentaires ouverts
        </label>
        <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} style={{ ...btn, marginLeft: 'auto' }}>
          {open ? 'Fermer' : `Voir les commentaires (${row.stats.comments ?? 0})`}
        </button>
      </div>
      {err && <p role="alert" style={{ margin: '8px 0 0', color: '#F09A7A', fontSize: 13 }}>{err}</p>}
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {items === null && <Loader2 size={16} className="animate-spin" aria-label="Chargement" />}
          {items && items.length === 0 && <p style={{ margin: 0, fontSize: 13, color: DC.faint }}>Aucun commentaire.</p>}
          {distress > 0 && <p style={{ margin: 0, fontSize: 12.5, color: '#F0C987', lineHeight: 1.5 }}>{distress} commentaire{distress > 1 ? 's' : ''} montrant une détresse : non publié{distress > 1 ? 's' : ''}, la personne a reçu en privé le 1515 et le CHU Fann. Tu ne vois pas qui c'est.</p>}
          {(items ?? []).map(c => (
            <div key={c.id} style={{ borderRadius: 12, border: `1px solid ${c.status === 'distress' ? 'rgba(240,201,135,.5)' : c.reports > 0 ? 'rgba(240,154,122,.5)' : DC.line}`, background: 'rgba(255,255,255,.03)', padding: 10, opacity: c.hidden ? 0.55 : 1 }}>
              <p style={{ margin: 0, fontSize: 12, color: DC.faint }}>
                {c.status === 'distress' ? 'Détresse (non publié)' : c.name}{c.pinned ? ' · épinglé' : ''}{c.hidden && c.status !== 'distress' ? ' · masqué' : ''}{c.reports > 0 ? ` · signalé ${c.reports} fois` : ''}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 14, lineHeight: 1.5, color: DC.text, whiteSpace: 'pre-wrap' }}>{c.text}</p>
              {c.reply && <p style={{ margin: '6px 0 0', fontSize: 13.5, color: palette.accent, whiteSpace: 'pre-wrap' }}>Ta réponse : {c.reply.text}</p>}
              {c.status === 'public' && (
                <div style={{ marginTop: 8 }}>
                  {!c.reply && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input aria-label="Répondre" value={drafts[c.id] ?? ''} onChange={e => setDrafts(d => ({ ...d, [c.id]: e.target.value }))} placeholder="Répondre publiquement…" className="drl-input" style={{ ...field, minHeight: 38, padding: '0 10px', fontSize: 14, flex: 1 }} />
                      <button type="button" disabled={(drafts[c.id] ?? '').trim().length < 2} onClick={() => act(replyComment(c.id, drafts[c.id]).then(() => setDrafts(d => ({ ...d, [c.id]: '' }))))} style={{ ...btn, opacity: (drafts[c.id] ?? '').trim().length < 2 ? 0.4 : 1 }}>Envoyer</button>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button type="button" onClick={() => act(adminCommentAct(c.id, 'pin', !c.pinned))} style={btn}>{c.pinned ? 'Désépingler' : 'Épingler'}</button>
                    <button type="button" onClick={() => act(adminCommentAct(c.id, 'hide', !c.hidden))} style={btn}>{c.hidden ? 'Réafficher' : 'Masquer'}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CommunityPanel: React.FC<{ palette: MomentPalette }> = ({ palette }) => {
  const [text, setText] = useState('');
  const [all, setAll] = useState(true);
  const [scaleId, setScaleId] = useState('');
  const [levels, setLevels] = useState<Level[]>([]);
  const [totems, setTotems] = useState<string[]>([]);
  const [progs, setProgs] = useState<string[]>([]);
  const [activity, setActivity] = useState<'nouveaux' | 'absents' | null>(null);
  const [later, setLater] = useState(false);
  const [when, setWhen] = useState('');
  const [count, setCount] = useState<{ count: number; min: number; fine: boolean } | null>(null);
  const [countErr, setCountErr] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [rows, setRows] = useState<BroadcastRow[]>([]);
  const seq = useRef(0);
  const voice = useVoiceRecorder();
  const mmss = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;

  const audience: Audience = useMemo(() => {
    if (all) return { all: true };
    const a: Audience = {};
    if (scaleId) a.test = { scaleId, levels };
    if (totems.length) a.totems = totems;
    if (progs.length) a.programmes = progs;
    if (activity) a.activity = activity;
    return a;
  }, [all, scaleId, levels, totems, progs, activity]);
  const hasCriteria = all || !!scaleId || totems.length > 0 || progs.length > 0 || !!activity;

  const refresh = () => listBroadcasts().then(r => setRows(r.items)).catch(() => {});
  useEffect(() => { refresh(); }, []);

  // Nombre de personnes visées, en direct (sans jamais afficher de noms)
  useEffect(() => {
    setConfirm(false);
    if (!hasCriteria) { setCount(null); setCountErr(''); return; }
    const mine = ++seq.current;
    const t = setTimeout(() => {
      countAudience(audience).then(r => { if (mine === seq.current) { setCount({ count: r.count, min: r.minForTargeted, fine: r.fine }); setCountErr(''); } })
        .catch(e => { if (mine === seq.current) { setCount(null); setCountErr(e instanceof Error ? e.message : 'Erreur'); } });
    }, 400);
    return () => clearTimeout(t);
  }, [audience, hasCriteria]);

  const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]);
  const tooFew = !!count && count.fine && count.count < count.min;
  const sendAt = later && when ? new Date(when).getTime() : 0;
  const whenOk = !later || (sendAt > Date.now() + 60000);
  const canSend = (text.trim().length >= 2 || !!voice.clip) && voice.state !== 'recording' && hasCriteria && !!count && count.count > 0 && !tooFew && whenOk && !busy;

  const send = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const audio = voice.clip ? { data: await blobToBase64(voice.clip.blob), mime: voice.clip.mime, durationSec: voice.clip.durationSec } : undefined;
      const r = await createBroadcast(text.trim(), audience, later ? sendAt : undefined, audio);
      setMsg(r.status === 'scheduled' ? `Programmé pour ${r.count} personne${r.count > 1 ? 's' : ''}.` : `Message envoyé à ${r.count} personne${r.count > 1 ? 's' : ''}.`);
      setText(''); setConfirm(false); voice.reset();
      refresh();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Erreur'); setConfirm(false); }
    finally { setBusy(false); }
  };

  const chip = (on: boolean): React.CSSProperties => ({
    minHeight: 36, padding: '0 12px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600,
    border: `1px solid ${on ? palette.accent : DC.line}`, background: on ? 'rgba(242,182,109,.15)' : DC.glass, color: on ? palette.accent : DC.muted,
  });
  const lab: React.CSSProperties = { margin: '14px 0 6px', fontSize: 12.5, fontWeight: 700, color: DC.soft };

  const scaleOptions = Object.entries(SCALE_META).map(([id, m]) => ({ id, label: m.label })).sort((a, b) => a.label.localeCompare(b.label, 'fr'));

  return (
    <div style={{ marginTop: 14 }}>
      <section style={card}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: DC.text }}>Un message pour ta communauté</p>
        <textarea aria-label="Ton message" rows={6} maxLength={MAX} value={text} onChange={e => setText(e.target.value)}
          placeholder="Écris comme tu parles. Les gens recevront simplement « Dr Lô t'a laissé un message »."
          className="drl-input" style={{ ...field, marginTop: 10, lineHeight: 1.5, resize: 'vertical', minHeight: 130 }} />
        <p style={{ margin: '4px 0 0', fontSize: 12, color: DC.faint, textAlign: 'right' }}>{text.length} / {MAX}</p>

        <div style={{ marginTop: 10 }}>
          {voice.state === 'idle' || voice.state === 'denied' ? (
            <button type="button" onClick={voice.start} className="drl-btn" style={{ minHeight: 44, padding: '0 14px', borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.soft, fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Mic size={16} aria-hidden="true" /> Ajouter un vocal (3 min max)
            </button>
          ) : voice.state === 'recording' ? (
            <button type="button" onClick={voice.stop} className="drl-btn" aria-label="Arrêter l'enregistrement" style={{ minHeight: 44, padding: '0 14px', borderRadius: 999, border: '1px solid rgba(240,154,122,.6)', background: 'rgba(240,154,122,.12)', color: DC.text, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Square size={14} fill="currentColor" aria-hidden="true" /> Enregistrement… {mmss(voice.elapsed)} / {mmss(MAX_VOICE_SEC)}
            </button>
          ) : voice.state === 'ready' && voice.clip ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <audio controls src={voice.clip.url} style={{ flex: 1, minWidth: 0, height: 40 }} />
              <button type="button" onClick={voice.reset} aria-label="Supprimer le vocal" className="drl-btn" style={{ width: 44, height: 44, borderRadius: 12, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} aria-hidden="true" /></button>
            </div>
          ) : <p style={{ margin: 0, fontSize: 13, color: DC.faint }}>Ce navigateur ne permet pas d'enregistrer un vocal.</p>}
          {voice.state === 'denied' && <p role="alert" style={{ margin: '6px 0 0', fontSize: 13, color: '#F09A7A' }}>Le micro est bloqué. Autorise-le dans ton navigateur puis réessaie.</p>}
          {voice.clip && <p style={{ margin: '6px 0 0', fontSize: 12, color: DC.faint }}>Vocal de {mmss(voice.clip.durationSec)}. Le texte ci-dessus devient facultatif.</p>}
        </div>

        <p style={lab}>Pour qui ?</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <button type="button" onClick={() => setAll(true)} style={chip(all)}>Tout le monde</button>
          <button type="button" onClick={() => setAll(false)} style={chip(!all)}>Un groupe précis</button>
        </div>

        {!all && (
          <div>
            <p style={lab}>A fait ce test</p>
            <select aria-label="Test" value={scaleId} onChange={e => { setScaleId(e.target.value); if (!e.target.value) setLevels([]); }} className="drl-input" style={{ ...field, minHeight: 46, padding: '0 12px' }}>
              <option value="">Peu importe</option>
              {scaleOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            {scaleId && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {LEVELS.map(l => <button key={l.id} type="button" onClick={() => setLevels(v => toggle(v, l.id))} style={chip(levels.includes(l.id))}>{l.label}</button>)}
              </div>
            )}
            <p style={lab}>Totem</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TOTEMS.map(t => { const id = TOTEM_IDS[t] ?? t; return <button key={id} type="button" onClick={() => setTotems(v => toggle(v, id))} style={chip(totems.includes(id))}>{t}</button>; })}
            </div>
            <p style={lab}>Suit un programme</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PROGS.map(p => <button key={p.id} type="button" onClick={() => setProgs(v => toggle(v, p.id))} style={chip(progs.includes(p.id))}>{p.label}</button>)}
            </div>
            <p style={lab}>Activité</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button type="button" onClick={() => setActivity(a => (a === 'nouveaux' ? null : 'nouveaux'))} style={chip(activity === 'nouveaux')}>Nouveaux (moins de 7 jours)</button>
              <button type="button" onClick={() => setActivity(a => (a === 'absents' ? null : 'absents'))} style={chip(activity === 'absents')}>Pas revus depuis 7 jours</button>
            </div>
            {!hasCriteria && <p style={{ margin: '10px 0 0', fontSize: 13, color: DC.faint }}>Choisis au moins un critère.</p>}
          </div>
        )}

        <div role="status" style={{ marginTop: 14, borderRadius: 14, border: `1px solid ${tooFew ? 'rgba(240,154,122,.6)' : DC.line}`, background: 'rgba(255,255,255,.04)', padding: 12, fontSize: 14, color: DC.soft, lineHeight: 1.5 }}>
          {countErr ? <span style={{ color: '#F09A7A' }}>{countErr}</span>
            : !hasCriteria ? 'Choisis le groupe pour voir combien de personnes seront concernées.'
            : !count ? <Loader2 size={16} className="animate-spin" aria-label="Calcul" />
            : tooFew ? <span style={{ color: '#F09A7A' }}>Seulement {count.count} personne{count.count > 1 ? 's' : ''} : il en faut au moins {count.min} pour que personne ne soit reconnu. Élargis le groupe.</span>
            : <><b style={{ color: DC.text }}>{count.count}</b> personne{count.count > 1 ? 's' : ''} recevr{count.count > 1 ? 'ont' : 'a'} ce message. Tu ne vois jamais leurs noms.</>}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 14, color: DC.soft, cursor: 'pointer' }}>
          <input type="checkbox" checked={later} onChange={e => setLater(e.target.checked)} /> Programmer l'envoi
        </label>
        {later && (
          <div>
            <input type="datetime-local" aria-label="Date d'envoi" value={when} onChange={e => setWhen(e.target.value)} className="drl-input" style={{ ...field, marginTop: 8, minHeight: 46, padding: '0 12px' }} />
            {when && !whenOk && <p style={{ margin: '6px 0 0', fontSize: 13, color: '#F09A7A' }}>Choisis une heure dans le futur.</p>}
            <p style={{ margin: '6px 0 0', fontSize: 12, color: DC.faint }}>L'envoi se fait à l'heure pile qui suit (vérification chaque heure). Aucune notification la nuit (22 h – 7 h).</p>
          </div>
        )}

        {err && <p role="alert" style={{ margin: '12px 0 0', color: '#F09A7A', fontSize: 13.5 }}>{err}</p>}
        {msg && <p role="status" style={{ margin: '12px 0 0', color: DC.ok, fontSize: 13.5 }}>{msg}</p>}

        {!confirm ? (
          <button type="button" disabled={!canSend} onClick={() => setConfirm(true)} className="drl-btn"
            style={{ marginTop: 14, width: '100%', minHeight: 48, borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontWeight: 700, fontSize: 15, cursor: canSend ? 'pointer' : 'default', opacity: canSend ? 1 : 0.45, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Send size={16} aria-hidden="true" /> {later ? 'Programmer' : 'Envoyer'}
          </button>
        ) : (
          <div style={{ marginTop: 14, borderRadius: 14, border: '1px solid rgba(233,200,143,.45)', background: 'rgba(233,200,143,.08)', padding: 12 }}>
            <p style={{ margin: 0, fontSize: 14, color: DC.text, lineHeight: 1.5 }}>
              {later ? `Programmer pour le ${fmt(sendAt)}` : 'Envoyer maintenant'} à <b>{count?.count}</b> personne{(count?.count ?? 0) > 1 ? 's' : ''} ? Un message envoyé ne se rattrape pas, tu pourras seulement le masquer.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button type="button" onClick={send} disabled={busy} className="drl-btn" style={{ flex: 1, minHeight: 46, borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontWeight: 700, cursor: 'pointer' }}>
                {busy ? 'Envoi…' : 'Oui, c\'est parti'}
              </button>
              <button type="button" onClick={() => setConfirm(false)} className="drl-btn" style={{ minHeight: 46, padding: '0 16px', borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.muted, fontWeight: 600, cursor: 'pointer' }}>Relire</button>
            </div>
          </div>
        )}
      </section>

      <h2 style={{ margin: '22px 0 0', fontSize: 15, fontWeight: 700, color: DC.text }}>Messages envoyés</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
        {rows.length === 0 && <p style={{ color: DC.faint, fontSize: 14, margin: 0 }}>Aucun message pour l'instant.</p>}
        {rows.map(r => (
          <article key={r.id} style={{ ...card, opacity: r.hidden ? 0.55 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: DC.faint }}>
              <span>{STATUS[r.status] ?? r.status} · {fmt(r.status === 'scheduled' ? r.sendAt : r.createdAt)}{r.hidden ? ' · masqué' : ''}</span>
              <span>{r.audienceCount} personne{r.audienceCount > 1 ? 's' : ''}</span>
            </div>
            {r.audio && <p style={{ margin: '8px 0 0', fontSize: 13, color: palette.accent, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Mic size={13} aria-hidden="true" /> Vocal de {mmss(r.audio.durationSec)}</p>}
            {r.text && <p style={{ margin: '8px 0 0', fontSize: 14.5, lineHeight: 1.55, color: DC.text, whiteSpace: 'pre-wrap' }}>{r.text}</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, fontSize: 13, color: DC.muted }}>
              <span>👁 {r.stats.views}</span>
              <span>❤️ {r.stats.reactions.heart}</span>
              <span>🙏 {r.stats.reactions.pray}</span>
              <span>💪 {r.stats.reactions.strong}</span>
              <button type="button" onClick={() => hideBroadcast(r.id, !r.hidden).then(refresh).catch(() => {})} aria-label={r.hidden ? 'Réafficher' : 'Masquer'} className="drl-btn"
                style={{ marginLeft: 'auto', minHeight: 36, padding: '0 10px', borderRadius: 10, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.muted, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>
                {r.hidden ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />} {r.hidden ? 'Réafficher' : 'Masquer'}
              </button>
            </div>
            {!r.hidden && r.status !== 'scheduled' && <CommentsAdmin row={r} palette={palette} onChange={refresh} />}
          </article>
        ))}
      </div>
    </div>
  );
};

export default CommunityPanel;
