/**
 * HomeProgramme — « Mon programme » sur l'accueil : ce qu'il reste à faire aujourd'hui, et le programme du jour
 * qui s'ouvre par-dessus l'accueil (on coche ici, sans changer de page). Quand la journée est validée, la carte disparaît.
 * Les actions qui passent par la conversation (bilan, nouveau test, arrêter, recommencer) ouvrent le Compagnon.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, ClipboardCheck } from 'lucide-react';
import { DC } from './DrLoShell';
import ProgrammePanel from './ProgrammePanel';
import { AXES } from '../../data/programmeLibrary';
import {
  bilanDue, dayNumber, hardStreak, isDone, pause as pauseProg, planFor, remainingToday, resume as resumeProg, retestInfo,
  setRoutine, setSleep, toggleCheck, toggleRoutine, type EngKey, type Programme, type SleepNote,
} from '../../utils/programme';
import { dayKey, moodReply, type MoodId, type MoodMap } from '../../utils/moodLog';
import { recordMood } from '../../services/moodService';
import { saveProgramme } from '../../services/programmeService';
import { addCarnet, saveConfidence } from '../../services/confierService';
import { KORIS_COSTS } from '../../services/korisService';
import { credits } from '../../config/creditName';
import { getScaleMeta } from '../../utils/scaleMeta';
import { trackAccueil } from '../../utils/accueilTracking';
import type { MomentPalette } from '../../utils/drloMoment';

const PROGRAMME_CARNET = 'Programme';

interface Props {
  uid: string;
  prog: Programme;
  onProg: (p: Programme) => void;
  moods: MoodMap;
  onMoods: (m: MoodMap) => void;
  prenom?: string;
  genre?: 'homme' | 'femme';
  palette: MomentPalette;
}

const HomeProgramme: React.FC<Props> = ({ uid, prog, onProg, moods, onMoods, prenom, genre, palette }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const today = dayKey();
  const active = prog.status === 'active' && !prog.result;
  const paused = prog.status === 'paused' && !prog.result;

  const persist = (next: Programme) => { onProg(next); saveProgramme(uid, next).catch(() => { /* copie locale gardée */ }); };
  const toChat = () => { setOpen(false); navigate('/compagnon', { state: { programme: true } }); };

  const left = active ? remainingToday(prog, today, moods) : 0;
  const bilan = active ? bilanDue(prog, today) : null;
  const retest = active ? retestInfo(prog, today, moods)?.available : false;
  const day = Math.min(28, dayNumber(prog, today));

  const pickMood = (id: MoodId): string => {
    const already = !!moods[today];
    const next = { ...moods, [today]: { mood: id, at: Date.now() } };
    onMoods(next);
    recordMood(uid, today, id).catch(() => { /* la copie locale est gardée */ });
    trackAccueil('mood', { from: 'programme_accueil' });
    if (active && id === 'tres_dur' && hardStreak(next, today) >= 3) {
      if (!prog.light) persist({ ...prog, light: true });
      return 'Trois jours très durs d\'affilée : je passe ton programme en version douce. Parler à quelqu\'un aide vraiment, le 1515 répond à toute heure.';
    }
    return moodReply(id, prenom, already);
  };

  const showCard = paused || (active && (left > 0 || !!bilan || !!retest));
  const items = active ? planFor(prog, day) : [];

  return (
    <>
      {showCard && (
        <section aria-label="Mon programme" style={{ marginTop: 18 }}>
          <button onClick={() => { trackAccueil('programme_open', { from: 'accueil' }); setOpen(true); }} className="drl-btn"
            style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit', color: DC.text, cursor: 'pointer', padding: '14px 14px 12px', borderRadius: 18, border: `1px solid ${DC.sage}66`, background: `${DC.sage}14` }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ClipboardCheck size={22} color={DC.sage} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, letterSpacing: '.1em', color: DC.sage }}>{AXES[prog.axis].short.toUpperCase()} · JOUR {day} SUR 28</span>
                <span style={{ display: 'block', marginTop: 2, fontFamily: 'Fraunces, serif', fontSize: 18, lineHeight: 1.25, fontWeight: 600, color: DC.title }}>
                  {paused ? 'Ton programme est en pause' : bilan ? 'Ton bilan de la semaine est prêt' : left > 0 ? `${left} chose${left > 1 ? 's' : ''} à faire aujourd'hui` : 'Ton nouveau test est prêt'}
                </span>
              </span>
              <ChevronRight size={18} color={DC.muted} aria-hidden="true" />
            </span>
            {active && left > 0 && (
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {items.map(e => {
                  const done = isDone(prog, today, e.key, moods);
                  return (
                    <span key={e.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 28, padding: '0 10px', borderRadius: 999, fontSize: 13, fontWeight: 600, border: `1px solid ${done ? DC.sage : DC.line}`, color: done ? DC.sage : DC.soft, textDecoration: done ? 'line-through' : 'none' }}>
                      {done && <Check size={13} strokeWidth={2.6} aria-hidden="true" />}{e.kind === 'mood' ? 'Humeur' : e.kind === 'learn' ? 'À lire' : e.title}
                    </span>
                  );
                })}
              </span>
            )}
          </button>
        </section>
      )}
      {open && (
        <ProgrammePanel
          p={prog} today={today} moods={moods} palette={palette} prenom={prenom} genre={genre} totem={null}
          testLabel={id => getScaleMeta(id).label}
          bilanCost={credits(KORIS_COSTS.programme_bilan)} testCost={credits(KORIS_COSTS.test)} busy={null}
          onClose={() => setOpen(false)}
          onToggle={(k: EngKey, on?: boolean) => persist(toggleCheck(prog, today, k, on))}
          onCommit={() => persist({ ...prog, commits: { ...(prog.commits ?? {}), [today]: true } })}
          onNote={(t: string) => { addCarnet(uid, PROGRAMME_CARNET); saveConfidence(uid, t, PROGRAMME_CARNET).catch(() => { /* l'exercice reste coché */ }); }}
          onCrisis={(t: string) => { setOpen(false); navigate('/compagnon', { state: { talk: { draft: t } } }); }}
          onSleep={(n: SleepNote) => persist(setSleep(prog, today, n))}
          onRoutineCheck={(id: string, on?: boolean) => persist(toggleRoutine(prog, today, id, on))}
          onRoutineSet={(id: string, on: boolean) => persist(setRoutine(prog, id, on))}
          onMood={pickMood}
          onBilan={toChat} onRetest={toChat} onStop={toChat} onRestart={toChat} onOther={toChat}
          onLight={(on: boolean) => persist({ ...prog, light: on || !!prog.fragile })}
          onPause={() => persist(pauseProg(prog, today))}
          onResume={() => persist(resumeProg(prog, today))}
        />
      )}
    </>
  );
};

export default HomeProgramme;
