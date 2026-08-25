import React, { useState, useEffect } from 'react';
import { Lock, Heart, Loader2, ArrowLeft, RefreshCw, Sprout, Smile, Leaf } from 'lucide-react';
import {
  checkSexualAccess,
  saveSexualAccess,
  resetSexualAccess,
  type AccessStatus,
  type SexualAccessData,
} from '../../services/sexualAccessService';

type Phase = 'loading' | 'age_gate' | 'eligibility' | 'blocked_minor' | 'blocked_no_exp' | 'blocked_uncomfortable' | 'access_limited' | 'granted';
type CurrentQ = 'q1' | 'q2' | 'q3';

interface Props {
  userId: string | null;
  onGranted: () => void;
}

interface QuestionOption { id: string; label: string; sub?: string; }
interface Question { id: string; text: string; options: QuestionOption[]; }

const Q1: Question = {
  id: 'q1',
  text: "Pour mieux adapter ton évaluation,\ndis-nous où tu en es dans ta vie intime.\nAs-tu déjà eu des expériences intimes\navec quelqu'un ?",
  options: [
    { id: 'aucune', label: "Non, je n'ai jamais eu\nd'expériences intimes", sub: "(ni baiser, ni caresses, ni rapports)" },
    { id: 'legere', label: "J'ai eu quelques expériences légères", sub: "(baisers, caresses — mais pas de rapports sexuels)" },
    { id: 'complete', label: "J'ai eu des rapports sexuels", sub: "(avec ou sans partenaire fixe)" },
  ],
};

const Q2: Question = {
  id: 'q2',
  text: "Ces expériences sont-elles\nrécentes ou passées ?",
  options: [
    { id: 'recent', label: "Récentes — j'ai une vie intime\nactive en ce moment" },
    { id: 'passe', label: "C'était il y a un moment —\nje n'ai plus de vie intime\nactive actuellement" },
    { id: 'longtemps', label: "J'ai eu des expériences mais\nc'était il y a longtemps" },
  ],
};

const Q3: Question = {
  id: 'q3',
  text: "Est-ce que tu te sens à l'aise\npour répondre à des questions\nsur ta vie intime aujourd'hui ?",
  options: [
    { id: 'a_laise', label: "Oui, je suis prêt(e)" },
    { id: 'hesitant', label: "Un peu hésitant(e) mais\nje veux essayer" },
    { id: 'pas_a_laise', label: "Pas vraiment —\nje préfère passer" },
  ],
};

function evaluerAcces(reponses: Record<string, string>): AccessStatus {
  if (reponses.q1 === 'aucune') return 'pas_assez_experience';
  if (reponses.q1 === 'legere') return 'acces_limite';
  if (reponses.q2 === 'passe' || reponses.q2 === 'longtemps') return 'autorise';
  if (reponses.q3 === 'pas_a_laise') return 'non_disponible';
  return 'autorise';
}

