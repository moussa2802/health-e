import React, { useState, useEffect, memo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, Globe, User, HelpCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useDebounce } from "../../hooks/useDebounce";
import LanguageSelector from "./LanguageSelector";
import KoriBalance from "../koris/KoriBalance";

const OptimizedHeader: React.FC = memo(() => {
  const [isMenuOpen, setIsMenuOpen]         = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [scrolled, setScrolled]             = useState(false);

  const { isAuthenticated, currentUser, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const debouncedMenuOpen  = useDebounce(isMenuOpen, 100);
  const languageMenuRef    = useRef<HTMLDivElement>(null);

  /* Scroll shadow */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Click outside */
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

  return (
    <header
      style={{
        background: scrolled
          ? "rgba(255,255,255,0.92)"
          : "rgba(255,255,255,0.75)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: scrolled
          ? "1px solid rgba(59,130,246,0.14)"
          : "1px solid rgba(59,130,246,0.08)",
        boxShadow: scrolled ? "0 2px 20px rgba(59,130,246,0.07)" : "none",
        transition: "background 0.3s, box-shadow 0.3s, border-color 0.3s",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 no-underline">
            <span
              className="text-2xl font-black"
              style={{
                background: "linear-gradient(135deg, #3B82F6, #2DD4BF)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "-0.5px",
              }}
            >
              Health-e
            </span>
            <span
              className="hidden sm:inline text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(59,130,246,0.08)",
                color: "#3B82F6",
                border: "1px solid rgba(59,130,246,0.18)",
              }}
            >
              beta
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-5">
            {isAuthenticated && currentUser ? (
              <>
                <Link
                  to="/assessment"
                  className="text-sm font-medium transition-colors"
                  style={{ color: "#475569", textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#3B82F6")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#475569")}
                >
                  Évaluations
                </Link>

                <Link
                  to="/mon-espace"
                  className="text-sm font-medium transition-colors"
                  style={{ color: "#475569", textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#065F46")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#475569")}
                >
                  🌿 Mon Espace
                </Link>

                {/* Koris Balance */}
                <div style={{ position: 'relative' }}>
                  <KoriBalance />
                </div>

                {/* User avatar + name */}
                <div className="flex items-center gap-2">
                  {currentUser.profileImage ? (
                    <img
                      src={currentUser.profileImage}
                      alt={currentUser.name}
                      className="w-7 h-7 rounded-full object-cover"
                      style={{ border: "2px solid rgba(59,130,246,0.25)" }}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#3B82F6,#2DD4BF)" }}
                    >
                      <User size={14} color="white" />
                    </div>
                  )}
                  <span className="text-sm font-medium max-w-[120px] truncate" style={{ color: "#0A2342" }}>
                    {currentUser.name}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="text-sm font-medium transition-colors"
                  style={{ color: "#EF4444", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                  {t("nav.logout")}
                </button>

                <Link
                  to="/faq"
                  className="flex items-center p-1.5 rounded-lg transition"
                  style={{ color: "#64748B", textDecoration: "none" }}
                  title="Aide"
                  onMouseEnter={e => (e.currentTarget.style.color = "#3B82F6")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#64748B")}
                >
                  <HelpCircle className="w-4 h-4" />
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/assessment"
                  className="text-sm font-medium transition-colors"
                  style={{ color: "#475569", textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#3B82F6")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#475569")}
                >
                  Évaluations
                </Link>
                <Link
                  to="/patient/access"
                  className="text-sm font-semibold px-4 py-1.5 rounded-xl transition"
                  style={{
                    background: "linear-gradient(135deg,#3B82F6,#2DD4BF)",
                    color: "white",
                    textDecoration: "none",
                  }}
                >
                  Connexion
                </Link>
              </div>
            )}

            {/* Flags */}
            <div className="flex items-center gap-1.5">
              <img src="https://flagcdn.com/w40/sn.png" alt="Sénégal" className="w-5 h-3.5 rounded shadow-sm" loading="lazy" />
              <img src="https://flagcdn.com/w40/ca.png" alt="Canada"  className="w-5 h-3.5 rounded shadow-sm" loading="lazy" />
            </div>

            {/* Language */}
            <div className="relative" ref={languageMenuRef}>
              <button
                onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                className="flex items-center p-1.5 rounded-lg transition"
                style={{ color: "#64748B" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#3B82F6")}
                onMouseLeave={e => (e.currentTarget.style.color = "#64748B")}
              >
                <Globe className="w-4 h-4" />
              </button>
              {isLanguageMenuOpen && (
                <LanguageSelector onClose={() => setIsLanguageMenuOpen(false)} />
              )}
            </div>
          </nav>

          {/* Mobile right side */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
              className="p-2"
              style={{ color: "#64748B" }}
            >
              <Globe className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2"
              style={{ color: "#0A2342" }}
            >
              {debouncedMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {debouncedMenuOpen && (
          <nav
            className="md:hidden mt-3 pb-3 flex flex-col gap-1 rounded-2xl p-3"
            style={{
              background: "rgba(255,255,255,0.9)",
              border: "1px solid rgba(59,130,246,0.1)",
            }}
          >
            {isAuthenticated && currentUser ? (
              <>
                {/* Koris balance mobile */}
                <div className="py-2 px-3" style={{ position: 'relative' }}>
                  <KoriBalance />
                </div>
                <Link
                  to="/assessment"
                  className="py-2 px-3 rounded-xl text-sm font-medium"
                  style={{ color: "#0A2342", textDecoration: "none" }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Évaluations
                </Link>
                <Link
                  to="/mon-espace"
                  className="py-2 px-3 rounded-xl text-sm font-medium"
                  style={{ color: "#065F46", textDecoration: "none" }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  🌿 Mon Espace
                </Link>
                <Link
                  to="/faq"
                  className="py-2 px-3 rounded-xl text-sm font-medium"
                  style={{ color: "#64748B", textDecoration: "none" }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  ❓ Aide
                </Link>
                <button
                  onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                  className="py-2 px-3 rounded-xl text-sm font-medium text-left w-full"
                  style={{ color: "#EF4444", background: "transparent" }}
                >
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/assessment"
                  className="py-2 px-3 rounded-xl text-sm font-medium"
                  style={{ color: "#0A2342", textDecoration: "none" }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Évaluations
                </Link>
                <Link
                  to="/patient/access"
                  className="py-2 px-3 rounded-xl text-sm font-semibold text-center"
                  style={{
                    background: "linear-gradient(135deg,#3B82F6,#2DD4BF)",
                    color: "white",
                    textDecoration: "none",
                  }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Connexion
                </Link>
              </>
            )}
            <div className="flex items-center gap-2 px-3 pt-2">
              <img src="https://flagcdn.com/w40/sn.png" alt="Sénégal" className="w-5 h-3.5 rounded shadow-sm" loading="lazy" />
              <img src="https://flagcdn.com/w40/ca.png" alt="Canada"  className="w-5 h-3.5 rounded shadow-sm" loading="lazy" />
            </div>
          </nav>
        )}

        {/* Language Selector Mobile */}
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
