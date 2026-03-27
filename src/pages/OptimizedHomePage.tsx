import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

/* ── Emojis flottants ── */
const FLOATERS = ["🧠","💙","✨","🌱","💪","🫶","🌟","⚡","❤️","🔥","🌸","🫂"];

const Floater: React.FC<{ emoji: string; style: React.CSSProperties }> = ({ emoji, style }) => (
  <div className="absolute select-none pointer-events-none" style={style}>{emoji}</div>
);

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

  /* positions fixes pour éviter le re-render */
  const floaters = [
    { emoji: "🧠", top: "8%",  left: "6%",  size: 32, delay: 0 },
    { emoji: "💙", top: "15%", left: "88%", size: 28, delay: 0.8 },
    { emoji: "✨", top: "32%", left: "4%",  size: 22, delay: 1.4 },
    { emoji: "🌱", top: "72%", left: "92%", size: 28, delay: 0.3 },
    { emoji: "💪", top: "80%", left: "5%",  size: 24, delay: 1.1 },
    { emoji: "🫶", top: "55%", left: "94%", size: 30, delay: 0.6 },
    { emoji: "🌟", top: "90%", left: "22%", size: 22, delay: 1.9 },
    { emoji: "⚡", top: "42%", left: "91%", size: 20, delay: 2.1 },
    { emoji: "❤️", top: "25%", left: "3%",  size: 26, delay: 1.6 },
    { emoji: "🔥", top: "62%", left: "89%", size: 24, delay: 0.9 },
    { emoji: "🌸", top: "88%", left: "80%", size: 20, delay: 2.4 },
    { emoji: "🫂", top: "5%",  left: "45%", size: 26, delay: 1.2 },
  ];

  return (
    <>
      <style>{`
        @keyframes floatBob {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-10px) rotate(3deg); }
          66%       { transform: translateY(-5px) rotate(-2deg); }
        }
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0%   { transform: scale(0.85); opacity: 0; }
          70%  { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes shimmerBtn {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .he-btn-primary {
          background: linear-gradient(135deg, #3B82F6 0%, #2DD4BF 50%, #3B82F6 100%);
          background-size: 200% auto;
          animation: shimmerBtn 3s linear infinite;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .he-btn-primary:hover {
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 12px 40px rgba(59,130,246,0.45);
        }
        .he-btn-secondary {
          transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .he-btn-secondary:hover {
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 8px 28px rgba(10,35,66,0.12);
          background: rgba(255,255,255,1) !important;
        }
        .he-tag {
          animation: popIn 0.5s cubic-bezier(.34,1.56,.64,1) both;
        }
        .he-headline { animation: fadeSlideUp 0.7s ease both 0.15s; }
        .he-sub      { animation: fadeSlideUp 0.7s ease both 0.3s; }
        .he-ctarow   { animation: fadeSlideUp 0.7s ease both 0.45s; }
        .he-footnote { animation: fadeSlideUp 0.7s ease both 0.6s; }
      `}</style>

      <div
        className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-4"
        style={{
          background: "linear-gradient(160deg, #EEF4FF 0%, #F0FDFF 45%, #ECFEFF 100%)",
        }}
      >
        {/* ── Background mesh circles ── */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div style={{
            position: "absolute", width: 500, height: 500,
            borderRadius: "50%", top: -100, left: -150,
            background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
          }} />
          <div style={{
            position: "absolute", width: 400, height: 400,
            borderRadius: "50%", bottom: -80, right: -120,
            background: "radial-gradient(circle, rgba(45,212,191,0.12) 0%, transparent 70%)",
          }} />
          <div style={{
            position: "absolute", width: 300, height: 300,
            borderRadius: "50%", top: "40%", right: "20%",
            background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)",
          }} />
        </div>

        {/* ── Floating emojis ── */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {floaters.map((f, i) => (
            <Floater
              key={i}
              emoji={f.emoji}
              style={{
                top: f.top,
                left: f.left,
                fontSize: f.size,
                opacity: 0.55,
                animation: `floatBob ${3.5 + (i % 3) * 0.8}s ease-in-out ${f.delay}s infinite`,
              }}
            />
          ))}
        </div>

        {/* ── Main content ── */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl w-full">

          {/* Tag pill */}
          <div
            className="he-tag mb-7 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
            style={{
              background: "rgba(255,255,255,0.85)",
              border: "1.5px solid rgba(59,130,246,0.22)",
              color: "#1E40AF",
              backdropFilter: "blur(10px)",
              boxShadow: "0 2px 16px rgba(59,130,246,0.1)",
            }}
          >
            <span style={{ fontSize: 16 }}>✨</span>
            24 évaluations validées &nbsp;·&nbsp; 100% confidentiel
          </div>

          {/* Typing headline */}
          <h1
            className="he-headline font-black mb-1 leading-tight"
            style={{ fontSize: "clamp(2.4rem, 5.5vw, 4.2rem)", color: "#0A2342" }}
          >
            <span
              style={{
                background: "linear-gradient(135deg, #3B82F6, #2DD4BF)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                minHeight: "1.2em",
                display: "inline-block",
              }}
            >
              {typed}
              <span
                style={{
                  display: "inline-block",
                  width: 3,
                  height: "0.9em",
                  background: "#3B82F6",
                  marginLeft: 3,
                  verticalAlign: "middle",
                  borderRadius: 2,
                  animation: "shimmerBtn 1s linear infinite",
                }}
              />
            </span>
          </h1>

          {/* Static sub-title */}
          <p
            className="he-sub mt-0 mb-3 font-black leading-tight"
            style={{
              fontSize: "clamp(1.7rem, 4vw, 3rem)",
              color: "#0A2342",
              opacity: 0.85,
            }}
          >
            Ton profil en santé mentale &amp; sexuelle.
          </p>

          {/* Description */}
          <p
            className="he-sub mb-11 leading-relaxed"
            style={{
              fontSize: "clamp(0.95rem, 2vw, 1.1rem)",
              color: "#475569",
              maxWidth: 460,
            }}
          >
            Des tests scientifiques, bienveillants et adaptés à ta réalité —
            construis ton profil à ton rythme, item par item.
          </p>

          {/* CTAs */}
          <div className="he-ctarow flex flex-col sm:flex-row gap-4 items-center w-full justify-center">
            <button
              onClick={() => navigate(isAuthenticated ? "/assessment" : "/assessment")}
              className="he-btn-primary flex items-center justify-center gap-3 px-9 py-4 rounded-2xl font-bold text-lg text-white shadow-lg w-full sm:w-auto"
              style={{ minWidth: 250 }}
            >
              Commencer mon évaluation
              <ArrowRight size={20} />
            </button>

            <Link
              to="/assessment/compatibility"
              className="he-btn-secondary flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-semibold w-full sm:w-auto"
              style={{
                background: "rgba(255,255,255,0.82)",
                border: "1.5px solid rgba(10,35,66,0.14)",
                color: "#0A2342",
                backdropFilter: "blur(8px)",
                textDecoration: "none",
              }}
            >
              <span style={{ fontSize: 18 }}>💑</span>
              Tester ma compatibilité
            </Link>
          </div>

          {/* Micro-social proof */}
          <div
            className="he-footnote mt-10 flex items-center gap-3 px-5 py-2.5 rounded-2xl text-sm"
            style={{
              background: "rgba(255,255,255,0.65)",
              border: "1px solid rgba(59,130,246,0.12)",
              color: "#64748B",
              backdropFilter: "blur(8px)",
            }}
          >
            <span style={{ display: "flex", gap: -6 }}>
              {["🧠", "💙", "🌱", "🫶"].map((e, i) => (
                <span key={i} style={{ fontSize: 18, marginRight: -4 }}>{e}</span>
              ))}
            </span>
            <span>
              <strong style={{ color: "#0A2342" }}>14 </strong>échelles de santé mentale
              &nbsp;+&nbsp;
              <strong style={{ color: "#0A2342" }}>10 </strong>de santé sexuelle
            </span>
          </div>
        </div>

        {/* ── Footer discret ── */}
        <div
          className="absolute bottom-0 left-0 right-0 py-4 px-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs"
          style={{
            borderTop: "1px solid rgba(59,130,246,0.1)",
            color: "#94A3B8",
            background: "rgba(255,255,255,0.5)",
            backdropFilter: "blur(8px)",
          }}
        >
          <span>
            <strong style={{ color: "#0A2342" }}>Health-e</strong> — Ces évaluations ne remplacent pas un professionnel de santé.
          </span>
          <div className="flex items-center gap-4">
            <Link to="/professionals" style={{ color: "#94A3B8", textDecoration: "none" }} className="hover:text-blue-500 transition-colors">
              Espace professionnels
            </Link>
            <span>·</span>
            <Link to="/confidentialite" style={{ color: "#94A3B8", textDecoration: "none" }} className="hover:text-blue-500 transition-colors">
              Confidentialité
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default OptimizedHomePage;