function calculerAge(dateStr: string): number {
  const birth = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const SexualAccessGate: React.FC<Props> = ({ userId, onGranted }) => {
  const [phase, setPhase] = useState<Phase>('loading');
  const [birthDate, setBirthDate] = useState('');
  const [birthError, setBirthError] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState<CurrentQ>('q1');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    checkSexualAccess(userId).then(data => {
      if (!data || !data.statut) { setPhase('age_gate'); return; }
      switch (data.statut) {
        case 'mineur':               setPhase('blocked_minor'); break;
        case 'pas_assez_experience': setPhase('blocked_no_exp'); break;
        case 'non_disponible':       setPhase('blocked_uncomfortable'); break;
        case 'acces_limite':         setPhase('access_limited'); break;
        case 'bloque_temp': {
          const next = data.date_prochaine_reevaluation;
          if (next && new Date() > new Date(next)) setPhase('age_gate');
          else setPhase('blocked_no_exp');
          break;
        }
        default: onGranted();
      }
    }).catch(() => setPhase('age_gate'));
  }, [userId]);

  const transition = (fn: () => void) => {
    setAnimating(true);
    setTimeout(() => { fn(); setAnimating(false); }, 180);
  };

  const saveAndTransition = async (statut: AccessStatus) => {
    const age = birthDate ? calculerAge(birthDate) : undefined;
    const data: SexualAccessData = {
      age_verifie: true, date_naissance: birthDate || undefined, age, statut,
      date_evaluation: new Date().toISOString(), date_prochaine_reevaluation: null,
    };
    setSaving(true);
    try { await saveSexualAccess(userId, data); } catch { /* ignore */ }
    setSaving(false);
    if (statut === 'pas_assez_experience') transition(() => setPhase('blocked_no_exp'));
    else if (statut === 'non_disponible') transition(() => setPhase('blocked_uncomfortable'));
    else if (statut === 'acces_limite') transition(() => setPhase('access_limited'));
    else onGranted();
  };

  const handleAgeSubmit = () => {
    if (!birthDate) { setBirthError("Merci d'entrer ta date de naissance."); return; }
    const age = calculerAge(birthDate);
    if (age < 0 || age > 120) { setBirthError('Date invalide.'); return; }
    setBirthError(null);
    if (age < 18) {
      saveSexualAccess(userId, {
        age_verifie: true, date_naissance: birthDate, age, statut: 'mineur',
        date_evaluation: new Date().toISOString(), date_prochaine_reevaluation: null,
      }).catch(() => {});
      setPhase('blocked_minor');
      return;
    }
    setCurrentQ('q1');
    setAnswers({});
    transition(() => setPhase('eligibility'));
  };

  const handleAnswer = async (questionId: string, answerId: string) => {
    if (saving) return;
    const newAnswers = { ...answers, [questionId]: answerId };
    setAnswers(newAnswers);
    if (questionId === 'q1') {
      if (answerId === 'aucune') await saveAndTransition('pas_assez_experience');
      else if (answerId === 'complete') transition(() => setCurrentQ('q2'));
      else transition(() => setCurrentQ('q3'));
      return;
    }
    if (questionId === 'q2') { transition(() => setCurrentQ('q3')); return; }
    const statut = evaluerAcces(newAnswers);
    await saveAndTransition(statut);
  };

  const handleReset = async () => {
    setSaving(true);
    try { await resetSexualAccess(userId); } catch { /* ignore */ }
    setSaving(false);
    setAnswers({}); setCurrentQ('q1'); setBirthDate('');
    transition(() => setPhase('age_gate'));
  };

  const getProgress = () => {
    if (currentQ === 'q1') return { step: 1, total: 3 };
    if (currentQ === 'q2') return { step: 2, total: 3 };
    if (answers.q1 === 'legere') return { step: 2, total: 2 };
    return { step: 3, total: 3 };
  };

  const wrap = (content: React.ReactNode) => (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-5 py-6">
      <div
        className="w-full max-w-[480px] bg-card rounded-block border border-line p-7 shadow-soft"
        style={{
          opacity: animating ? 0 : 1,
          transform: animating ? 'translateY(8px)' : 'translateY(0)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
        }}
      >
        {content}
      </div>
      <p className="mt-5 text-[11px] text-muted text-center max-w-[340px]">
        Tes réponses restent privées et ne sont jamais partagées.
      </p>
    </div>
  );

  const OptionButton: React.FC<{ onClick: () => void; label: string; sub?: string }> = ({ onClick, label, sub }) => (
    <button
      onClick={onClick}
      disabled={saving}
      className="flex items-start gap-3 p-3.5 rounded-xl border border-line bg-card text-left text-[13px] font-medium text-ink transition-all duration-150 hover:border-accent/40 hover:bg-accent-soft cursor-pointer disabled:cursor-wait w-full"
    >
      <span className="whitespace-pre-line leading-snug">{label}</span>
      {sub && <span className="text-[11px] text-muted font-normal">{sub}</span>}
    </button>
  );

  if (phase === 'loading') return wrap(
    <div className="flex items-center justify-center gap-3 py-6 text-muted text-sm">
      <Loader2 size={18} className="animate-spin" /> Vérification…
    </div>
  );

  if (phase === 'age_gate') return wrap(
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center flex-shrink-0 shadow-soft">
          <Lock size={22} color="white" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-accent uppercase tracking-wide mb-0.5">Section réservée aux adultes</p>
          <h2 className="font-display text-lg font-bold text-ink">Vérifions ton âge</h2>
        </div>
      </div>
      <p className="text-sm text-ink-soft leading-relaxed mb-5">
        Cette section aborde des sujets intimes et sensibles. Elle est <strong>strictement réservée aux personnes majeures</strong> (18 ans et plus).
      </p>
      <label className="block text-[13px] font-semibold text-ink mb-2">Quelle est ta date de naissance ?</label>
      <input
        type="date"
        value={birthDate}
        onChange={e => { setBirthDate(e.target.value); setBirthError(null); }}
        max={new Date().toISOString().split('T')[0]}
        className={`w-full p-3.5 rounded-xl border text-sm text-ink bg-card outline-none mb-1 ${birthError ? 'border-danger' : 'border-line'} focus:border-accent`}
      />
      {birthError && <p className="text-xs text-danger mb-3">{birthError}</p>}
      <button onClick={handleAgeSubmit} className="w-full mt-3 py-3 rounded-xl bg-accent text-white text-sm font-bold border-none cursor-pointer hover:bg-accent/90 transition-colors">
        Continuer
      </button>
    </>
  );

  if (phase === 'blocked_minor') return wrap(
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-accent-soft flex items-center justify-center mx-auto mb-4">
        <Lock size={28} className="text-accent" />
      </div>
      <h2 className="font-display text-xl font-bold text-ink mb-3">Cette section est réservée aux adultes</h2>
      <div className="bg-paper rounded-block p-5 mb-6 text-left">
        <p className="text-sm text-ink-soft leading-relaxed">
          Cette section est pensée pour les personnes de <strong>18 ans et plus</strong>.
        </p>
        <p className="text-sm text-ok font-semibold leading-relaxed mt-3">
          Tu pourras y revenir librement dès que tu auras cet âge.
        </p>
      </div>
      <a href="/assessment/mental" className="block py-3 rounded-xl border border-line text-muted text-[13px] font-semibold no-underline text-center hover:bg-paper transition-colors">
        <ArrowLeft size={14} className="inline mr-1.5" />Retour à mon profil psychologique
      </a>
      <button onClick={handleReset} disabled={saving} className="w-full mt-2 py-2.5 rounded-xl border border-accent/20 bg-transparent text-accent text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 hover:bg-accent-soft transition-colors">
        <RefreshCw size={13} /> {saving ? '…' : "J'ai fait une erreur — Recommencer"}
      </button>
    </div>
  );

  if (phase === 'eligibility') {
    const q = currentQ === 'q1' ? Q1 : currentQ === 'q2' ? Q2 : Q3;
    const { step, total } = getProgress();
    const pct = ((step - 1) / total) * 100;

    return wrap(
      <>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center flex-shrink-0 shadow-soft">
            <Heart size={18} color="white" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-accent uppercase tracking-wide mb-0.5">
              Vie intime — Question {step}/{total}
            </p>
            <h2 className="font-display text-base font-bold text-ink">Quelques questions rapides</h2>
          </div>
        </div>

        <div className="h-1 bg-paper-dark rounded-full overflow-hidden mb-5">
          <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>

        <p className="text-sm text-ink-soft leading-relaxed mb-5 whitespace-pre-line">{q.text}</p>

        <div className="flex flex-col gap-2.5">
          {q.options.map(opt => (
            <OptionButton key={opt.id} onClick={() => handleAnswer(q.id, opt.id)} label={opt.label} sub={opt.sub} />
          ))}
        </div>

        {saving && (
          <div className="flex items-center justify-center gap-2 mt-4 text-muted text-xs">
            <Loader2 size={14} className="animate-spin" /> Enregistrement…
          </div>
        )}
      </>
    );
  }

  if (phase === 'blocked_no_exp') return wrap(
    <>
      <div className="text-center mb-5">
        <div className="w-14 h-14 rounded-full bg-sage-soft flex items-center justify-center mx-auto mb-3">
          <Sprout size={26} className="text-sage" />
        </div>
        <h2 className="font-display text-xl font-bold text-ink">Cette section n'est pas encore pour toi</h2>
      </div>
      <div className="bg-sage-soft border border-sage/10 rounded-block p-5 mb-5">
        <p className="text-sm text-ink-soft leading-relaxed">Pour évaluer ta vie intime, on a besoin d'expériences vécues sur lesquelles se baser.</p>
        <p className="text-sm text-ink-soft leading-relaxed mt-3">Sans ces éléments, nos outils d'évaluation ne peuvent pas te donner des résultats pertinents.</p>
        <p className="text-sm text-ok font-semibold leading-relaxed mt-3">Cette section t'attend quand tu seras prêt(e)</p>
      </div>
      <a href="/assessment/mental" className="block py-3 rounded-xl border border-line text-muted text-[13px] font-semibold no-underline text-center hover:bg-paper transition-colors">
        <ArrowLeft size={14} className="inline mr-1.5" />Retour à mon profil psychologique
      </a>
      <button onClick={handleReset} disabled={saving} className="w-full mt-2 py-2.5 rounded-xl border border-accent/20 bg-transparent text-accent text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 hover:bg-accent-soft transition-colors">
        <RefreshCw size={13} /> {saving ? '…' : 'Ma situation a changé — Réévaluer'}
      </button>
    </>
  );

  if (phase === 'blocked_uncomfortable') return wrap(
    <>
      <div className="text-center mb-5">
        <div className="w-14 h-14 rounded-full bg-gold-soft flex items-center justify-center mx-auto mb-3">
          <Smile size={26} className="text-gold" />
        </div>
        <h2 className="font-display text-xl font-bold text-ink">Pas de problème</h2>
      </div>
      <div className="bg-paper rounded-block border border-line p-5 mb-5">
        <p className="text-sm text-ink-soft leading-relaxed">Ce n'est pas le bon moment et c'est tout à fait normal.</p>
        <p className="text-sm text-ink-soft leading-relaxed mt-3">Ta vie intime t'appartient — tu n'as aucune obligation d'en parler ici.</p>
        <p className="text-sm text-sage font-semibold leading-relaxed mt-3">Tu pourras y revenir quand tu le souhaiteras</p>
      </div>
      <a href="/assessment/mental" className="block py-3 rounded-xl border border-line text-muted text-[13px] font-semibold no-underline text-center hover:bg-paper transition-colors">
        <ArrowLeft size={14} className="inline mr-1.5" />Retour à mon profil psychologique
      </a>
      <button onClick={handleReset} disabled={saving} className="w-full mt-2 py-2.5 rounded-xl border border-accent/20 bg-transparent text-accent text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 hover:bg-accent-soft transition-colors">
        <RefreshCw size={13} /> {saving ? '…' : 'Je veux réessayer'}
      </button>
    </>
  );

  if (phase === 'access_limited') return wrap(
    <>
      <div className="text-center mb-5">
        <div className="w-14 h-14 rounded-full bg-sage-soft flex items-center justify-center mx-auto mb-3">
          <Leaf size={26} className="text-sage" />
        </div>
        <h2 className="font-display text-xl font-bold text-ink">Accès partiel disponible</h2>
      </div>
      <div className="bg-sage-soft border border-sage/10 rounded-block p-5 mb-5">
        <p className="text-sm text-ink-soft leading-relaxed">Tes expériences nous permettent d'explorer certains aspects de ta vie intime — notamment ton rapport au désir, à ton corps et à tes valeurs.</p>
        <p className="text-sm text-ink-soft leading-relaxed mt-3">Certaines évaluations plus avancées nécessitent plus d'expériences — elles seront disponibles plus tard.</p>
        <p className="text-sm text-ok font-semibold leading-relaxed mt-3">On commence par ce qui est pertinent pour toi maintenant</p>
      </div>
      <button onClick={onGranted} className="w-full py-3 rounded-xl bg-accent text-white text-sm font-bold border-none cursor-pointer hover:bg-accent/90 transition-colors">
        Continuer
      </button>
      <button onClick={handleReset} disabled={saving} className="w-full mt-2 py-2.5 rounded-xl border border-accent/20 bg-transparent text-accent text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 hover:bg-accent-soft transition-colors">
        <RefreshCw size={13} /> {saving ? '…' : 'Réévaluer ma situation'}
      </button>
    </>
  );

  return null;
};

export default SexualAccessGate;
