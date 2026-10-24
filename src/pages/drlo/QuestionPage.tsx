/**
 * QuestionPage — « Écris au vrai Dr Lô » (/question).
 * Débloqué par les paliers ; gratuit (une question à la fois, une par mois) ; places limitées
 * chaque semaine (file par vagues, on passe devant en invitant 3 proches).
 * Rien du profil n'est partagé par défaut ; intime et journal exclus sauf accord explicite.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Share2 } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import PaliersCard from '../../components/accueil/PaliersCard';
import { useAuth } from '../../contexts/AuthContext';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import {
  getDrloStatus, joinDrloQueue, submitDrloQuestion, markDrloAnswersSeen, inviteLink,
  type DrloStatus, type SubmitInput,
} from '../../services/drloQuestionService';
import { trackAccueil } from '../../utils/accueilTracking';
import { NotifOptinCard } from '../../components/accueil/NotificationsPanel';
import { canProposeReminders, loadPrefs, noteProposed, pushSupport } from '../../services/pushService';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const fmt = (t: number) => { const d = new Date(t); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const fmtDay = (t: number) => { const d = new Date(t); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };

const SHARE = [
  { value: 'none', label: 'Ma question seulement', desc: 'Dr Lô voit seulement ta question.' },
  { value: 'totem', label: 'Mon totem et mes tendances', desc: 'Ton totem, ton âge et ton genre.' },
  { value: 'results', label: 'Mes résultats de tests', desc: 'Tes résultats, hors intime et journal (sauf si tu les ajoutes).' },
] as const;

const h1: React.CSSProperties = { margin: '6px 0 0', fontFamily: 'Fraunces, serif', fontSize: 28, lineHeight: 1.2, fontWeight: 600, color: DC.title };
const label: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: DC.soft, lineHeight: 1.45, cursor: 'pointer' };

const QuestionPage: React.FC = () => {
  const palette = usePalette();
  const { isAuthenticated, currentUser } = useAuth();
  const genre = getOnboardingProfile()?.genre;
  const [status, setStatus] = useState<DrloStatus | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  /** Après l'envoi : « Je te préviens dès qu'il répond ? » (si les rappels ne sont pas encore activés). */
  const [askNotif, setAskNotif] = useState(false);
  const [form, setForm] = useState<SubmitInput>({ text: '', anonymous: true, share: 'none', includeIntime: false, includeJournal: false, videoConsent: false });

  const load = () => getDrloStatus().then(s => {
    setStatus(s);
    if (s.questions.some(q => q.answer && !q.seen)) markDrloAnswersSeen().catch(() => {});
  }).catch(e => setError(e.message));

  useEffect(() => { if (isAuthenticated && currentUser) load(); }, [isAuthenticated, currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await submitDrloQuestion(form);
      trackAccueil('question_sent', { share: form.share, anonymous: form.anonymous }); // jamais le texte
      setSent(true);
      if (currentUser && canProposeReminders(currentUser.id) && pushSupport() !== 'unsupported') {
        loadPrefs(currentUser.id).then(pr => { if (!pr.on) { setAskNotif(true); noteProposed(currentUser.id); } }).catch(() => {});
      }
      setForm(f => ({ ...f, text: '' }));
      await load();
    } catch (er: unknown) {
      setError(er instanceof Error ? er.message : 'Erreur');
      await load();
    } finally { setBusy(false); }
  };

  const reserve = async () => {
    setBusy(true);
    try { setStatus(await joinDrloQueue()); trackAccueil('queue_join'); } catch (er: unknown) { setError(er instanceof Error ? er.message : 'Erreur'); }
    finally { setBusy(false); }
  };

  const shareInvite = () => {
    if (!status) return;
    const text = `Je fais des tests de bien-être avec Dr Lô sur Health-e. Fais le tien, c'est gratuit et privé : ${inviteLink(status.referral.code)}`;
    trackAccueil('invite_share');
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  const footer = (
    <p style={{ margin: '18px 0 0', textAlign: 'center', fontSize: 11.5, lineHeight: 1.55, color: DC.faint }}>
      Dr Lô te donne des conseils de bien-être. Ce n'est pas une consultation médicale. Si une consultation est nécessaire, il t'oriente vers un confrère au Sénégal.
      En cas d'urgence : <a href="tel:1515" style={{ fontWeight: 700 }}>1515 (SAMU)</a>.
    </p>
  );

  if (!isAuthenticated) {
    return (
      <DrLoShell back={{ to: '/espace', label: 'Retour à mon espace' }} genre={genre} palette={palette}>
        <h1 style={{ ...h1, marginTop: 22 }}>Écrire au vrai Dr Lô</h1>
        <p style={{ fontSize: 15, lineHeight: 1.55, color: DC.soft }}>Pour lui écrire, il te faut un espace personnel : c'est là qu'arrivera sa réponse.</p>
        <Link to="/" state={{ signup: true }} className="drl-btn" style={{ display: 'inline-flex', minHeight: 48, padding: '0 20px', alignItems: 'center', borderRadius: 999, background: palette.primary, color: DC.ink, fontWeight: 700, textDecoration: 'none' }}>Créer mon espace</Link>
        {footer}
      </DrLoShell>
    );
  }

  const answered = status?.questions.filter(q => q.answer) ?? [];
  const pending = status?.questions.find(q => q.status === 'pending');

  return (
    <DrLoShell back={{ to: '/espace', label: 'Retour à mon espace' }} genre={genre} palette={palette}>
      <div style={{ marginTop: 18 }}>
        <p style={{ margin: 0, fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: DC.gold, fontWeight: 700 }}>
          {status?.paliers.unlocked ? 'Débloqué · gratuit, ta récompense' : 'Ta récompense'}
        </p>
        <h1 style={h1}>Écris au vrai Dr Lô</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14.5, color: DC.muted, lineHeight: 1.5 }}>Il te répond lui-même, par écrit, sous 7 jours.</p>
      </div>

      {!status && !error && <p style={{ color: DC.faint, marginTop: 20 }}>…</p>}
      {error && <p role="alert" style={{ marginTop: 14, color: '#F09A7A', fontSize: 14 }}>{error}</p>}

      {/* Réponses */}
      {answered.map(q => (
        <section key={q.id} style={{ ...card, marginTop: 14, borderColor: 'rgba(127,209,160,.35)', background: 'rgba(127,209,160,.06)' }}>
          <p style={{ margin: 0, fontSize: 12, color: DC.faint }}>Ta question du {fmt(q.createdAt)}</p>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: DC.muted, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>« {q.text} »</p>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 12 }}>
            <img src="/dr-lo.png" alt="Dr Lô" width={32} height={32} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `2px solid ${palette.accent}`, flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: palette.accent }}>
                Dr Lô{q.status === 'referred' ? ' · orientation vers un confrère' : ''}{q.answer ? ` · ${fmt(q.answer.at)}` : ''}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 15, lineHeight: 1.55, color: DC.text, whiteSpace: 'pre-wrap' }}>{q.answer!.text}</p>
            </div>
          </div>
        </section>
      ))}

      {status && !status.paliers.unlocked && <PaliersCard status={status} palette={palette} withCta={false} />}

      {status && status.paliers.unlocked && (pending || sent) && (
        <section style={{ ...card, marginTop: 14 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Ta question est entre de bonnes mains.</p>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: DC.muted, lineHeight: 1.5 }}>Dr Lô te répond sous 7 jours. Tu la retrouveras ici, et je te le dirai sur l'accueil.</p>
          {pending && <p style={{ margin: '8px 0 0', fontSize: 13.5, color: DC.faint, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>« {pending.text} »</p>}
          {askNotif && currentUser && <NotifOptinCard uid={currentUser.id} palette={palette} reason="drlo_answer" onDone={() => {}} />}
        </section>
      )}

      {status && status.paliers.unlocked && !pending && !sent && status.ask.reason === 'wait' && (
        <section style={{ ...card, marginTop: 14 }}>
          <p style={{ margin: 0, fontSize: 14.5, color: DC.soft, lineHeight: 1.5 }}>Ta prochaine question gratuite sera possible le {fmt(status.ask.nextAt!)}. En attendant, Dr Lô reste là dans la conversation.</p>
        </section>
      )}

      {/* File d'attente par vagues */}
      {status && status.paliers.unlocked && status.ask.ok && !status.queue.canSubmit && (
        <section aria-label="Ta place" style={{ ...card, marginTop: 14, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 14.5, color: DC.soft, lineHeight: 1.5 }}>Pour bien répondre à chacun, Dr Lô ouvre un nombre limité de places chaque semaine.</p>
          {status.queue.inQueue ? (
            <>
              <p style={{ margin: '14px 0 0', fontSize: 12.5, color: DC.faint }}>Ta place dans la file</p>
              <p style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 40, fontWeight: 700, color: palette.accent }}>n° {status.queue.position}</p>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, color: DC.muted }}>Prochaine vague : {fmtDay(status.queue.nextWave)}</p>
            </>
          ) : (
            <button onClick={reserve} disabled={busy} className="drl-btn" style={{ marginTop: 12, minHeight: 48, padding: '0 20px', borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontWeight: 700, fontSize: 14.5, cursor: 'pointer' }}>
              Réserver ma place
            </button>
          )}
          <div style={{ marginTop: 16, textAlign: 'left', borderTop: `1px solid ${DC.line}`, paddingTop: 14 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Passe devant : invite {status.referral.goal} proches</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: DC.muted, lineHeight: 1.5 }}>Chaque proche qui fait son premier test compte. À {status.referral.goal}, tu passes en tête de la prochaine vague.</p>
            <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 700, color: palette.accent }}>{Math.min(status.referral.count, status.referral.goal)} proche{status.referral.count > 1 ? 's' : ''} sur {status.referral.goal}</p>
            <button onClick={shareInvite} className="drl-btn" style={{ marginTop: 10, minHeight: 44, padding: '0 16px', borderRadius: 999, border: '1px solid rgba(37,211,102,.5)', background: 'rgba(37,211,102,.12)', color: DC.text, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Share2 size={16} aria-hidden="true" /> Inviter sur WhatsApp
            </button>
          </div>
          <p style={{ margin: '14px 0 0', fontSize: 12.5, color: DC.faint, lineHeight: 1.5 }}>
            En attendant, tout reste ouvert : les tests, la conversation avec Dr Lô, ton journal.
            Si tu ne vas pas bien en ce moment, n'attends pas : <a href="tel:1515" style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Phone size={12} aria-hidden="true" /> 1515</a>.
          </p>
        </section>
      )}

      {/* Formulaire */}
      {status && status.paliers.unlocked && status.ask.ok && status.queue.canSubmit && !sent && (
        <form onSubmit={submit} style={{ ...card, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label htmlFor="drlo-q" style={{ fontSize: 14, fontWeight: 700 }}>Ta question</label>
          <textarea id="drlo-q" rows={6} maxLength={1500} value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
            placeholder="Écris ce que tu veux lui demander, avec tes mots…" className="drl-input"
            style={{ marginTop: -6, borderRadius: 16, border: `1.5px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '12px 14px', fontFamily: 'inherit', fontSize: 16, lineHeight: 1.5, color: DC.text, outline: 'none', resize: 'vertical' }} />

          <label style={label}>
            <input type="checkbox" checked={form.anonymous} onChange={e => setForm(f => ({ ...f, anonymous: e.target.checked }))} style={{ width: 20, height: 20, accentColor: palette.accent, flexShrink: 0 }} />
            <span><b>Rester anonyme</b><br /><span style={{ color: DC.faint, fontSize: 12.5 }}>{form.anonymous ? 'Ta question arrive sans ton prénom.' : 'Dr Lô verra ton prénom.'}</span></span>
          </label>

          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Ce que Dr Lô peut voir de ton profil</legend>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SHARE.map(o => (
                <label key={o.value} style={{ ...label, borderRadius: 14, padding: '10px 12px', border: `1px solid ${form.share === o.value ? palette.accent : DC.line}`, background: form.share === o.value ? 'rgba(242,182,109,.08)' : 'transparent' }}>
                  <input type="radio" name="share" checked={form.share === o.value} onChange={() => setForm(f => ({ ...f, share: o.value }))} style={{ width: 18, height: 18, accentColor: palette.accent, flexShrink: 0, marginTop: 2 }} />
                  <span><b>{o.label}</b><br /><span style={{ color: DC.faint, fontSize: 12.5 }}>{o.desc}</span></span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12.5, color: DC.faint }}>Exclus par défaut</p>
            <label style={label}>
              <input type="checkbox" checked={form.includeIntime} disabled={form.share !== 'results'} onChange={e => setForm(f => ({ ...f, includeIntime: e.target.checked }))} style={{ width: 20, height: 20, accentColor: palette.accent, flexShrink: 0 }} />
              <span style={{ opacity: form.share !== 'results' ? 0.5 : 1 }}>Inclure ma vie intime</span>
            </label>
            <label style={{ ...label, marginTop: 8 }}>
              <input type="checkbox" checked={form.includeJournal} onChange={e => setForm(f => ({ ...f, includeJournal: e.target.checked }))} style={{ width: 20, height: 20, accentColor: palette.accent, flexShrink: 0 }} />
              <span>Inclure mon journal <span style={{ color: DC.faint, fontSize: 12.5 }}>(mes 5 derniers écrits)</span></span>
            </label>
          </div>

          <label style={{ ...label, fontSize: 13 }}>
            <input type="checkbox" checked={form.videoConsent} onChange={e => setForm(f => ({ ...f, videoConsent: e.target.checked }))} style={{ width: 20, height: 20, accentColor: palette.accent, flexShrink: 0 }} />
            <span>J'accepte que Dr Lô reprenne ma question anonymement dans une vidéo. Je peux changer d'avis avant la publication.</span>
          </label>

          <p style={{ margin: 0, fontSize: 12.5, color: DC.faint }}>Réponse sous 7 jours · places limitées chaque semaine ({status.cap}).</p>
          <button type="submit" disabled={busy || form.text.trim().length < 10} className="drl-btn"
            style={{ minHeight: 50, borderRadius: 14, border: 0, background: palette.primary, color: DC.ink, fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: busy || form.text.trim().length < 10 ? 0.55 : 1 }}>
            {busy ? 'Envoi…' : 'Envoyer ma question'}
          </button>
        </form>
      )}

      {footer}
    </DrLoShell>
  );
};

export default QuestionPage;
