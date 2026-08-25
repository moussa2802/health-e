import React, { useState, useEffect, memo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, Globe, User, HelpCircle, Sparkles } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useDebounce } from "../../hooks/useDebounce";
import LanguageSelector from "./LanguageSelector";
import KoriBalance from "../koris/KoriBalance";

const OptimizedHeader: React.FC = memo(() => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { isAuthenticated, currentUser, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const debouncedMenuOpen = useDebounce(isMenuOpen, 100);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(e.target as Node))
        setIsLanguageMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navLinkClass = "text-sm font-medium text-ink-soft no-underline transition-colors hover:text-ink";
  const mobileLinkClass = "py-2.5 px-3 rounded-xl text-sm font-medium text-ink no-underline";

  return (
    <header
      className="sticky top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(243,241,234,0.95)" : "rgba(243,241,234,0.8)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: `1px solid ${scrolled ? '#E7E4DA' : 'rgba(231,228,218,0.5)'}`,
        boxShadow: scrolled ? "0 1px 2px rgba(23,24,27,.04), 0 4px 12px rgba(23,24,27,.04)" : "none",
      }}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">

          <Link to="/" className="flex items-center gap-1.5 no-underline">
            <span className="text-2xl font-black text-ink tracking-tight">
              Health-e
            </span>
            <span className="hidden sm:inline text-xs font-semibold px-2 py-0.5 rounded-pill bg-sage-soft text-sage border border-sage/10">
              beta
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-5">
            {isAuthenticated && currentUser ? (
              <>
                <Link to="/assessment" className={navLinkClass}>
                  Évaluations
                </Link>

                <Link to="/mon-espace" className={navLinkClass}>
                  Mon Espace
                </Link>

                {currentUser.type === "patient" && (
                  <Link
                    to="/app"
                    className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-pill bg-sage text-white no-underline hover:bg-sage/90 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Compagnon
                  </Link>
                )}

                <div style={{ position: 'relative' }}>
                  <KoriBalance />
                </div>

                <div className="flex items-center gap-2">
                  {currentUser.profileImage ? (
                    <img
                      src={currentUser.profileImage}
                      alt={currentUser.name}
                      className="w-7 h-7 rounded-full object-cover border-2 border-line"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center bg-ink">
                      <User size={14} color="white" />
                    </div>
                  )}
                  <span className="text-sm font-medium max-w-[120px] truncate text-ink">
                    {currentUser.name}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-danger bg-transparent border-none cursor-pointer p-0 hover:opacity-75 transition-opacity"
                >
                  {t("nav.logout")}
                </button>

                <Link to="/faq" className="p-1.5 rounded-lg text-muted hover:text-ink transition-colors no-underline" title="Aide">
                  <HelpCircle className="w-4 h-4" />
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/assessment" className={navLinkClass}>
                  Évaluations
                </Link>
                <Link
                  to="/app"
                  className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-pill bg-sage text-white no-underline hover:bg-sage/90 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Compagnon
                </Link>
                <Link
                  to="/patient/access"
                  className="text-sm font-semibold px-4 py-1.5 rounded-pill bg-ink text-white no-underline hover:bg-ink/90 transition-colors"
                >
                  Connexion
                </Link>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <img src="https://flagcdn.com/w40/sn.png" alt="Sénégal" className="w-5 h-3.5 rounded shadow-sm" loading="lazy" />
              <img src="https://flagcdn.com/w40/ca.png" alt="Canada" className="w-5 h-3.5 rounded shadow-sm" loading="lazy" />
            </div>

            <div className="relative" ref={languageMenuRef}>
              <button
                onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                className="flex items-center p-1.5 rounded-lg text-muted hover:text-ink transition-colors"
              >
                <Globe className="w-4 h-4" />
              </button>
              {isLanguageMenuOpen && (
                <LanguageSelector onClose={() => setIsLanguageMenuOpen(false)} />
              )}
            </div>
          </nav>

          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
              className="p-2 text-muted"
            >
              <Globe className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-ink"
            >
              {debouncedMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {debouncedMenuOpen && (
          <nav className="md:hidden mt-3 pb-3 flex flex-col gap-1 rounded-block p-3 bg-card border border-line shadow-soft">
            {isAuthenticated && currentUser ? (
              <>
                <div className="py-2 px-3" style={{ position: 'relative' }}>
                  <KoriBalance />
                </div>
                <Link to="/assessment" className={mobileLinkClass} onClick={() => setIsMenuOpen(false)}>
                  Évaluations
                </Link>
                <Link to="/mon-espace" className={mobileLinkClass} onClick={() => setIsMenuOpen(false)}>
                  Mon Espace
                </Link>
                {currentUser.type === "patient" && (
                  <Link
                    to="/app"
                    className="flex items-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-semibold bg-sage text-white no-underline"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Compagnon
                  </Link>
                )}
                <Link to="/faq" className={`${mobileLinkClass} text-muted`} onClick={() => setIsMenuOpen(false)}>
                  Aide
                </Link>
                <button
                  onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                  className="py-2.5 px-3 rounded-xl text-sm font-medium text-left w-full text-danger bg-transparent"
                >
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <>
                <Link to="/assessment" className={mobileLinkClass} onClick={() => setIsMenuOpen(false)}>
                  Évaluations
                </Link>
                <Link
                  to="/app"
                  className="flex items-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-semibold bg-sage text-white no-underline"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Compagnon
                </Link>
                <Link
                  to="/patient/access"
                  className="py-2.5 px-3 rounded-xl text-sm font-semibold text-center bg-ink text-white no-underline"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Connexion
                </Link>
              </>
            )}
            <div className="flex items-center gap-2 px-3 pt-2">
              <img src="https://flagcdn.com/w40/sn.png" alt="Sénégal" className="w-5 h-3.5 rounded shadow-sm" loading="lazy" />
              <img src="https://flagcdn.com/w40/ca.png" alt="Canada" className="w-5 h-3.5 rounded shadow-sm" loading="lazy" />
            </div>
          </nav>
        )}

        {isLanguageMenuOpen && (
          <div className="md:hidden">
            <LanguageSelector onClose={() => setIsLanguageMenuOpen(false)} />
          </div>
        )}
      </div>
    </header>
  );
});

OptimizedHeader.displayName = "OptimizedHeader";
export default OptimizedHeader;
