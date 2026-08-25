import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { X, CheckCircle2 } from "lucide-react";

const DISMISSED_KEY = "he_google_link_dismissed";
const LINK_SUCCESS_KEY = "he_google_link_success";

/**
 * Banner shown to phone-only users, inviting them to link their Google account
 * for easier future sign-in. Uses redirect mode (no popup).
 */
const GoogleLinkBanner: React.FC = () => {
  const { isPhoneOnlyUser, linkGoogleAccount, currentUser } = useAuth();
  const [visible, setVisible] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    // Check if we just returned from a successful Google link redirect
    const linkSuccess = localStorage.getItem(LINK_SUCCESS_KEY);
    if (linkSuccess === currentUser.id) {
      localStorage.removeItem(LINK_SUCCESS_KEY);
      setVisible(true);
      setSuccess(true);
      setTimeout(() => setVisible(false), 3000);
      return;
    }

    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed === currentUser.id) return;
    if (isPhoneOnlyUser()) {
      setVisible(true);
    }
  }, [currentUser, isPhoneOnlyUser]);

  const handleDismiss = () => {
    setVisible(false);
    if (currentUser) {
      localStorage.setItem(DISMISSED_KEY, currentUser.id);
    }
  };

  const handleLink = async () => {
    setLinking(true);
    setError("");
    try {
      // Save a flag so we can show success after the redirect return
      if (currentUser) {
        localStorage.setItem(LINK_SUCCESS_KEY, currentUser.id);
      }
      await linkGoogleAccount();
      // linkWithRedirect navigates away — code below won't execute
    } catch (e: any) {
      localStorage.removeItem(LINK_SUCCESS_KEY);
      setError(e?.message || "Erreur lors de l'association.");
      setLinking(false);
    }
  };

  if (!visible) return null;

  if (success) {
    return (
      <div className="my-4 px-[18px] py-[14px] rounded-xl bg-sage-soft border border-sage/25 flex items-center gap-2.5">
        <CheckCircle2 className="h-5 w-5 text-sage flex-shrink-0" />
        <span className="text-sm font-semibold text-sage">
          Compte Google associé avec succès !
        </span>
      </div>
    );
  }

  return (
    <div className="relative my-4 px-[18px] py-[14px] rounded-xl bg-accent-soft border border-accent/20">
      {/* Close button */}
      <button
        onClick={handleDismiss}
        aria-label="Fermer"
        className="absolute top-2.5 right-2.5 p-0.5 text-muted hover:text-ink-soft transition-colors"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-3">
        {/* Google icon */}
        <div className="w-9 h-9 rounded-[10px] bg-card border border-line flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
        </div>

        <div className="flex-1">
          <p className="m-0 text-sm font-bold text-ink">
            Associez votre compte Google
          </p>
          <p className="mt-1 mb-0 text-xs text-ink-soft leading-relaxed">
            Connectez-vous plus facilement la prochaine fois, sans attendre de SMS.
          </p>

          {error && (
            <p className="mt-1.5 mb-0 text-xs text-danger">{error}</p>
          )}

          <button
            onClick={handleLink}
            disabled={linking}
            className="mt-2.5 px-4 py-2 rounded-pill border-none bg-accent text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer hover:bg-accent/90 transition-colors"
          >
            {linking ? "Redirection..." : "Associer Google"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleLinkBanner;
