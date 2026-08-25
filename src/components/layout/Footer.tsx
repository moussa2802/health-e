import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";

const Footer: React.FC = () => {
  const { language } = useLanguage();

  const links = [
    { to: "/assessment",      label: language === "fr" ? "Évaluations"     : "Assessments" },
    { to: "/admin/login",     label: "Administration" },
    { to: "/confidentialite", label: language === "fr" ? "Confidentialité" : "Privacy" },
    { to: "/contact",         label: "Contact" },
  ];

  return (
    <footer className="border-t border-line bg-paper">
      <div className="container mx-auto px-4 py-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">

          <div className="flex items-center gap-3">
            <span className="text-lg font-black text-ink tracking-tight">
              Health-e
            </span>
            <span className="text-muted">·</span>
            <span className="text-xs text-muted">
              {language === "fr"
                ? "Ces évaluations ne remplacent pas un professionnel de santé."
                : "These assessments do not replace a healthcare professional."}
            </span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {links.map((link, i) => (
              <React.Fragment key={link.to}>
                <Link
                  to={link.to}
                  className="text-xs font-medium text-muted no-underline hover:text-ink transition-colors"
                >
                  {link.label}
                </Link>
                {i < links.length - 1 && (
                  <span className="text-line text-[10px]">·</span>
                )}
              </React.Fragment>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <img src="https://flagcdn.com/w40/sn.png" alt="Sénégal" className="w-5 h-3.5 rounded shadow-sm" loading="lazy" />
            <img src="https://flagcdn.com/w40/ca.png" alt="Canada"  className="w-5 h-3.5 rounded shadow-sm" loading="lazy" />
            <span className="text-xs text-muted">
              © {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
