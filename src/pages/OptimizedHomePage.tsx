import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Brain, Heart, Link2, CheckCircle2, Sparkles } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

/* ── Typing effect hook ── */
function useTyping(words: string[], speed = 80, pause = 1800) {
  const [idx, setIdx]       = useState(0);
  const [text, setText]     = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const full = words[idx];
    if (!deleting && text === full) {
      const t = setTimeout(() => setDeleting(true), pause);
      return () => clearTimeout(t);
    }
    if (deleting && text === "") {
      setDeleting(false);
      setIdx(i => (i + 1) % words.length);
      return;
    }
    const t = setTimeout(
      () => setText(deleting ? text.slice(0, -1) : full.slice(0, text.length + 1)),
      deleting ? 35 : speed
    );
    return () => clearTimeout(t);
  });

  return text;
}

/* ── Speech bubble ── */
const SpeechBubble: React.FC = () => {
  const words = ["Salut,", "moi", "c'est", "Dr.", "Lô"];
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (visible >= words.length) return;
    const t = setTimeout(() => setVisible(v => v + 1), 260 + visible * 80);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div className="absolute -top-4 -right-32 sm:-right-32 right-0 z-20 animate-fadeIn whitespace-nowrap rounded-2xl rounded-bl-sm border border-line bg-card px-4 py-2.5 text-sm font-bold text-ink shadow-lift max-w-[calc(100vw-3rem)]">
      {words.slice(0, visible).join(" ")}
      {visible < words.length && (
        <span className="ml-0.5 inline-block h-[0.9em] w-[2px] animate-pulse align-middle bg-accent" />
      )}
      {/* Tail */}
      <span className="absolute bottom-2.5 -left-2 h-0 w-0 border-y-[6px] border-r-[9px] border-y-transparent border-r-card" />
    </div>
  );
};

/* ── Dr LO photo avatar ── */
const DrLoAvatar: React.FC = () => (
  <div className="relative flex h-[200px] w-[200px] items-center justify-center">
    <SpeechBubble />
    {/* Outer ring */}
    <div className="absolute inset-0 rounded-full border-2 border-dashed border-accent/30" />
    {/* Middle ring */}
    <div className="absolute inset-3 rounded-full border border-dashed border-sage/30" />
    {/* Photo */}
    <div className="absolute inset-6 overflow-hidden rounded-full border-4 border-card shadow-lift">
      <img
        src="/dr-lo.png"
        alt="Dr. LO"
        className="h-full w-full object-cover object-top"
      />
    </div>
    {/* Small badge */}
    <div className="absolute bottom-4 right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-accent shadow-soft">
      <Brain size={16} className="text-white" />
    </div>
  </div>
);

/* ═══════════════════════════ PAGE ═══════════════════════════ */
const OptimizedHomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const typed = useTyping([
    "Explore qui tu es vraiment.",
    "Comprends ton fonctionnement.",
    "Découvre ton profil intérieur.",
    "Commence ton voyage.",
  ]);

  const cards = [
    {
      icon: <Brain size={22} className="text-accent" />,
      count: "14",
      label: "Évaluations",
      sub: "Profil psychologique",
      bg: "bg-accent-soft",
    },
    {
      icon: <Heart size={22} className="text-sage" />,
      count: "10",
      label: "Évaluations",
      sub: "Vie intime",
      bg: "bg-sage-soft",
    },
    {
      icon: <Link2 size={22} className="text-gold" />,
      count: "1",
      label: "Test de",
      sub: "Compatibilité",
      bg: "bg-gold-soft",
    },
  ];

  const trustItems = [
    "Scientifiquement validé",
    "Anonyme",
    "Gratuit",
    "Adapté au contexte africain",
  ];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-paper px-4 py-8">
      {/* ── Main content ── */}
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center">

        {/* Tag pill */}
        <div className="animate-fadeIn mb-5 inline-flex items-center gap-2 rounded-pill border border-line bg-card px-4 py-1.5 text-sm font-semibold text-ink shadow-soft">
          <Sparkles size={14} className="text-accent" />
          24 évaluations validées &nbsp;·&nbsp; 100% confidentiel
        </div>

        {/* Dr LO avatar */}
        <div className="animate-fadeIn mb-4">
          <DrLoAvatar />
        </div>

        {/* Typing headline */}
        <h1 className="font-display animate-fadeIn mb-1 text-[clamp(2rem,5vw,3.6rem)] font-bold leading-tight text-ink">
          <span className="inline-block min-h-[1.2em] text-accent">
            {typed}
            <span className="ml-0.5 inline-block h-[0.85em] w-[2.5px] animate-pulse align-middle rounded-sm bg-accent" />
          </span>
        </h1>

        {/* Static sub-title */}
        <p className="font-display animate-fadeIn mt-0 mb-2 text-[clamp(1.4rem,3.5vw,2.5rem)] font-bold leading-tight text-ink">
          Ton profil <span className="text-accent">psychologique</span>{" "}
          &amp; <span className="text-sage">ta vie intime</span>.
        </p>

        {/* Description */}
        <p className="animate-fadeIn mb-8 max-w-[440px] text-[clamp(0.9rem,1.8vw,1.05rem)] leading-relaxed text-ink-soft">
          Des tests scientifiques, bienveillants et adaptés à ta réalité —
          construis ton profil à ton rythme, item par item.
        </p>

        {/* CTAs */}
        <div className="animate-fadeIn flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={() => navigate("/assessment")}
            className="flex w-full min-w-[240px] items-center justify-center gap-3 rounded-2xl bg-ink px-9 py-4 text-lg font-bold text-white shadow-lift transition-transform hover:-translate-y-0.5 sm:w-auto"
          >
            Commencer mon évaluation
            <ArrowRight size={20} />
          </button>
        </div>

        {/* Trust indicators */}
        <div className="animate-fadeIn mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-medium text-muted">
          {trustItems.map((item, i) => (
            <span key={i} className="flex items-center gap-1">
              <CheckCircle2 size={13} className="text-sage" />
              <span>{item}</span>
              {i < trustItems.length - 1 && <span className="ml-1 text-line">·</span>}
            </span>
          ))}
        </div>

        {/* 3 mini cards */}
        <div className="animate-fadeIn mt-10 grid w-full grid-cols-3 gap-3">
          {cards.map((card, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1.5 rounded-card border border-line bg-card px-3 py-4 shadow-soft transition-transform hover:-translate-y-1 hover:shadow-lift"
            >
              <div className={`flex h-[42px] w-[42px] items-center justify-center rounded-xl ${card.bg}`}>
                {card.icon}
              </div>
              <div className="font-display text-2xl font-bold leading-none text-ink">
                {card.count}
              </div>
              <div className="text-center text-[0.7rem] font-semibold leading-tight text-muted">
                {card.label}
                <br />
                <span className="font-bold text-ink">{card.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer discret ── */}
      <div className="relative z-10 mt-10 flex w-full max-w-2xl flex-col items-center justify-between gap-2 border-t border-line px-4 py-3 text-xs text-muted sm:flex-row">
        <span>
          <strong className="text-ink">Health-e</strong>
          {" "}— Ces évaluations ne remplacent pas un professionnel de santé.
        </span>
        <div className="flex items-center gap-3">
          <Link to="/confidentialite" className="text-muted no-underline transition-colors hover:text-accent">
            Confidentialité
          </Link>
          <span>·</span>
          <Link to="/professionals" className="text-muted no-underline transition-colors hover:text-accent">
            Professionnels
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OptimizedHomePage;
