import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Brain, Heart, Link2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

/* ── Floating emojis (watermark style) ── */
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

/* ── Speech bubble ── */
const SpeechBubble: React.FC = () => {
  const words = ["Salut,", "moi", "c'est", "Dr.", "Lô\u00A0👋"];
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (visible >= words.length) return;
    const t = setTimeout(() => setVisible(v => v + 1), 260 + visible * 80);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div
      style={{
        position: "absolute",
        top: -18,
        right: -130,
        background: "rgba(255,255,255,0.95)",
        border: "1.5px solid rgba(59,130,246,0.18)",
        borderRadius: "18px 18px 18px 4px",
        padding: "10px 16px",
        boxShadow: "0 4px 20px rgba(59,130,246,0.13)",
        backdropFilter: "blur(10px)",
        whiteSpace: "nowrap",
        fontSize: "0.95rem",
        fontWeight: 700,
        color: "#0A2342",
        zIndex: 20,
        animation: "fadeSlideUp 0.4s ease both",
      }}
    >
      {words.slice(0, visible).join(" ")}
      {visible < words.length && (
        <span
          style={{
            display: "inline-block",
            width: 2,
            height: "0.9em",
            background: "#3B82F6",
            marginLeft: 2,
            verticalAlign: "middle",
            borderRadius: 2,
            animation: "cursorBlink 0.7s step-end infinite",
          }}
        />
      )}
      {/* Tail */}
      <span
        style={{
          position: "absolute",
          bottom: 10,
          left: -8,
          width: 0,
          height: 0,
          borderTop: "6px solid transparent",
          borderBottom: "6px solid transparent",
          borderRight: "9px solid rgba(255,255,255,0.95)",
          filter: "drop-shadow(-2px 0px 1px rgba(59,130,246,0.1))",
        }}
      />
    </div>
  );
};

