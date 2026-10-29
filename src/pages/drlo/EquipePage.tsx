/**
 * EquipePage — /equipe : porte d'entrée discrète pour l'équipe (Dr Lô et administration).
 * Rien de sensible ici : chaque espace demande sa propre connexion et revérifie le rôle côté serveur.
 */
import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Mail, ShieldCheck } from "lucide-react";
import DrLoShell, { DC, card, usePalette } from "../../components/accueil/DrLoShell";

const EquipePage: React.FC = () => {
  const palette = usePalette();
  const items = [
    { to: "/drlo", icon: Mail, title: "Espace Dr Lô", hint: "Questions, messages à ma communauté" },
    { to: "/admin/login", icon: ShieldCheck, title: "Administration", hint: "Utilisateurs, paiements, statistiques" },
  ];
  return (
    <DrLoShell back={{ to: "/", label: "Accueil" }} palette={palette}>
      <p style={{ margin: "18px 0 0", fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase", color: palette.accent, fontWeight: 700 }}>Accès équipe</p>
      <h1 style={{ margin: "6px 0 0", fontFamily: "Fraunces, serif", fontSize: 28, lineHeight: 1.2, fontWeight: 600, color: DC.title }}>Où veux-tu aller ?</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
        {items.map(it => (
          <Link key={it.to} to={it.to} className="drl-btn" style={{ ...card, textDecoration: "none", display: "flex", alignItems: "center", gap: 14, minHeight: 64 }}>
            <it.icon size={22} color={palette.accent} aria-hidden="true" />
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 16, fontWeight: 700, color: DC.text }}>{it.title}</span>
              <span style={{ display: "block", marginTop: 2, fontSize: 13, color: DC.muted }}>{it.hint}</span>
            </span>
            <ChevronRight size={18} color={DC.faint} aria-hidden="true" />
          </Link>
        ))}
      </div>
      <p style={{ margin: "18px 0 0", fontSize: 13, color: DC.faint, lineHeight: 1.5 }}>Chaque espace demande sa propre connexion.</p>
    </DrLoShell>
  );
};

export default EquipePage;
