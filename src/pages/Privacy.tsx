/**
 * Politique de confidentialité — réécrite le 29 oct. 2026 pour décrire le site tel qu'il est
 * (l'ancienne parlait de téléconsultation et affirmait qu'aucune donnée de santé n'était conservée, ce qui est faux).
 * À faire relire par un juriste avant de la considérer comme définitive.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import InfoShell, { CONTACT_EMAIL, InfoList, InfoSection, P } from '../components/ui/InfoShell';
import { COLOR } from '../design/charte';

const B: React.FC<{ children: React.ReactNode }> = ({ children }) => <b style={{ color: COLOR.title }}>{children}</b>;

const Privacy: React.FC = () => (
  <InfoShell eyebrow="Confidentialité" title="Tes données sur Health-e" updated="29 octobre 2026"
    intro="Ce que tu confies ici est intime. Cette page dit, sans jargon, ce que nous gardons, pourquoi, qui peut le voir et comment tout effacer.">

    <InfoSection title="L'essentiel">
      <InfoList items={[
        <>Tes résultats, ton journal et tes conversations sont liés à ton compte. <B>Ils ne sont jamais publiés ni vendus</B>, et il n'y a pas de publicité sur Health-e.</>,
        <>Ce que tu partages toi-même (carte de totem, carte de résultat) <B>ne montre jamais ta vie intime</B>.</>,
        <>Pour te répondre, Dr Lô IA envoie ce qui est nécessaire à un service d'intelligence artificielle (détails plus bas).</>,
        <>Tu peux effacer tes résultats toi-même, et demander la suppression de tout ton compte à <B>{CONTACT_EMAIL}</B>.</>,
      ]} />
    </InfoSection>

    <InfoSection title="Ce que nous gardons">
      <InfoList items={[
        <><B>Ton compte</B> : prénom, adresse e-mail. Le mot de passe est géré par Google (Firebase Authentication) : nous ne le voyons jamais.</>,
        <><B>Ta situation</B>, que tu indiques au début : tranche d'âge, genre, situation de couple, et quelques repères (enfants, deuil, événement difficile) qui servent à te proposer les bons tests.</>,
        <><B>Tes tests</B> : tes réponses, tes scores et leurs interprétations, y compris pour la vie intime. Ce sont des données de santé : nous les traitons comme telles.</>,
        <><B>Ce que tu écris ou enregistres</B> : ton journal, ton humeur, tes conversations avec Dr Lô IA, ce qu'il retient de toi pour s'en souvenir, tes questions au vrai Dr Lô, tes commentaires et vocaux dans les chaînes, tes défis.</>,
        <><B>Tes achats d'étincelles</B> : la formule, le montant, la date et la référence du paiement. Le paiement passe par PayTech (Wave, Orange Money) : nous ne recevons ni ton code ni tes informations bancaires.</>,
        <><B>Des informations techniques</B> : des statistiques d'utilisation (pages ouvertes, boutons touchés, jamais le contenu de ce que tu écris) et, si tu actives les rappels, l'identifiant de notification de ton téléphone.</>,
      ]} />
    </InfoSection>

    <InfoSection title="Pourquoi">
      <InfoList items={[
        'Te donner tes résultats, ton totem, ton profil et ton historique.',
        'Permettre à Dr Lô IA de te répondre en tenant compte de ce qu\'il sait de toi.',
        'Calculer une compatibilité quand toi et l\'autre personne l\'avez demandé.',
        'Gérer tes étincelles et tes paiements.',
        'T\'envoyer les rappels que tu as choisis.',
        'Protéger la communauté : filtrer les insultes dans les commentaires et repérer les messages de détresse pour orienter vers de l\'aide.',
        'Améliorer le site, à partir de statistiques qui ne contiennent pas tes textes.',
      ]} />
    </InfoSection>

    <InfoSection title="Dr Lô IA et l'intelligence artificielle">
      <P>Dr Lô IA fonctionne avec Claude, un modèle d'intelligence artificielle de la société Anthropic. Quand tu lui parles ou demandes une analyse, nous lui envoyons ton message et les éléments utiles de ton profil (prénom, résultats, ce qu'il retient de toi). D'après les conditions d'Anthropic, ces données ne servent pas à entraîner ses modèles.</P>
      <P>Dr Lô IA ne pose pas de diagnostic. Ses réponses peuvent se tromper : pour toute décision de santé, parle à un professionnel.</P>
    </InfoSection>

    <InfoSection title="Qui peut voir quoi">
      <InfoList items={[
        <><B>Toi</B> : tout ce qui est dans ton espace.</>,
        <><B>Le vrai Dr Lô</B> : seulement ce que tu lui envoies (ta question, et les parties de ton profil que tu choisis de lui montrer) et ce que tu publies dans les chaînes. Tu peux lui écrire anonymement. Il ne reprend ta question dans une vidéo que si tu l'as accepté, toujours anonymement.</>,
        <><B>Les membres d'une chaîne</B> : tes commentaires, signés comme tu le choisis (anonyme, pseudo ou prénom).</>,
        <><B>La personne avec qui tu fais un test de compatibilité</B> : le résultat de la comparaison, pas tes réponses aux tests.</>,
        <><B>Nos prestataires techniques</B>, uniquement pour faire fonctionner le service : Google Firebase (comptes et base de données), Netlify (hébergement du site), Anthropic (Dr Lô IA), PayTech (paiements). Leurs serveurs peuvent se trouver hors du Sénégal.</>,
      ]} />
      <P>Nous ne vendons ni ne louons aucune donnée, et nous n'en donnons à personne d'autre, sauf obligation légale.</P>
    </InfoSection>

    <InfoSection title="Combien de temps">
      <P>Tes données restent tant que ton compte existe. Tu peux à tout moment :</P>
      <InfoList items={[
        <>effacer tous tes résultats et analyses dans <Link to="/assessment/profile" style={{ color: COLOR.action }}>Mon profil</Link> (« Réinitialiser mon profil ») ;</>,
        <>effacer ce que Dr Lô retient de toi, depuis <Link to="/espace" style={{ color: COLOR.action }}>Mon espace</Link> ;</>,
        <>modifier ou supprimer une page de ton journal ;</>,
        <>demander la suppression complète de ton compte à <B>{CONTACT_EMAIL}</B> : nous la faisons dans un délai d'un mois au plus et te le confirmons.</>,
      ]} />
    </InfoSection>

    <InfoSection title="Sécurité">
      <P>Les échanges sont chiffrés (HTTPS). Tes données ne sont accessibles qu'avec ton compte, et des règles d'accès empêchent un autre compte de les lire. Aucun système n'est infaillible : si un incident touchait tes données, nous te préviendrions.</P>
    </InfoSection>

    <InfoSection title="Tes droits">
      <P>Selon la loi sénégalaise n° 2008-12 du 25 janvier 2008 sur la protection des données à caractère personnel, tu peux demander à accéder à tes données, à les corriger, à les supprimer, ou t'opposer à leur utilisation. Écris à <B>{CONTACT_EMAIL}</B>.</P>
      <P>Si tu n'es pas satisfait de notre réponse, tu peux saisir la Commission de Protection des Données Personnelles (CDP) du Sénégal.</P>
    </InfoSection>

    <InfoSection title="Âge">
      <P>Health-e est réservé aux personnes de 18 ans et plus.</P>
    </InfoSection>

    <InfoSection title="Changements">
      <P>Si cette politique change de façon importante, nous te le dirons sur le site avant que le changement s'applique. La date en haut de la page indique la dernière mise à jour.</P>
    </InfoSection>
  </InfoShell>
);

export default Privacy;
