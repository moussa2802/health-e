/**
 * DrLoConsole — l'espace personnel du vrai Dr Lô (/drlo), SÉPARÉ de l'administration.
 * Accès : compte avec le rôle staff/{uid}.drlo === true (posé à la main dans Firestore).
 * Les administrateurs (stats, utilisateurs…) n'y ont pas accès, et Dr Lô n'a pas besoin d'être admin.
 * Ici : les questions des utilisateurs, ce qu'ils ont choisi de partager, les réponses.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { ChevronDown, Loader2, LogOut, Video } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import { useAuth } from '../../contexts/AuthContext';
import { auth, db } from '../../utils/firebase';
import { adminAnswerQuestion, adminCloseQuestion, adminDeleteEntry, adminEditEntry, adminListQuestions, type AdminQuestion } from '../../services/drloQuestionService';
import ReplyComposer from '../../components/accueil/ReplyComposer';
import { getScaleMeta } from '../../utils/scaleMeta';
import DrloBench from '../../components/accueil/DrloBench';
import CommunityPanel from '../../components/accueil/CommunityPanel';
import ChannelsAdmin from '../../components/accueil/ChannelsAdmin';
import PracticesAdmin from '../../components/accueil/PracticesAdmin';
import { useChannelsActivity } from '../../hooks/useChannelsActivity';
import { getDrloActivity, markCommunitySeen } from '../../services/drloBroadcastService';
import AudioPlayer from '../../components/accueil/AudioPlayer';

const fmt = (t: number) => (t ? new Date(t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const SHARE_LABEL: Record<string, string> = { none: 'Question seule', totem: 'Totem et tendances', results: 'Résultats de tests' };
const field: React.CSSProperties = { width: '100%', minHeight: 48, boxSizing: 'border-box', borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '0 14px', fontFamily: 'inherit', fontSize: 16, color: DC.text, outline: 'none' };

const SEV_COLOR: Record<string, string> = { minimal: '#7FD6A0', positive: '#7FD6A0', mild: '#E9C88F', moderate: '#F0A56E', severe: '#E8664F', high: '#E8664F' };

/** Profil partagé, replié par défaut : une ligne de résumé, puis le détail à la demande. */
const Snapshot: React.FC<{ s: Record<string, unknown>; palette: { accent: string } }> = ({ s, palette }) => {
  const [open, setOpen] = useState(false);
  const results = (s.results ?? {}) as Record<string, { label: string; severity: string }>;
  const journal = (s.journal ?? []) as { date: string | null; text: string }[];
  const who = [s.prenom, s.genre, s.age].filter(Boolean).map(String).join(' · ');
  const n = Object.keys(results).length;
  const share = SHARE_LABEL[String(s.share)] ?? 'Question seule';
  if (String(s.share) === 'none' && !who && n === 0 && journal.length === 0) return null;
  const summary = [who, Boolean(s.totem) && `Totem ${String(s.totem)}`, n > 0 && `${n} test${n > 1 ? 's' : ''}`, journal.length > 0 && 'journal'].filter(Boolean).join(' · ');
  return (
    <div style={{ marginTop: 10 }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="drl-btn"
        style={{ width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', padding: '0 12px', borderRadius: 12, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.04)', color: DC.muted, fontSize: 13, cursor: 'pointer' }}>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><b style={{ color: DC.soft }}>Profil partagé</b>{summary ? ` · ${summary}` : ''}</span>
        <ChevronDown size={16} aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ marginTop: 6, borderRadius: 12, background: 'rgba(255,255,255,.04)', border: `1px solid ${DC.line}`, padding: 12, fontSize: 13, color: DC.muted, lineHeight: 1.5 }}>
          <p style={{ margin: 0, fontWeight: 700, color: DC.soft }}>{share}{s.includeIntime ? ' · intime inclus' : ''}{s.includeJournal ? ' · journal inclus' : ''}</p>
          {n > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {Object.entries(results).map(([id, r]) => (
                <span key={id} title={r.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, border: `1px solid ${DC.line}`, fontSize: 13, color: DC.soft }}>
                  <i aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: SEV_COLOR[r.severity] ?? palette.accent, display: 'inline-block' }} />
                  {getScaleMeta(id).label}
                </span>
              ))}
            </div>
          )}
          {journal.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <p style={{ margin: 0, fontWeight: 700, color: DC.soft }}>Journal</p>
              {journal.map((j, i) => <p key={i} style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap', borderLeft: `2px solid ${DC.confier}`, paddingLeft: 8 }}>{j.text}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const mmss = (n: number) => `${Math.floor(n / 60)}:${String(Math.round(n % 60)).padStart(2, '0')}`;
const miniBtn: React.CSSProperties = { minHeight: 36, padding: '0 12px', borderRadius: 10, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.muted, cursor: 'pointer', fontSize: 13 };
/** À répondre : jamais répondu, ou la personne a écrit en dernier et la discussion n'est pas close. */
const needsAnswer = (q: AdminQuestion) => q.status === 'pending' || (!q.closed && q.thread.length > 0 && q.thread[q.thread.length - 1].from === 'user');

/** Une question et sa discussion : réponse écrite ou vocale, modifier, supprimer, clôturer. Compacte quand elle est traitée. */
const QuestionCard: React.FC<{
  q: AdminQuestion; palette: { accent: string; primary: string }; late: boolean; onChanged: () => void; onError: (m: string) => void;
}> = ({ q, palette, late, onChanged, onError }) => {
  const todo = needsAnswer(q);
  const [open, setOpen] = useState(todo);
  const [editing, setEditing] = useState<number | null>(null);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const [referred, setReferred] = useState(false);
  const who = q.anonymous ? 'Anonyme' : String((q.snapshot as { prenom?: string }).prenom || 'Prénom non partagé');
  const run = async (p: Promise<unknown>) => { try { await p; onChanged(); } catch (e: unknown) { onError(e instanceof Error ? e.message : 'Erreur'); } };
  const last = q.thread[q.thread.length - 1];
  const hasDrlo = q.thread.some(e => e.from === 'drlo');
  return (
    <article style={{ ...card, padding: 14, borderColor: late ? 'rgba(240,154,122,.6)' : todo && q.thread.length ? palette.accent : DC.line }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ all: 'unset', display: 'block', width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}>
        <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, color: DC.faint }}>
          <span>{fmt(q.createdAt)} · {who}{late ? ' · plus de 5 jours' : ''}</span>
          {q.videoConsent && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: DC.ok }}><Video size={12} aria-hidden="true" /> vidéo OK</span>}
        </span>
        <span style={{ display: 'block', marginTop: 6, fontSize: 15, lineHeight: 1.5, color: DC.text, whiteSpace: open ? 'pre-wrap' : undefined,
          ...(open ? {} : { overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }) }}>{q.text}</span>
        {!open && hasDrlo && <span style={{ display: 'block', marginTop: 6, fontSize: 13, color: palette.accent, fontWeight: 600 }}>
          {todo ? 'La personne t\'a répondu : à toi' : q.closed ? 'Discussion clôturée' : `Répondu le ${fmt(q.answer?.at ?? 0)}`} · toucher pour voir</span>}
      </button>
      {open && (
        <>
          <Snapshot s={q.snapshot} palette={palette} />
          {q.thread.map(e => {
            const mine = e.from === 'drlo';
            return (
              <div key={e.index} style={{ marginTop: 10, borderLeft: `2px solid ${mine ? palette.accent : DC.line}`, paddingLeft: 10 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: mine ? palette.accent : DC.faint }}>
                  {mine ? 'Toi' : who}{e.editedAt ? ' · modifié' : ''} · {fmt(e.editedAt ?? e.at)}
                </p>
                {editing === e.index ? (
                  <div style={{ marginTop: 6 }}>
                    <ReplyComposer initialText={e.text} existingAudio={e.audioSec ? { url: e.audioUrl ?? null, sec: e.audioSec } : null} placeholder="Ta réponse" submitLabel="Enregistrer la modification"
                      onSubmit={async (t, clip, removeAudio) => { await adminEditEntry(q.id, e.index, { text: t, audio: clip, removeAudio }); setEditing(null); onChanged(); }}
                      onCancel={() => setEditing(null)} />
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: DC.faint }}>La personne verra « Réponse mise à jour ».</p>
                  </div>
                ) : (
                  <>
                    {e.audioSec > 0 && (e.audioUrl
                      ? <AudioPlayer src={e.audioUrl} ariaLabel={mine ? 'Ton vocal' : 'Vocal'} style={{ marginTop: 6 }} />
                      : <p style={{ margin: '6px 0 0', fontSize: 13, color: DC.muted }}>Vocal de {mmss(e.audioSec)}</p>)}
                    {e.text && <p style={{ margin: '4px 0 0', fontSize: 15, lineHeight: 1.5, color: mine ? DC.soft : DC.text, whiteSpace: 'pre-wrap' }}>{e.text}</p>}
                    {mine && (confirmDel === e.index ? (
                      <div role="alertdialog" aria-label="Supprimer cette réponse" style={{ marginTop: 8, padding: 10, borderRadius: 12, border: '1px solid rgba(240,154,122,.5)', background: 'rgba(240,154,122,.08)' }}>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: DC.text }}>Supprimer cette réponse pour de bon ?{q.thread.filter(x => x.from === 'drlo').length === 1 ? ' La question reviendra dans « À répondre ».' : ''}</p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button type="button" onClick={() => { setConfirmDel(null); void run(adminDeleteEntry(q.id, e.index)); }} className="drl-btn" style={{ ...miniBtn, flex: 1, color: '#F09A7A', borderColor: 'rgba(240,154,122,.5)' }}>Oui, supprimer</button>
                          <button type="button" onClick={() => setConfirmDel(null)} className="drl-btn" style={miniBtn}>Garder</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        <button type="button" onClick={() => setEditing(e.index)} className="drl-btn" style={miniBtn}>Modifier</button>
                        <button type="button" onClick={() => setConfirmDel(e.index)} className="drl-btn" style={miniBtn}>Supprimer</button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })}
          {last && last.from === 'user' && !q.closed && <p style={{ margin: '10px 0 0', fontSize: 13, fontWeight: 700, color: '#F0C987' }}>La personne t'a répondu : à toi.</p>}
          {q.closed ? (
            <div style={{ marginTop: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: DC.muted }}>Discussion clôturée : la personne ne peut plus écrire.</p>
              <button type="button" onClick={() => void run(adminCloseQuestion(q.id, false))} className="drl-btn" style={{ ...miniBtn, marginTop: 8 }}>Rouvrir la discussion</button>
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
              {!hasDrlo && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, color: DC.muted, minHeight: 36 }}>
                  <input type="checkbox" checked={referred} onChange={e => setReferred(e.target.checked)} /> Orienter vers un confrère
                </label>
              )}
              <ReplyComposer placeholder={hasDrlo ? 'Continuer la discussion…' : 'Ta réponse : conseils de bien-être. Si une consultation est nécessaire, oriente vers un confrère.'} submitLabel="Envoyer la réponse"
                onSubmit={async (t, clip) => { await adminAnswerQuestion(q.id, t, referred ? 'referred' : 'answered', clip); setReferred(false); onChanged(); }} />
              {hasDrlo && <button type="button" onClick={() => void run(adminCloseQuestion(q.id, true))} className="drl-btn" style={{ ...miniBtn, marginTop: 8 }}>Clôturer la discussion</button>}
            </div>
          )}
        </>
      )}
    </article>
  );
};

