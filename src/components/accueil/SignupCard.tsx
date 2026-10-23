/**
 * SignupCard — créer ou retrouver son espace sans quitter la conversation.
 *  - Google d'abord (la plupart des comptes), e-mail ensuite, ancien numéro en lien discret ;
 *  - prénom et genre déjà connus par la conversation sont réutilisés ;
 *  - une adresse déjà utilisée bascule en « entre ton mot de passe » ;
 *  - LinkAccountCard : un ancien compte par téléphone relie Google ou un e-mail.
 * La suite (transfert des données invité, message de bienvenue) est gérée par ConversationAccueil
 * grâce au marqueur `he_accueil_signup_pending` (survit à une redirection Google).
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTerms } from '../../contexts/TermsContext';
import { validateEmail } from '../../utils/emailValidation';
import { trackAccueil } from '../../utils/accueilTracking';
import type { MomentPalette } from '../../utils/drloMoment';

export const SIGNUP_PENDING_KEY = 'he_accueil_signup_pending';
const markPending = () => { try { localStorage.setItem(SIGNUP_PENDING_KEY, String(Date.now())); } catch { /* ignore */ } };
const clearPending = () => { try { localStorage.removeItem(SIGNUP_PENDING_KEY); } catch { /* ignore */ } };

const T = { text: '#F4EEE4', muted: '#CFC6B8', faint: '#A79E90', ink: '#1C140D', line: 'rgba(255,255,255,.16)', err: '#F09A7A' };

const field: React.CSSProperties = {
  width: '100%', minHeight: 48, boxSizing: 'border-box', borderRadius: 14, border: `1px solid ${T.line}`,
  background: 'rgba(255,255,255,.06)', padding: '0 14px', fontFamily: 'inherit', fontSize: 16, color: T.text, outline: 'none',
};

const GoogleG: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

