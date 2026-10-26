import React from "react";
import { Link } from "react-router-dom";
import ConversationAccueil from "../components/accueil/ConversationAccueil";
import { useAuth } from "../contexts/AuthContext";
import AccueilSeoSections from "../components/accueil/AccueilSeoSections";

/**
 * Page d'accueil : le premier écran EST Dr Lô (thème chaud sombre, plein écran).
 * Sous le pli : contenu indexable (présentation, évaluations, FAQ) pour le référencement.
 * L'en-tête et le pied de page du site sont masqués sur « / » (voir App.tsx).
 */
const OptimizedHomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  return (
  <div className="relative flex min-h-screen flex-col" style={{ background: "#130F0C", color: "#F4EEE4" }}>
    <ConversationAccueil />

    {/* Vitrine pour visiteurs (et pour Google) : inutile pour une personne connectée */}
    {!isAuthenticated && <AccueilSeoSections />}

    {/* ── Footer discret ── */}
    <div className="mx-auto mt-14 flex w-full max-w-3xl flex-col items-center justify-between gap-2 border-t border-white/[0.12] px-5 py-4 text-xs text-[#A79E90] sm:flex-row">
      <span>
        <strong className="text-[#F4EEE4]">Health-e</strong>
        {" "}— Ces évaluations ne remplacent pas un professionnel de santé.
      </span>
      <div className="flex items-center gap-3">
        <Link to="/confidentialite" className="text-[#A79E90] no-underline transition-colors hover:text-[#F2B66D]">
          Confidentialité
        </Link>
        <span>·</span>
        <Link to="/professionals" className="text-[#A79E90] no-underline transition-colors hover:text-[#F2B66D]">
          Professionnels
        </Link>
      </div>
    </div>
  </div>
  );
};

export default OptimizedHomePage;
