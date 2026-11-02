/**
 * InfosPage — /mes-informations : « Mes informations ». La personne voit et corrige ce que le site sait d'elle
 * (prénom, genre, tranche d'âge, situation). Tout est facultatif sauf le prénom ; rien n'est partagé avec les autres.
 * Enregistré sur l'appareil et, avec un compte, sur le compte (pour les retrouver sur tous les appareils).
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, LogOut, Lock } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import { useAuth } from '../../contexts/AuthContext';
import { getOnboardingProfile, saveOnboardingProfile } from '../../utils/onboardingProfile';
import { saveOnboardingToProfile } from '../../services/evaluationService';
import type { AgeRange, DeuilVecu, EvenementDifficile, Genre, OnboardingProfile, SituationEnfants, SituationMariage, SituationRelationnelle } from '../../types/onboarding';

type Form = { prenom: string; genre: Genre | ''; age: AgeRange | ''; situation_relationnelle: SituationRelationnelle | ''; deuil: DeuilVecu | ''; evenement_traumatisant: EvenementDifficile | ''; situation_mariage: SituationMariage | ''; enfants: SituationEnfants | '' };
const EMPTY: Form = { prenom: '', genre: '', age: '', situation_relationnelle: '', deuil: '', evenement_traumatisant: '', situation_mariage: '', enfants: '' };

const AGES: AgeRange[] = ['18-25', '26-35', '36-45', '46-55', '55+'];
const situations = (g: Genre | ''): { v: SituationRelationnelle; l: string }[] => {
  const f = g === 'femme';
  return [
    { v: 'celibataire', l: 'Célibataire' }, { v: 'en_couple', l: 'En couple' }, { v: 'marie', l: f ? 'Mariée' : 'Marié' },
    { v: 'polygamie', l: 'Dans une union polygame' }, { v: 'separe_divorce', l: f ? 'Séparée ou divorcée' : 'Séparé ou divorcé' },
    { v: 'veuf', l: f ? 'Veuve' : 'Veuf' }, { v: 'complique', l: 'C\'est compliqué' },
  ];
};
const DEUIL: { v: DeuilVecu; l: string }[] = [{ v: 'recent', l: 'Oui, récemment' }, { v: 'ancien', l: 'Oui, il y a un moment' }, { v: 'non', l: 'Non' }];
const EVENT: { v: EvenementDifficile; l: string }[] = [{ v: 'oui', l: 'Oui' }, { v: 'non', l: 'Non' }, { v: 'np', l: 'Je préfère ne pas dire' }];
const MARIAGE: { v: SituationMariage; l: string }[] = [{ v: 'actuellement', l: 'Oui, actuellement' }, { v: 'plus_maintenant', l: 'Plus maintenant' }, { v: 'jamais', l: 'Jamais' }];
const ENFANTS: { v: SituationEnfants; l: string }[] = [{ v: 'oui', l: 'Oui' }, { v: 'non', l: 'Non' }, { v: 'perte', l: 'J\'ai perdu un enfant' }];

const fromProfile = (p: Partial<OnboardingProfile> | null): Form => ({ ...EMPTY, ...(p ? Object.fromEntries(Object.entries(p).filter(([k]) => k in EMPTY)) : {}) } as Form);

const h1: React.CSSProperties = { margin: '6px 0 0', fontFamily: 'Fraunces, serif', fontSize: 28, lineHeight: 1.2, fontWeight: 600, color: DC.title };
const h2: React.CSSProperties = { margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: DC.text };

const InfosPage: React.FC = () => {
  const palette = usePalette();
  const navigate = useNavigate();
  const { isAuthenticated, authReady, currentUser, logout } = useAuth();
  const [initial] = useState<Form>(() => fromProfile(getOnboardingProfile()));
  const [f, setF] = useState<Form>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (authReady && !isAuthenticated) navigate(`/patient/access?returnTo=${encodeURIComponent('/mes-informations')}`, { replace: true }); }, [authReady, isAuthenticated, navigate]);
  if (!authReady || !isAuthenticated) return null;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setF(x => ({ ...x, [k]: x[k] === v && k !== 'prenom' ? '' : v })); setSaved(false); setError(''); };
  const dirty = JSON.stringify(f) !== JSON.stringify(initial) && !saved;

  const save = async () => {
    const prenom = f.prenom.trim();
    if (prenom.length < 1 || prenom.length > 20 || !/^[\p{L}\p{N} .'-]+$/u.test(prenom)) { setError('Écris ton prénom (20 caractères maximum, lettres et chiffres).'); return; }
    setBusy(true); setError('');
    try {
      const existing = (getOnboardingProfile() ?? {}) as Partial<OnboardingProfile> & { partial?: boolean };
      const merged: Record<string, unknown> = { ...existing, ...Object.fromEntries(Object.entries({ ...f, prenom }).filter(([, v]) => v !== '')) };
      for (const k of Object.keys(EMPTY)) if ((f as Record<string, string>)[k] === '' && k !== 'prenom') delete merged[k]; // une réponse retirée est vraiment retirée
      const complete = (Object.keys(EMPTY) as (keyof Form)[]).every(k => !!merged[k]);
      if (complete) { delete merged.partial; merged.completedAt = existing.completedAt ?? new Date().toISOString(); } else merged.partial = true;
      saveOnboardingProfile(merged as unknown as OnboardingProfile);
      if (currentUser) await saveOnboardingToProfile(currentUser.id, merged as Record<string, string>);
      setSaved(true);
    } catch { setError('Ça n\'a pas pu être enregistré sur ton compte. Réessaie dans un instant.'); }
    finally { setBusy(false); }
  };

  const chips = <T extends string>(label: string, key: keyof Form, opts: { v: T; l: string }[], hint?: string) => (
    <section aria-label={label} style={{ ...card, marginTop: 12 }}>
      <h2 style={h2}>{label}</h2>
      <div role="radiogroup" aria-label={label} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {opts.map(o => {
          const on = f[key] === o.v;
          return (
            <button key={o.v} type="button" role="radio" aria-checked={on} onClick={() => set(key, o.v as Form[typeof key])} className="drl-btn"
              style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, cursor: 'pointer', fontSize: 15, fontWeight: 600, border: `1px solid ${on ? palette.accent : DC.line}`, background: on ? 'rgba(242,182,109,.16)' : DC.glass, color: on ? palette.accent : DC.text }}>
              {o.l}
            </button>
          );
        })}
      </div>
      {hint && <p style={{ margin: '10px 0 0', fontSize: 13, color: DC.faint, lineHeight: 1.5 }}>{hint}</p>}
    </section>
  );

  return (
    <DrLoShell palette={palette} genre={f.genre || undefined} back={{ to: '/espace', label: 'Retour à Mon espace' }}>
      <h1 style={h1}>Mes informations</h1>
      <p style={{ margin: '10px 0 0', fontSize: 15, color: DC.soft, lineHeight: 1.5 }}>
        Ce que le site sait de toi, pour adapter les questions et les conseils. Tu peux tout corriger quand tu veux. Rien de tout ça n'est visible par les autres.
      </p>

      <section aria-label="Ton prénom" style={{ ...card, marginTop: 14 }}>
        <h2 style={h2}>Ton prénom</h2>
        <input value={f.prenom} maxLength={20} onChange={e => set('prenom', e.target.value)} autoComplete="given-name" aria-label="Prénom" className="drl-input" placeholder="Ton prénom ou un surnom"
          style={{ width: '100%', boxSizing: 'border-box', minHeight: 48, borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '0 14px', fontFamily: 'inherit', fontSize: 16, color: DC.text, outline: 'none' }} />
      </section>

      {chips('Ton genre', 'genre', [{ v: 'homme' as Genre, l: 'Homme' }, { v: 'femme' as Genre, l: 'Femme' }], 'Il adapte les questions, certains tests et la façon dont ton compagnon s\'adresse à toi.')}
      {chips('Ta tranche d\'âge', 'age', AGES.map(a => ({ v: a, l: a === '55+' ? '55 ans et plus' : `${a.replace('-', ' à ')} ans` })), 'On ne garde jamais ta date de naissance.')}
      {chips('Ta situation', 'situation_relationnelle', situations(f.genre))}
      {chips('As-tu vécu un deuil ?', 'deuil', DEUIL, 'Le test sur le deuil ne te sera proposé que si c\'est le cas.')}
      {chips('As-tu vécu un événement très difficile ?', 'evenement_traumatisant', EVENT, 'Le test sur le stress post-traumatique ne te sera proposé que si tu réponds oui.')}
      {chips(f.genre === 'femme' ? 'As-tu été mariée ?' : 'As-tu été marié ?', 'situation_mariage', MARIAGE)}
      {chips('As-tu des enfants ?', 'enfants', ENFANTS)}

      {error && <p role="alert" style={{ margin: '14px 0 0', color: '#F09A7A', fontSize: 14, lineHeight: 1.45 }}>{error}</p>}
      <button type="button" onClick={save} disabled={busy || !dirty} className="drl-btn"
        style={{ marginTop: 16, width: '100%', minHeight: 50, borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 16, fontWeight: 700, cursor: dirty ? 'pointer' : 'default', opacity: dirty || busy ? 1 : 0.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {busy ? <Loader2 size={18} className="animate-spin" aria-label="Enregistrement" /> : saved ? <><Check size={18} aria-hidden="true" /> Enregistré</> : 'Enregistrer'}
      </button>

      <section aria-label="Ton compte" style={{ ...card, marginTop: 22 }}>
        <h2 style={h2}>Ton compte</h2>
        {currentUser?.email && <p style={{ margin: 0, fontSize: 15, color: DC.soft, display: 'flex', alignItems: 'center', gap: 8, overflowWrap: 'anywhere' }}><Lock size={15} aria-hidden="true" style={{ flex: 'none' }} />{currentUser.email}</p>}
        <button type="button" onClick={async () => { await logout().catch(() => {}); navigate('/'); }} className="drl-btn"
          style={{ marginTop: 12, minHeight: 44, padding: '0 16px', borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <LogOut size={16} aria-hidden="true" /> Me déconnecter
        </button>
      </section>
    </DrLoShell>
  );
};

export default InfosPage;
