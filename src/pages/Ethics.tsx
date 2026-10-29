/**
 * Notre éthique — réécrite le 29 oct. 2026 (l'ancienne décrivait des règles pour des professionnels de téléconsultation).
 * Les engagements qui guident Dr Lô IA, le vrai Dr Lô et la conception du site.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import InfoShell, { CONTACT_EMAIL, InfoSection, P } from '../components/ui/InfoShell';
import { COLOR } from '../design/charte';

const PRINCIPLES: { title: string; text: React.ReactNode }[] = [
  { title: 'On ne pose pas de diagnostic', text: 'Les tests donnent des repères, Dr Lô donne des conseils de bien-être. Quand un résultat ou un message montre qu\'il faut plus, on oriente vers un professionnel.' },
  { title: 'La sécurité passe avant tout', text: 'Quand un message laisse penser que quelqu\'un est en danger, Dr Lô IA le dit simplement, rappelle qu\'il faut une vraie personne maintenant, et affiche les numéros d\'urgence (SAMU : 1515). Les commentaires de détresse dans les chaînes sont signalés au vrai Dr Lô.' },
  { title: 'On dit qui parle', text: 'Le dessin, c\'est Dr Lô IA. La photo, c\'est le vrai Dr Lô. On ne fait jamais passer l\'IA pour un humain, ni l\'inverse.' },
  { title: 'Ta vie intime reste à toi', text: 'Elle n\'apparaît sur aucune carte partagée, et le vrai Dr Lô ne la voit que si tu choisis de la lui montrer.' },
  { title: 'Pas de manipulation', text: 'Pas de fausse urgence, pas de culpabilisation pour te faire revenir ou payer, pas de publicité. Le coût en étincelles est affiché avant chaque utilisation.' },
  { title: 'Franc et bienveillant', text: 'Dr Lô dit les choses comme elles sont, avec respect. Il peut recadrer quand c\'est utile, et reste doux quand ça fait mal.' },
  { title: 'Pensé pour ici', text: 'Les tests et les conseils tiennent compte de la réalité du Sénégal et de l\'Afrique francophone : la famille, la religion, la pression du mariage, l\'argent. Sans jugement.' },
];

const Ethics: React.FC = () => (
  <InfoShell eyebrow="Éthique" title="Nos engagements" intro="Parler de santé mentale et de sexualité demande de la confiance. Voici les règles que Dr Lô IA, le vrai Dr Lô et le site suivent.">
    {PRINCIPLES.map(p => (
      <InfoSection key={p.title} title={p.title}><P>{p.text}</P></InfoSection>
    ))}
    <InfoSection title="Un manquement ?">
      <P>Si une réponse de Dr Lô ou un contenu du site te semble aller contre ces engagements, dis-le-nous à <b style={{ color: COLOR.title }}>{CONTACT_EMAIL}</b>. Le détail sur tes données est dans la <Link to="/confidentialite" style={{ color: COLOR.action, fontWeight: 700 }}>politique de confidentialité</Link>.</P>
    </InfoSection>
  </InfoShell>
);

export default Ethics;