const DrLoConsole: React.FC = () => {
  const palette = usePalette();
  const { authReady, isAuthenticated, currentUser } = useAuth();
  const [role, setRole] = useState<'unknown' | 'drlo' | 'none'>('unknown');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [items, setItems] = useState<AdminQuestion[]>([]);
  const [week, setWeek] = useState<{ used: number; cap: number; queued: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTabRaw] = useState<'pending' | 'done' | 'bench' | 'community' | 'channels' | 'practices'>('pending');
  const [activity, setActivity] = useState<{ community: number; distress: number; byBroadcast: Record<string, number> }>({ community: 0, distress: 0, byBroadcast: {} });
  const chBadge = useChannelsActivity(role === 'drlo', tab);
  const loadActivity = () => { getDrloActivity().then(setActivity).catch(() => {}); };
  const setTab = (t: typeof tab) => {
    if (tab === 'community' && t !== 'community') markCommunitySeen().then(loadActivity).catch(() => {});
    setTabRaw(t);
  };

  // Rôle Dr Lô (lu dans staff/{uid} ; le serveur revérifie à chaque action)
  useEffect(() => {
    const fs = db;
    if (!isAuthenticated || !currentUser || !fs) { setRole('unknown'); return; }
    getDoc(doc(fs, 'staff', currentUser.id))
      .then(s => setRole(s.exists() && s.data().drlo === true ? 'drlo' : 'none'))
      .catch(() => setRole('none'));
  }, [isAuthenticated, currentUser?.id]);

  const load = () => {
    setLoading(true);
    adminListQuestions().then(r => { setItems(r.items); setWeek(r.week); setError(''); })
      .catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { if (role === 'drlo') load(); }, [role]);
  useEffect(() => {
    if (role !== 'drlo') return;
    loadActivity();
    const t = window.setInterval(() => { loadActivity(); }, 60000);
    return () => window.clearInterval(t);
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => items.filter(q => (tab === 'pending' ? needsAnswer(q) : !needsAnswer(q))), [items, tab]);
  const pendingCount = items.filter(needsAnswer).length;

  const loginGoogle = async () => {
    setLoginError('');
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch { setLoginError('Connexion Google interrompue. Réessaie.'); }
  };
  const loginEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try { await signInWithEmailAndPassword(auth, email.trim(), password); }
    catch { setLoginError('E-mail ou mot de passe incorrect.'); }
  };

  const title = (
    <div style={{ marginTop: 18 }}>
      <p style={{ margin: 0, fontSize: 13, letterSpacing: '.14em', textTransform: 'uppercase', color: palette.accent, fontWeight: 700 }}>Espace Dr Lô</p>
      <h1 style={{ margin: '6px 0 0', fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 600, color: DC.title }}>Tes échanges avec les utilisateurs</h1>
    </div>
  );

  // ── Connexion ──
  if (!authReady) return <DrLoShell back={{ to: '/', label: 'Accueil' }} palette={palette}>{title}<Loader2 className="animate-spin" style={{ marginTop: 20 }} /></DrLoShell>;
  if (!isAuthenticated) {
    return (
      <DrLoShell back={{ to: '/', label: 'Accueil' }} palette={palette}>
        {title}
        <section style={{ ...card, marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, fontSize: 14, color: DC.muted }}>Connecte-toi avec ton compte Dr Lô. Cet espace est distinct de l'administration.</p>
          <button onClick={loginGoogle} className="drl-btn" style={{ minHeight: 50, borderRadius: 14, border: 0, background: '#FBF5EA', color: '#1F1A15', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Continuer avec Google</button>
          <form onSubmit={loginEmail} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" aria-label="E-mail" autoComplete="email" style={field} className="drl-input" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" aria-label="Mot de passe" autoComplete="current-password" style={field} className="drl-input" />
            <button type="submit" className="drl-btn" style={{ minHeight: 48, borderRadius: 14, border: 0, background: palette.primary, color: DC.ink, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Se connecter</button>
          </form>
          {loginError && <p role="alert" style={{ margin: 0, color: '#F09A7A', fontSize: 13 }}>{loginError}</p>}
        </section>
      </DrLoShell>
    );
  }
  if (role === 'unknown') return <DrLoShell back={{ to: '/', label: 'Accueil' }} palette={palette}>{title}<Loader2 className="animate-spin" style={{ marginTop: 20 }} /></DrLoShell>;
  if (role === 'none') {
    return (
      <DrLoShell back={{ to: '/', label: 'Accueil' }} palette={palette}>
        {title}
        <section style={{ ...card, marginTop: 16 }}>
          <p style={{ margin: 0, fontSize: 15, color: DC.soft, lineHeight: 1.5 }}>Ce compte n'a pas accès à l'espace Dr Lô.</p>
          <button onClick={() => signOut(auth)} className="drl-btn" style={{ marginTop: 12, minHeight: 44, padding: '0 16px', borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontWeight: 600, cursor: 'pointer' }}>Changer de compte</button>
        </section>
      </DrLoShell>
    );
  }

  // ── Boîte de réception ──
  return (
    <DrLoShell back={{ to: '/', label: 'Accueil' }} palette={palette}>
      {title}
      {week && (
        <p style={{ margin: '8px 0 0', fontSize: 14, color: DC.muted, lineHeight: 1.5 }}>
          Cette semaine : <b style={{ color: DC.text }}>{week.used} / {week.cap}</b> questions · {week.queued} en file d'attente. Réponse promise sous 7 jours.
        </p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, alignItems: 'center' }}>
        {(['pending', 'done', 'community', 'channels', 'practices', 'bench'] as const).map(t => {
          const n = t === 'pending' ? pendingCount : t === 'community' && tab !== 'community' ? activity.community : t === 'channels' ? chBadge : 0;
          const label = t === 'pending' ? 'À répondre' : t === 'done' ? 'Répondues' : t === 'community' ? 'Ma communauté' : t === 'channels' ? 'Chaînes' : t === 'practices' ? 'Pratiques' : 'Banc d\'essai';
          return (
            <button key={t} onClick={() => setTab(t)} className="drl-btn" aria-label={n > 0 ? `${label} : ${n} nouveauté${n > 1 ? 's' : ''}` : label}
              style={{ position: 'relative', minHeight: 38, padding: '0 14px', borderRadius: 999, border: `1px solid ${tab === t ? palette.accent : DC.line}`, background: tab === t ? 'rgba(242,182,109,.15)' : DC.glass, color: tab === t ? palette.accent : DC.muted, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {label}
              {n > 0 && <span aria-hidden="true" style={{ position: 'absolute', top: -7, right: -4, minWidth: 20, height: 20, padding: '0 6px', boxSizing: 'border-box', borderRadius: 10, background: '#E8664F', color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #1C1612' }}>{n}</span>}
            </button>
          );
        })}
        <button onClick={() => signOut(auth)} aria-label="Se déconnecter" className="drl-btn" style={{ marginLeft: 'auto', width: 38, height: 38, borderRadius: 12, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <LogOut size={16} aria-hidden="true" />
        </button>
      </div>
      {error && <p role="alert" style={{ color: '#F09A7A', fontSize: 14 }}>{error}</p>}
      {tab === 'community' ? <CommunityPanel palette={palette} newByBroadcast={activity.byBroadcast} /> : tab === 'channels' ? <ChannelsAdmin palette={palette} /> : tab === 'practices' ? <PracticesAdmin palette={palette} /> : tab === 'bench' && currentUser ? <DrloBench uid={currentUser.id} palette={palette} /> : loading && items.length === 0 ? <Loader2 className="animate-spin" style={{ marginTop: 20 }} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
          {list.length === 0 && <p style={{ color: DC.faint, fontSize: 14 }}>{tab === 'pending' ? 'Aucune question en attente. 🙏' : 'Pas encore de réponse envoyée.'}</p>}
          {list.map(q => (
            <QuestionCard key={q.id} q={q} palette={palette} late={q.status === 'pending' && Date.now() - q.createdAt > 5 * 86400000}
              onChanged={load} onError={setError} />
          ))}
        </div>
      )}
      <p style={{ margin: '18px 0 0', textAlign: 'center', fontSize: 13, color: DC.faint }}>
        Les questions anonymes arrivent sans prénom. <Link to="/" style={{ color: palette.accent }}>Retour au site</Link>
      </p>
    </DrLoShell>
  );
};

export default DrLoConsole;