const SignupCard: React.FC<{
  mode: 'signup' | 'login';
  prenom?: string;
  genre?: 'homme' | 'femme';
  palette: MomentPalette;
}> = ({ mode: initialMode, prenom, genre, palette }) => {
  const navigate = useNavigate();
  const { signInWithGoogle, register, login, resetPassword, isAuthenticated } = useAuth();
  const { hasAgreedToTerms, setHasAgreedToTerms } = useTerms();
  const [mode, setMode] = useState(initialMode);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(prenom ?? '');
  const [gender, setGender] = useState<'homme' | 'femme' | ''>(genre ?? '');
  const [busy, setBusy] = useState<null | 'google' | 'email'>(null);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  if (isAuthenticated) {
    return (
      <p style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#9DBFAF' }}>
        <Check size={14} strokeWidth={2.6} aria-hidden="true" /> Ton espace est ouvert
      </p>
    );
  }

  const needsConsent = mode === 'signup';
  const consentOk = !needsConsent || hasAgreedToTerms;

  const onGoogle = async () => {
    setErr(''); setInfo('');
    if (!consentOk) { setErr('Coche d\'abord la case « J\'accepte les conditions ».'); return; }
    setBusy('google');
    trackAccueil('signup_start', { method: 'google', mode });
    markPending();
    try {
      await signInWithGoogle(); // popup ; en cas de redirection, la page reviendra sur « / »
    } catch (e: unknown) {
      clearPending();
      const msg = e instanceof Error ? e.message : '';
      setErr(/popup-closed|cancelled/i.test(msg) ? 'Connexion annulée. Tu peux réessayer quand tu veux.' : 'La connexion Google n\'a pas abouti. Réessaie, ou passe par ton e-mail.');
      setBusy(null);
    }
  };

  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setInfo('');
    const check = validateEmail(email);
    if (!check.valid) { setErr(check.error ?? 'Adresse e-mail invalide.'); return; }
    if (password.length < 6) { setErr('Le mot de passe doit faire au moins 6 caractères.'); return; }
    if (mode === 'signup') {
      if (!name.trim()) { setErr('Ton prénom (ou un surnom) ?'); return; }
      if (!gender) { setErr('Tu es un homme ou une femme ?'); return; }
      if (!hasAgreedToTerms) { setErr('Coche d\'abord la case « J\'accepte les conditions ».'); return; }
    }
    setBusy('email');
    trackAccueil('signup_start', { method: 'email', mode });
    markPending();
    try {
      if (mode === 'signup') {
        try {
          await register(email.trim(), password, 'patient', { name: name.trim(), displayName: name.trim(), gender, type: 'patient' });
        } catch (re: unknown) {
          const m = re instanceof Error ? re.message : '';
          const code = (re as { code?: string })?.code;
          if (code === 'auth/email-already-in-use' || /déjà utilisée|already/i.test(m)) {
            clearPending();
            setMode('login');
            setPassword('');
            setInfo('Cette adresse a déjà un espace. Entre ton mot de passe pour le retrouver.');
            setBusy(null);
            return;
          }
          throw re;
        }
        try { localStorage.setItem('he_new_account', 'true'); } catch { /* ignore */ }
      }
      await login(email.trim(), password, 'patient');
    } catch (le: unknown) {
      clearPending();
      const code = (le as { code?: string })?.code;
      const m = le instanceof Error ? le.message : '';
      setErr(mode === 'login' && (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/user-not-found' || /mot de passe|password/i.test(m))
        ? 'E-mail ou mot de passe incorrect.'
        : (m || 'Ça n\'a pas marché. Réessaie dans un instant.'));
      setBusy(null);
    }
  };

  const onForgot = async () => {
    setErr(''); setInfo('');
    if (!validateEmail(email).valid) { setErr('Écris d\'abord ton adresse e-mail juste au-dessus.'); return; }
    try { await resetPassword(email.trim()); setInfo('Je t\'ai envoyé un lien pour choisir un nouveau mot de passe. Regarde tes e-mails (et les indésirables).'); }
    catch { setErr('Je n\'ai pas pu envoyer le lien. Vérifie l\'adresse.'); }
  };

  const onPhone = () => {
    markPending();
    trackAccueil('signup_start', { method: 'phone', mode });
    navigate('/patient/access?returnTo=/');
  };

  const btnPrimary: React.CSSProperties = {
    width: '100%', minHeight: 50, borderRadius: 14, border: 0, background: '#FBF5EA', color: '#1F1A15', fontSize: 15, fontWeight: 700,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: busy ? 'default' : 'pointer', opacity: busy && busy !== 'google' ? 0.6 : 1,
  };
  const btnGhost: React.CSSProperties = {
    width: '100%', minHeight: 48, borderRadius: 14, border: `1px solid ${T.line}`, background: 'rgba(255,255,255,.05)', color: T.text,
    fontSize: 14.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
  };
  const linkStyle: React.CSSProperties = { border: 0, background: 'transparent', color: T.muted, fontSize: 13, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', minHeight: 36, padding: '0 4px' };

  return (
    <div className="drl-in" style={{ marginTop: 10, textAlign: 'left', borderRadius: 18, border: '1px solid rgba(242,182,109,.35)', background: 'rgba(255,255,255,.06)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {mode === 'signup' && (prenom || genre) && (
        <p style={{ margin: 0, fontSize: 12, color: T.faint }}>Ton prénom{genre ? ', ton genre' : ''} et ce qu'on a fait ensemble sont déjà gardés.</p>
      )}
      <button onClick={onGoogle} disabled={!!busy} className="drl-btn" style={btnPrimary}>
        <GoogleG /> {busy === 'google' ? 'Connexion…' : 'Continuer avec Google'}
      </button>

      {!emailOpen ? (
        <button onClick={() => setEmailOpen(true)} disabled={!!busy} className="drl-btn" style={btnGhost}>
          <Mail size={17} aria-hidden="true" /> Avec mon e-mail
        </button>
      ) : (
        <form onSubmit={onEmail} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mode === 'signup' && !prenom && (
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ton prénom ou un surnom" aria-label="Prénom" autoComplete="given-name" style={field} className="drl-input" />
          )}
          {mode === 'signup' && !genre && (
            <div role="radiogroup" aria-label="Genre" style={{ display: 'flex', gap: 8 }}>
              {(['homme', 'femme'] as const).map(g => (
                <button key={g} type="button" role="radio" aria-checked={gender === g} onClick={() => setGender(g)} className="drl-btn"
                  style={{ ...btnGhost, minHeight: 44, flex: 1, borderColor: gender === g ? palette.accent : T.line, color: gender === g ? palette.accent : T.text }}>
                  {g === 'homme' ? 'Un homme' : 'Une femme'}
                </button>
              ))}
            </div>
          )}
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" placeholder="Ton adresse e-mail" aria-label="Adresse e-mail" style={field} className="drl-input" />
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            placeholder={mode === 'signup' ? 'Choisis un mot de passe (6 caractères min.)' : 'Ton mot de passe'} aria-label="Mot de passe" style={field} className="drl-input" />
          <button type="submit" disabled={!!busy} className="drl-btn"
            style={{ ...btnPrimary, background: palette.primary, color: T.ink, opacity: busy ? 0.6 : 1 }}>
            {busy === 'email' ? 'Un instant…' : mode === 'signup' ? 'Créer mon espace' : 'Retrouver mon espace'}
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setErr(''); setInfo(''); }} style={linkStyle}>
              {mode === 'signup' ? 'J\'ai déjà un espace' : 'Créer un nouvel espace'}
            </button>
            {mode === 'login' && <button type="button" onClick={onForgot} style={linkStyle}>Mot de passe oublié</button>}
          </div>
        </form>
      )}

      {needsConsent && (
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12.5, color: T.muted, lineHeight: 1.45, cursor: 'pointer' }}>
          <input type="checkbox" checked={hasAgreedToTerms} onChange={e => setHasAgreedToTerms(e.target.checked)}
            style={{ width: 20, height: 20, marginTop: 1, accentColor: palette.accent, flexShrink: 0 }} />
          <span>
            J'accepte les <Link to="/conditions" target="_blank" style={{ color: palette.accent }}>conditions d'utilisation</Link> et
            la <Link to="/confidentialite" target="_blank" style={{ color: palette.accent }}>politique de confidentialité</Link>.
          </span>
        </label>
      )}

      {info && <p role="status" style={{ margin: 0, fontSize: 13, color: '#9DBFAF', lineHeight: 1.45 }}>{info}</p>}
      {err && <p role="alert" style={{ margin: 0, fontSize: 13, color: T.err, lineHeight: 1.45 }}>{err}</p>}

      <button onClick={onPhone} style={{ ...linkStyle, alignSelf: 'center', fontSize: 12.5 }}>Avant, je me connectais avec mon numéro</button>
    </div>
  );
};

