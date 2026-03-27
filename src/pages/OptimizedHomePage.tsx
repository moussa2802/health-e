import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ArrowRight, Sparkles, Heart, Brain, ChevronDown, Zap, Users, Target, Shield } from "lucide-react";

/* ─────────────────────────────────────────────
   Animated counter hook
───────────────────────────────────────────── */
function useCountUp(target: number, duration = 1600, active = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, active]);
  return count;
}

/* ─────────────────────────────────────────────
   Floating blob component
───────────────────────────────────────────── */
const Blob: React.FC<{ className: string }> = ({ className }) => (
  <div className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`} />
);

/* ─────────────────────────────────────────────
   Floating particle
───────────────────────────────────────────── */
const Particle: React.FC<{ delay: number; x: number; size: number; color: string }> = ({ delay, x, size, color }) => (
  <div
    className="absolute bottom-0 rounded-full pointer-events-none opacity-0"
    style={{
      left: `${x}%`,
      width: size,
      height: size,
      background: color,
      animation: `floatUp 4s ease-in ${delay}s infinite`,
    }}
  />
);

/* ─────────────────────────────────────────────
   Scale badge pill
───────────────────────────────────────────── */
const Badge: React.FC<{ label: string; accent: string }> = ({ label, accent }) => (
  <span
    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border"
    style={{ borderColor: `${accent}40`, color: accent, background: `${accent}12` }}
  >
    {label}
  </span>
);

/* ─────────────────────────────────────────────
   Step card
───────────────────────────────────────────── */
const StepCard: React.FC<{
  number: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  delay: string;
  visible: boolean;
}> = ({ number, icon, title, desc, delay, visible }) => (
  <div
    className="flex flex-col items-center text-center transition-all duration-700"
    style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(32px)",
      transitionDelay: delay,
    }}
  >
    {/* connector line (hidden on mobile) */}
    <div className="relative mb-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center text-3xl shadow-lg">
        {icon}
      </div>
      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-white text-xs font-bold flex items-center justify-center shadow">
        {number}
      </span>
    </div>
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    <p className="text-sm text-white/60 leading-relaxed max-w-[180px]">{desc}</p>
  </div>
);

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
const OptimizedHomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  /* visibility refs for scroll animations */
  const howRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);
  const compatRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  const [howVisible, setHowVisible] = useState(false);
  const [catVisible, setCatVisible] = useState(false);
  const [compatVisible, setCompatVisible] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);

  /* hero typing effect */
  const headlines = [
    "Découvre qui tu es vraiment.",
    "Explore ton profil intérieur.",
    "Comprends tes émotions.",
    "Commence ton voyage.",
  ];
  const [hlIndex, setHlIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    const full = headlines[hlIndex];
    if (typing) {
      if (displayText.length < full.length) {
        const t = setTimeout(() => setDisplayText(full.slice(0, displayText.length + 1)), 45);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setTyping(false), 2200);
        return () => clearTimeout(t);
      }
    } else {
      if (displayText.length > 0) {
        const t = setTimeout(() => setDisplayText(displayText.slice(0, -1)), 22);
        return () => clearTimeout(t);
      } else {
        setHlIndex((i) => (i + 1) % headlines.length);
        setTyping(true);
      }
    }
  });

  /* intersection observers */
  useEffect(() => {
    const obs = (ref: React.RefObject<HTMLDivElement | null>, setter: (v: boolean) => void) =>
      new IntersectionObserver(([e]) => { if (e.isIntersecting) setter(true); }, { threshold: 0.15 });
    const o1 = obs(howRef, setHowVisible);    howRef.current && o1.observe(howRef.current);
    const o2 = obs(catRef, setCatVisible);    catRef.current && o2.observe(catRef.current);
    const o3 = obs(compatRef, setCompatVisible); compatRef.current && o3.observe(compatRef.current);
    const o4 = obs(statsRef, setStatsVisible);   statsRef.current && o4.observe(statsRef.current);
    return () => { o1.disconnect(); o2.disconnect(); o3.disconnect(); o4.disconnect(); };
  }, []);

  const count1 = useCountUp(23, 1400, statsVisible);
  const count2 = useCountUp(5, 1200, statsVisible);

  const handleCTA = () => navigate(isAuthenticated ? "/assessment/select" : "/assessment");

  /* ─── particles ─── */
  const particles = Array.from({ length: 12 }, (_, i) => ({
    delay: i * 0.35,
    x: (i * 8.3) % 100,
    size: 4 + (i % 4) * 3,
    color: i % 3 === 0 ? "#a855f7" : i % 3 === 1 ? "#ec4899" : "#f97316",
  }));

  return (
    <>
      {/* ── global keyframes ── */}
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1); opacity: 0; }
          10%  { opacity: 0.6; }
          90%  { opacity: 0.2; }
          100% { transform: translateY(-80vh) scale(0.4); opacity: 0; }
        }
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: .18; }
          50%       { transform: scale(1.08); opacity: .28; }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(6px); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes card-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-8px) rotate(0.5deg); }
          66%       { transform: translateY(-4px) rotate(-0.5deg); }
        }
        .shimmer-text {
          background: linear-gradient(90deg, #fff 0%, #f0abfc 30%, #fff 60%, #fdba74 90%, #fff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3.5s linear infinite;
        }
        .card-float { animation: card-float 6s ease-in-out infinite; }
        .card-float-delay { animation: card-float 6s ease-in-out 2s infinite; }
        .blob-pulse { animation: pulse-slow 7s ease-in-out infinite; }
        .arrow-bounce { animation: bounce-subtle 1.6s ease-in-out infinite; }
        .glass {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .glass-dark {
          background: rgba(0,0,0,0.25);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.08);
        }
      `}</style>

      <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0f0c29 0%, #1a0533 40%, #24243e 100%)" }}>

        {/* ═══════════════════ HERO ═══════════════════ */}
        <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 pt-16">

          {/* background blobs */}
          <Blob className="w-[600px] h-[600px] bg-violet-600 top-[-150px] left-[-200px] blob-pulse" />
          <Blob className="w-[500px] h-[500px] bg-pink-600 bottom-[-100px] right-[-150px] blob-pulse" style={{ animationDelay: "3.5s" } as React.CSSProperties} />
          <Blob className="w-[300px] h-[300px] bg-orange-500 top-[40%] left-[60%] blob-pulse" style={{ animationDelay: "1.8s" } as React.CSSProperties} />

          {/* floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p, i) => <Particle key={i} {...p} />)}
          </div>

          {/* pill badge */}
          <div
            className="glass mb-8 px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium"
            style={{ opacity: 1, animation: "none" }}
          >
            <Sparkles size={14} className="text-violet-400" />
            <span className="text-violet-300">23 évaluations scientifiquement validées</span>
            <span className="text-white/30 mx-1">•</span>
            <span className="text-pink-300">100% confidentiel</span>
          </div>

          {/* main headline */}
          <h1 className="text-center font-black mb-4" style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)", lineHeight: 1.1 }}>
            <span className="shimmer-text">{displayText}</span>
            <span className="text-violet-400 animate-pulse">|</span>
            <br />
            <span className="text-white/90" style={{ fontSize: "clamp(1.4rem, 3.5vw, 2.5rem)", fontWeight: 500 }}>
              Ton voyage intérieur commence ici.
            </span>
          </h1>

          {/* sub */}
          <p className="text-white/60 text-center max-w-xl mb-10 leading-relaxed" style={{ fontSize: "clamp(0.95rem, 2vw, 1.1rem)" }}>
            Des tests en santé mentale et sexuelle, adaptés à ta réalité. Bienveillants, scientifiques, et pensés pour toi.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <button
              onClick={handleCTA}
              className="group relative flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg text-white shadow-2xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-violet-500/40"
              style={{ background: "linear-gradient(135deg, #7c3aed, #db2777, #ea580c)", backgroundSize: "200%", minWidth: 260 }}
            >
              <span className="relative z-10">✨ Commencer mon évaluation</span>
              <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "linear-gradient(135deg, #6d28d9, #be185d, #c2410c)" }} />
            </button>

            <Link
              to="/assessment/compatibility"
              className="glass flex items-center gap-2 px-6 py-4 rounded-2xl text-white/80 hover:text-white font-medium transition-all duration-300 hover:scale-105"
            >
              💑 Tester la compatibilité
            </Link>
          </div>

          {/* floating mini-cards */}
          <div className="relative w-full max-w-3xl mx-auto mt-16 h-32 hidden md:block">
            <div className="card-float absolute left-4 top-0 glass rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg">
              <span className="text-2xl">🧠</span>
              <div>
                <div className="text-white font-semibold text-sm">Santé Mentale</div>
                <div className="text-white/50 text-xs">14 évaluations</div>
              </div>
            </div>
            <div className="card-float-delay absolute right-4 top-4 glass rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg">
              <span className="text-2xl">💋</span>
              <div>
                <div className="text-white font-semibold text-sm">Santé Sexuelle</div>
                <div className="text-white/50 text-xs">9 évaluations</div>
              </div>
            </div>
            <div className="card-float absolute left-[40%] top-6 glass rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg" style={{ animation: "card-float 6s ease-in-out 1s infinite" }}>
              <span className="text-2xl">💑</span>
              <div>
                <div className="text-white font-semibold text-sm">Compatibilité</div>
                <div className="text-white/50 text-xs">Score HE-ID</div>
              </div>
            </div>
          </div>

          {/* scroll hint */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40">
            <span className="text-white text-xs">Découvrir</span>
            <ChevronDown size={18} className="text-white arrow-bounce" />
          </div>
        </section>

        {/* ═══════════════════ STATS BAR ═══════════════════ */}
        <section ref={statsRef} className="py-10 px-4" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: `${count1}`, label: "Échelles validées", icon: "📊" },
              { value: `${count2}`, label: "Dimensions analysées", icon: "🔍" },
              { value: "5 min", label: "Pour commencer", icon: "⚡" },
              { value: "100%", label: "Confidentiel", icon: "🔒" },
            ].map((s, i) => (
              <div
                key={i}
                className="transition-all duration-700"
                style={{
                  opacity: statsVisible ? 1 : 0,
                  transform: statsVisible ? "translateY(0)" : "translateY(20px)",
                  transitionDelay: `${i * 120}ms`,
                }}
              >
                <div className="text-3xl mb-1">{s.icon}</div>
                <div className="text-3xl font-black text-white">{s.value}</div>
                <div className="text-white/50 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════ CATEGORIES ═══════════════════ */}
        <section ref={catRef} className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            {/* heading */}
            <div
              className="text-center mb-14 transition-all duration-700"
              style={{ opacity: catVisible ? 1 : 0, transform: catVisible ? "translateY(0)" : "translateY(24px)" }}
            >
              <span className="text-violet-400 font-semibold text-sm uppercase tracking-widest">Explorer</span>
              <h2 className="text-3xl md:text-4xl font-black text-white mt-2">
                Choisis ton domaine d'exploration
              </h2>
              <p className="text-white/50 mt-3 max-w-lg mx-auto">
                Deux univers, des dizaines de clés pour mieux te comprendre — et comprendre les autres.
              </p>
            </div>

            {/* two big cards */}
            <div className="grid md:grid-cols-2 gap-6">

              {/* Mental Health Card */}
              <div
                className="group relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-violet-500/30"
                style={{
                  opacity: catVisible ? 1 : 0,
                  transform: catVisible ? "translateX(0)" : "translateX(-40px)",
                  transition: "all 0.7s cubic-bezier(.22,1,.36,1)",
                  transitionDelay: "0.1s",
                  background: "linear-gradient(145deg, rgba(124,58,237,0.25), rgba(168,85,247,0.1))",
                  border: "1px solid rgba(124,58,237,0.3)",
                }}
                onClick={() => navigate("/assessment/select?cat=mental_health")}
              >
                {/* bg glow */}
                <div className="absolute top-[-60px] right-[-60px] w-48 h-48 rounded-full blur-3xl opacity-30 bg-violet-500 group-hover:opacity-50 transition-opacity" />

                <div className="relative p-8">
                  {/* emoji + label */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <span className="text-6xl filter drop-shadow-lg">🧠</span>
                    </div>
                    <span className="glass px-3 py-1 rounded-full text-violet-300 text-xs font-semibold">14 échelles</span>
                  </div>

                  <h3 className="text-2xl font-black text-white mb-2">Santé Mentale</h3>
                  <p className="text-white/60 text-sm mb-6 leading-relaxed">
                    Anxiété, résilience, estime de soi, attachement, traumatismes, pressions sociales… Explore les coulisses de ton fonctionnement émotionnel.
                  </p>

                  {/* badges */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {["Anxiété", "Dépression", "Résilience", "Attachement", "PTSD", "Pression sociale"].map(b => (
                      <Badge key={b} label={b} accent="#a855f7" />
                    ))}
                    <Badge label="+8 autres" accent="#a855f7" />
                  </div>

                  <div className="flex items-center gap-2 text-violet-400 font-semibold text-sm group-hover:gap-3 transition-all">
                    Explorer la santé mentale <ArrowRight size={16} />
                  </div>
                </div>
              </div>

              {/* Sexual Health Card */}
              <div
                className="group relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-pink-500/30"
                style={{
                  opacity: catVisible ? 1 : 0,
                  transform: catVisible ? "translateX(0)" : "translateX(40px)",
                  transition: "all 0.7s cubic-bezier(.22,1,.36,1)",
                  transitionDelay: "0.2s",
                  background: "linear-gradient(145deg, rgba(219,39,119,0.25), rgba(244,114,182,0.1))",
                  border: "1px solid rgba(219,39,119,0.3)",
                }}
                onClick={() => navigate("/assessment/select?cat=sexual_health")}
              >
                {/* bg glow */}
                <div className="absolute top-[-60px] right-[-60px] w-48 h-48 rounded-full blur-3xl opacity-30 bg-pink-500 group-hover:opacity-50 transition-opacity" />

                <div className="relative p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <span className="text-6xl filter drop-shadow-lg">💋</span>
                    </div>
                    <span className="glass px-3 py-1 rounded-full text-pink-300 text-xs font-semibold">9 échelles</span>
                  </div>

                  <h3 className="text-2xl font-black text-white mb-2">Santé Sexuelle</h3>
                  <p className="text-white/60 text-sm mb-6 leading-relaxed">
                    Satisfaction, désir, intimité, fonctionnement sexuel, normes culturelles… Comprends ta vie intime sans tabous ni jugements.
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {["Satisfaction", "Désir", "Intimité", "Fonctionnement", "Normes sociales"].map(b => (
                      <Badge key={b} label={b} accent="#ec4899" />
                    ))}
                    <Badge label="+4 autres" accent="#ec4899" />
                  </div>

                  <div className="flex items-center gap-2 text-pink-400 font-semibold text-sm group-hover:gap-3 transition-all">
                    Explorer la santé sexuelle <ArrowRight size={16} />
                  </div>
                </div>
              </div>
            </div>

            {/* CTA below cards */}
            <div
              className="text-center mt-10 transition-all duration-700"
              style={{ opacity: catVisible ? 1 : 0, transitionDelay: "0.4s" }}
            >
              <button
                onClick={handleCTA}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <Zap size={16} className="text-yellow-400" />
                Ou tout explorer en une fois
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
        <section ref={howRef} className="py-20 px-4" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="max-w-4xl mx-auto">
            <div
              className="text-center mb-14 transition-all duration-700"
              style={{ opacity: howVisible ? 1 : 0, transform: howVisible ? "translateY(0)" : "translateY(24px)" }}
            >
              <span className="text-orange-400 font-semibold text-sm uppercase tracking-widest">Simple & rapide</span>
              <h2 className="text-3xl md:text-4xl font-black text-white mt-2">
                En 3 étapes, tout change
              </h2>
              <p className="text-white/50 mt-3">
                Pas de compte nécessaire pour commencer. Juste toi et tes réponses.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* connector line on desktop */}
              <div
                className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px transition-all duration-1000"
                style={{
                  background: "linear-gradient(90deg, #7c3aed, #db2777, #ea580c)",
                  opacity: howVisible ? 0.4 : 0,
                  transitionDelay: "0.5s",
                }}
              />

              <StepCard
                number="1" visible={howVisible} delay="0.1s"
                icon="🎯"
                title="Je choisis mes items"
                desc="Entre 2 et 10 évaluations parmi 23 échelles validées."
              />
              <StepCard
                number="2" visible={howVisible} delay="0.25s"
                icon="💬"
                title="Je réponds aux questions"
                desc="Des questions simples, bienveillantes. Pas de bonnes ni mauvaises réponses."
              />
              <StepCard
                number="3" visible={howVisible} delay="0.4s"
                icon="🌟"
                title="Je découvre mon profil"
                desc="Résultats détaillés + interprétation IA personnalisée en français."
              />
            </div>

            {/* bonus pill */}
            <div
              className="mt-12 flex justify-center transition-all duration-700"
              style={{ opacity: howVisible ? 1 : 0, transitionDelay: "0.6s" }}
            >
              <div className="glass px-6 py-3 rounded-2xl flex items-center gap-3 text-sm text-white/70">
                <Shield size={16} className="text-green-400 flex-shrink-0" />
                Tes réponses ne sont jamais vendues ni partagées. Elles t'appartiennent.
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════ COMPATIBILITY ═══════════════════ */}
        <section ref={compatRef} className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div
              className="relative rounded-3xl overflow-hidden transition-all duration-700"
              style={{
                opacity: compatVisible ? 1 : 0,
                transform: compatVisible ? "translateY(0) scale(1)" : "translateY(40px) scale(0.97)",
                background: "linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(219,39,119,0.3) 50%, rgba(234,88,12,0.2) 100%)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {/* bg decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20 bg-pink-400" />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-3xl opacity-20 bg-violet-400" />

              <div className="relative p-8 md:p-12">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  {/* left */}
                  <div>
                    <div className="text-5xl mb-4">💑</div>
                    <span className="text-pink-300 font-semibold text-sm uppercase tracking-widest">Nouveau</span>
                    <h2 className="text-3xl md:text-4xl font-black text-white mt-2 mb-4">
                      Es-tu compatible avec les gens qui t'entourent ?
                    </h2>
                    <p className="text-white/60 mb-8 leading-relaxed">
                      Compare ton ID Health-e avec celui d'un·e ami·e, d'un partenaire ou d'un proche. Découvrez votre score de compatibilité sur 5 dimensions clés — et ce que vous pouvez construire ensemble.
                    </p>

                    <div className="flex flex-wrap gap-3 mb-8">
                      {["💛 Émotionnel", "🧩 Psychologique", "🗣 Communication", "🌱 Santé mentale", "🔥 Sexualité"].map(d => (
                        <span key={d} className="glass px-3 py-1.5 rounded-xl text-white/70 text-sm">{d}</span>
                      ))}
                    </div>

                    <Link
                      to="/assessment/compatibility"
                      className="group inline-flex items-center gap-3 px-7 py-3.5 rounded-2xl font-bold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-pink-500/40"
                      style={{ background: "linear-gradient(135deg, #db2777, #7c3aed)" }}
                    >
                      <Users size={18} />
                      Tester notre compatibilité
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>

                  {/* right — mock ID cards */}
                  <div className="relative flex flex-col items-center gap-4">
                    <div className="glass-dark rounded-2xl p-5 w-full max-w-xs shadow-xl" style={{ transform: "rotate(-2deg)" }}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: "linear-gradient(135deg, #7c3aed, #db2777)" }}>A</div>
                        <div>
                          <div className="text-white font-semibold text-sm">Awa</div>
                          <div className="text-violet-400 font-mono text-xs">HE-2026-K7RT</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[78, 65, 82, 71, 90].map((v, i) => (
                          <div key={i} className="text-center">
                            <div className="h-1 rounded-full mb-1" style={{ background: `rgba(168,85,247,${v/100})` }} />
                            <span className="text-white/40 text-[10px]">{v}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-sm z-10"
                      style={{ background: "linear-gradient(135deg, #db2777, #ea580c)" }}>❤️</div>

                    <div className="glass-dark rounded-2xl p-5 w-full max-w-xs shadow-xl" style={{ transform: "rotate(2deg)" }}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: "linear-gradient(135deg, #db2777, #ea580c)" }}>M</div>
                        <div>
                          <div className="text-white font-semibold text-sm">Moussa</div>
                          <div className="text-pink-400 font-mono text-xs">HE-2026-P2MN</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[85, 70, 75, 68, 88].map((v, i) => (
                          <div key={i} className="text-center">
                            <div className="h-1 rounded-full mb-1" style={{ background: `rgba(236,72,153,${v/100})` }} />
                            <span className="text-white/40 text-[10px]">{v}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* score badge */}
                    <div className="absolute top-1/2 -right-4 -translate-y-1/2 glass rounded-2xl px-4 py-3 text-center shadow-2xl">
                      <div className="text-3xl font-black" style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>82%</div>
                      <div className="text-white/50 text-xs">compatibles</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════ FINAL CTA ═══════════════════ */}
        <section className="py-20 px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="text-5xl mb-6">🚀</div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              Prêt·e à te découvrir ?
            </h2>
            <p className="text-white/50 mb-10 leading-relaxed">
              C'est gratuit, anonyme, et ça prend moins de 20 minutes. Des milliers de personnes ont déjà commencé leur voyage.
            </p>
            <button
              onClick={handleCTA}
              className="group relative inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-xl text-white shadow-2xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-violet-500/50"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #ea580c 100%)", backgroundSize: "200%" }}
            >
              ✨ Commencer maintenant
              <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform duration-300" />
            </button>
            <p className="mt-4 text-white/30 text-sm">Aucun compte requis · Résultats immédiats</p>
          </div>
        </section>

        {/* ═══════════════════ FOOTER ═══════════════════ */}
        <footer className="py-10 px-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Heart size={16} className="text-pink-500" />
              <span className="text-white/60 text-sm font-semibold">Health-e</span>
            </div>

            <p className="text-white/30 text-xs text-center max-w-md leading-relaxed">
              Les évaluations proposées ne constituent pas un diagnostic médical et ne remplacent pas une consultation auprès d'un professionnel de santé qualifié.
            </p>

            <div className="flex items-center gap-4 text-xs text-white/30">
              <Link to="/professionals" className="hover:text-white/60 transition-colors flex items-center gap-1">
                <Target size={12} />
                Espace professionnels
              </Link>
              <span>•</span>
              <Link to="/privacy" className="hover:text-white/60 transition-colors">Confidentialité</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default OptimizedHomePage;
