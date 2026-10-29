/**
 * MonJournalPage — « Mon journal », pensé comme un journal intime (inspiré de Day One, Apple Journal, Daylio) :
 *  - /journal               : le fil des pages (rangé par mois, date en grand, première ligne comme titre),
 *                             ou le calendrier du mois ; recherche ; carnets ; « Ce jour-là ».
 *  - /journal/ecrire        : une page blanche datée d'aujourd'hui (carnet, humeur facultative).
 *  - /journal/:id           : lire une page ; la modifier ; demander l'avis de Dr Lô ; la supprimer.
 *  - /journal/:id/modifier  : modifier une page déjà écrite (la date d'origine est gardée).
 * Le carnet « Programme » (notes des exercices) existe mais n'est jamais mis en avant.
 * Tout est privé ; Dr Lô ne lit une page que si on le lui demande (1 étincelle).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, Feather, List, Lock, Pencil, Phone, Search, Sparkles, Trash2 } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import MoodIcon from '../../components/accueil/MoodIcon';
import LoadingCards from '../../components/accueil/LoadingCards';
import { EntryCard, INK, PROGRAMME, MONTHS, cap, norm, keyOfDate, fullDate, hhmm, moodByLabel, split, sortCarnets } from '../../components/accueil/JournalEntryCard';
import { useAuth } from '../../contexts/AuthContext';
import { useKoris } from '../../contexts/KorisContext';
import { KORIS_COSTS } from '../../services/korisService';
import { credits } from '../../config/creditName';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import { dayKey, MOODS, type MoodId } from '../../utils/moodLog';
import { recordMood, fetchMoods } from '../../services/moodService';
import {
  askAdvice, cleanCarnet, DEFAULT_CARNET, listJournal, loadCarnets, removeConfidence, saveConfidence, updateConfidence, type JournalItem,
} from '../../services/confierService';
import { detectCrisis } from '../../utils/accueilFlow';
import { ackFor } from '../../utils/confierFlow';
import { getCrisisResources } from '../../data/crisisResources';
import { trackAccueil } from '../../utils/accueilTracking';

const btn = (primary: boolean, accent: string): React.CSSProperties => ({
  minHeight: 46, padding: '0 18px', borderRadius: 14, border: primary ? 0 : `1px solid ${DC.line}`, cursor: 'pointer', fontFamily: 'inherit',
  background: primary ? accent : DC.glass, color: primary ? DC.ink : DC.text, fontSize: 15, fontWeight: 700,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, textDecoration: 'none',
});

// ───────────────────────── Le fil et le calendrier ─────────────────────────

const Calendar: React.FC<{ items: JournalItem[]; palette: { accent: string } }> = ({ items, palette }) => {
  const now = new Date();
  const [cur, setCur] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [picked, setPicked] = useState<string | null>(keyOfDate(now));
  const byDay = useMemo(() => {
    const m = new Map<string, JournalItem[]>();
    for (const it of items) { const d = new Date(it.date); if (Number.isNaN(d.getTime())) continue; const k = keyOfDate(d); m.set(k, [...(m.get(k) ?? []), it]); }
    return m;
  }, [items]);
  const first = new Date(cur.y, cur.m, 1);
  const lead = (first.getDay() + 6) % 7; // semaine qui commence le lundi
  const days = new Date(cur.y, cur.m + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)] as (number | null)[];
  const move = (n: number) => setCur(c => { const d = new Date(c.y, c.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const dayItems = picked ? byDay.get(picked) ?? [] : [];
  const monthCount = [...byDay.keys()].filter(k => k.startsWith(`${cur.y}-${String(cur.m + 1).padStart(2, '0')}`)).length;
  return (
    <div>
      <section style={{ ...card, marginTop: 12 }} aria-label="Calendrier de mon journal">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => move(-1)} aria-label="Mois précédent" className="drl-btn" style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={18} /></button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, color: DC.title }}>{cap(MONTHS[cur.m])} {cur.y}</p>
            <p style={{ margin: 0, fontSize: 13, color: DC.faint }}>{monthCount ? `${monthCount} jour${monthCount > 1 ? 's' : ''} écrit${monthCount > 1 ? 's' : ''}` : 'Aucune page ce mois-ci'}</p>
          </div>
          <button onClick={() => move(1)} aria-label="Mois suivant" className="drl-btn" style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={18} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 4, marginTop: 12 }}>
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((w, i) => <span key={i} style={{ textAlign: 'center', fontSize: 13, color: DC.faint, fontWeight: 700 }}>{w}</span>)}
          {cells.map((n, i) => {
            if (n === null) return <span key={`e${i}`} />;
            const k = `${cur.y}-${String(cur.m + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
            const has = byDay.has(k);
            const isToday = k === keyOfDate(now);
            const sel = picked === k;
            return (
              <button key={k} onClick={() => setPicked(k)} aria-label={`${n} ${MONTHS[cur.m]}${has ? ` : ${byDay.get(k)!.length} page(s)` : ''}`} aria-pressed={sel} className="drl-btn"
                style={{ aspectRatio: '1', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: has ? 800 : 500,
                  border: `1px solid ${sel ? palette.accent : isToday ? 'rgba(242,182,109,.45)' : 'transparent'}`,
                  background: has ? 'rgba(201,184,228,.22)' : 'transparent', color: has ? DC.title : DC.faint, position: 'relative' }}>
                {n}
                {has && <span aria-hidden="true" style={{ position: 'absolute', bottom: 5, left: '50%', transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: '50%', background: INK }} />}
              </button>
            );
          })}
        </div>
      </section>
      {picked && (
        <div style={{ marginTop: 14 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: INK }}>{fullDate(new Date(`${picked}T12:00:00`))}</p>
          {dayItems.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{dayItems.map(it => <EntryCard key={it.id} it={it} />)}</div>
          ) : <p style={{ margin: 0, fontSize: 14, color: DC.faint }}>Rien d'écrit ce jour-là.</p>}
        </div>
      )}
    </div>
  );
};

const Feed: React.FC<{ items: JournalItem[]; palette: { accent: string; primary: string } }> = ({ items, palette }) => {
  const [view, setView] = useState<'fil' | 'calendrier'>(() => { try { return localStorage.getItem('he_journal_view') === 'calendrier' ? 'calendrier' : 'fil'; } catch { return 'fil'; } });
  const [q, setQ] = useState('');
  const [carnet, setCarnet] = useState<string | null>(null);
  const setV = (v: 'fil' | 'calendrier') => { setView(v); try { localStorage.setItem('he_journal_view', v); } catch { /* ignore */ } };
  const carnets = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) m.set(i.carnet, (m.get(i.carnet) ?? 0) + 1);
    return sortCarnets([...m.keys()].sort((a, b) => (m.get(b) ?? 0) - (m.get(a) ?? 0))).map(c => [c, m.get(c) ?? 0] as [string, number]);
  }, [items]);
  const filtered = useMemo(() => items.filter(i => (!carnet || i.carnet === carnet) && (!q.trim() || norm(i.contenu).includes(norm(q.trim())))), [items, q, carnet]);
  const months = useMemo(() => {
    const out: { label: string; entries: JournalItem[] }[] = [];
    for (const it of filtered) {
      const d = new Date(it.date);
      const label = Number.isNaN(d.getTime()) ? 'Sans date' : `${cap(MONTHS[d.getMonth()])} ${d.getFullYear()}`;
      const g = out[out.length - 1];
      if (g && g.label === label) g.entries.push(it); else out.push({ label, entries: [it] });
    }
    return out;
  }, [filtered]);
  // « Ce jour-là » : une page écrite le même jour d'un mois ou d'une année d'avant
  const memory = useMemo(() => {
    const now = new Date();
    return items.find(i => { const d = new Date(i.date); return d.getDate() === now.getDate() && keyOfDate(d) !== keyOfDate(now) && i.carnet !== PROGRAMME; });
  }, [items]);
  const tab = (v: 'fil' | 'calendrier', label: string, Icon: typeof List) => (
    <button role="tab" aria-selected={view === v} onClick={() => setV(v)} className="drl-btn"
      style={{ flex: 1, minHeight: 40, borderRadius: 10, border: 0, cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit',
        background: view === v ? 'rgba(201,184,228,.25)' : 'transparent', color: view === v ? DC.text : DC.muted }}>
      <Icon size={15} aria-hidden="true" /> {label}
    </button>
  );
  return (
    <>
      {memory && (() => {
        const d = new Date(memory.date);
        const months = (new Date().getFullYear() - d.getFullYear()) * 12 + new Date().getMonth() - d.getMonth();
        return (
          <Link to={`/journal/${memory.id}`} className="drl-btn" style={{ ...card, marginTop: 14, display: 'block', textDecoration: 'none', color: DC.text, borderColor: 'rgba(233,200,143,.4)', background: 'rgba(233,200,143,.07)' }}>
            <p style={{ margin: 0, fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 800, color: '#E9C88F' }}>Ce jour-là · il y a {months >= 12 ? `${Math.floor(months / 12)} an${months >= 24 ? 's' : ''}` : `${months} mois`}</p>
            <p style={{ margin: '6px 0 0', fontFamily: 'Fraunces, serif', fontSize: 16, color: DC.title }}>{split(memory.contenu).title}</p>
          </Link>
        );
      })()}

      <div role="tablist" aria-label="Affichage du journal" style={{ display: 'flex', gap: 4, padding: 4, marginTop: 16, borderRadius: 13, background: 'rgba(201,184,228,.08)', border: '1px solid rgba(201,184,228,.25)' }}>
        {tab('fil', 'Mes pages', List)}{tab('calendrier', 'Calendrier', CalendarDays)}
      </div>

      {view === 'calendrier' ? <Calendar items={items} palette={palette} /> : (
        <>
          <label style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 14px', borderRadius: 14, border: `1px solid ${DC.line}`, background: DC.glass }}>
            <Search size={16} color={DC.faint} aria-hidden="true" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Retrouver un passage, un prénom…" aria-label="Chercher dans mon journal" className="drl-input"
              style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', color: DC.text, fontSize: 15, outline: 'none', fontFamily: 'inherit' }} />
          </label>
          {carnets.length > 1 && (
            <div role="group" aria-label="Mes carnets" style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto', paddingBottom: 2 }}>
              {[[null, items.length] as [string | null, number], ...carnets].map(([c, n]) => (
                <button key={c ?? 'tout'} onClick={() => setCarnet(c)} aria-pressed={carnet === c} className="drl-btn"
                  style={{ flexShrink: 0, minHeight: 36, padding: '0 12px', borderRadius: 999, border: `1px solid ${carnet === c ? INK : DC.line}`, background: carnet === c ? 'rgba(201,184,228,.22)' : 'transparent', color: c === PROGRAMME ? DC.faint : DC.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {c ?? 'Toutes'} <span style={{ color: DC.faint, fontWeight: 500 }}>{n}</span>
                </button>
              ))}
            </div>
          )}
          {months.length === 0 && <p style={{ marginTop: 16, textAlign: 'center', fontSize: 14, color: DC.faint }}>Rien trouvé{q ? ` pour « ${q} »` : ''}.</p>}
          {months.map(g => (
            <section key={g.label} aria-label={g.label} style={{ marginTop: 18 }}>
              <h2 style={{ margin: '0 0 10px', fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 600, color: DC.title }}>{g.label}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{g.entries.map(it => <EntryCard key={it.id} it={it} />)}</div>
            </section>
          ))}
        </>
      )}
    </>
  );
};

// ───────────────────────── Écrire / modifier ─────────────────────────

const Writer: React.FC<{ uid: string | null; existing: JournalItem | null; palette: { accent: string; primary: string } }> = ({ uid, existing, palette }) => {
  const navigate = useNavigate();
  const owner = uid ?? 'guest';
  const [text, setText] = useState(existing?.contenu ?? '');
  const [carnet, setCarnet] = useState(existing?.carnet ?? DEFAULT_CARNET);
  const [mood, setMood] = useState<MoodId | null>(existing?.humeur ? moodByLabel(existing.humeur)?.id ?? null : null);
  const [newCarnet, setNewCarnet] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [after, setAfter] = useState<{ id: string; crisis: boolean; ack: string } | null>(null);
  const carnets = sortCarnets(loadCarnets(owner, existing ? [existing.carnet] : [])).filter(c => c !== PROGRAMME || existing?.carnet === PROGRAMME);
  const date = existing ? new Date(existing.date) : new Date();

  const save = async () => {
    const t = text.trim();
    if (t.length < 2 || busy) return;
    setBusy(true); setError('');
    const label = mood ? MOODS.find(m => m.id === mood)!.label : '';
    try {
      let id = existing?.id ?? '';
      if (existing) await updateConfidence(uid, existing.id, { contenu: t, carnet, humeur: label });
      else {
        id = await saveConfidence(uid, t, carnet, label);
        // Humeur choisie en écrivant : notée aussi pour aujourd'hui si rien n'est noté
        if (mood) fetchMoods(uid, dayKey()).then(m => { if (!m[dayKey()]) void recordMood(uid, dayKey(), mood); }).catch(() => {});
      }
      trackAccueil('confier_entry', { from: existing ? 'journal_edit' : 'journal_page' });
      const crisis = detectCrisis(t);
      if (crisis) trackAccueil('crisis', { at: 'journal' });
      if (existing && !crisis) { navigate(`/journal/${existing.id}`, { replace: true }); return; }
      setAfter({ id, crisis, ack: ackFor(1, t) });
    } catch { setError('La page n\'a pas pu être enregistrée. Vérifie ta connexion et réessaie.'); }
    finally { setBusy(false); }
  };

  if (after) {
    const res = getCrisisResources().filter(r => r.phone).slice(0, 3);
    return (
      <div style={{ marginTop: 22 }}>
        <section style={{ ...card, borderColor: after.crisis ? 'rgba(240,154,122,.5)' : 'rgba(201,184,228,.4)' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: INK }}>C'est rangé dans ton journal.</p>
          {after.crisis ? (
            <>
              <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.6, color: DC.soft }}>Ce que tu viens d'écrire est important. Tu n'as pas à traverser ça sans personne : appelle une de ces personnes, ou parle tout de suite à quelqu'un de confiance.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {res.map(r => <a key={r.label} href={`tel:${(r.phone ?? '').replace(/\s/g, '')}`} style={{ ...btn(false, palette.accent), justifyContent: 'flex-start', borderColor: 'rgba(240,154,122,.5)' }}><Phone size={16} aria-hidden="true" /> {r.label} · {r.phone}</a>)}
              </div>
            </>
          ) : <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.6, color: DC.soft }}>{after.ack}</p>}
        </section>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <Link to={`/journal/${after.id}`} style={btn(true, palette.primary)}>Relire ma page</Link>
          <Link to="/journal" style={btn(false, palette.accent)}>Mon journal</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 18 }}>
      <p style={{ margin: 0, fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 800, color: INK }}>{existing ? 'Modifier ma page' : 'Nouvelle page'}</p>
      <h1 style={{ margin: '4px 0 0', fontFamily: 'Fraunces, serif', fontSize: 26, lineHeight: 1.2, fontWeight: 600, color: DC.title }}>{fullDate(date)}</h1>
      {existing && <p style={{ margin: '2px 0 0', fontSize: 13, color: DC.faint }}>Écrite à {hhmm(date)} · la date ne change pas</p>}

      <p style={{ margin: '16px 0 6px', fontSize: 13, color: DC.muted, fontWeight: 600 }}>Comment tu te sens ? <span style={{ color: DC.faint, fontWeight: 500 }}>(facultatif)</span></p>
      <div role="group" aria-label="Mon humeur" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 6 }}>
        {MOODS.map(md => (
          <button key={md.id} onClick={() => setMood(m => (m === md.id ? null : md.id))} aria-pressed={mood === md.id} className="drl-mood"
            style={{ minHeight: 62, borderRadius: 14, border: `1px solid ${mood === md.id ? md.color : DC.line}`, background: mood === md.id ? `${md.color}22` : DC.glass, color: DC.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <MoodIcon id={md.id} color={md.color} />{md.label}
          </button>
        ))}
      </div>

      <textarea aria-label="Ma page" autoFocus value={text} onChange={e => setText(e.target.value)} maxLength={4000}
        placeholder={'Écris comme ça vient.\nLa première ligne servira de titre.'}
        style={{ marginTop: 14, width: '100%', boxSizing: 'border-box', minHeight: '42vh', resize: 'vertical', borderRadius: 18, border: '1px solid rgba(201,184,228,.3)', outline: 'none', padding: '16px 16px 16px 18px',
          fontFamily: 'Fraunces, Georgia, serif', fontSize: 17, lineHeight: '30px', color: DC.text,
          background: 'repeating-linear-gradient(transparent, transparent 29px, rgba(201,184,228,.10) 29px, rgba(201,184,228,.10) 30px), rgba(255,255,255,.03)', backgroundAttachment: 'local' }} />
      <p style={{ margin: '4px 2px 0', fontSize: 13, color: DC.faint, textAlign: 'right' }}>{text.length} / 4000</p>

      <p style={{ margin: '10px 0 6px', fontSize: 13, color: DC.muted, fontWeight: 600 }}>Carnet</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {carnets.map(c => (
          <button key={c} onClick={() => setCarnet(c)} aria-pressed={carnet === c} className="drl-btn"
            style={{ minHeight: 36, padding: '0 12px', borderRadius: 999, border: `1px solid ${carnet === c ? INK : DC.line}`, background: carnet === c ? 'rgba(201,184,228,.22)' : 'transparent', color: DC.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{c}</button>
        ))}
        {newCarnet === null ? (
          <button onClick={() => setNewCarnet('')} className="drl-btn" style={{ minHeight: 36, padding: '0 12px', borderRadius: 999, border: `1px dashed ${DC.line}`, background: 'transparent', color: DC.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>+ Nouveau</button>
        ) : (
          <input autoFocus value={newCarnet} maxLength={24} onChange={e => setNewCarnet(e.target.value)} aria-label="Nom du nouveau carnet" placeholder="Nom du carnet"
            onBlur={() => { const n = cleanCarnet(newCarnet); if (n) setCarnet(n); setNewCarnet(null); }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            className="drl-input" style={{ minHeight: 36, width: 150, padding: '0 12px', borderRadius: 999, border: `1px solid ${INK}`, background: 'transparent', color: DC.text, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
        )}
      </div>

      {error && <p role="alert" style={{ margin: '12px 0 0', fontSize: 14, color: '#F09A7A' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        <button onClick={() => void save()} disabled={text.trim().length < 2 || busy} style={{ ...btn(true, palette.primary), flex: 1, opacity: text.trim().length < 2 || busy ? 0.45 : 1 }}>
          {busy ? 'Enregistrement…' : existing ? 'Enregistrer les changements' : 'Ranger dans mon journal'}
        </button>
        <button onClick={() => navigate(existing ? `/journal/${existing.id}` : '/journal')} style={btn(false, palette.accent)}>Annuler</button>
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 13, color: DC.faint, display: 'flex', alignItems: 'center', gap: 6 }}><Lock size={12} aria-hidden="true" /> Visible par toi seul. Dr Lô ne lit que si tu le lui demandes.</p>
    </div>
  );
};

// ───────────────────────── Lire une page ─────────────────────────

const Reader: React.FC<{ uid: string | null; it: JournalItem; palette: { accent: string; primary: string }; onChanged: (it: JournalItem | null) => void }> = ({ uid, it, palette, onChanged }) => {
  const navigate = useNavigate();
  const { refreshBalance, openNoKorisModal } = useKoris();
  const [confirm, setConfirm] = useState(false);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState('');
  const d = new Date(it.date);
  const mood = it.humeur ? moodByLabel(it.humeur) : undefined;

  const del = async () => {
    if (!confirm) { setConfirm(true); return; }
    try { await removeConfidence(uid, it.id); onChanged(null); navigate('/journal', { replace: true }); } catch { setNote('Suppression impossible pour le moment.'); }
  };
  const ask = async () => {
    if (!uid) { setNote('Crée ton espace pour demander l\'avis de Dr Lô.'); return; }
    setAsking(true); setNote('');
    const out = await askAdvice(uid, it.contenu, it.id);
    setAsking(false);
    if (out.ok) { refreshBalance(); onChanged({ ...it, drLo: out.text }); }
    else if (out.reason === 'no_koris') openNoKorisModal('L\'avis de Dr Lô sur ta page', KORIS_COSTS.journal ?? 1);
    else setNote('Dr Lô n\'arrive pas à répondre maintenant. Réessaie dans un moment.');
  };

  return (
    <article style={{ marginTop: 18 }}>
      <p style={{ margin: 0, fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 800, color: INK }}>{it.carnet}</p>
      <h1 style={{ margin: '4px 0 0', fontFamily: 'Fraunces, serif', fontSize: 26, lineHeight: 1.2, fontWeight: 600, color: DC.title }}>{Number.isNaN(d.getTime()) ? 'Ma page' : fullDate(d)}</h1>
      <p style={{ margin: '4px 0 0', fontSize: 13, color: DC.faint, display: 'flex', alignItems: 'center', gap: 8 }}>
        {!Number.isNaN(d.getTime()) && hhmm(d)}
        {mood && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><MoodIcon id={mood.id} color={mood.color} /> {mood.label}</span>}
      </p>
      <div style={{ marginTop: 16, padding: '18px 18px 20px', borderRadius: 18, border: '1px solid rgba(201,184,228,.25)', background: 'rgba(201,184,228,.05)' }}>
        <p style={{ margin: 0, fontFamily: 'Fraunces, Georgia, serif', fontSize: 17, lineHeight: 1.75, color: DC.text, whiteSpace: 'pre-wrap' }}>{it.contenu}</p>
      </div>

      {it.drLo && (
        <section style={{ ...card, marginTop: 14, borderColor: 'rgba(233,200,143,.4)', background: 'rgba(233,200,143,.06)' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#E9C88F', display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={14} aria-hidden="true" /> L'avis de Dr Lô</p>
          <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.6, color: DC.soft, whiteSpace: 'pre-wrap' }}>{it.drLo}</p>
        </section>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        <Link to={`/journal/${it.id}/modifier`} style={{ ...btn(true, palette.primary), flex: 1 }}><Pencil size={16} aria-hidden="true" /> Modifier</Link>
        {!it.drLo && (
          <button onClick={() => void ask()} disabled={asking} style={{ ...btn(false, palette.accent), flex: 1, opacity: asking ? 0.6 : 1 }}>
            <Sparkles size={16} aria-hidden="true" /> {asking ? 'Dr Lô lit…' : `L'avis de Dr Lô · ${credits(KORIS_COSTS.journal ?? 1)}`}
          </button>
        )}
      </div>
      <button onClick={() => void del()} style={{ marginTop: 14, minHeight: 40, border: 0, background: 'transparent', color: confirm ? '#F09A7A' : DC.faint, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
        <Trash2 size={15} aria-hidden="true" /> {confirm ? 'Supprimer pour de bon ? Touche encore' : 'Supprimer cette page'}
      </button>
      {note && <p role="status" style={{ margin: '8px 0 0', fontSize: 14, color: DC.muted }}>{note}</p>}
    </article>
  );
};

// ───────────────────────── La page ─────────────────────────

const MonJournalPage: React.FC = () => {
  const palette = usePalette();
  const { id, edit } = useParams<{ id?: string; edit?: string }>();
  const { currentUser, isAuthenticated } = useAuth();
  const uid = isAuthenticated && currentUser ? currentUser.id : null;
  const genre = getOnboardingProfile()?.genre;
  const [items, setItems] = useState<JournalItem[] | null>(null);
  const writing = id === 'ecrire';
  const current = !writing && id ? (items ?? []).find(i => i.id === id) ?? null : null;

  useEffect(() => {
    let off = false;
    listJournal(uid, 300).then(l => { if (!off) setItems(l); }).catch(() => { if (!off) setItems([]); });
    return () => { off = true; };
  }, [uid, id, edit]);

  const back = id ? { to: '/journal', label: 'Retour à mon journal' } : { to: '/espace', label: 'Retour à mon espace' };
  const onChanged = (it: JournalItem | null) => setItems(prev => (prev ?? []).flatMap(x => (current && x.id === current.id ? (it ? [it] : []) : [x])));

  return (
    <DrLoShell back={back} genre={genre} palette={palette}>
      {writing ? <Writer uid={uid} existing={null} palette={palette} />
        : id ? (
          items === null ? <LoadingCards label="J'ouvre ta page…" count={1} />
            : !current ? <p style={{ marginTop: 40, textAlign: 'center', color: DC.muted }}>Cette page n'existe plus. <Link to="/journal" style={{ color: palette.accent }}>Mon journal</Link></p>
            : edit === 'modifier' ? <Writer uid={uid} existing={current} palette={palette} />
            : <Reader uid={uid} it={current} palette={palette} onChanged={onChanged} />
        ) : (
          <>
            <div style={{ marginTop: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <h1 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 30, lineHeight: 1.15, fontWeight: 600, color: DC.title, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <BookOpen size={26} color={INK} aria-hidden="true" /> Mon journal
                </h1>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: DC.faint, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Lock size={12} aria-hidden="true" /> Privé · {items ? `${items.length} page${items.length > 1 ? 's' : ''}` : '…'}
                </p>
              </div>
            </div>
            <Link to="/journal/ecrire" className="drl-btn" style={{ ...btn(true, 'linear-gradient(180deg, #D8CAF0 0%, #B9A6D6 100%)'), width: '100%', boxSizing: 'border-box', marginTop: 16, minHeight: 54, fontSize: 16 }}>
              <Feather size={18} aria-hidden="true" /> Écrire aujourd'hui
            </Link>
            <Link to="/" state={{ tab: 'confier' }} style={{ marginTop: 8, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: DC.muted, fontSize: 13, textDecoration: 'none' }}>
              ou <b style={{ color: INK, margin: '0 3px' }}>te confier à Dr Lô</b> au fil de la journée <ChevronRight size={14} aria-hidden="true" />
            </Link>
            {items === null ? <LoadingCards label="J'ouvre ton journal…" /> : items.length === 0 ? (
              <section style={{ ...card, marginTop: 16, textAlign: 'center' }}>
                <p style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 18, color: DC.title }}>Ton journal est encore vide.</p>
                <p style={{ margin: '6px 0 0', fontSize: 14, color: DC.muted, lineHeight: 1.55 }}>Raconte ta journée, même en deux phrases. Tu pourras tout relire ici, jour après jour, et retrouver chaque page dans le calendrier.</p>
              </section>
            ) : <Feed items={items} palette={palette} />}
          </>
        )}
    </DrLoShell>
  );
};

export default MonJournalPage;
