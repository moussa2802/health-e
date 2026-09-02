import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Mail, Eye, EyeOff, CheckCircle2, AlertTriangle } from "lucide-react";

const MigrationGate: React.FC = () => {
  const { linkGoogleAccount, linkEmailToAccount, logout } = useAuth();

  const [mode, setMode] = useState<"choose" | "email">("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      await linkGoogleAccount();
      setSuccess(true);
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'association Google.");
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      await linkEmailToAccount(email.trim(), password);
      setSuccess(true);
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      const code = e?.code || "";
      if (code === "auth/email-already-in-use") {
        setError("Cet email est déjà utilisé par un autre compte.");
      } else if (code === "auth/invalid-email") {
        setError("Adresse email invalide.");
      } else if (code === "auth/provider-already-linked") {
        setError("Un email est déjà associé à ce compte.");
      } else {
        setError(e?.message || "Erreur lors de l'association.");
      }
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <CheckCircle2 className="h-16 w-16 text-sage mx-auto mb-4" />
          <h2 className="text-xl font-bold text-ink mb-2">Migration réussie !</h2>
          <p className="text-sm text-ink-soft mb-6">
            Votre compte est maintenant sécurisé. Vous allez être redirigé automatiquement.
          </p>
          <p className="text-xs text-muted">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-warm-amber/15 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-7 w-7 text-warm-amber" />
          </div>
          <h1 className="text-xl font-bold text-ink mb-2">
            Sécurisez votre compte
          </h1>
          <p className="text-sm text-ink-soft leading-relaxed">
            La connexion par SMS sera bientôt désactivée. Associez une méthode de connexion gratuite pour continuer à utiliser Health-e.
          </p>
        </div>

        {error && (
          <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-danger/10 border border-danger/20">
            <p className="text-xs text-danger m-0">{error}</p>
          </div>
        )}

        {mode === "choose" ? (
          <div className="space-y-3">
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-card border border-line hover:border-accent/40 transition-colors cursor-pointer disabled:opacity-60"
            >
              <div className="w-9 h-9 rounded-[10px] bg-surface border border-line flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-ink m-0">
                  {loading ? "Redirection..." : "Continuer avec Google"}
                </p>
                <p className="text-xs text-muted m-0 mt-0.5">Rapide et sécurisé</p>
              </div>
            </button>

            <button
              onClick={() => setMode("email")}
              disabled={loading}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-card border border-line hover:border-accent/40 transition-colors cursor-pointer disabled:opacity-60"
            >
              <div className="w-9 h-9 rounded-[10px] bg-accent-soft border border-accent/20 flex items-center justify-center flex-shrink-0">
                <Mail className="h-[18px] w-[18px] text-accent" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-ink m-0">
                  Email + mot de passe
                </p>
                <p className="text-xs text-muted m-0 mt-0.5">Créez un accès par email</p>
              </div>
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-line text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6 caractères minimum"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-card border border-line text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink-soft transition-colors bg-transparent border-none cursor-pointer p-0"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                Confirmer le mot de passe
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retapez le mot de passe"
                className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-line text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-pill bg-accent text-white text-sm font-bold border-none cursor-pointer hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Association en cours..." : "Associer cet email"}
            </button>

            <button
              type="button"
              onClick={() => { setMode("choose"); setError(""); }}
              className="w-full py-2 text-xs text-muted hover:text-ink-soft transition-colors bg-transparent border-none cursor-pointer"
            >
              ← Retour au choix
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-line text-center">
          <button
            onClick={logout}
            className="text-xs text-muted hover:text-danger transition-colors bg-transparent border-none cursor-pointer"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
};

export default MigrationGate;
