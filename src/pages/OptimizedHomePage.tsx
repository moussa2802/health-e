import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Heart } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const OptimizedHomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleStart = () =>
    navigate(isAuthenticated ? "/assessment" : "/assessment");

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg, #EFF6FF 0%, #F0FDFF 60%, #ECFEFF 100%)" }}
    >
      {/* ── Centered hero — prend tout l'espace disponible ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">

        {/* Badge */}
        <div
          className="mb-8 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"
          style={{
            background: "rgba(255,255,255,0.8)",
            border: "1px solid rgba(59,130,246,0.2)",
            color: "#3B82F6",
            backdropFilter: "blur(8px)",
          }}
        >
          ✨ 24 évaluations validées · 100% confidentiel
        </div>

        {/* Title */}
        <h1
          className="font-black mb-5 leading-tight"
          style={{
            fontSize: "clamp(2.6rem, 6vw, 4.8rem)",
            color: "#0A2342",
            maxWidth: 720,
          }}
        >
          Explore ton profil en{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #3B82F6, #2DD4BF)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            santé mentale
          </span>{" "}
          et{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #2DD4BF, #06B6D4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            sexuelle
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="mb-12 leading-relaxed"
          style={{
            fontSize: "clamp(1rem, 2vw, 1.2rem)",
            color: "#475569",
            maxWidth: 520,
          }}
        >
          Des outils scientifiques, bienveillants et adaptés à ta réalité.
          Construis ton profil à ton rythme, item par item.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <button
            onClick={handleStart}
            className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #3B82F6, #2DD4BF)",
              boxShadow: "0 8px 32px rgba(59,130,246,0.35)",
              minWidth: 260,
            }}
          >
            Commencer mon évaluation
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <Link
            to="/assessment/compatibility"
            className="flex items-center gap-2 px-7 py-4 rounded-2xl font-semibold transition-all duration-300 hover:scale-105"
            style={{
              background: "rgba(255,255,255,0.85)",
              border: "1.5px solid rgba(10,35,66,0.15)",
              color: "#0A2342",
              backdropFilter: "blur(8px)",
            }}
          >
            💑 Tester ma compatibilité
          </Link>
        </div>
      </div>

      {/* ── Footer discret ── */}
      <footer className="py-6 px-4" style={{ borderTop: "1px solid rgba(59,130,246,0.1)" }}>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Heart size={14} style={{ color: "#3B82F6" }} />
            <span className="text-sm font-semibold" style={{ color: "#0A2342" }}>Health-e</span>
          </div>
          <p className="text-xs text-center" style={{ color: "#94A3B8", maxWidth: 400 }}>
            Les évaluations ne remplacent pas une consultation auprès d'un professionnel de santé qualifié.
          </p>
          <div className="flex items-center gap-4 text-xs" style={{ color: "#94A3B8" }}>
            <Link to="/professionals" className="hover:text-blue-500 transition-colors">Espace professionnels</Link>
            <span>·</span>
            <Link to="/confidentialite" className="hover:text-blue-500 transition-colors">Confidentialité</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default OptimizedHomePage;
