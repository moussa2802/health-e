import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { X } from "lucide-react";

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
      <div
        style={{
          margin: "16px 0",
          padding: "14px 18px",
          borderRadius: 14,
          background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(16,185,129,0.06))",
          border: "1.5px solid rgba(34,197,94,0.25)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 20 }}>✓</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#16A34A" }}>
          Compte Google associé avec succès !
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        margin: "16px 0",
        padding: "14px 18px",
        borderRadius: 14,
        background: "linear-gradient(135deg, rgba(59,130,246,0.06), rgba(45,212,191,0.04))",
        border: "1.5px solid rgba(59,130,246,0.18)",
        position: "relative",
      }}
    >
      {/* Close button */}
      <button
        onClick={handleDismiss}
        aria-label="Fermer"
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#94A3B8",
          padding: 2,
        }}
      >
        <X size={16} />
      </button>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Google icon */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "white",
            border: "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
        </div>

        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1E293B" }}>
            Associez votre compte Google
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748B", lineHeight: 1.4 }}>
            Connectez-vous plus facilement la prochaine fois, sans attendre de SMS.
          </p>

          {error && (
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#DC2626" }}>{error}</p>
          )}

          <button
            onClick={handleLink}
            disabled={linking}
            style={{
              marginTop: 10,
              padding: "8px 16px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, #3B82F6, #2DD4BF)",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor: linking ? "not-allowed" : "pointer",
              opacity: linking ? 0.6 : 1,
            }}
          >
            {linking ? "Redirection..." : "Associer Google"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleLinkBanner;
