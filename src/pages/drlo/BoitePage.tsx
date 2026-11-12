/**
 * BoitePage — /boite-a-questions : une question anonyme, sans compte, sans promesse de réponse.
 * Dr Lô lit tout ; il répond par écrit sur cette page ou dans une vidéo, quand il le peut.
 *
 * Organisation de la page (pour qu'on ne s'y perde pas quand les réponses s'accumulent) :
 *   1. « Tes questions » épinglé en haut : celles déposées depuis cet appareil, avec leur état.
 *   2. Poser une question.
 *   3. « Les réponses de Dr Lô » : thèmes, recherche, cartes repliées (la question d'abord), « voir plus ».
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Clock, Pin, Phone, Search, Video } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import { RealDrLoPhoto } from '../../components/accueil/RealDrLoBadge';
import {
  forgetMyQuestion, getBox, getMineStatus, readMyQuestions, rememberMyQuestion, sendBoxQuestion,
  type BoxAnswer, type BoxTopic, type MineStatus, type MyQuestion,
} from '../../services/boxService';
import { pageTitle } from './outilsShared';

const MAX = 500;
const PAGE = 6;
const NEW_DAYS = 7;

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const dayLabel = (ms: number) => (ms ? new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '');
const isRecent = (ms: number) => ms > 0 && Date.now() - ms < NEW_DAYS * 86400000;
const short = (t: string, n = 150) => (t.length > n ? `${t.slice(0, n).trimEnd()}…` : t);

const Pill: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, border: `1px solid ${color}`, color, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{children}</span>
);

const BoitePage: React.FC = () => {
  const palette = usePalette();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<null | { support: boolean }>(null);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<BoxAnswer[]>([]);
  const [topics, setTopics] = useState<BoxTopic[]>([]);
  const [waiting, setWaiting] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mine, setMine] = useState<MyQuestion[]>(() => readMyQuestions());
  const [status, setStatus] = useState<Record<string, MineStatus>>({});
  const [topic, setTopic] = useState('all');
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getBox().then(b => { setAnswers(b.answers); setTopics(b.topics); setWaiting(b.waiting); }).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  // L'état de chaque question de cet appareil. Une question supprimée côté serveur disparaît de la liste.
  const ids = mine.map(q => q.id).join(',');
  useEffect(() => {
    if (!ids) return;
    getMineStatus(ids.split(',')).then(list => {
      const map: Record<string, MineStatus> = {};
      list.forEach(s => { map[s.id] = s; });
      setStatus(map);
      list.filter(s => s.state === 'gone').forEach(s => setMine(forgetMyQuestion(s.id)));
    }).catch(() => {});
  }, [ids]);

  const send = async () => {
    if (text.trim().length < 8) { setError('Écris au moins une phrase (8 caractères).'); return; }
    setBusy(true); setError('');
    try {
      const asked = text.trim();
      const r = await sendBoxQuestion(asked);
      if (r.id) setMine(rememberMyQuestion({ id: r.id, text: asked, at: Date.now() }));
      setSent({ support: r.support }); setText('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  };

  const mineIds = useMemo(() => new Set(mine.map(q => q.id)), [mine]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    answers.forEach(a => { c[a.topic] = (c[a.topic] || 0) + 1; });
    return c;
  }, [answers]);
  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return answers.filter(a => (topic === 'all' || a.topic === topic) && (!q || norm(`${a.question} ${a.answer}`).includes(q)));
  }, [answers, topic, query]);
  const visible = filtered.slice(0, shown);
  const toggle = (id: string) => setOpen(o => ({ ...o, [id]: !o[id] }));
  const topicLabel = (id: string) => topics.find(t => t.id === id)?.label ?? 'Autres questions';

  const chip = (active: boolean): React.CSSProperties => ({
    minHeight: 40, padding: '0 14px', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap',
    border: `1px solid ${active ? palette.accent : DC.line}`, background: active ? palette.accent : 'transparent', color: active ? '#1C1612' : DC.text,
  });

  const answerBlock = (a: string) => (
    <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'flex-start' }}>
      <RealDrLoPhoto size={36} palette={palette} />
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: DC.text, whiteSpace: 'pre-line' }}>{a}</p>
    </div>
  );

  return (
    <DrLoShell back={{ to: '/', label: 'Accueil' }} palette={palette}>
      <h1 style={pageTitle}>Une question ? Dépose-la.</h1>
      <p style={{ margin: '10px 0 0', fontSize: 15, color: DC.soft, lineHeight: 1.5 }}>Sans compte, sans nom. Dr Lô lit les questions et répond à certaines : ici par écrit, ou dans une vidéo. Il ne peut pas répondre à toutes.</p>

      {/* 1. Tes questions — épinglé en haut */}
      {mine.length > 0 && (
        <section aria-labelledby="box-mine" style={{ marginTop: 20 }}>
          <h2 id="box-mine" style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: DC.title }}>
            <Pin size={18} color={palette.accent} aria-hidden="true" /> Tes questions
          </h2>
          <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.45, color: DC.faint }}>Gardées seulement sur cet appareil : si tu changes de téléphone ou vides les données du navigateur, elles ne s'affichent plus ici.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mine.map(q => {
              const s = status[q.id];
              const answered = s?.state === 'answered';
              return (
                <article key={q.id} style={{ ...card, border: `1px solid ${answered ? palette.accent : DC.line}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: DC.faint }}>Déposée le {dayLabel(q.at)}</span>
                    {!s && <Pill color={DC.faint}><Clock size={12} aria-hidden="true" /> Vérification…</Pill>}
                    {s?.state === 'waiting' && <Pill color={DC.soft}><Clock size={12} aria-hidden="true" /> En attente</Pill>}
                    {answered && <Pill color={palette.accent}>Dr Lô a répondu</Pill>}
                    {s?.state === 'video' && <Pill color={palette.accent}><Video size={12} aria-hidden="true" /> Réponse en vidéo</Pill>}
                    {s?.state === 'closed' && <Pill color={DC.faint}>Pas de réponse écrite</Pill>}
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: 15, fontWeight: 700, lineHeight: 1.45, color: DC.title }}>{answered && s?.question ? s.question : short(q.text)}</p>
                  {answered && s?.answer && answerBlock(s.answer)}
                  {s?.state === 'waiting' && <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5, color: DC.soft }}>Dr Lô lit toutes les questions et répond à certaines. Reviens voir ici : si une réponse est publiée, elle apparaîtra à cet endroit.</p>}
                  {s?.state === 'video' && <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5, color: DC.soft }}>Dr Lô répond à ta question dans une vidéo, sur ses réseaux.</p>}
                  {s?.state === 'closed' && <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5, color: DC.soft }}>Dr Lô n'a pas pu répondre à cette question ici. Tu peux la reformuler et la redéposer, ou en parler à ton compagnon.</p>}
                  <button type="button" onClick={() => setMine(forgetMyQuestion(q.id))} className="drl-btn"
                    style={{ marginTop: 10, minHeight: 40, padding: '0 4px', border: 'none', background: 'transparent', color: DC.faint, fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}>
                    Retirer de cette liste
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. Poser une question */}
      {sent ? (
        <section style={{ ...card, marginTop: 18 }} aria-live="polite">
          <p style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: DC.title }}>C'est déposé. Merci.</p>
          <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.5, color: DC.soft }}>Ta question est épinglée en haut de cette page, dans « Tes questions ». Reviens : si Dr Lô répond ici, tu la verras à cet endroit.</p>
          {sent.support && (
            <div role="alert" style={{ marginTop: 14, padding: 12, borderRadius: 14, border: '1px solid rgba(232,102,79,.5)', background: 'rgba(232,102,79,.1)' }}>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: DC.text }}>Ce que tu écris me fait penser que tu souffres. Ne reste pas avec ça sans en parler : parle à une personne de confiance, ou appelle maintenant le SAMU au <b>1515</b>.</p>
              <a href="tel:1515" className="drl-btn" style={{ marginTop: 10, minHeight: 48, padding: '0 16px', borderRadius: 14, background: '#E8664F', color: '#fff', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}><Phone size={18} aria-hidden="true" /> Appeler le 1515</a>
            </div>
          )}
          <button onClick={() => setSent(null)} className="drl-btn" style={{ marginTop: 14, minHeight: 44, padding: '0 16px', borderRadius: 14, border: `1px solid ${DC.line}`, background: 'transparent', color: DC.text, fontWeight: 700, cursor: 'pointer' }}>Poser une autre question</button>
        </section>
      ) : (
        <section style={{ ...card, marginTop: 18 }}>
          <label htmlFor="box-q" style={{ display: 'block', fontSize: 14, fontWeight: 700, color: DC.soft }}>Ta question</label>
          <textarea id="box-q" value={text} onChange={e => setText(e.target.value.slice(0, MAX))} rows={5} placeholder="Écris comme tu parles. Pas de numéro ni de lien."
            style={{ width: '100%', boxSizing: 'border-box', marginTop: 8, borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: 12, fontFamily: 'inherit', fontSize: 16, lineHeight: 1.45, color: DC.text, outline: 'none', resize: 'vertical' }} />
          <p style={{ margin: '6px 0 0', fontSize: 13, color: DC.faint, textAlign: 'right' }}>{text.length} / {MAX}</p>
          {error && <p role="alert" style={{ margin: '8px 0 0', color: '#F09A7A', fontSize: 15 }}>{error}</p>}
          <button onClick={send} disabled={busy} className="drl-btn"
            style={{ marginTop: 12, width: '100%', minHeight: 52, borderRadius: 16, border: 'none', background: palette.accent, color: '#1C1612', fontSize: 16, fontWeight: 800, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.55 : 1 }}>
            {busy ? 'Envoi…' : 'Déposer ma question'}
          </button>
          <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.45, color: DC.faint }}>Anonyme : on ne garde ni ton nom, ni ton compte, ni ton adresse. Ce n'est pas une consultation : en cas d'urgence, appelle le SAMU (1515).</p>
        </section>
      )}

      {/* 3. Les réponses de Dr Lô */}
      {loaded && (
        <section aria-labelledby="box-answers" style={{ marginTop: 28 }}>
          <h2 id="box-answers" style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: DC.title }}>Les réponses de Dr Lô</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, lineHeight: 1.45, color: DC.soft }}>
            {answers.length > 0 ? `${answers.length} réponse${answers.length > 1 ? 's' : ''} publiée${answers.length > 1 ? 's' : ''}` : 'Pas encore de réponse publiée.'}
            {waiting !== null && waiting > 0 ? ` · ${waiting} question${waiting > 1 ? 's' : ''} attend${waiting > 1 ? 'ent' : ''} encore Dr Lô` : ''}
          </p>

          {answers.length > 0 && (
            <>
              <div role="group" aria-label="Choisir un thème" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 0 4px', margin: '0 -2px', scrollbarWidth: 'none' }}>
                <button type="button" onClick={() => { setTopic('all'); setShown(PAGE); }} aria-pressed={topic === 'all'} className="drl-btn" style={chip(topic === 'all')}>Toutes ({answers.length})</button>
                {topics.filter(t => counts[t.id]).map(t => (
                  <button key={t.id} type="button" onClick={() => { setTopic(t.id); setShown(PAGE); }} aria-pressed={topic === t.id} className="drl-btn" style={chip(topic === t.id)}>{t.label} ({counts[t.id]})</button>
                ))}
              </div>

              <div style={{ position: 'relative', marginTop: 8 }}>
                <Search size={18} color={DC.faint} aria-hidden="true" style={{ position: 'absolute', left: 14, top: 15 }} />
                <input type="search" value={query} onChange={e => { setQuery(e.target.value); setShown(PAGE); }} placeholder="Chercher un mot (ex. : mère, stress, rupture)" aria-label="Chercher dans les réponses"
                  style={{ width: '100%', boxSizing: 'border-box', minHeight: 48, borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '0 14px 0 42px', fontFamily: 'inherit', fontSize: 16, color: DC.text, outline: 'none' }} />
              </div>

              {filtered.length === 0 ? (
                <p style={{ margin: '16px 0 0', fontSize: 15, lineHeight: 1.5, color: DC.soft }}>Aucune réponse ne correspond. Essaie un autre mot, ou une autre catégorie.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                  {visible.map(a => {
                    const isOpen = !!open[a.id];
                    const own = mineIds.has(a.id);
                    return (
                      <article key={a.id} style={{ ...card, padding: 0, border: `1px solid ${own ? palette.accent : DC.line}` }}>
                        <button type="button" onClick={() => toggle(a.id)} aria-expanded={isOpen} className="drl-btn"
                          style={{ width: '100%', display: 'flex', gap: 12, alignItems: 'flex-start', padding: 16, minHeight: 56, border: 'none', background: 'transparent', color: 'inherit', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: DC.soft }}>{topicLabel(a.topic)}</span>
                              <span style={{ fontSize: 12, color: DC.faint }}>· {dayLabel(a.at)}</span>
                              {isRecent(a.at) && <Pill color={palette.accent}>Nouveau</Pill>}
                              {own && <Pill color={palette.accent}>Ta question</Pill>}
                            </span>
                            <span style={{ display: 'block', fontSize: 15, fontWeight: 700, lineHeight: 1.45, color: DC.title }}>{a.question}</span>
                            {!isOpen && <span style={{ display: 'block', marginTop: 6, fontSize: 14, color: palette.accent, fontWeight: 700 }}>Lire la réponse</span>}
                          </span>
                          <ChevronDown size={20} color={DC.soft} aria-hidden="true" style={{ flexShrink: 0, marginTop: 20, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                        </button>
                        {isOpen && <div style={{ padding: '0 16px 16px' }}>{answerBlock(a.answer)}</div>}
                      </article>
                    );
                  })}
                </div>
              )}

              {filtered.length > shown && (
                <button type="button" onClick={() => setShown(n => n + PAGE)} className="drl-btn"
                  style={{ marginTop: 14, width: '100%', minHeight: 50, borderRadius: 16, border: `1px solid ${DC.line}`, background: 'transparent', color: DC.text, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  Voir {Math.min(PAGE, filtered.length - shown)} réponse{Math.min(PAGE, filtered.length - shown) > 1 ? 's' : ''} de plus ({filtered.length - shown} restante{filtered.length - shown > 1 ? 's' : ''})
                </button>
              )}
            </>
          )}
        </section>
      )}
    </DrLoShell>
  );
};

export default BoitePage;
