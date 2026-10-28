/**
 * MonJournalPage — « Mon journal » (/journal), une vraie page, sans passer par la discussion avec Dr Lô IA.
 * En haut : l'humeur des 7 derniers jours et le nombre de pages. Puis le journal lui-même (rangé par jour,
 * recherche, carnets) et l'onglet « Écrire » — le même que dans « Me confier », donc les mêmes données.
 * Dr Lô ne donne son avis que si on le lui demande. Tout reste privé.
 */
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import ConfierPanel from '../../components/accueil/ConfierPanel';
import MoodIcon from '../../components/accueil/MoodIcon';
import { useAuth } from '../../contexts/AuthContext';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import { dayKey, moodById, type MoodMap } from '../../utils/moodLog';
import { fetchMoods } from '../../services/moodService';
import { listJournal } from '../../services/confierService';
import { addDays } from '../../utils/cycleCalc';

const SHORT = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const MonJournalPage: React.FC = () => {
  const palette = usePalette();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const uid = isAuthenticated && currentUser ? currentUser.id : null;
  const genre = getOnboardingProfile()?.genre;
  const today = dayKey();
  const startView = (location.state as { write?: boolean } | null)?.write ? 'write' : 'journal';
  const [view, setView] = useState<'write' | 'journal'>(startView);
  const [moods, setMoods] = useState<MoodMap>({});
  const [pages, setPages] = useState<number | null>(null);

  useEffect(() => {
    let off = false;
    fetchMoods(uid, addDays(today, -8)).then(m => { if (!off) setMoods(m); }).catch(() => {});
    listJournal(uid, 200).then(l => { if (!off) setPages(l.length); }).catch(() => { if (!off) setPages(0); });
    return () => { off = true; };
  }, [uid, today, view]);

  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  return (
    <DrLoShell back={{ to: '/espace', label: 'Retour à mon espace' }} genre={genre} palette={palette}>
      <div style={{ marginTop: 18 }}>
        <h1 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 28, lineHeight: 1.2, fontWeight: 600, color: DC.title }}>Mon journal</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: DC.muted, lineHeight: 1.5 }}>
          Ce que tu écris ici n'est vu que par toi. Dr Lô ne donne son avis que si tu le lui demandes.
        </p>
      </div>

      <section aria-label="Ma semaine" style={{ ...card, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: DC.text }}>Ma semaine</p>
          <span style={{ fontSize: 12.5, color: DC.faint }}>{pages === null ? '' : pages === 0 ? 'Aucune page encore' : `${pages} page${pages > 1 ? 's' : ''} écrite${pages > 1 ? 's' : ''}`}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4, marginTop: 12 }}>
          {week.map(d => {
            const m = moods[d];
            const def = m ? moodById(m.mood) : null;
            const wd = new Date(`${d}T12:00:00`).getDay();
            return (
              <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11.5, color: d === today ? palette.accent : DC.faint, fontWeight: d === today ? 700 : 500 }}>{SHORT[wd]}</span>
                <span aria-label={def ? `${d} : ${def.label}` : `${d} : pas notée`} style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${def ? `${def.color}66` : DC.line}`, background: def ? `${def.color}1A` : 'transparent' }}>
                  {def ? <MoodIcon id={def.id} color={def.color} /> : <span style={{ width: 5, height: 5, borderRadius: '50%', background: DC.line }} />}
                </span>
              </div>
            );
          })}
        </div>
        <Link to="/humeur" className="drl-btn" style={{ marginTop: 12, minHeight: 40, display: 'flex', alignItems: 'center', gap: 6, color: palette.accent, fontSize: 13.5, fontWeight: 700, textDecoration: 'none' }}>
          Voir toute mon humeur <ChevronRight size={16} aria-hidden="true" />
        </Link>
      </section>

      <ConfierPanel
        userId={uid}
        genre={genre}
        onStatus={() => { /* pas d'avatar animé sur cette page */ }}
        onSignup={() => navigate('/', { state: { signup: true } })}
        view={view}
        onView={setView}
      />
    </DrLoShell>
  );
};

export default MonJournalPage;
