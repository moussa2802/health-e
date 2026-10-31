import React from "react";
import ConversationAccueil from "../components/accueil/ConversationAccueil";

/**
 * Onglet « Compagnon » (/compagnon) : la conversation, qui était l'accueil du site.
 * Elle passe en plein écran dès qu'on écrit (au-dessus de la barre du bas).
 */
const CompagnonPage: React.FC = () => (
  <div className="relative flex min-h-screen flex-col" style={{ background: "#130F0C", color: "#F4EEE4", paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}>
    <ConversationAccueil />
  </div>
);

export default CompagnonPage;
