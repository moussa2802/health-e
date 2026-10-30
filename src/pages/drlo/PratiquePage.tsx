/**
 * PratiquePage — /pratique/:id : une pratique de Dr Lô.
 *  - pas encore débloquée : présentation, source, précautions, bouton « Débloquer » (étincelles payées une seule fois) ;
 *  - exercice guidé / technique : audio, étapes, « J'arrête, ça ne va pas » toujours visible, puis « Comment tu te sens ? » ;
 *  - carnet : la saisie du jour (ou d'un des 7 derniers jours) et la semaine.
 * Le script de l'audio n'arrive jamais ici (il reste pour Dr Lô IA).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BookOpen, Check, Headphones, Info, ListChecks, Loader2, Phone } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import AudioPlayer from '../../components/accueil/AudioPlayer';
import KoriCta from '../../components/koris/KoriCta';
import { useAuth } from '../../contexts/AuthContext';
import { useKoris } from '../../contexts/KorisContext';
import { getCrisisResources } from '../../data/crisisResources';
import { FONT } from '../../design/charte';
import { Segments } from './outilsShared';
import {
  finishPractice, getPractice, localDay, logCarnet, PLACES_MAX, setPracticeMode, stopPractice, typeLabel, unlockPractice,
  type CarnetDay, type CarnetField, type Feeling, type Learning, type Practice,
} from '../../services/practiceService';

const ICON = { guided: Headphones, technique: ListChecks, carnet: BookOpen } as const;
const DAY_NAMES = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const dayLabel = (d: string, today: string, yesterday: string) => (d === today ? 'Aujourd\'hui' : d === yesterday ? 'Hier' : `${DAY_NAMES[new Date(`${d}T12:00:00`).getDay()]} ${Number(d.slice(8))}`);

const Crisis: React.FC = () => (
  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
    {getCrisisResources().map(r => r.phone ? (
      <a key={r.label} href={`tel:${r.phone.replace(/\s/g, '')}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, textDecoration: 'none' }}>
        <Phone size={16} aria-hidden="true" /> <span style={{ flex: 1, fontSize: 15 }}>{r.label}</span> <b>{r.phone}</b>
      </a>
    ) : <p key={r.label} style={{ margin: 0, fontSize: 14, color: DC.soft }}>{r.label}{r.note ? ` — ${r.note}` : ''}</p>)}
  </div>
);

/** Exercice guidé ou technique. */
const Exercise: React.FC<{ p: Practice; accent: string; primary: string; onProgress: (l: Learning | null | undefined) => void }> = ({ p, accent, primary, onProgress }) => {
  const [phase, setPhase] = useState<'doing' | 'feeling' | 'done' | 'stopped'>('doing');
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [busy, setBusy] = useState(false);
  const finish = async (f: Feeling) => { setBusy(true); setFeeling(f); try { const r = await finishPractice(p.id, f); onProgress(r.learning); } catch { /* le ressenti n'est qu'un indicateur */ } setPhase('done'); setBusy(false); };
  const stop = async () => { setPhase('stopped'); stopPractice(p.id).catch(() => {}); };

  if (phase === 'stopped') {
    return (
      <section role="alert" style={{ ...card, marginTop: 16, borderColor: 'rgba(240,138,122,.5)' }}>
        <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 20, color: DC.title }}>Tu as bien fait de t'arrêter</h2>
        <p style={{ margin: '8px 0 0', fontSize: 15, color: DC.soft, lineHeight: 1.6 }}>Ouvre les yeux, pose tes pieds bien à plat, regarde autour de toi et nomme trois choses que tu vois. Respire normalement. Ce que tu ressens est réel, et tu n'as pas à le traverser seul.</p>
        <p style={{ margin: '10px 0 0', fontSize: 15, color: DC.soft, lineHeight: 1.6 }}>Si ça ne passe pas, ou si tu te sens en danger, appelle maintenant :</p>
        <Crisis />
        <p style={{ margin: '12px 0 0', fontSize: 14, color: DC.muted }}>Tu peux aussi <Link to="/question" style={{ color: accent, fontWeight: 700 }}>écrire au vrai Dr Lô</Link>.</p>
      </section>
    );
  }
  return (
    <>
      {p.audioUrl && <div style={{ marginTop: 16 }}><AudioPlayer src={p.audioUrl} ariaLabel={`Audio : ${p.title}`} accent={accent} /></div>}
      {(p.steps ?? []).length > 0 && (
        <ol style={{ margin: '16px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(p.steps ?? []).map((s, i) => (
            <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span aria-hidden="true" style={{ width: 28, height: 28, flex: 'none', borderRadius: '50%', background: 'rgba(242,182,109,.16)', color: accent, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
              <span style={{ fontSize: 15, color: DC.text, lineHeight: 1.55, paddingTop: 3 }}>{s}</span>
            </li>
          ))}
        </ol>
      )}
      {phase === 'doing' && (
        <button type="button" onClick={() => setPhase('feeling')} className="drl-btn" style={{ marginTop: 20, width: '100%', minHeight: 52, borderRadius: 14, border: 0, background: primary, color: DC.ink, fontWeight: 700, fontSize: 17, cursor: 'pointer' }}>J'ai fini</button>
      )}
      {phase === 'feeling' && (
        <section style={{ ...card, marginTop: 16 }} aria-label="Comment tu te sens">
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: DC.title }}>Comment tu te sens maintenant ?</h2>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {([['mieux', 'Mieux'], ['pareil', 'Pareil'], ['moins', 'Moins bien']] as [Feeling, string][]).map(([f, l]) => (
              <button key={f} type="button" disabled={busy} onClick={() => finish(f)} className="drl-btn" style={{ flex: 1, minHeight: 48, borderRadius: 14, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>{l}</button>
            ))}
          </div>
        </section>
      )}
      {phase === 'done' && (
        <section role="status" style={{ ...card, marginTop: 16 }}>
          <p style={{ margin: 0, fontSize: 15, color: DC.text, lineHeight: 1.6 }}>
            {feeling === 'mieux' ? 'Bravo. Garde ce moment en tête : tu peux le refaire quand tu veux, il est à toi.'
              : feeling === 'pareil' ? 'C\'est normal : ces exercices font effet avec la répétition. Essaie de le refaire demain, au même moment.'
              : 'Merci de l\'avoir dit. Parfois, s\'arrêter sur ses sensations réveille des choses. Si ça dure ou si ça pèse, parles-en à quelqu\'un, ou écris au vrai Dr Lô.'}
          </p>
          {feeling === 'moins' && <Crisis />}
          <button type="button" onClick={() => { setPhase('doing'); setFeeling(null); }} style={{ marginTop: 12, background: 'none', border: 0, padding: 0, color: accent, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Refaire l'exercice</button>
        </section>
      )}
      {phase !== 'done' && (
        <button type="button" onClick={stop} className="drl-btn" style={{ marginTop: 12, width: '100%', minHeight: 46, borderRadius: 14, border: '1px solid rgba(240,138,122,.55)', background: 'transparent', color: '#F08A7A', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>J'arrête, ça ne va pas</button>
      )}
    </>
  );
};

/** Un champ du carnet. */
const FieldInput: React.FC<{ f: CarnetField; v: CarnetDay['values'][string] | undefined; set: (v: CarnetDay['values'][string] | undefined) => void; accent: string }> = ({ f, v, set, accent }) => {
  const pill = (on: boolean): React.CSSProperties => ({ minWidth: 40, minHeight: 40, padding: '0 10px', borderRadius: 12, border: `1px solid ${on ? accent : DC.line}`, background: on ? 'rgba(242,182,109,.18)' : DC.glass, color: on ? DC.title : DC.soft, fontWeight: 700, fontSize: 15, cursor: 'pointer' });
  if (f.kind === 'scale') {
    return (
      <div>
        <div role="radiogroup" aria-label={f.label} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {Array.from({ length: 11 }, (_, n) => <button key={n} type="button" role="radio" aria-checked={v === n} onClick={() => set(v === n ? undefined : n)} className="drl-btn" style={pill(v === n)}>{n}</button>)}
        </div>
        {(f.low || f.high) && <p style={{ margin: '6px 0 0', display: 'flex', justifyContent: 'space-between', fontSize: 13, color: DC.faint }}><span>0 = {f.low ?? ''}</span><span>10 = {f.high ?? ''}</span></p>}
      </div>
    );
  }
  if (f.kind === 'check') return <button type="button" aria-pressed={v === true} onClick={() => set(v === true ? undefined : true)} className="drl-btn" style={{ ...pill(v === true), display: 'inline-flex', alignItems: 'center', gap: 8 }}>{v === true && <Check size={16} aria-hidden="true" />} {v === true ? 'Fait' : 'Pas encore'}</button>;
  if (f.kind === 'choice') return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{(f.options ?? []).map(o => <button key={o} type="button" aria-pressed={v === o} onClick={() => set(v === o ? undefined : o)} className="drl-btn" style={pill(v === o)}>{o}</button>)}</div>;
  return <input aria-label={f.label} maxLength={280} value={typeof v === 'string' ? v : ''} onChange={e => set(e.target.value || undefined)} className="drl-input" style={{ width: '100%', boxSizing: 'border-box', borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '12px 14px', color: DC.text, fontSize: 15 }} />;
};

/** Carnet : saisie d'un jour + la semaine. */
const Carnet: React.FC<{ p: Practice; logs: CarnetDay[]; accent: string; primary: string; onSaved: (d: CarnetDay, learning?: Learning | null) => void }> = ({ p, logs, accent, primary, onSaved }) => {
  const today = localDay(0), yesterday = localDay(-1);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => localDay(-i)), []);
  const byDay = useMemo(() => Object.fromEntries(logs.map(l => [l.day, l.values])), [logs]);
  const [day, setDay] = useState(today);
  const [values, setValues] = useState<CarnetDay['values']>(byDay[today] ?? {});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { setValues(byDay[day] ?? {}); setMsg(''); setErr(''); }, [day]); // eslint-disable-line react-hooks/exhaustive-deps
  const fields = p.fields ?? [];
  const save = async () => {
    setBusy(true); setErr(''); setMsg('');
    try { const r = await logCarnet(p.id, day, values); onSaved({ day, values: r.values }, r.learning); setMsg(day === today ? 'C\'est noté pour aujourd\'hui.' : 'C\'est noté.'); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  };
  const scales = fields.filter(f => f.kind === 'scale');
  const week = [...days].reverse();
  return (
    <>
      <div role="tablist" aria-label="Jour" style={{ display: 'flex', gap: 6, marginTop: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {days.map(d => (
          <button key={d} type="button" role="tab" aria-selected={day === d} onClick={() => setDay(d)} className="drl-btn"
            style={{ flex: 'none', minHeight: 40, padding: '0 12px', borderRadius: 999, border: `1px solid ${day === d ? accent : DC.line}`, background: day === d ? 'rgba(242,182,109,.15)' : DC.glass, color: day === d ? DC.title : DC.muted, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {dayLabel(d, today, yesterday)} {byDay[d] && <Check size={14} color={DC.ok} aria-label="rempli" />}
          </button>
        ))}
      </div>
      <section style={{ ...card, marginTop: 10 }} aria-label="Mon carnet du jour">
        {fields.map(f => (
          <div key={f.id} style={{ marginTop: 14 }}>
            <p style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: DC.text }}>{f.label}</p>
            <FieldInput f={f} v={values[f.id]} accent={accent} set={v => setValues(cur => { const n = { ...cur }; if (v === undefined) delete n[f.id]; else n[f.id] = v; return n; })} />
          </div>
        ))}
        {err && <p role="alert" style={{ margin: '12px 0 0', color: '#F09A7A', fontSize: 14 }}>{err}</p>}
        {msg && <p role="status" style={{ margin: '12px 0 0', color: DC.ok, fontSize: 14 }}>{msg}</p>}
        <button type="button" disabled={busy || !Object.keys(values).length} onClick={save} className="drl-btn" style={{ marginTop: 16, width: '100%', minHeight: 52, borderRadius: 14, border: 0, background: primary, color: DC.ink, fontWeight: 700, fontSize: 17, cursor: 'pointer', opacity: busy || !Object.keys(values).length ? 0.5 : 1 }}>
          {busy ? <Loader2 size={18} className="animate-spin" aria-label="Enregistrement" /> : 'Enregistrer'}
        </button>
      </section>
      {scales.length > 0 && (
        <section style={{ ...card, marginTop: 14 }} aria-label="Ma semaine">
          <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 20, color: DC.title }}>Ma semaine</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', marginTop: 10, borderCollapse: 'collapse', fontSize: 14 }}>
              <thead><tr><th style={{ textAlign: 'left', color: DC.faint, fontWeight: 600, padding: '4px 0' }} /> {week.map(d => <th key={d} style={{ color: DC.faint, fontWeight: 600, padding: 4, fontSize: 13 }}>{DAY_NAMES[new Date(`${d}T12:00:00`).getDay()].slice(0, 2)}</th>)}</tr></thead>
              <tbody>
                {scales.map(f => (
                  <tr key={f.id}>
                    <td style={{ color: DC.soft, padding: '6px 6px 6px 0', whiteSpace: 'nowrap' }}>{f.label}</td>
                    {week.map(d => {
                      const n = byDay[d]?.[f.id];
                      const col = typeof n === 'number' ? (n >= 7 ? DC.ok : n >= 4 ? '#E9C88F' : '#F08A7A') : DC.faint;
                      return <td key={d} style={{ textAlign: 'center', padding: 4, fontWeight: 700, color: col }}>{typeof n === 'number' ? n : '·'}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: DC.faint }}>{logs.filter(l => days.includes(l.day)).length} jour{logs.filter(l => days.includes(l.day)).length > 1 ? 's' : ''} rempli{logs.filter(l => days.includes(l.day)).length > 1 ? 's' : ''} sur 7.</p>
        </section>
      )}
    </>
  );
};

const PratiquePage: React.FC = () => {
  const palette = usePalette();
  const { id = '' } = useParams<{ id: string }>();
  const [sp] = useSearchParams();
  const from = sp.get('from') || '';
  const back = from.startsWith('/') && !from.startsWith('//') ? { to: from, label: 'Retour' } : { to: '/espace', label: 'Mon espace' };
  const navigate = useNavigate();
  const { isAuthenticated, authReady } = useAuth();
  const { refreshBalance } = useKoris();
  const [p, setP] = useState<Practice | null>(null);
  const [logs, setLogs] = useState<CarnetDay[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [choice, setChoice] = useState<'learning' | 'toolbox'>('learning');
  useEffect(() => { if (authReady && !isAuthenticated) navigate(`/patient/access?returnTo=${encodeURIComponent(`/pratique/${id}`)}`, { replace: true }); }, [authReady, isAuthenticated, navigate, id]);
  const load = () => getPractice(id).then(r => { setP(r.practice); setLogs(r.logs); setError(''); }).catch(e => setError(e instanceof Error ? e.message : 'Erreur'));
  useEffect(() => { if (isAuthenticated) load(); }, [id, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps
  const unlock = async () => {
    setBusy(true); setError('');
    try { await unlockPractice(id, p && p.learnDays > 0 ? choice : undefined); await refreshBalance(); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  };
  const place = (m: 'learning' | 'toolbox' | 'dropped', goto?: string) => async () => {
    setBusy(true); setError('');
    try { await setPracticeMode(id, m); if (goto) navigate(goto); else await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  };
  const progress = (l: Learning | null | undefined) => { if (l) setP(cur => (cur ? { ...cur, learning: l } : cur)); };
  const full = (p?.placesUsed ?? 0) >= PLACES_MAX;
  const effChoice: 'learning' | 'toolbox' = full ? 'toolbox' : choice;
  if (!authReady || !isAuthenticated) return null;
  const Icon = p ? ICON[p.type] : BookOpen;
  return (
    <DrLoShell back={back} palette={palette}>
      {error && <p role="alert" style={{ marginTop: 20, color: '#F09A7A', fontSize: 15 }}>{error}</p>}
      {!p && !error && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Loader2 className="animate-spin" aria-label="Chargement" /></div>}
      {p && (
        <>
          <p style={{ margin: '18px 0 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: palette.accent }}><Icon size={15} aria-hidden="true" /> {typeLabel(p.type)} · {p.minutes} min</p>
          <h1 style={{ margin: '8px 0 0', fontFamily: FONT.display, fontSize: 30, fontWeight: 600, lineHeight: 1.15, color: DC.title }}>{p.title}</h1>
          {p.summary && <p style={{ margin: '10px 0 0', fontSize: 16, color: DC.soft, lineHeight: 1.55 }}>{p.summary}</p>}
          {p.cautions && (
            <div style={{ marginTop: 14, display: 'flex', gap: 10, padding: 12, borderRadius: 14, background: 'rgba(233,200,143,.08)', border: '1px solid rgba(233,200,143,.25)' }}>
              <Info size={18} color="#E9C88F" aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
              <p style={{ margin: 0, fontSize: 14, color: DC.soft, lineHeight: 1.5 }}>{p.cautions}</p>
            </div>
          )}
          {!p.unlocked ? (
            <section style={{ ...card, marginTop: 16 }}>
              <p style={{ margin: 0, fontSize: 15, color: DC.text, lineHeight: 1.55 }}>
                {p.type === 'carnet' ? 'Une fois débloqué, ce carnet est à toi : tu le remplis chaque jour, sans repayer.' : 'Une fois débloquée, cette pratique est à toi : tu la refais quand tu veux, sans repayer.'}
                {p.hasAudio ? ' Dr Lô te guide de sa voix.' : ''}
              </p>
              {p.learnDays > 0 && (
                <div role="radiogroup" aria-label="Comment tu veux commencer" style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {([
                    ['learning', `${p.type === 'carnet' ? 'Le remplir' : 'Apprendre'} en ${p.learnDays} jours`, p.type === 'carnet' ? `Un jour à la fois pendant ${p.learnDays} jours, dans ta routine. À la fin, tu vois ce que ça t'apprend.` : `Un essai par jour pendant ${p.learnDays} jours, dans ta routine. À la fin, tu vois si ça marche pour toi.`, full],
                    ['toolbox', 'Dans ma boîte à outils', 'Je la garde et je l\'utilise quand j\'en ai besoin, sans routine.', false],
                  ] as ['learning' | 'toolbox', string, string, boolean][]).map(([k, t, d, off]) => {
                    const on = effChoice === k;
                    return (
                      <button key={k} type="button" role="radio" aria-checked={on} disabled={off} onClick={() => setChoice(k)} className="drl-btn"
                        style={{ textAlign: 'left', padding: 14, borderRadius: 18, cursor: off ? 'not-allowed' : 'pointer', opacity: off ? 0.55 : 1, color: DC.text, border: on ? '2px solid #F2B66D' : `1px solid ${DC.line}`, background: on ? 'rgba(242,182,109,.12)' : DC.glass }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${on ? '#F2B66D' : '#BFB3A3'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{on && <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F2B66D' }} />}</span>
                          <b style={{ fontSize: 16 }}>{t}</b>
                          {k === 'learning' && !off && <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: '#1B130C', background: '#F2B66D', padding: '2px 10px', borderRadius: 999 }}>Conseillé</span>}
                        </span>
                        <span style={{ display: 'block', margin: '4px 0 0 28px', fontSize: 14, lineHeight: 1.45, color: DC.soft }}>{off ? `Ta routine est pleine (${PLACES_MAX} outils en apprentissage). Termine-en un d'abord.` : d}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div style={{ marginTop: 14 }}>
                <KoriCta label={p.type === 'carnet' ? 'Débloquer le carnet' : 'Débloquer'} cost={p.price} isFree={p.free || p.price === 0} freeReason={p.free && p.price > 0 ? 'Offerte parce que tu es membre de la chaîne' : undefined} loading={busy} onClick={unlock} />
              </div>
            </section>
          ) : (
            <>
              {p.mode === 'learning' && p.learning && !p.learning.ready && (
                <section style={{ ...card, marginTop: 16 }} aria-label="Apprentissage en cours">
                  <p style={{ margin: 0, fontSize: 14, color: DC.muted }}>Apprentissage · jour {p.learning.day} sur {p.learning.of}</p>
                  <div style={{ marginTop: 8 }}><Segments done={p.learning.done} of={p.learning.of} /></div>
                </section>
              )}
              {p.mode === 'learning' && p.learning?.ready && (
                <section style={{ ...card, marginTop: 16, borderColor: 'rgba(242,182,109,.45)', background: 'rgba(242,182,109,.1)' }} aria-label="Bilan de l'apprentissage">
                  <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 26, lineHeight: 1.15, color: DC.title }}>{p.type === 'carnet' ? 'Carnet terminé.' : 'Tu l\'as apprise.'}</h2>
                  {p.type === 'carnet' ? (
                    <p style={{ margin: '10px 0 0', fontSize: 16, color: DC.text, lineHeight: 1.5 }}>Tu as rempli ton carnet {p.learning.done} jour{p.learning.done > 1 ? 's' : ''} sur {p.learning.of}. Tu peux le relire quand tu veux.</p>
                  ) : (
                    <>
                      <p style={{ margin: '10px 0 0', fontSize: 18, lineHeight: 1.35, fontFamily: FONT.display, color: DC.title }}>Sur tes {p.learning.done} essais, tu t'es senti mieux {p.learning.mieux} fois.</p>
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }} aria-hidden="true">
                        {Array.from({ length: p.learning.done }, (_, i) => <span key={i} style={{ flex: 1, height: 36, borderRadius: 10, background: i < p.learning!.mieux ? '#F2B66D' : 'rgba(243,233,220,.25)' }} />)}
                      </div>
                      <p style={{ margin: '12px 0 0', fontSize: 15, color: DC.soft, lineHeight: 1.5 }}>
                        {p.learning.mieux >= Math.ceil(p.learning.done / 2) ? 'Cette technique a l\'air de marcher pour toi. Tu n\'as plus besoin de la faire chaque jour : garde-la pour les moments où ça monte.' : 'Ce n\'est pas grave si l\'effet est léger : ça demande parfois plus de pratique. Tu peux la refaire quelques jours, ou la garder pour plus tard.'}
                      </p>
                    </>
                  )}
                  <button type="button" disabled={busy} onClick={place('toolbox', '/boite-a-outils')} className="drl-btn" style={{ marginTop: 16, width: '100%', minHeight: 52, borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>Garder dans ma boîte à outils</button>
                  <button type="button" disabled={busy} onClick={place('learning')} className="drl-btn" style={{ marginTop: 10, width: '100%', minHeight: 48, borderRadius: 999, border: `1px solid ${DC.line}`, background: 'transparent', color: DC.text, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>La refaire encore {p.learnDays} jours</button>
                  <button type="button" disabled={busy} onClick={place('dropped', '/routine')} style={{ marginTop: 6, width: '100%', minHeight: 44, background: 'none', border: 0, color: DC.muted, fontSize: 14, textDecoration: 'underline', cursor: 'pointer' }}>Elle ne me convient pas</button>
                  <p style={{ margin: '4px 0 0', textAlign: 'center', fontSize: 13, color: DC.faint }}>Ta place dans la routine se libère.</p>
                </section>
              )}
              {p.mode === 'dropped' && (
                <button type="button" disabled={busy} onClick={place('toolbox')} style={{ marginTop: 14, minHeight: 44, background: 'none', border: 0, padding: 0, color: palette.accent, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Remettre dans ma boîte à outils</button>
              )}
              {p.type === 'carnet' ? (
                <Carnet p={p} logs={logs} accent={palette.accent} primary={palette.primary} onSaved={(d, l) => { setLogs(ls => [d, ...ls.filter(x => x.day !== d.day)]); progress(l); }} />
              ) : (
                <Exercise p={p} accent={palette.accent} primary={palette.primary} onProgress={progress} />
              )}
              {p.mode === 'toolbox' && p.learnDays > 0 && !p.learning && (
                <button type="button" disabled={busy} onClick={place('learning')} style={{ marginTop: 16, minHeight: 44, background: 'none', border: 0, padding: 0, color: DC.muted, fontSize: 14, textDecoration: 'underline', cursor: 'pointer' }}>Refaire l'apprentissage ({p.learnDays} jours)</button>
              )}
            </>
          )}
          {p.source && <p style={{ margin: '20px 0 0', fontSize: 13, color: DC.faint, lineHeight: 1.5 }}>Source : {p.source}. Cette pratique accompagne, elle ne remplace pas un suivi par un professionnel.</p>}
        </>
      )}
    </DrLoShell>
  );
};

export default PratiquePage;
