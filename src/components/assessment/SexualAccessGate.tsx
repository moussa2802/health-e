import React, { useState, useEffect } from 'react';
import {
  checkSexualAccess,
  saveSexualAccess,
  resetSexualAccess,
  type AccessStatus,
  type SexualAccessData,
} from '../../services/sexualAccessService';

type Phase =
  | 'loading'
  | 'age_gate'
  | 'eligibility'
  | 'blocked_minor'
  | 'blocked_no_exp'
  | 'blocked_uncomfortable'
  | 'access_limited'
  | 'granted';

type CurrentQ = 'q1' | 'q2' | 'q3';

interface Props {
  userId: string | null;
  onGranted: () => void;
}

// ── Questions ─────────────────────────────────────────────────────────────────

interface QuestionOption {
  id: string;
  emoji: string;
  label: string;
  sub?: string;
}

interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
}

const Q1: Question = {
  id: 'q1',
  text: "Pour mieux adapter ton évaluation,\ndis-nous où tu en es dans ta vie intime.\nAs-tu déjà eu des expériences intimes\navec quelqu'un ?",
  options: [
    {
      id: 'aucune',
      emoji: '🌱',
      label: "Non, je n'ai jamais eu\nd'expériences intimes",
      sub: "(ni baiser, ni caresses, ni rapports)",
    },
    {
      id: 'legere',
      emoji: '🌿',
      label: "J'ai eu quelques expériences légères",
      sub: "(baisers, caresses — mais pas de rapports sexuels)",
    },
    {
      id: 'complete',
      emoji: '🌺',
      label: "J'ai eu des rapports sexuels",
      sub: "(avec ou sans partenaire fixe)",
    },
  ],
};

const Q2: Question = {
  id: 'q2',
  text: "Ces expériences sont-elles\nrécentes ou passées ?",
  options: [
    {
      id: 'recent',
      emoji: '⏰',
      label: "Récentes — j'ai une vie intime\nactive en ce moment",
    },
    {
      id: 'passe',
      emoji: '📅',
      label: "C'était il y a un moment —\nje n'ai plus de vie intime\nactive actuellement",
    },
    {
      id: 'longtemps',
      emoji: '💭',
      label: "J'ai eu des expériences mais\nc'était il y a longtemps",
    },
  ],
};

const Q3: Question = {
  id: 'q3',
  text: "Est-ce que tu te sens à l'aise\npour répondre à des questions\nsur ta vie intime aujourd'hui ?",
  options: [
    { id: 'a_laise',    emoji: '😊', label: "Oui, je suis prêt(e)" },
    { id: 'hesitant',   emoji: '🤔', label: "Un peu hésitant(e) mais\nje veux essayer" },
    { id: 'pas_a_laise', emoji: '😰', label: "Pas vraiment —\nje préfère passer" },
  ],
};

// ── Decision logic ────────────────────────────────────────────────────────────

function evaluerAcces(reponses: Record<string, string>): AccessStatus {
  if (reponses.q1 === 'aucune') return 'pas_assez_experience';
  if (reponses.q1 === 'legere') return 'acces_limite';
  // q1 === 'complete'
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

// ── Style helpers ─────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 480,
  background: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  border: '1.5px solid rgba(255,255,255,0.7)',
  borderRadius: 24,
  padding: '32px 28px',
  boxShadow: '0 8px 40px rgba(124,58,237,0.10)',
};

const btnPrimary: React.CSSProperties = {
  width: '100%',
  padding: '13px 20px',
  borderRadius: 12,
  border: 'none',
  background: 'linear-gradient(135deg,#EC4899,#F97316)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  marginTop: 8,
};

const btnGhost: React.CSSProperties = {
  width: '100%',
  padding: '11px 20px',
  borderRadius: 12,
  border: '1.5px solid rgba(124,58,237,0.2)',
  background: 'transparent',
  color: '#7C3AED',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: 8,
};

const btnBack: React.CSSProperties = {
  width: '100%',
  padding: '11px 20px',
  borderRadius: 12,
  border: '1.5px solid rgba(100,116,139,0.2)',
  background: 'transparent',
  color: '#64748B',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: 8,
};

// ── Component ─────────────────────────────────────────────────────────────────

