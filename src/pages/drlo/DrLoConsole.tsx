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
import { ChevronDown, Loader2, LogOut, Send, Video } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import { useAuth } from '../../contexts/AuthContext';
import { auth, db } from '../../utils/firebase';
import { adminAnswerQuestion, adminListQuestions, type AdminQuestion } from '../../services/drloQuestionService';
import { getScaleMeta } from '../../utils/scaleMeta';
import DrloBench from '../../components/accueil/DrloBench';
import CommunityPanel from '../../components/accueil/CommunityPanel';
import { getDrloActivity, markCommunitySeen } from '../../services/drloBroadcastService';

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
                <span key={id} title={r.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, border: `1px solid ${DC.line}`, fontSize: 12.5, color: DC.soft }}>
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

/** Une question : compacte, dépliable quand elle est déjà traitée. */
const QuestionCard: React.FC<{
  q: AdminQuestion; palette: { accent: string; primary: string }; late: boolean; draft: string; saving: boolean;
  onDraft: (v: string) => void; onAnswer: (status: 'answered' | 'referred') => void;
}> = ({ q, palette, late, draft, saving, onDraft, onAnswer }) => {
  const [open, setOpen] = useState(!q.answer);
  const who = q.anonymous ? 'Anonyme' : String((q.snapshot as { prenom?: string }).prenom || 'Prénom non partagé');
  return (
    <article style={{ ...card, padding: 14, borderColor: late ? 'rgba(240,154,122,.6)' : DC.line }}>
      <button type="button" onClick={() => q.answer && setOpen(o => !o)} aria-expanded={open} disabled={!q.answer}
        style={{ all: 'unset', display: 'block', width: '100%', boxSizing: 'border-box', cursor: q.answer ? 'pointer' : 'default' }}>
        <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: DC.faint }}>
          <span>{fmt(q.createdAt)} · {who}{late ? ' · plus de 5 jours' : ''}</span>
          {q.videoConsent && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: DC.ok }}><Video size={12} aria-hidden="true" /> vidéo OK</span>}
        </span>
        <span style={{ display: 'block', marginTop: 6, fontSize: 15, lineHeight: 1.5, color: DC.text, whiteSpace: open ? 'pre-wrap' : undefined,
          ...(open ? {} : { overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }) }}>{q.text}</span>
        {q.answer && !open && <span style={{ display: 'block', marginTop: 6, fontSize: 12.5, color: palette.accent, fontWeight: 600 }}>Répondu le {fmt(q.answer.at)} · toucher pour voir</span>}
      </button>
      {open && (
        <>
          <Snapshot s={q.snapshot} palette={palette} />
          {q.answer ? (
            <div style={{ marginTop: 12, borderTop: `1px solid ${DC.line}`, paddingTop: 10 }}>
              <p style={{ margin: 0, fontSize: 12, color: DC.faint }}>{q.status === 'referred' ? 'Orientation' : 'Ta réponse'} · {fmt(q.answer.at)}</p>
              <p style={{ margin: '4px 0 0', fontSize: 14.5, color: DC.soft, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{q.answer.text}</p>
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
              <textarea rows={4} value={draft} onChange={e => onDraft(e.target.value)}
                placeholder="Ta réponse : conseils de bien-être. Si une consultation est nécessaire, oriente vers un confrère."
                className="drl-input" style={{ ...field, minHeight: 100, padding: '12px 14px', lineHeight: 1.5, resize: 'vertical' }} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                <button onClick={() => onAnswer('answered')} disabled={saving} className="drl-btn"
                  style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: saving ? 0.6 : 1 }}>
                  <Send size={15} aria-hidden="true" /> Envoyer la réponse
                </button>
                <button onClick={() => onAnswer('referred')} disabled={saving} className="drl-btn"
                  style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: '1px solid rgba(233,200,143,.45)', background: 'rgba(233,200,143,.10)', color: DC.text, fontWeight: 600, cursor: 'pointer' }}>
                  Orienter vers un confrère
                </button>
              </div>
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
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [tab, setTabRaw] = useState<'pending' | 'done' | 'bench' | 'community'>('pending');
  const [activity, setActivity] = useState<{ community: number; distress: number; byBroadcast: Record<string, number> }>({ community: 0, distress: 0, byBroadcast: {} });
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

  const list = useMemo(() => items.filter(q => (tab === 'pending' ? q.status === 'pending' : q.status !== 'pending')), [items, tab]);
  const pendingCount = items.filter(q => q.status === 'pending').length;

  const answer = async (q: AdminQuestion, status: 'answered' | 'referred') => {
    const text = (drafts[q.id] ?? '').trim();
    if (text.length < 2) return;
    setSaving(q.id);
    try { await adminAnswerQuestion(q.id, text, status); setDrafts(d => ({ ...d, [q.id]: '' })); load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setSaving(null); }
  };

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
      <p style={{ margin: 0, fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: palette.accent, fontWeight: 700 }}>Espace Dr Lô</p>
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
          <p style={{ margin: 0, fontSize: 14.5, color: DC.soft, lineHeight: 1.5 }}>Ce compte n'a pas accès à l'espace Dr Lô.</p>
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
        <p style={{ margin: '8px 0 0', fontSize: 13.5, color: DC.muted, lineHeight: 1.5 }}>
          Cette semaine : <b style={{ color: DC.text }}>{week.used} / {week.cap}</b> questions · {week.queued} en file d'attente. Réponse promise sous 7 jours.
        </p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, alignItems: 'center' }}>
        {(['pending', 'done', 'community', 'bench'] as const).map(t => {
          const n = t === 'pending' ? pendingCount : t === 'community' && tab !== 'community' ? activity.community : 0;
          const label = t === 'pending' ? 'À répondre' : t === 'done' ? 'Répondues' : t === 'community' ? 'Ma communauté' : 'Banc d\'essai';
          return (
            <button key={t} onClick={() => setTab(t)} className="drl-btn" aria-label={n > 0 ? `${label} : ${n} nouveauté${n > 1 ? 's' : ''}` : label}
              style={{ position: 'relative', minHeight: 38, padding: '0 14px', borderRadius: 999, border: `1px solid ${tab === t ? palette.accent : DC.line}`, background: tab === t ? 'rgba(242,182,109,.15)' : DC.glass, color: tab === t ? palette.accent : DC.muted, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
              {label}
              {n > 0 && <span aria-hidden="true" style={{ position: 'absolute', top: -7, right: -4, minWidth: 20, height: 20, padding: '0 6px', boxSizing: 'border-box', borderRadius: 10, background: '#E8664F', color: '#fff', fontSize: 11.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #1C1612' }}>{n}</span>}
            </button>
          );
        })}
        <button onClick={() => signOut(auth)} aria-label="Se déconnecter" className="drl-btn" style={{ marginLeft: 'auto', width: 38, height: 38, borderRadius: 12, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <LogOut size={16} aria-hidden="true" />
        </button>
      </div>
      {error && <p role="alert" style={{ color: '#F09A7A', fontSize: 13.5 }}>{error}</p>}
      {tab === 'community' ? <CommunityPanel palette={palette} newByBroadcast={activity.byBroadcast} /> : tab === 'bench' && currentUser ? <DrloBench uid={currentUser.id} palette={palette} /> : loading && items.length === 0 ? <Loader2 className="animate-spin" style={{ marginTop: 20 }} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
          {list.length === 0 && <p style={{ color: DC.faint, fontSize: 14 }}>{tab === 'pending' ? 'Aucune question en attente. 🙏' : 'Pas encore de réponse envoyée.'}</p>}
          {list.map(q => (
            <QuestionCard key={q.id} q={q} palette={palette} late={q.status === 'pending' && Date.now() - q.createdAt > 5 * 86400000}
              draft={drafts[q.id] ?? ''} saving={saving === q.id} onDraft={v => setDrafts(d => ({ ...d, [q.id]: v }))} onAnswer={st => answer(q, st)} />
          ))}
        </div>
      )}
      <p style={{ margin: '18px 0 0', textAlign: 'center', fontSize: 11.5, color: DC.faint }}>
        Les questions anonymes arrivent sans prénom. <Link to="/" style={{ color: palette.accent }}>Retour au site</Link>
      </p>
    </DrLoShell>
  );
};

export default DrLoConsole;
