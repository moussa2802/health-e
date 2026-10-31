/**
 * Conditions d'utilisation — réécrites le 29 oct. 2026 pour le site tel qu'il est
 * (les anciennes décrivaient une plateforme de téléconsultation).
 * À faire relire par un juriste avant de les considérer comme définitives.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import InfoShell, { CONTACT_EMAIL, InfoList, InfoSection, P } from '../components/ui/InfoShell';
import { COLOR } from '../design/charte';

const B: React.FC<{ children: React.ReactNode }> = ({ children }) => <b style={{ color: COLOR.title }}>{children}</b>;

const Terms: React.FC = () => (
  <InfoShell eyebrow="Conditions" title="Conditions d'utilisation" updated="29 octobre 2026"
    intro="Les règles du jeu, en clair. En utilisant Health-e, tu les acceptes.">

    <InfoSection title="Ce qu'est Health-e">
      <P>Health-e (health-e.sn) t'aide à mieux te comprendre : tests de psychologie et de vie intime, animal intérieur, journal, suivi de l'humeur, test de compatibilité, défis entre proches, et un compagnon IA pour t'accompagner. Il y a <B>le compagnon IA</B>, une intelligence artificielle que tu peux nommer, et <B>Dr Lô</B>, médecin, qui publie dans les chaînes et répond lui-même aux questions qu'on lui écrit.</P>
    </InfoSection>

    <InfoSection title="Ce que Health-e n'est pas">
      <InfoList items={[
        <><B>Pas une consultation médicale.</B> Les tests et les réponses du compagnon IA ou de Dr Lô donnent des repères et des conseils de bien-être. Ils ne posent pas de diagnostic et ne prescrivent pas de traitement.</>,
        <><B>Pas un service d'urgence.</B> Personne ne surveille les messages en direct. En cas de danger, appelle le 1515 (SAMU).</>,
        <><B>Pas infaillible.</B> le compagnon IA peut se tromper. Pour une décision de santé, parle à un professionnel.</>,
      ]} />
    </InfoSection>

    <InfoSection title="Ton compte">
      <InfoList items={[
        'Health-e est réservé aux personnes de 18 ans et plus.',
        'Tu donnes des informations sincères : c\'est ce qui rend tes résultats utiles.',
        'Ton compte est personnel. Garde ton mot de passe pour toi.',
        'Tu peux arrêter quand tu veux et demander la suppression de ton compte.',
      ]} />
    </InfoSection>

    <InfoSection title="Les étincelles">
      <P>Certaines fonctions de le compagnon IA utilisent des étincelles (conversation, analyses, compatibilité, programme…). Le coût est affiché avant chaque utilisation. Tu en reçois à l'inscription et tu peux en acheter par Wave ou Orange Money, via notre prestataire de paiement PayTech.</P>
      <P>Les étincelles servent uniquement sur Health-e : elles ne s'échangent pas contre de l'argent et ne sont pas remboursables, sauf erreur de paiement ou problème technique de notre fait. Dans ce cas, écris à <B>{CONTACT_EMAIL}</B> avec la référence du paiement.</P>
    </InfoSection>

    <InfoSection title="Les chaînes, les commentaires et les défis">
      <P>Ce que tu publies (commentaires, vocaux, questions de défi) est lu par d'autres personnes. On y reste bienveillant :</P>
      <InfoList items={[
        'pas d\'insultes, de moqueries, de menaces ni de contenu sexuel explicite ;',
        'pas d\'informations qui permettent de reconnaître quelqu\'un sans son accord ;',
        'pas de publicité ni de liens vers d\'autres services.',
      ]} />
      <P>Nous pouvons masquer un contenu ou retirer l'accès à une chaîne ou au site en cas de non-respect de ces règles.</P>
    </InfoSection>

    <InfoSection title="Écrire à Dr Lô">
      <P>C'est gratuit, une fois la récompense débloquée. Il répond lui-même, sous 7 jours. Sa réponse reste un conseil de bien-être : si ta situation le demande, il t'oriente vers un confrère. Il ne reprend ta question dans une vidéo que si tu l'as accepté, toujours anonymement.</P>
    </InfoSection>

    <InfoSection title="Tes données">
      <P>Ce que nous gardons, pourquoi et comment l'effacer est expliqué dans la <Link to="/confidentialite" style={{ color: COLOR.action, fontWeight: 700 }}>politique de confidentialité</Link>.</P>
    </InfoSection>

    <InfoSection title="Propriété">
      <P>Les textes, tests adaptés, illustrations (animaux intérieurs), vocaux et le code du site appartiennent à Health-e. Tu peux partager tes cartes de résultat et d'animal intérieur ; le reste ne se copie pas sans notre accord. Ce que tu écris reste à toi : tu nous autorises seulement à l'utiliser pour faire fonctionner le service.</P>
    </InfoSection>

    <InfoSection title="Responsabilité">
      <P>Nous faisons de notre mieux pour que le site fonctionne et que ses contenus soient justes, sans pouvoir garantir qu'il n'y aura jamais de panne ou d'erreur. Health-e ne peut pas être tenu responsable des décisions prises uniquement sur la base d'un test ou d'une réponse du compagnon IA ou de Dr Lô.</P>
    </InfoSection>

    <InfoSection title="Changements et droit applicable">
      <P>Si ces conditions changent de façon importante, nous te le dirons sur le site. Elles sont soumises au droit sénégalais. Pour toute question : <B>{CONTACT_EMAIL}</B>.</P>
    </InfoSection>
  </InfoShell>
);

export default Terms;