const SexualAccessGate: React.FC<Props> = ({ userId, onGranted }) => {
  const [phase, setPhase] = useState<Phase>('loading');
  const [birthDate, setBirthDate] = useState('');
  const [birthError, setBirthError] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState<CurrentQ>('q1');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [animating, setAnimating] = useState(false);

  // ── Load existing access on mount ──────────────────────────────────────────

  useEffect(() => {
    checkSexualAccess(userId).then(data => {
      if (!data || !data.statut) { setPhase('age_gate'); return; }

      switch (data.statut) {
        case 'mineur':            setPhase('blocked_minor'); break;
        case 'pas_assez_experience': setPhase('blocked_no_exp'); break;
        case 'non_disponible':    setPhase('blocked_uncomfortable'); break;
        case 'acces_limite':      setPhase('access_limited'); break;
        case 'bloque_temp': {
          // legacy data: re-open if past re-eval date, otherwise show no_exp
          const next = data.date_prochaine_reevaluation;
          if (next && new Date() > new Date(next)) setPhase('age_gate');
          else setPhase('blocked_no_exp');
          break;
        }
        default: onGranted(); // autorise, acces_accompagne
      }
    }).catch(() => setPhase('age_gate'));
  }, [userId]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const transition = (fn: () => void) => {
    setAnimating(true);
    setTimeout(() => { fn(); setAnimating(false); }, 180);
  };

  const saveAndTransition = async (statut: AccessStatus) => {
    const age = birthDate ? calculerAge(birthDate) : undefined;
    const data: SexualAccessData = {
      age_verifie: true,
      date_naissance: birthDate || undefined,
      age,
      statut,
      date_evaluation: new Date().toISOString(),
      date_prochaine_reevaluation: null,
    };
    setSaving(true);
    try { await saveSexualAccess(userId, data); } catch { /* ignore */ }
    setSaving(false);

    if (statut === 'pas_assez_experience') transition(() => setPhase('blocked_no_exp'));
    else if (statut === 'non_disponible')  transition(() => setPhase('blocked_uncomfortable'));
    else if (statut === 'acces_limite')    transition(() => setPhase('access_limited'));
    else onGranted();
  };

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleAgeSubmit = () => {
    if (!birthDate) { setBirthError("Merci d'entrer ta date de naissance."); return; }
    const age = calculerAge(birthDate);
    if (age < 0 || age > 120) { setBirthError('Date invalide.'); return; }
    setBirthError(null);

    if (age < 18) {
      saveSexualAccess(userId, {
        age_verifie: true,
        date_naissance: birthDate,
        age,
        statut: 'mineur',
        date_evaluation: new Date().toISOString(),
        date_prochaine_reevaluation: null,
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
      if (answerId === 'aucune') {
        await saveAndTransition('pas_assez_experience');
      } else if (answerId === 'complete') {
        transition(() => setCurrentQ('q2'));
      } else {
        // legere — skip Q2, go to Q3
        transition(() => setCurrentQ('q3'));
      }
      return;
    }

    if (questionId === 'q2') {
      // After Q2, always show Q3
      transition(() => setCurrentQ('q3'));
      return;
    }

    // q3 — final question, evaluate
    const statut = evaluerAcces(newAnswers);
    await saveAndTransition(statut);
  };

  const handleReset = async () => {
    setSaving(true);
    try { await resetSexualAccess(userId); } catch { /* ignore */ }
    setSaving(false);
    setAnswers({});
    setCurrentQ('q1');
    setBirthDate('');
    transition(() => setPhase('age_gate'));
  };

  // ── Progress helper ────────────────────────────────────────────────────────

  const getProgress = (): { step: number; total: number } => {
    if (currentQ === 'q1') return { step: 1, total: 3 };
    if (currentQ === 'q2') return { step: 2, total: 3 };
    // q3
    if (answers.q1 === 'legere') return { step: 2, total: 2 };
    return { step: 3, total: 3 };
  };

  // ── Layout wrapper ─────────────────────────────────────────────────────────

  const wrap = (content: React.ReactNode) => (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FDF2F8 0%, #F5F3FF 50%, #EFF6FF 100%)',
      fontFamily: "'Inter',-apple-system,sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -80, left: -80, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{
        ...cardStyle,
        opacity: animating ? 0 : 1,
        transform: animating ? 'translateY(8px)' : 'translateY(0)',
        transition: 'opacity 0.18s ease, transform 0.18s ease',
      }}>
        {content}
      </div>

      <p style={{ marginTop: 20, fontSize: 11, color: '#94A3B8', textAlign: 'center', maxWidth: 340 }}>
        Tes réponses restent privées et ne sont jamais partagées.
      </p>
    </div>
  );

  // ── Phases ─────────────────────────────────────────────────────────────────

  if (phase === 'loading') return wrap(
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '24px 0', color: '#94A3B8', fontSize: 14 }}>
      <div style={{ width: 20, height: 20, border: '2.5px solid rgba(236,72,153,0.3)', borderTopColor: '#EC4899', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      Vérification…
    </div>
  );

  // ── Age Gate ───────────────────────────────────────────────────────────────

  if (phase === 'age_gate') return wrap(
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#EC4899,#F97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, boxShadow: '0 2px 12px rgba(236,72,153,0.3)' }}>
          🔒
        </div>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 700, color: '#EC4899', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Section réservée aux adultes</p>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0A2342' }}>Vérifions ton âge</h2>
        </div>
      </div>

      <p style={{ margin: '0 0 20px', fontSize: 14, color: '#374151', lineHeight: 1.65 }}>
        Cette section aborde des sujets intimes et sensibles. Elle est <strong>strictement réservée aux personnes majeures</strong> (18 ans et plus).
      </p>

      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
        Quelle est ta date de naissance ?
      </label>
      <input
        type="date"
        value={birthDate}
        onChange={e => { setBirthDate(e.target.value); setBirthError(null); }}
        max={new Date().toISOString().split('T')[0]}
        style={{
          width: '100%',
          padding: '13px 16px',
          borderRadius: 12,
          border: birthError ? '1.5px solid #DC2626' : '1.5px solid rgba(236,72,153,0.2)',
          fontSize: 14,
          color: '#0A2342',
          background: '#fff',
          boxSizing: 'border-box',
          outline: 'none',
          marginBottom: birthError ? 6 : 16,
        }}
      />
      {birthError && <p style={{ margin: '0 0 12px', fontSize: 12, color: '#DC2626' }}>{birthError}</p>}

      <button style={btnPrimary} onClick={handleAgeSubmit}>
        Continuer →
      </button>
    </>
  );

  // ── Blocked Minor ──────────────────────────────────────────────────────────

  if (phase === 'blocked_minor') return wrap(
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
      <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 800, color: '#0A2342' }}>Cette section est réservée aux adultes</h2>
      <div style={{ background: '#F8FAFF', borderRadius: 16, padding: '20px', marginBottom: 24, textAlign: 'left' }}>
        <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.75 }}>
          Cette section est pensée pour les personnes de <strong>18 ans et plus</strong>.
        </p>
        <p style={{ margin: '12px 0 0', fontSize: 14, color: '#16A34A', fontWeight: 600, lineHeight: 1.75 }}>
          Tu pourras y revenir librement dès que tu auras cet âge. 🌱
        </p>
      </div>
      <a href="/assessment/mental" style={{ display: 'block', padding: '13px 20px', borderRadius: 12, border: '1.5px solid rgba(100,116,139,0.2)', background: 'transparent', color: '#64748B', fontSize: 13, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
        ← Retour à mon profil psychologique
      </a>
      <button style={btnGhost} onClick={handleReset} disabled={saving}>
        {saving ? '…' : '🔄 J\'ai fait une erreur — Recommencer'}
      </button>
    </div>
  );

  // ── Eligibility Questions ──────────────────────────────────────────────────

  if (phase === 'eligibility') {
    const q = currentQ === 'q1' ? Q1 : currentQ === 'q2' ? Q2 : Q3;
    const { step, total } = getProgress();
    const progress = Math.round(((step - 1) / total) * 100);

    return wrap(
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#EC4899,#F97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, boxShadow: '0 2px 10px rgba(236,72,153,0.3)' }}>
            💋
          </div>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 700, color: '#EC4899', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Vie intime — Question {step}/{total}
            </p>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0A2342' }}>Quelques questions rapides</h2>
          </div>
        </div>

        <div style={{ height: 4, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#EC4899,#F97316)', borderRadius: 99, transition: 'width 0.3s ease' }} />
        </div>

        <p style={{ margin: '0 0 18px', fontSize: 14, color: '#374151', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
          {q.text}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {q.options.map(opt => (
            <button
              key={opt.id}
              onClick={() => handleAnswer(q.id, opt.id)}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '13px 16px', borderRadius: 12,
                border: '1.5px solid rgba(236,72,153,0.15)',
                background: '#FFFFFF', cursor: saving ? 'wait' : 'pointer',
                textAlign: 'left', fontSize: 13, fontWeight: 500, color: '#0A2342',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(236,72,153,0.4)'; (e.currentTarget as HTMLButtonElement).style.background = '#FDF2F8'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(236,72,153,0.15)'; (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF'; }}
            >
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{opt.emoji}</span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ whiteSpace: 'pre-line', lineHeight: 1.4 }}>{opt.label}</span>
                {opt.sub && <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>{opt.sub}</span>}
              </span>
            </button>
          ))}
        </div>

        {saving && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, color: '#94A3B8', fontSize: 12 }}>
            <div style={{ width: 14, height: 14, border: '2px solid rgba(236,72,153,0.3)', borderTopColor: '#EC4899', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Enregistrement…
          </div>
        )}
      </>
    );
  }

  // ── Blocked — No experience ────────────────────────────────────────────────

  if (phase === 'blocked_no_exp') return wrap(
    <>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🌱</div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0A2342' }}>
          Cette section n'est pas encore pour toi
        </h2>
      </div>

      <div style={{ background: '#F0FDF4', border: '1px solid rgba(22,163,74,0.15)', borderRadius: 16, padding: '20px', marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.75 }}>
          Pour évaluer ta vie intime, on a besoin d'expériences vécues sur lesquelles se baser.
        </p>
        <p style={{ margin: '12px 0 0', fontSize: 14, color: '#374151', lineHeight: 1.75 }}>
          Sans ces éléments, nos outils d'évaluation ne peuvent pas te donner des résultats pertinents — et on préfère être honnêtes avec toi plutôt que de te donner des résultats qui ne te correspondent pas.
        </p>
        <p style={{ margin: '12px 0 0', fontSize: 14, color: '#16A34A', fontWeight: 600, lineHeight: 1.75 }}>
          Cette section t'attend quand tu seras prêt(e) 🤍
        </p>
      </div>

      <a href="/assessment/mental" style={{ ...btnBack, display: 'block', textDecoration: 'none', textAlign: 'center' }}>
        ← Retour à mon profil psychologique
      </a>
      <button style={btnGhost} onClick={handleReset} disabled={saving}>
        {saving ? '…' : '🔄 Ma situation a changé — Réévaluer'}
      </button>
    </>
  );

  // ── Blocked — Uncomfortable ────────────────────────────────────────────────

  if (phase === 'blocked_uncomfortable') return wrap(
    <>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>😊</div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0A2342' }}>
          Pas de problème
        </h2>
      </div>

      <div style={{ background: '#F8FAFF', border: '1px solid rgba(100,116,139,0.1)', borderRadius: 16, padding: '20px', marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.75 }}>
          Ce n'est pas le bon moment et c'est tout à fait normal.
        </p>
        <p style={{ margin: '12px 0 0', fontSize: 14, color: '#374151', lineHeight: 1.75 }}>
          Ta vie intime t'appartient — tu n'as aucune obligation d'en parler ici.
        </p>
        <p style={{ margin: '12px 0 0', fontSize: 14, color: '#7C3AED', fontWeight: 600, lineHeight: 1.75 }}>
          Tu pourras y revenir quand tu le souhaiteras 🤍
        </p>
      </div>

      <a href="/assessment/mental" style={{ ...btnBack, display: 'block', textDecoration: 'none', textAlign: 'center' }}>
        ← Retour à mon profil psychologique
      </a>
      <button style={btnGhost} onClick={handleReset} disabled={saving}>
        {saving ? '…' : '🔄 Je veux réessayer'}
      </button>
    </>
  );

  // ── Access Limited (CAS 2 — expériences légères) ──────────────────────────

  if (phase === 'access_limited') return wrap(
    <>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🌿</div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0A2342' }}>Accès partiel disponible</h2>
      </div>

      <div style={{ background: '#F0FDF4', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 16, padding: '20px', marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.75 }}>
          Tes expériences nous permettent d'explorer certains aspects de ta vie intime — notamment ton rapport au désir, à ton corps et à tes valeurs.
        </p>
        <p style={{ margin: '12px 0 0', fontSize: 14, color: '#374151', lineHeight: 1.75 }}>
          Certaines évaluations plus avancées nécessitent plus d'expériences — elles seront disponibles plus tard.
        </p>
        <p style={{ margin: '12px 0 0', fontSize: 14, color: '#16A34A', fontWeight: 600, lineHeight: 1.75 }}>
          On commence par ce qui est pertinent pour toi maintenant 😊
        </p>
      </div>

      <button style={btnPrimary} onClick={onGranted}>
        Continuer →
      </button>
      <button style={btnGhost} onClick={handleReset} disabled={saving}>
        {saving ? '…' : '🔄 Réévaluer ma situation'}
      </button>
    </>
  );

  return null;
};

export default SexualAccessGate;
