import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ArrowRight, Sparkles, Heart, ChevronDown, Zap, Users, Target, Shield } from "lucide-react";

/* ─────────────────────────────────────────────
   Palette — calée sur le header blue-500→teal-400
   PRIMARY  : #3B82F6  (blue-500)
   TEAL     : #2DD4BF  (teal-400)
   CYAN     : #06B6D4  (cyan-500)
   NAVY     : #0A2342
   BG LIGHT : #F0F9FF / #F8FAFF
───────────────────────────────────────────── */

/* ── Animated counter ── */
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

/* ── Light blob ── */
const Blob: React.FC<{ className: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} style={style} />
);

/* ── Particle ── */
const Particle: React.FC<{ delay: number; x: number; size: number; color: string }> = ({ delay, x, size, color }) => (
  <div
    className="absolute bottom-0 rounded-full pointer-events-none opacity-0"
    style={{ left: `${x}%`, width: size, height: size, background: color, animation: `floatUp 5s ease-in ${delay}s infinite` }}
  />
);

/* ── Badge pill ── */
const Badge: React.FC<{ label: string; accent: string }> = ({ label, accent }) => (
  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border"
    style={{ borderColor: `${accent}35`, color: accent, background: `${accent}0F` }}>
    {label}
  </span>
);

/* ── Step card — light bg ── */
const StepCard: React.FC<{
  number: string; icon: React.ReactNode; title: string; desc: string; delay: string; visible: boolean;
}> = ({ number, icon, title, desc, delay, visible }) => (
  <div className="flex flex-col items-center text-center transition-all duration-700"
    style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(32px)", transitionDelay: delay }}>
    <div className="relative mb-6">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-md"
        style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(45,212,191,0.12))", border: "1.5px solid rgba(59,130,246,0.2)" }}>
        {icon}
      </div>
      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shadow"
        style={{ background: "linear-gradient(135deg, #3B82F6, #2DD4BF)" }}>
        {number}
      </span>
    </div>
    <h3 className="text-lg font-bold mb-2" style={{ color: "#0A2342" }}>{title}</h3>
    <p className="text-sm leading-relaxed max-w-[180px]" style={{ color: "#64748B" }}>{desc}</p>
  </div>
);

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
const OptimizedHomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const howRef    = useRef<HTMLDivElement>(null);
  const catRef    = useRef<HTMLDivElement>(null);
  const compatRef = useRef<HTMLDivElement>(null);
  const statsRef  = useRef<HTMLDivElement>(null);

  const [howVisible,    setHowVisible]    = useState(false);
  const [catVisible,    setCatVisible]    = useState(false);
  const [compatVisible, setCompatVisible] = useState(false);
  const [statsVisible,  setStatsVisible]  = useState(false);

  /* typing effect */
  const headlines = [
    "Découvre qui tu es vraiment.",
    "Explore ton profil intérieur.",
    "Comprends tes émotions.",
    "Commence ton voyage.",
  ];
  const [hlIndex,      setHlIndex]      = useState(0);
  const [displayText,  setDisplayText]  = useState("");
  const [typing,       setTyping]       = useState(true);

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
        setHlIndex(i => (i + 1) % headlines.length);
        setTyping(true);
      }
    }
  });

  /* scroll observers */
  useEffect(() => {
    const obs = (ref: React.RefObject<HTMLDivElement | null>, setter: (v: boolean) => void) =>
      new IntersectionObserver(([e]) => { if (e.isIntersecting) setter(true); }, { threshold: 0.15 });
    const o1 = obs(howRef, setHowVisible);       howRef.current    && o1.observe(howRef.current);
    const o2 = obs(catRef, setCatVisible);       catRef.current    && o2.observe(catRef.current);
    const o3 = obs(compatRef, setCompatVisible); compatRef.current && o3.observe(compatRef.current);
    const o4 = obs(statsRef,  setStatsVisible);  statsRef.current  && o4.observe(statsRef.current);
    return () => { o1.disconnect(); o2.disconnect(); o3.disconnect(); o4.disconnect(); };
  }, []);

  const count1 = useCountUp(23, 1400, statsVisible);
  const count2 = useCountUp(5,  1200, statsVisible);

  const handleCTA = () => navigate(isAuthenticated ? "/assessment/select" : "/assessment");

  const particles = Array.from({ length: 14 }, (_, i) => ({
    delay: i * 0.3,
    x: (i * 7.4) % 100,
    size: 4 + (i % 4) * 3,
    color: i % 3 === 0 ? "#3B82F6" : i % 3 === 1 ? "#2DD4BF" : "#06B6D4",
  }));

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1); opacity: 0; }
          10%  { opacity: 0.45; }
          90%  { opacity: 0.12; }
          100% { transform: translateY(-75vh) scale(0.4); opacity: 0; }
        }
        @keyframes pulse-blob {
          0%, 100% { transform: scale(1); opacity: .12; }
          50%       { transform: scale(1.1); opacity: .22; }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(6px); }
        }
        @keyframes shimmer-blue {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes card-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-7px) rotate(0.4deg); }
          66%       { transform: translateY(-3px) rotate(-0.4deg); }
        }

        .shimmer-text {
          background: linear-gradient(90deg,
            #0A2342 0%, #3B82F6 25%, #06B6D4 50%, #2DD4BF 75%, #0A2342 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer-blue 3.5s linear infinite;
        }
        .card-float       { animation: card-float 6s ease-in-out infinite; }
        .card-float-delay { animation: card-float 6s ease-in-out 2s infinite; }
        .blob-pulse       { animation: pulse-blob 7s ease-in-out infinite; }
        .arrow-bounce     { animation: bounce-subtle 1.6s ease-in-out infinite; }

        /* light glassmorphism for hero cards */
        .glass-light {
          background: rgba(255,255,255,0.75);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(59,130,246,0.15);
          box-shadow: 0 4px 24px rgba(59,130,246,0.08);
        }
        /* dark-navy glass for compatibility section */
        .glass-navy {
          background: rgba(10,35,66,0.55);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(59,130,246,0.2);
        }
      `}</style>

      <div className="min-h-screen" style={{ background: "#F8FAFF" }}>

        {/* ═══════════════════ HERO ═══════════════════ */}
        <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 pt-16"
          style={{ background: "linear-gradient(160deg, #EFF6FF 0%, #F0FDFF 45%, #ECFEFF 100%)" }}>

          {/* subtle blobs — light blue/teal */}
          <Blob className="w-[550px] h-[550px] blob-pulse"
            style={{ background: "#3B82F6", top: -120, left: -180, opacity: 0.1 }} />
          <Blob className="w-[450px] h-[450px] blob-pulse"
            style={{ background: "#2DD4BF", bottom: -80, right: -120, opacity: 0.1, animationDelay: "3.5s" }} />
          <Blob className="w-[280px] h-[280px] blob-pulse"
            style={{ background: "#06B6D4", top: "38%", left: "62%", opacity: 0.08, animationDelay: "1.8s" }} />

          {/* particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p, i) => <Particle key={i} {...p} />)}
          </div>

          {/* pill badge */}
          <div className="glass-light mb-8 px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium">
            <Sparkles size={14} style={{ color: "#3B82F6" }} />
            <span style={{ color: "#0A2342" }}>23 évaluations scientifiquement validées</span>
            <span className="mx-1" style={{ color: "#94A3B8" }}>•</span>
            <span style={{ color: "#06B6D4" }}>100% confidentiel</span>
          </div>

          {/* headline */}
          <h1 className="text-center font-black mb-4" style={{ fontSize: "clamp(2.4rem,6vw,4.5rem)", lineHeight: 1.1 }}>
            <span className="shimmer-text">{displayText}</span>
            <span className="animate-pulse" style={{ color: "#3B82F6" }}>|</span>
            <br />
            <span style={{ fontSize: "clamp(1.4rem,3.5vw,2.5rem)", fontWeight: 500, color: "#1E3A5F" }}>
              Ton voyage intérieur commence ici.
            </span>
          </h1>

          {/* sub */}
          <p className="text-center max-w-xl mb-10 leading-relaxed"
            style={{ fontSize: "clamp(0.95rem,2vw,1.1rem)", color: "#475569" }}>
            Des tests en santé mentale et sexuelle, adaptés à ta réalité.
            Bienveillants, scientifiques, et pensés pour toi.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <button
              onClick={handleCTA}
              className="group relative flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg text-white shadow-xl overflow-hidden transition-all duration-300 hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #3B82F6, #2DD4BF)",
                boxShadow: "0 8px 32px rgba(59,130,246,0.35)",
                minWidth: 260,
              }}
            >
              <span className="relative z-10">✨ Commencer mon évaluation</span>
              <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "linear-gradient(135deg, #2563EB, #14B8A6)" }} />
            </button>

            <Link
              to="/assessment/compatibility"
              className="glass-light flex items-center gap-2 px-6 py-4 rounded-2xl font-medium transition-all duration-300 hover:scale-105"
              style={{ color: "#0A2342" }}
            >
              💑 Tester la compatibilité
            </Link>
          </div>

          {/* floating mini-cards */}
          <div className="relative w-full max-w-3xl mx-auto mt-16 h-32 hidden md:block">
            <div className="card-float absolute left-4 top-0 glass-light rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">🧠</span>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#0A2342" }}>Santé Mentale</div>
                <div className="text-xs" style={{ color: "#64748B" }}>14 évaluations</div>
              </div>
            </div>
            <div className="card-float-delay absolute right-4 top-4 glass-light rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">💋</span>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#0A2342" }}>Santé Sexuelle</div>
                <div className="text-xs" style={{ color: "#64748B" }}>9 évaluations</div>
              </div>
            </div>
            <div className="absolute left-[40%] top-6 glass-light rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{ animation: "card-float 6s ease-in-out 1s infinite" }}>
              <span className="text-2xl">💑</span>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#0A2342" }}>Compatibilité</div>
                <div className="text-xs" style={{ color: "#64748B" }}>Score HE-ID</div>
              </div>
            </div>
          </div>

          {/* scroll hint */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1" style={{ opacity: 0.35 }}>
            <span className="text-xs" style={{ color: "#0A2342" }}>Découvrir</span>
            <ChevronDown size={18} className="arrow-bounce" style={{ color: "#3B82F6" }} />
          </div>
        </section>

        {/* ═══════════════════ STATS BAR ═══════════════════ */}
        <section ref={statsRef} className="py-10 px-4 bg-white border-y"
          style={{ borderColor: "rgba(59,130,246,0.1)" }}>
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: `${count1}`, label: "Échelles validées",    icon: "📊" },
              { value: `${count2}`, label: "Dimensions analysées", icon: "🔍" },
              { value: "5 min",     label: "Pour commencer",       icon: "⚡" },
              { value: "100%",      label: "Confidentiel",         icon: "🔒" },
            ].map((s, i) => (
              <div key={i} className="transition-all duration-700"
                style={{
                  opacity: statsVisible ? 1 : 0,
                  transform: statsVisible ? "translateY(0)" : "translateY(20px)",
                  transitionDelay: `${i * 120}ms`,
                }}>
                <div className="text-3xl mb-1">{s.icon}</div>
                <div className="text-3xl font-black" style={{ color: "#0A2342" }}>{s.value}</div>
                <div className="text-sm mt-1" style={{ color: "#64748B" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════ CATEGORIES ═══════════════════ */}
        <section ref={catRef} className="py-20 px-4" style={{ background: "#F0F9FF" }}>
          <div className="max-w-5xl mx-auto">

            <div className="text-center mb-14 transition-all duration-700"
              style={{ opacity: catVisible ? 1 : 0, transform: catVisible ? "translateY(0)" : "translateY(24px)" }}>
              <span className="font-semibold text-sm uppercase tracking-widest" style={{ color: "#3B82F6" }}>Explorer</span>
              <h2 className="text-3xl md:text-4xl font-black mt-2" style={{ color: "#0A2342" }}>
                Choisis ton domaine d'exploration
              </h2>
              <p className="mt-3 max-w-lg mx-auto" style={{ color: "#64748B" }}>
                Deux univers, des dizaines de clés pour mieux te comprendre — et comprendre les autres.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">

              {/* Mental Health */}
              <div
                className="group relative rounded-3xl overflow-hidden cursor-pointer bg-white transition-all duration-500 hover:scale-[1.02]"
                style={{
                  opacity: catVisible ? 1 : 0,
                  transform: catVisible ? "translateX(0)" : "translateX(-40px)",
                  transition: "all 0.7s cubic-bezier(.22,1,.36,1)",
                  transitionDelay: "0.1s",
                  border: "1.5px solid rgba(59,130,246,0.2)",
                  boxShadow: "0 4px 24px rgba(59,130,246,0.08)",
                }}
                onClick={() => navigate("/assessment/select?cat=mental_health")}
              >
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: "#3B82F6", opacity: 0.06, top: -40, right: -40 }} />

                <div className="relative p-8">
                  <div className="flex items-start justify-between mb-6">
                    <span className="text-6xl filter drop-shadow-sm">🧠</span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background: "rgba(59,130,246,0.08)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.2)" }}>
                      14 échelles
                    </span>
                  </div>
                  <h3 className="text-2xl font-black mb-2" style={{ color: "#0A2342" }}>Santé Mentale</h3>
                  <p className="text-sm mb-6 leading-relaxed" style={{ color: "#64748B" }}>
                    Anxiété, résilience, estime de soi, attachement, traumatismes, pressions sociales…
                    Explore les coulisses de ton fonctionnement émotionnel.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {["Anxiété", "Dépression", "Résilience", "Attachement", "PTSD", "Pression sociale"].map(b => (
                      <Badge key={b} label={b} accent="#3B82F6" />
                    ))}
                    <Badge label="+8 autres" accent="#3B82F6" />
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-sm group-hover:gap-3 transition-all"
                    style={{ color: "#3B82F6" }}>
                    Explorer la santé mentale <ArrowRight size={16} />
                  </div>
                </div>
              </div>

              {/* Sexual Health */}
              <div
                className="group relative rounded-3xl overflow-hidden cursor-pointer bg-white transition-all duration-500 hover:scale-[1.02]"
                style={{
                  opacity: catVisible ? 1 : 0,
                  transform: catVisible ? "translateX(0)" : "translateX(40px)",
                  transition: "all 0.7s cubic-bezier(.22,1,.36,1)",
                  transitionDelay: "0.2s",
                  border: "1.5px solid rgba(45,212,191,0.25)",
                  boxShadow: "0 4px 24px rgba(45,212,191,0.08)",
                }}
                onClick={() => navigate("/assessment/select?cat=sexual_health")}
              >
                <div className="absolute rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: "#2DD4BF", opacity: 0.07, width: 160, height: 160, top: -40, right: -40 }} />

                <div className="relative p-8">
                  <div className="flex items-start justify-between mb-6">
                    <span className="text-6xl filter drop-shadow-sm">💋</span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background: "rgba(45,212,191,0.08)", color: "#0D9488", border: "1px solid rgba(45,212,191,0.3)" }}>
                      9 échelles
                    </span>
                  </div>
                  <h3 className="text-2xl font-black mb-2" style={{ color: "#0A2342" }}>Santé Sexuelle</h3>
                  <p className="text-sm mb-6 leading-relaxed" style={{ color: "#64748B" }}>
                    Satisfaction, désir, intimité, fonctionnement sexuel, normes culturelles…
                    Comprends ta vie intime sans tabous ni jugements.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {["Satisfaction", "Désir", "Intimité", "Fonctionnement", "Normes sociales"].map(b => (
                      <Badge key={b} label={b} accent="#0D9488" />
                    ))}
                    <Badge label="+4 autres" accent="#0D9488" />
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-sm group-hover:gap-3 transition-all"
                    style={{ color: "#0D9488" }}>
                    Explorer la santé sexuelle <ArrowRight size={16} />
                  </div>
                </div>
              </div>
            </div>

            {/* CTA below */}
            <div className="text-center mt-10 transition-all duration-700"
              style={{ opacity: catVisible ? 1 : 0, transitionDelay: "0.4s" }}>
              <button
                onClick={handleCTA}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
                style={{
                  background: "white",
                  border: "1.5px solid rgba(59,130,246,0.3)",
                  color: "#3B82F6",
                  boxShadow: "0 2px 12px rgba(59,130,246,0.1)",
                }}
              >
                <Zap size={16} style={{ color: "#06B6D4" }} />
                Ou tout explorer en une fois
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
        <section ref={howRef} className="py-20 px-4 bg-white">
          <div className="max-w-4xl mx-auto">

            <div className="text-center mb-14 transition-all duration-700"
              style={{ opacity: howVisible ? 1 : 0, transform: howVisible ? "translateY(0)" : "translateY(24px)" }}>
              <span className="font-semibold text-sm uppercase tracking-widest" style={{ color: "#06B6D4" }}>Simple & rapide</span>
              <h2 className="text-3xl md:text-4xl font-black mt-2" style={{ color: "#0A2342" }}>
                En 3 étapes, tout change
              </h2>
              <p className="mt-3" style={{ color: "#64748B" }}>
                Pas de compte nécessaire pour commencer. Juste toi et tes réponses.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* connector */}
              <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px transition-all duration-1000"
                style={{
                  background: "linear-gradient(90deg, #3B82F6, #2DD4BF)",
                  opacity: howVisible ? 0.35 : 0,
                  transitionDelay: "0.5s",
                }} />
              <StepCard number="1" visible={howVisible} delay="0.1s"  icon="🎯" title="Je choisis mes items"       desc="Entre 2 et 10 évaluations parmi 23 échelles validées." />
              <StepCard number="2" visible={howVisible} delay="0.25s" icon="💬" title="Je réponds aux questions"   desc="Des questions simples, bienveillantes. Pas de bonnes ni mauvaises réponses." />
              <StepCard number="3" visible={howVisible} delay="0.4s"  icon="🌟" title="Je découvre mon profil"    desc="Résultats détaillés + interprétation IA personnalisée en français." />
            </div>

            {/* privacy pill */}
            <div className="mt-12 flex justify-center transition-all duration-700"
              style={{ opacity: howVisible ? 1 : 0, transitionDelay: "0.6s" }}>
              <div className="flex items-center gap-3 px-6 py-3 rounded-2xl text-sm"
                style={{ background: "#F0FDF4", border: "1px solid rgba(34,197,94,0.2)", color: "#166534" }}>
                <Shield size={16} className="text-green-500 flex-shrink-0" />
                Tes réponses ne sont jamais vendues ni partagées. Elles t'appartiennent.
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════ COMPATIBILITY ═══════════════════ */}
        <section ref={compatRef} className="py-20 px-4" style={{ background: "#EFF6FF" }}>
          <div className="max-w-4xl mx-auto">
            <div
              className="relative rounded-3xl overflow-hidden transition-all duration-700"
              style={{
                opacity: compatVisible ? 1 : 0,
                transform: compatVisible ? "translateY(0) scale(1)" : "translateY(40px) scale(0.97)",
                background: "linear-gradient(135deg, #0A2342 0%, #0E3A6B 55%, #0C4A6E 100%)",
                border: "1px solid rgba(59,130,246,0.3)",
                boxShadow: "0 20px 60px rgba(10,35,66,0.3)",
              }}
            >
              {/* bg glows — blue/cyan, no pink */}
              <div className="absolute rounded-full blur-3xl pointer-events-none"
                style={{ background: "#3B82F6", opacity: 0.15, width: 280, height: 280, top: -60, right: -60 }} />
              <div className="absolute rounded-full blur-3xl pointer-events-none"
                style={{ background: "#2DD4BF", opacity: 0.12, width: 220, height: 220, bottom: -40, left: -40 }} />

              <div className="relative p-8 md:p-12">
                <div className="grid md:grid-cols-2 gap-8 items-center">

                  {/* left */}
                  <div>
                    <div className="text-5xl mb-4">💑</div>
                    <span className="font-semibold text-sm uppercase tracking-widest" style={{ color: "#2DD4BF" }}>Nouveau</span>
                    <h2 className="text-3xl md:text-4xl font-black text-white mt-2 mb-4">
                      Es-tu compatible avec les gens qui t'entourent ?
                    </h2>
                    <p className="mb-8 leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                      Compare ton ID Health-e avec celui d'un·e ami·e, d'un partenaire ou d'un proche.
                      Découvrez votre score de compatibilité sur 5 dimensions — et ce que vous pouvez construire ensemble.
                    </p>

                    <div className="flex flex-wrap gap-3 mb-8">
                      {["💛 Émotionnel", "🧩 Psychologique", "🗣 Communication", "🌱 Santé mentale", "🔥 Sexualité"].map(d => (
                        <span key={d} className="px-3 py-1.5 rounded-xl text-sm"
                          style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)", color: "rgba(255,255,255,0.75)" }}>
                          {d}
                        </span>
                      ))}
                    </div>

                    <Link
                      to="/assessment/compatibility"
                      className="group inline-flex items-center gap-3 px-7 py-3.5 rounded-2xl font-bold text-white shadow-lg transition-all duration-300 hover:scale-105"
                      style={{
                        background: "linear-gradient(135deg, #3B82F6, #2DD4BF)",
                        boxShadow: "0 8px 24px rgba(59,130,246,0.4)",
                      }}
                    >
                      <Users size={18} />
                      Tester notre compatibilité
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>

                  {/* right — mock ID cards */}
                  <div className="relative flex flex-col items-center gap-4">
                    {/* card Awa */}
                    <div className="glass-navy rounded-2xl p-5 w-full max-w-xs shadow-xl" style={{ transform: "rotate(-2deg)" }}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ background: "linear-gradient(135deg, #3B82F6, #2DD4BF)" }}>A</div>
                        <div>
                          <div className="text-white font-semibold text-sm">Awa</div>
                          <div className="font-mono text-xs" style={{ color: "#2DD4BF" }}>HE-2026-K7RT</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[78, 65, 82, 71, 90].map((v, i) => (
                          <div key={i} className="text-center">
                            <div className="h-1 rounded-full mb-1" style={{ background: `rgba(59,130,246,${v / 100})` }} />
                            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>{v}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* heart */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center z-10 text-sm"
                      style={{ background: "linear-gradient(135deg, #3B82F6, #2DD4BF)" }}>💙</div>

                    {/* card Moussa */}
                    <div className="glass-navy rounded-2xl p-5 w-full max-w-xs shadow-xl" style={{ transform: "rotate(2deg)" }}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ background: "linear-gradient(135deg, #06B6D4, #3B82F6)" }}>M</div>
                        <div>
                          <div className="text-white font-semibold text-sm">Moussa</div>
                          <div className="font-mono text-xs" style={{ color: "#06B6D4" }}>HE-2026-P2MN</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[85, 70, 75, 68, 88].map((v, i) => (
                          <div key={i} className="text-center">
                            <div className="h-1 rounded-full mb-1" style={{ background: `rgba(45,212,191,${v / 100})` }} />
                            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>{v}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* score badge */}
                    <div className="absolute top-1/2 -right-4 -translate-y-1/2 glass-navy rounded-2xl px-4 py-3 text-center shadow-2xl">
                      <div className="text-3xl font-black"
                        style={{ background: "linear-gradient(135deg, #3B82F6, #2DD4BF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        82%
                      </div>
                      <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>compatibles</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════ FINAL CTA ═══════════════════ */}
        <section className="py-20 px-4 text-center bg-white">
          <div className="max-w-2xl mx-auto">
            <div className="text-5xl mb-6">🚀</div>
            <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: "#0A2342" }}>
              Prêt·e à te découvrir ?
            </h2>
            <p className="mb-10 leading-relaxed" style={{ color: "#64748B" }}>
              C'est gratuit, anonyme, et ça prend moins de 20 minutes.
              Des milliers de personnes ont déjà commencé leur voyage.
            </p>
            <button
              onClick={handleCTA}
              className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-xl text-white shadow-xl transition-all duration-300 hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #3B82F6, #2DD4BF)",
                boxShadow: "0 12px 40px rgba(59,130,246,0.35)",
              }}
            >
              ✨ Commencer maintenant
              <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform duration-300" />
            </button>
            <p className="mt-4 text-sm" style={{ color: "#94A3B8" }}>Aucun compte requis · Résultats immédiats</p>
          </div>
        </section>

        {/* ═══════════════════ FOOTER ═══════════════════ */}
        <footer className="py-10 px-4 bg-white" style={{ borderTop: "1px solid rgba(59,130,246,0.1)" }}>
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Heart size={16} style={{ color: "#3B82F6" }} />
              <span className="text-sm font-semibold" style={{ color: "#0A2342" }}>Health-e</span>
            </div>

            <p className="text-xs text-center max-w-md leading-relaxed" style={{ color: "#94A3B8" }}>
              Les évaluations proposées ne constituent pas un diagnostic médical et ne remplacent
              pas une consultation auprès d'un professionnel de santé qualifié.
            </p>

            <div className="flex items-center gap-4 text-xs" style={{ color: "#94A3B8" }}>
              <Link to="/professionals" className="hover:text-blue-500 transition-colors flex items-center gap-1">
                <Target size={12} />
                Espace professionnels
              </Link>
              <span>•</span>
              <Link to="/privacy" className="hover:text-blue-500 transition-colors">Confidentialité</Link>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};

export default OptimizedHomePage;
