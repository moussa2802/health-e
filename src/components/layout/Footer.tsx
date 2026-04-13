import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";

const Footer: React.FC = () => {
  const { language } = useLanguage();

  const links = [
    { to: "/assessment",     label: language === "fr" ? "Évaluations"      : "Assessments" },
    { to: "/assessment/compatibility", label: language === "fr" ? "Compatibilité"    : "Compatibility" },
    { to: "/admin/login",     label: "Administration" },
    { to: "/confidentialite",label: language === "fr" ? "Confidentialité"  : "Privacy" },
    { to: "/contact",        label: "Contact" },
  ];

  return (
    <footer
      style={{
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(59,130,246,0.1)",
      }}
    >
      <div className="container mx-auto px-4 py-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">

          {/* Logo + tagline */}
          <div className="flex items-center gap-3">
            <span
              className="text-lg font-black"
              style={{
                background: "linear-gradient(135deg,#3B82F6,#2DD4BF)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Health-e
            </span>
            <span style={{ color: "#CBD5E1" }}>·</span>
            <span className="text-xs" style={{ color: "#94A3B8" }}>
              {language === "fr"
                ? "Ces évaluations ne remplacent pas un professionnel de santé."
                : "These assessments do not replace a healthcare professional."}
            </span>
          </div>

          {/* Navigation links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {links.map((link, i) => (
              <React.Fragment key={link.to}>
                <Link
                  to={link.to}
                  className="text-xs font-medium transition-colors"
                  style={{ color: "#94A3B8", textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#3B82F6")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#94A3B8")}
                >
                  {link.label}
                </Link>
                {i < links.length - 1 && (
                  <span style={{ color: "#E2E8F0", fontSize: 10 }}>·</span>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Flags + copyright */}
          <div className="flex items-center gap-2">
            <img
              src="https://flagcdn.com/w40/sn.png"
              alt="Sénégal"
              className="w-5 h-3.5 rounded shadow-sm"
              loading="lazy"
            />
            <img
              src="https://flagcdn.com/w40/ca.png"
              alt="Canada"
              className="w-5 h-3.5 rounded shadow-sm"
              loading="lazy"
            />
            <span className="text-xs" style={{ color: "#CBD5E1" }}>
              © {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