/* ── Dr LO photo avatar ── */
const DrLoAvatar: React.FC = () => (
  <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
    <SpeechBubble />
    {/* Outer spinning dashed ring */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        border: "2px dashed rgba(59,130,246,0.3)",
        animation: "spinRing 18s linear infinite",
      }}
    />
    {/* Middle ring */}
    <div
      style={{
        position: "absolute",
        inset: 12,
        borderRadius: "50%",
        border: "1.5px dashed rgba(45,212,191,0.25)",
        animation: "spinRing 12s linear infinite reverse",
      }}
    />
    {/* Glow halo */}
    <div
      style={{
        position: "absolute",
        inset: 20,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(45,212,191,0.12) 60%, transparent 100%)",
        filter: "blur(8px)",
      }}
    />
    {/* Gradient border ring */}
    <div
      style={{
        position: "absolute",
        inset: 22,
        borderRadius: "50%",
        padding: 3,
        background: "linear-gradient(135deg, #3B82F6, #2DD4BF)",
      }}
    >
      <div style={{ borderRadius: "50%", width: "100%", height: "100%", background: "white" }} />
    </div>
    {/* Photo */}
    <img
      src="/dr-lo.png"
      alt="Dr. LO"
      style={{
        position: "absolute",
        inset: 25,
        width: "calc(100% - 50px)",
        height: "calc(100% - 50px)",
        borderRadius: "50%",
        objectFit: "cover",
        objectPosition: "top center",
      }}
    />
    {/* Small badge */}
    <div
      style={{
        position: "absolute",
        bottom: 18,
        right: 10,
        background: "linear-gradient(135deg,#3B82F6,#2DD4BF)",
        borderRadius: "50%",
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
        border: "2px solid white",
        boxShadow: "0 2px 8px rgba(59,130,246,0.3)",
      }}
    >
      🧠
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

  /* Fixed positions — avoid re-render flicker */
  const floaters = [
    { emoji: "🧠", top: "7%",  left: "5%",  size: 22, delay: 0 },
    { emoji: "💙", top: "14%", left: "87%", size: 20, delay: 0.8 },
    { emoji: "✨", top: "31%", left: "3%",  size: 16, delay: 1.4 },
    { emoji: "🌱", top: "70%", left: "92%", size: 20, delay: 0.3 },
    { emoji: "💪", top: "79%", left: "4%",  size: 17, delay: 1.1 },
    { emoji: "🫶", top: "54%", left: "94%", size: 20, delay: 0.6 },
    { emoji: "🌟", top: "89%", left: "20%", size: 16, delay: 1.9 },
    { emoji: "⚡", top: "41%", left: "91%", size: 15, delay: 2.1 },
    { emoji: "❤️", top: "24%", left: "2%",  size: 18, delay: 1.6 },
    { emoji: "🔥", top: "61%", left: "88%", size: 17, delay: 0.9 },
    { emoji: "🌸", top: "87%", left: "79%", size: 15, delay: 2.4 },
    { emoji: "🫂", top: "4%",  left: "44%", size: 18, delay: 1.2 },
  ];

  const cards = [
    {
      icon: <Brain size={22} style={{ color: "#3B82F6" }} />,
      count: "14",
      label: "Évaluations",
      sub: "Santé mentale",
      accent: "rgba(59,130,246,0.1)",
      border: "rgba(59,130,246,0.18)",
    },
    {
      icon: <Heart size={22} style={{ color: "#EC4899" }} />,
      count: "10",
      label: "Évaluations",
      sub: "Santé sexuelle",
      accent: "rgba(236,72,153,0.08)",
      border: "rgba(236,72,153,0.18)",
    },
    {
      icon: <Link2 size={22} style={{ color: "#2DD4BF" }} />,
      count: "1",
      label: "Test de",
      sub: "Compatibilité",
      accent: "rgba(45,212,191,0.08)",
      border: "rgba(45,212,191,0.22)",
    },
  ];

  return (
    <>
      <style>{`
        @keyframes floatBob {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-8px) rotate(3deg); }
          66%       { transform: translateY(-4px) rotate(-2deg); }
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
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes spinRing {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .he-btn-primary {
          background: linear-gradient(135deg, #3B82F6 0%, #2DD4BF 50%, #3B82F6 100%);
          background-size: 200% auto;
          animation: shimmerBtn 3s linear infinite;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .he-btn-primary:hover {
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 16px 48px rgba(59,130,246,0.4);
        }
        .he-btn-secondary {
          transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .he-btn-secondary:hover {
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 8px 28px rgba(45,212,191,0.18);
          background: rgba(255,255,255,1) !important;
        }
        .he-tag  { animation: popIn 0.5s cubic-bezier(.34,1.56,.64,1) both; }
        .he-illus    { animation: fadeSlideUp 0.6s ease both 0.05s; }
        .he-headline { animation: fadeSlideUp 0.7s ease both 0.15s; }
        .he-sub      { animation: fadeSlideUp 0.7s ease both 0.3s; }
        .he-ctarow   { animation: fadeSlideUp 0.7s ease both 0.45s; }
        .he-trust    { animation: fadeSlideUp 0.7s ease both 0.55s; }
        .he-cards    { animation: fadeSlideUp 0.7s ease both 0.65s; }
        .he-card {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .he-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(59,130,246,0.12);
        }
        .he-cursor {
          display: inline-block;
          width: 2.5px;
          height: 0.85em;
          background: #3B82F6;
          margin-left: 3px;
          vertical-align: middle;
          border-radius: 2px;
          animation: cursorBlink 1s step-end infinite;
        }
      `}</style>

      <div
        className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-4 py-8"
        style={{
          background: "linear-gradient(160deg, #EEF4FF 0%, #F0FDFF 45%, #ECFEFF 100%)",
        }}
      >
        {/* ── Background mesh circles ── */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div style={{
            position: "absolute", width: 500, height: 500,
            borderRadius: "50%", top: -100, left: -150,
            background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)",
          }} />
          <div style={{
            position: "absolute", width: 400, height: 400,
            borderRadius: "50%", bottom: -80, right: -120,
            background: "radial-gradient(circle, rgba(45,212,191,0.1) 0%, transparent 70%)",
          }} />
          <div style={{
            position: "absolute", width: 300, height: 300,
            borderRadius: "50%", top: "40%", right: "20%",
            background: "radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)",
          }} />
        </div>

        {/* ── Floating emojis (watermark) ── */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {floaters.map((f, i) => (
            <Floater
              key={i}
              emoji={f.emoji}
              style={{
                top: f.top,
                left: f.left,
                fontSize: f.size,
                opacity: 0.28,
                animation: `floatBob ${3.5 + (i % 3) * 0.8}s ease-in-out ${f.delay}s infinite`,
              }}
            />
          ))}
        </div>

        {/* ── Main content ── */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl w-full">

          {/* Tag pill */}
          <div
            className="he-tag mb-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold"
            style={{
              background: "rgba(255,255,255,0.85)",
              border: "1.5px solid rgba(59,130,246,0.22)",
              color: "#1E40AF",
              backdropFilter: "blur(10px)",
              boxShadow: "0 2px 16px rgba(59,130,246,0.1)",
            }}
          >
            <span style={{ fontSize: 14 }}>✨</span>
            24 évaluations validées &nbsp;·&nbsp; 100% confidentiel
          </div>

          {/* Dr LO avatar */}
          <div className="he-illus mb-4">
            <DrLoAvatar />
          </div>

          {/* Typing headline */}
          <h1
            className="he-headline font-black mb-1 leading-tight"
            style={{ fontSize: "clamp(2rem, 5vw, 3.6rem)", color: "#0A2342" }}
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
              <span className="he-cursor" />
            </span>
          </h1>

          {/* Static sub-title */}
          <p
            className="he-sub mt-0 mb-2 font-black leading-tight"
            style={{
              fontSize: "clamp(1.4rem, 3.5vw, 2.5rem)",
              color: "#0A2342",
            }}
          >
            Ton profil en{" "}
            <span style={{
              background: "linear-gradient(135deg, #3B82F6, #6366F1)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              santé mentale
            </span>
            {" "}&amp;{" "}
            <span style={{
              background: "linear-gradient(135deg, #EC4899, #F97316)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              sexuelle
            </span>
            .
          </p>

          {/* Description */}
          <p
            className="he-sub mb-8 leading-relaxed"
            style={{
              fontSize: "clamp(0.9rem, 1.8vw, 1.05rem)",
              color: "#475569",
              maxWidth: 440,
            }}
          >
            Des tests scientifiques, bienveillants et adaptés à ta réalité —
            construis ton profil à ton rythme, item par item.
          </p>

          {/* CTAs */}
          <div className="he-ctarow flex flex-col sm:flex-row gap-3 items-center w-full justify-center">
            <button
              onClick={() => navigate("/assessment")}
              className="he-btn-primary flex items-center justify-center gap-3 px-9 py-4 rounded-2xl font-bold text-lg text-white w-full sm:w-auto"
              style={{
                minWidth: 240,
                boxShadow: "0 8px 32px rgba(59,130,246,0.35)",
              }}
            >
              Commencer mon évaluation
              <ArrowRight size={20} />
            </button>

            <Link
              to="/assessment/compatibility"
              className="he-btn-secondary flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-semibold w-full sm:w-auto"
              style={{
                background: "rgba(255,255,255,0.88)",
                border: "2px solid rgba(45,212,191,0.45)",
                color: "#0A2342",
                backdropFilter: "blur(8px)",
                textDecoration: "none",
                minWidth: 210,
              }}
            >
              <span style={{ fontSize: 18 }}>💑</span>
              Tester ma compatibilité
            </Link>
          </div>

          {/* Trust indicators */}
          <div
            className="he-trust mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-medium"
            style={{ color: "#64748B" }}
          >
            {[
              "✓ Scientifiquement validé",
              "✓ Anonyme",
              "✓ Gratuit",
              "✓ Adapté au contexte africain",
            ].map((item, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "#2DD4BF", fontWeight: 700 }}>{item.slice(0, 1)}</span>
                <span>{item.slice(2)}</span>
                {i < 3 && <span style={{ marginLeft: 4, color: "#CBD5E1" }}>·</span>}
              </span>
            ))}
          </div>

          {/* 3 mini cards */}
          <div className="he-cards mt-10 grid grid-cols-3 gap-3 w-full">
            {cards.map((card, i) => (
              <div
                key={i}
                className="he-card flex flex-col items-center gap-1.5 py-4 px-3 rounded-2xl"
                style={{
                  background: `rgba(255,255,255,0.85)`,
                  border: `1.5px solid ${card.border}`,
                  backdropFilter: "blur(8px)",
                  boxShadow: `0 2px 12px ${card.accent}`,
                }}
              >
                <div
                  className="flex items-center justify-center rounded-xl"
                  style={{
                    width: 42, height: 42,
                    background: card.accent,
                  }}
                >
                  {card.icon}
                </div>
                <div
                  className="font-black"
                  style={{ fontSize: "1.4rem", color: "#0A2342", lineHeight: 1 }}
                >
                  {card.count}
                </div>
                <div style={{ fontSize: "0.7rem", color: "#64748B", lineHeight: 1.3, fontWeight: 600 }}>
                  {card.label}
                  <br />
                  <span style={{ color: "#0A2342", fontWeight: 700 }}>{card.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer discret ── */}
        <div
          className="relative z-10 mt-10 w-full max-w-2xl py-3 px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs rounded-2xl"
          style={{
            borderTop: "1px solid rgba(59,130,246,0.1)",
            color: "#94A3B8",
          }}
        >
          <span>
            <strong style={{ color: "#0A2342" }}>Health-e</strong>
            {" "}— Ces évaluations ne remplacent pas un professionnel de santé.
          </span>
          <div className="flex items-center gap-3">
            <Link to="/confidentialite" style={{ color: "#94A3B8", textDecoration: "none" }} className="hover:text-blue-500 transition-colors">
              Confidentialité
            </Link>
            <span>·</span>
            <Link to="/professionals" style={{ color: "#94A3B8", textDecoration: "none" }} className="hover:text-blue-500 transition-colors">
              Professionnels
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default OptimizedHomePage;
