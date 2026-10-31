/**
 * BoitePage — /boite-a-questions : une question anonyme, sans compte, sans promesse de réponse.
 * Dr Lô lit tout ; il répond par écrit sur cette page ou dans une vidéo, quand il le peut.
 */
import React, { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import { RealDrLoPhoto } from '../../components/accueil/RealDrLoBadge';
import { getBoxAnswers, sendBoxQuestion, type BoxAnswer } from '../../services/boxService';
import { pageTitle } from './outilsShared';

const MAX = 500;

const BoitePage: React.FC = () => {
  const palette = usePalette();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<null | { support: boolean }>(null);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<BoxAnswer[]>([]);

  useEffect(() => { getBoxAnswers().then(setAnswers).catch(() => {}); }, []);

  const send = async () => {
    if (text.trim().length < 8) { setError('Écris au moins une phrase (8 caractères).'); return; }
    setBusy(true); setError('');
    try { setSent(await sendBoxQuestion(text)); setText(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  };

  return (
    <DrLoShell back={{ to: '/', label: 'Accueil' }} palette={palette}>
      <h1 style={pageTitle}>Une question ? Dépose-la.</h1>
      <p style={{ margin: '10px 0 0', fontSize: 15, color: DC.soft, lineHeight: 1.5 }}>Sans compte, sans nom. Dr Lô lit les questions et répond à certaines : ici par écrit, ou dans une vidéo. Il ne peut pas répondre à toutes.</p>

      {sent ? (
        <section style={{ ...card, marginTop: 18 }} aria-live="polite">
          <p style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: DC.title }}>C'est déposé. Merci.</p>
          <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.5, color: DC.soft }}>Reviens sur cette page : si Dr Lô répond ici, tu le verras plus bas.</p>
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

      {answers.length > 0 && (
        <>
          <h2 style={{ margin: '28px 0 10px', fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: DC.title }}>Les réponses de Dr Lô</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {answers.map(a => (
              <article key={a.id} style={card}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.45, color: DC.title }}>{a.question}</p>
                <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'flex-start' }}>
                  <RealDrLoPhoto size={36} palette={palette} />
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: DC.text, whiteSpace: 'pre-line' }}>{a.answer}</p>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </DrLoShell>
  );
};

export default BoitePage;
