/**
 * FAQ — les questions qu'on se pose vraiment sur Health-e (réécrite le 29 oct. 2026 :
 * l'ancienne parlait de téléconsultation et de rendez-vous, qui n'existent pas).
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import InfoShell, { CONTACT_EMAIL } from '../components/ui/InfoShell';
import { COLOR, RADIUS } from '../design/charte';

type QA = { q: string; a: React.ReactNode };
const GROUPS: { title: string; items: QA[] }[] = [
  {
    title: 'Health-e et Dr Lô',
    items: [
      { q: "C'est quoi, Health-e ?", a: <>Un espace pour mieux te comprendre : des tests de psychologie et de vie intime, un journal, ton humeur au fil des jours, et Dr Lô pour t'accompagner. C'est pensé pour le Sénégal et l'Afrique francophone.</> },
      { q: 'Dr Lô, c\'est une vraie personne ?', a: <>Il y a deux Dr Lô. <b>Le Dr Lô de la conversation</b> (le dessin) est une intelligence artificielle : il connaît tes résultats et t'aide à les comprendre. <b>Le vrai Dr Lô</b> (la photo) est un médecin : il publie dans les chaînes et répond lui-même aux questions qu'on lui écrit. Sa photo apparaît seulement quand c'est vraiment lui.</> },
      { q: 'Est-ce que ça remplace un médecin ou un psy ?', a: <>Non. Les tests et Dr Lô t'aident à mettre des mots sur ce que tu vis, ils ne posent pas de diagnostic. Quand un résultat le demande, Dr Lô t'oriente vers un professionnel.</> },
      { q: "Et si ça va vraiment mal, maintenant ?", a: <>Appelle le <b>1515</b> (SAMU), à toute heure. Health-e n'est pas un service d'urgence : personne ne surveille les messages en direct.</> },
    ],
  },
  {
    title: 'Les tests',
    items: [
      { q: "D'où viennent les tests ?", a: <>Ce sont des questionnaires validés par la recherche (anxiété, humeur, estime de soi, attachement, désir…), reformulés pour qu'on les comprenne bien ici. Chaque test donne un score, ce qu'il veut dire et des conseils.</> },
      { q: 'Combien de temps ça prend ?', a: <>Quelques minutes par test, à ton rythme.</> },
      { q: 'Mon totem, comment je le débloque ?', a: <>Après tes 7 tests psychologiques de base. Ton totem (un animal sur 12) résume ton tempérament, avec 7 jauges. Il évolue quand tu refais des tests.</> },
      { q: 'Pourquoi certains tests sont grisés ou absents ?', a: <>Certains tests ne concernent que les personnes en couple, ou sont faits pour un genre en particulier. On les montre selon la situation que tu as indiquée.</> },
    ],
  },
  {
    title: 'Confidentialité',
    items: [
      { q: 'Qui peut voir mes résultats ?', a: <>Toi. Ils sont liés à ton compte et ne sont jamais publiés. Ce que tu partages (carte de totem, carte de résultat) ne montre jamais ta vie intime.</> },
      { q: 'Et quand j\'écris au vrai Dr Lô ?', a: <>Tu choisis : en anonyme ou avec ton prénom, et ce que tu lui montres de ton profil. Il ne reprend ta question dans une vidéo que si tu l'as accepté, toujours anonymement.</> },
      { q: 'Comment supprimer mes données ?', a: <>Tu peux effacer tes résultats toi-même dans <Link to="/assessment/profile" style={{ color: COLOR.action }}>Mon profil</Link>. Pour supprimer tout ton compte, écris à <b>{CONTACT_EMAIL}</b>. Le détail est dans la <Link to="/confidentialite" style={{ color: COLOR.action }}>politique de confidentialité</Link>.</> },
    ],
  },
  {
    title: 'Étincelles et paiement',
    items: [
      { q: "C'est gratuit ?", a: <>Créer ton espace, faire les tests et lire tes résultats, c'est gratuit. Certaines fonctions de Dr Lô IA (conversation, analyses, compatibilité, programme) utilisent des étincelles. Tu en reçois 25 à l'inscription.</> },
      { q: 'Comment acheter des étincelles ?', a: <>Dans <Link to="/acheter-koris" style={{ color: COLOR.action }}>Recharger mes étincelles</Link> : tu choisis une formule et tu paies par Wave ou Orange Money. Le paiement passe par PayTech : Health-e ne voit jamais tes codes ni tes informations de paiement.</> },
      { q: 'Écrire au vrai Dr Lô, ça coûte ?', a: <>Non. C'est une récompense gratuite, qui se débloque en quelques étapes dans ton espace. Il répond sous 7 jours.</> },
    ],
  },
];

const Item: React.FC<{ qa: QA }> = ({ qa }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: `1px solid ${COLOR.line}` }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="drl-btn"
        style={{ width: '100%', minHeight: 56, padding: '14px 0', display: 'flex', alignItems: 'center', gap: 12, border: 0, background: 'transparent', color: COLOR.text, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>
        <span style={{ flex: 1 }}>{qa.q}</span>
        <ChevronDown size={18} color={COLOR.faint} aria-hidden="true" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {open && <div style={{ padding: '0 0 16px', fontSize: 15, lineHeight: 1.65, color: COLOR.soft, maxWidth: '65ch' }}>{qa.a}</div>}
    </div>
  );
};

const FAQ: React.FC = () => (
  <InfoShell eyebrow="Aide" title="Questions fréquentes" intro="Ce qu'on nous demande le plus souvent. Tu ne trouves pas ? Écris-nous, on répond.">
    {GROUPS.map(g => (
      <section key={g.title} style={{ borderRadius: RADIUS.card, border: `1px solid ${COLOR.line}`, background: COLOR.glass, padding: '16px 18px 4px' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: COLOR.faint }}>{g.title}</h2>
        {g.items.map(qa => <Item key={qa.q} qa={qa} />)}
      </section>
    ))}
    <p style={{ margin: '8px 0 0', fontSize: 15, color: COLOR.muted, textAlign: 'center' }}>
      Une autre question ? <Link to="/contact" style={{ color: COLOR.action, fontWeight: 700 }}>Nous contacter</Link>
    </p>
  </InfoShell>
);

export default FAQ;
