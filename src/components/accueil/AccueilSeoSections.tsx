/**
 * AccueilSeoSections — Contenu indexable sous la conversation d'accueil.
 * ~45 % de l'acquisition vient de Google : la page d'accueil doit garder du texte
 * (présentation, liste des évaluations, confidentialité, FAQ), pas seulement un chat.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, ClipboardList, Sparkles, Lock, ChevronDown, Brain, Heart, Flame } from 'lucide-react';
import { MENTAL_HEALTH_SCALES, SEXUAL_HEALTH_SCALES, BONUS_SCALES } from '../../data/scales';
import { getScaleMeta } from '../../utils/scaleMeta';

const STEPS = [
  { icon: MessageCircle, title: 'Tu parles à Dr Lô', text: 'Dis-lui comment tu vas et ce qui t\'amène. Pas de formulaire : une conversation.' },
  { icon: ClipboardList, title: 'Il te propose le bon test', text: 'Anxiété, humeur, personnalité, couple… Des outils reconnus en psychologie, adaptés au contexte africain.' },
  { icon: Sparkles, title: 'Ton portrait se dessine', text: 'À chaque test, Dr Lô t\'explique ton résultat et ajoute une pièce à ton portrait : jusqu\'à ton animal-totem.' },
];

const FAQ = [
  { q: 'Health-e, c\'est gratuit ?', a: 'Oui pour commencer : la conversation avec Dr Lô est gratuite et tu peux faire 3 tests sans créer de compte. Certaines fonctions avancées utilisent des étincelles, les crédits du site.' },
  { q: 'Dr Lô est-il un vrai médecin ?', a: 'Dr Lô est un compagnon de bien-être conçu par un médecin sénégalais. Il ne pose pas de diagnostic et ne remplace pas une consultation : il t\'aide à mieux te comprendre et t\'oriente vers un professionnel quand c\'est nécessaire.' },
  { q: 'Mes réponses sont-elles confidentielles ?', a: 'Sans compte, tes réponses restent dans ton navigateur. Avec un compte, elles sont enregistrées dans ton profil pour que tu les retrouves sur tous tes appareils.' },
  { q: 'Les tests sont-ils fiables ?', a: 'Ils s\'appuient sur des échelles utilisées en psychologie (anxiété, humeur, personnalité, attachement…), reformulées pour notre contexte. Ce sont des repères pour mieux te connaître, pas des diagnostics.' },
  { q: 'À qui s\'adresse Health-e ?', a: 'Aux adultes (18 ans et plus) qui veulent comprendre leurs émotions, leur personnalité, leur couple ou leur vie intime, au Sénégal et dans toute l\'Afrique francophone.' },
];

const COUPLE_IDS = ['ecr_r', 'social_pressure', 'bonus_jalousie', 'bonus_dependance', 'griss_base', 'pair'];

const Group: React.FC<{ title: string; hint: string; icon: React.ElementType; ids: string[] }> = ({ title, hint, icon: Icon, ids }) => (
  <details className="group rounded-card border border-white/[0.12] bg-white/[0.05] px-4 py-3">
    <summary className="flex cursor-pointer list-none items-center gap-3">
      <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F2B66D]/15"><Icon size={22} className="text-[#F2B66D]" /></span>
      <span className="flex-1">
        <span className="block font-display text-[15px] font-bold text-[#F4EEE4]">{title} <span className="font-normal text-[13px] text-[#A79E90]">· {ids.length} tests</span></span>
        <span className="block text-[12.5px] leading-snug text-[#CFC6B8]">{hint}</span>
      </span>
      <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-[#A79E90] transition-transform group-open:rotate-180" />
    </summary>
    <ul className="m-0 mt-3 list-none grid grid-cols-1 gap-x-4 gap-y-2 p-0 sm:grid-cols-2">
      {ids.map(id => {
        const m = getScaleMeta(id);
        return (
          <li key={id} className="text-[13px] leading-snug">
            <Link to={`/assessment/test/${id}`} className="font-semibold text-[#F4EEE4] no-underline hover:text-[#F2B66D]">{m.label}</Link>
            {m.description && <span className="block text-[12px] text-[#A79E90]">{m.description}</span>}
          </li>
        );
      })}
    </ul>
  </details>
);

const AccueilSeoSections: React.FC = () => (
  <div className="w-full max-w-3xl mx-auto mt-14 px-5 text-left flex flex-col gap-14">
    <section>
      <p className="m-0 mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#A79E90]">Health-e · santé mentale & vie intime</p>
      <h2 className="font-display m-0 mb-6 text-[clamp(1.4rem,4vw,2rem)] font-bold leading-tight text-[#FBF5EA]">
        Comprends ce que tu ressens, <span className="text-[#F2B66D]">en parlant avec Dr Lô.</span>
      </h2>
      <h2 className="font-display text-2xl font-bold text-[#F4EEE4] mb-5">Comment ça marche</h2>
      <ol className="m-0 p-0 list-none grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="rounded-card border border-white/[0.12] bg-white/[0.05] p-4">
            <s.icon size={20} className="text-[#F2B66D]" />
            <p className="m-0 mt-2 text-sm font-bold text-[#F4EEE4]">{i + 1}. {s.title}</p>
            <p className="m-0 mt-1 text-[13px] text-[#CFC6B8] leading-snug">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>

    <section>
      <h2 className="font-display text-2xl font-bold text-[#F4EEE4] mb-5">Les évaluations Health-e</h2>
      <div className="flex flex-col gap-3">
        <Group title="Mon mental" hint="Anxiété, humeur, stress, estime de soi, personnalité, deuil…" icon={Brain}
          ids={MENTAL_HEALTH_SCALES.map(s => s.id).filter(id => !COUPLE_IDS.includes(id))} />
        <Group title="Mon couple" hint="Attachement, jalousie, dépendance affective, satisfaction et intimité de couple." icon={Heart}
          ids={COUPLE_IDS} />
        <Group title="Ma vie intime" hint="Désir, satisfaction, fonctionnement sexuel, communication, image de soi." icon={Flame}
          ids={SEXUAL_HEALTH_SCALES.map(s => s.id).filter(id => !COUPLE_IDS.includes(id))} />
        <Group title="Tests fun" hint="TDAH, hypersensibilité, haut potentiel, burnout, intelligence émotionnelle…" icon={Sparkles}
          ids={BONUS_SCALES.map(s => s.id).filter(id => !COUPLE_IDS.includes(id))} />
      </div>
    </section>

    <section className="rounded-block border border-white/[0.12] bg-white/[0.05] p-5">
      <h2 className="font-display text-xl font-bold text-[#F4EEE4] m-0 flex items-center gap-2"><Lock size={18} className="text-[#9DBFAF]" /> Confidentialité</h2>
      <p className="m-0 mt-2 text-[14px] text-[#CFC6B8] leading-relaxed">
        Santé mentale et vie intime sont des sujets sensibles. Sans compte, tes réponses restent sur ton téléphone.
        Ton totem et ta compatibilité se partagent sans jamais exposer ce qui est intime.{' '}
        <Link to="/confidentialite" className="text-[#F2B66D] font-semibold">Notre politique de confidentialité</Link>
      </p>
    </section>

    <section>
      <h2 className="font-display text-2xl font-bold text-[#F4EEE4] mb-4">Questions fréquentes</h2>
      <div className="flex flex-col gap-2">
        {FAQ.map(f => (
          <details key={f.q} className="rounded-card border border-white/[0.12] bg-white/[0.05] px-4 py-3">
            <summary className="cursor-pointer text-[14px] font-bold text-[#F4EEE4]">{f.q}</summary>
            <p className="m-0 mt-2 text-[13.5px] text-[#CFC6B8] leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-3 text-sm"><Link to="/faq" className="text-[#F2B66D] font-semibold">Toutes les questions</Link></p>
    </section>
  </div>
);

export default AccueilSeoSections;