export default SignupCard;

/** Ancien compte par téléphone : relier Google ou un e-mail (les SMS vont s'arrêter). */
export const LinkAccountCard: React.FC<{ palette: MomentPalette; onLinked: () => void }> = ({ palette, onLinked }) => {
  const { linkGoogleAccount, linkEmailToAccount, isPhoneOnlyUser } = useAuth();
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(!isPhoneOnlyUser());

  if (done) {
    return (
      <p style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#9DBFAF' }}>
        <Check size={14} strokeWidth={2.6} aria-hidden="true" /> Relié · tu n'as plus besoin des SMS
      </p>
    );
  }
  const finish = () => { setDone(true); trackAccueil('account_linked'); onLinked(); };
  const onGoogle = async () => {
    setErr(''); setBusy(true);
    try { await linkGoogleAccount(); finish(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Ça n\'a pas marché. Réessaie.'); }
    finally { setBusy(false); }
  };
  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const check = validateEmail(email);
    if (!check.valid) { setErr(check.error ?? 'Adresse e-mail invalide.'); return; }
    if (password.length < 6) { setErr('Le mot de passe doit faire au moins 6 caractères.'); return; }
    setBusy(true);
    try { await linkEmailToAccount(email.trim(), password); finish(); }
    catch (er: unknown) { setErr(er instanceof Error ? er.message : 'Ça n\'a pas marché. Réessaie.'); }
    finally { setBusy(false); }
  };
  return (
    <div className="drl-in" style={{ marginTop: 10, textAlign: 'left', borderRadius: 18, border: '1px solid rgba(242,182,109,.35)', background: 'rgba(255,255,255,.06)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button onClick={onGoogle} disabled={busy} className="drl-btn"
        style={{ width: '100%', minHeight: 50, borderRadius: 14, border: 0, background: '#FBF5EA', color: '#1F1A15', fontSize: 15, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer' }}>
        <GoogleG /> Relier mon compte Google
      </button>
      {!emailOpen ? (
        <button onClick={() => setEmailOpen(true)} className="drl-btn"
          style={{ width: '100%', minHeight: 48, borderRadius: 14, border: `1px solid ${T.line}`, background: 'rgba(255,255,255,.05)', color: T.text, fontSize: 14.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
          <Mail size={17} aria-hidden="true" /> Relier un e-mail
        </button>
      ) : (
        <form onSubmit={onEmail} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="Ton adresse e-mail" aria-label="Adresse e-mail" style={field} className="drl-input" />
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete="new-password" placeholder="Choisis un mot de passe (6 caractères min.)" aria-label="Mot de passe" style={field} className="drl-input" />
          <button type="submit" disabled={busy} className="drl-btn"
            style={{ width: '100%', minHeight: 48, borderRadius: 14, border: 0, background: palette.primary, color: T.ink, fontSize: 14.5, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
            Relier cet e-mail
          </button>
        </form>
      )}
      {err && <p role="alert" style={{ margin: 0, fontSize: 13, color: T.err }}>{err}</p>}
    </div>
  );
};
