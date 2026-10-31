/**
 * Contact — réécrite le 29 oct. 2026 (l'ancienne affichait « +221 XX XXX XX XX » et une adresse e-mail inexistante).
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Mail, MessageCircle, Phone } from 'lucide-react';
import InfoShell, { CONTACT_EMAIL, InfoSection, P } from '../components/ui/InfoShell';
import Btn from '../components/ui/Btn';
import { COLOR } from '../design/charte';

const Contact: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(CONTACT_EMAIL); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { /* sélection manuelle */ }
  };
  return (
    <InfoShell eyebrow="Contact" title="Nous écrire" intro="Une question sur le site, un souci de paiement, une demande sur tes données : écris-nous, on répond par e-mail.">
      <InfoSection title="Par e-mail">
        <p style={{ margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 10, fontSize: 17, fontWeight: 700, color: COLOR.title, wordBreak: 'break-all' }}>
          <Mail size={18} color={COLOR.action} aria-hidden="true" style={{ flexShrink: 0 }} /> <span style={{ userSelect: 'all' }}>{CONTACT_EMAIL}</span>
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
          <Btn href={`mailto:${CONTACT_EMAIL}`} icon={<Mail size={16} aria-hidden="true" />}>Écrire un e-mail</Btn>
          <Btn variant="secondary" onClick={copy} icon={copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}>{copied ? 'Adresse copiée' : 'Copier l\'adresse'}</Btn>
        </div>
      </InfoSection>

      <InfoSection title="Une question personnelle pour Dr Lô ?">
        <P>Pour parler de ce que tu vis, passe plutôt par ton espace : le compagnon IA te répond tout de suite, et tu peux <Link to="/question" style={{ color: COLOR.action, fontWeight: 700 }}>écrire à Dr Lô</Link> une fois la récompense débloquée. Il répond lui-même sous 7 jours.</P>
        <div style={{ marginTop: 12 }}><Btn variant="secondary" to="/compagnon" icon={<MessageCircle size={16} aria-hidden="true" />}>Parler à mon compagnon</Btn></div>
      </InfoSection>

      <InfoSection title="En cas d'urgence">
        <P>Si tu es en danger ou que ça ne va vraiment pas, n'attends pas une réponse par e-mail : appelle le <b style={{ color: COLOR.title }}>1515</b> (SAMU), à toute heure.</P>
        <p style={{ margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 700, color: COLOR.title }}>
          <Phone size={18} color={COLOR.attention} aria-hidden="true" /> 1515
        </p>
      </InfoSection>
    </InfoShell>
  );
};

export default Contact;
