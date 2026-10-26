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
import { Loader2, LogOut, Send, Video } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import { useAuth } from '../../contexts/AuthContext';
import { auth, db } from '../../utils/firebase';
import { adminAnswerQuestion, adminListQuestions, type AdminQuestion } from '../../services/drloQuestionService';
import { getScaleMeta } from '../../utils/scaleMeta';
import DrloBench from '../../components/accueil/DrloBench';

const fmt = (t: number) => (t ? new Date(t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const SHARE_LABEL: Record<string, string> = { none: 'Question seule', totem: 'Totem et tendances', results: 'Résultats de tests' };
const field: React.CSSProperties = { width: '100%', minHeight: 48, boxSizing: 'border-box', borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '0 14px', fontFamily: 'inherit', fontSize: 16, color: DC.text, outline: 'none' };

const Snapshot: React.FC<{ s: Record<string, unknown> }> = ({ s }) => {
  const results = (s.results ?? {}) as Record<string, { label: string; severity: string }>;
  const journal = (s.journal ?? []) as { date: string | null; text: string }[];
  const who = [s.prenom, s.genre, s.age].filter(Boolean).map(String).join(' · ');
  return (
    <div style={{ marginTop: 10, borderRadius: 14, background: 'rgba(255,255,255,.04)', border: `1px solid ${DC.line}`, padding: 12, fontSize: 13, color: DC.muted, lineHeight: 1.5 }}>
      <p style={{ margin: 0, fontWeight: 700, color: DC.soft }}>
        {SHARE_LABEL[String(s.share)] ?? 'Question seule'}{s.includeIntime ? ' · intime inclus' : ''}{s.includeJournal ? ' · journal inclus' : ''}
      </p>
      {who && <p style={{ margin: '4px 0 0' }}>{who}</p>}
      {Boolean(s.totem) && <p style={{ margin: '4px 0 0' }}>Totem : {String(s.totem)}</p>}
      {Object.keys(results).length > 0 && (
        <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
          {Object.entries(results).map(([id, r]) => <li key={id}>{getScaleMeta(id).label} : {r.label} ({r.severity})</li>)}
        </ul>
      )}
      {journal.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <p style={{ margin: 0, fontWeight: 700, color: DC.soft }}>Journal</p>
          {journal.map((j, i) => <p key={i} style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap', borderLeft: `2px solid ${DC.confier}`, paddingLeft: 8 }}>{j.text}</p>)}
        </div>
      )}
    </div>
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
  const [tab, setTab] = useState<'pending' | 'done' | 'bench'>('pending');

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
      <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
        {(['pending', 'done', 'bench'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className="drl-btn"
            style={{ minHeight: 38, padding: '0 14px', borderRadius: 999, border: `1px solid ${tab === t ? palette.accent : DC.line}`, background: tab === t ? 'rgba(242,182,109,.15)' : DC.glass, color: tab === t ? palette.accent : DC.muted, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
            {t === 'pending' ? `À répondre (${pendingCount})` : t === 'done' ? 'Répondues' : 'Banc d\'essai'}
          </button>
        ))}
        <button onClick={() => signOut(auth)} aria-label="Se déconnecter" className="drl-btn" style={{ marginLeft: 'auto', width: 38, height: 38, borderRadius: 12, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <LogOut size={16} aria-hidden="true" />
        </button>
      </div>
      {error && <p role="alert" style={{ color: '#F09A7A', fontSize: 13.5 }}>{error}</p>}
      {tab === 'bench' && currentUser ? <DrloBench uid={currentUser.id} palette={palette} /> : loading && items.length === 0 ? <Loader2 className="animate-spin" style={{ marginTop: 20 }} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
          {list.length === 0 && <p style={{ color: DC.faint, fontSize: 14 }}>{tab === 'pending' ? 'Aucune question en attente. 🙏' : 'Pas encore de réponse envoyée.'}</p>}
          {list.map(q => {
            const late = q.status === 'pending' && Date.now() - q.createdAt > 5 * 86400000;
            return (
              <article key={q.id} style={{ ...card, borderColor: late ? 'rgba(240,154,122,.6)' : DC.line }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: DC.faint }}>
                  <span>{fmt(q.createdAt)}{q.anonymous ? ' · anonyme' : ''}{late ? ' · plus de 5 jours' : ''}</span>
                  {q.videoConsent && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: DC.ok }}><Video size={12} aria-hidden="true" /> accord vidéo (anonyme)</span>}
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 15.5, lineHeight: 1.55, color: DC.text, whiteSpace: 'pre-wrap' }}>{q.text}</p>
                <Snapshot s={q.snapshot} />
                {q.answer ? (
                  <div style={{ marginTop: 12, borderTop: `1px solid ${DC.line}`, paddingTop: 10 }}>
                    <p style={{ margin: 0, fontSize: 12, color: DC.faint }}>{q.status === 'referred' ? 'Orientation' : 'Ta réponse'} · {fmt(q.answer.at)}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 14.5, color: DC.soft, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{q.answer.text}</p>
                  </div>
                ) : (
                  <div style={{ marginTop: 12 }}>
                    <textarea rows={6} value={drafts[q.id] ?? ''} onChange={e => setDrafts(d => ({ ...d, [q.id]: e.target.value }))}
                      placeholder="Ta réponse : conseils de bien-être. Si une consultation est nécessaire, oriente vers un confrère."
                      className="drl-input" style={{ ...field, minHeight: 130, padding: '12px 14px', lineHeight: 1.5, resize: 'vertical' }} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      <button onClick={() => answer(q, 'answered')} disabled={saving === q.id} className="drl-btn"
                        style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: saving === q.id ? 0.6 : 1 }}>
                        <Send size={15} aria-hidden="true" /> Envoyer la réponse
                      </button>
                      <button onClick={() => answer(q, 'referred')} disabled={saving === q.id} className="drl-btn"
                        style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: '1px solid rgba(233,200,143,.45)', background: 'rgba(233,200,143,.10)', color: DC.text, fontWeight: 600, cursor: 'pointer' }}>
                        Orienter vers un confrère
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      <p style={{ margin: '18px 0 0', textAlign: 'center', fontSize: 11.5, color: DC.faint }}>
        Les questions anonymes arrivent sans prénom. <Link to="/" style={{ color: palette.accent }}>Retour au site</Link>
      </p>
    </DrLoShell>
  );
};

export default DrLoConsole;
