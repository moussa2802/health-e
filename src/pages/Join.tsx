import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "../utils/firebase";
import { AlertCircle, Clock, Home, RefreshCw } from "lucide-react";

const ROOM_BASE_PATH = "/room"; // Configurable si votre route room diffère

interface JoinInfoResponse {
  status: "invalid" | "too_early" | "ok" | "finished";
  bookingId?: string;
  roomPath?: string;
  startsAtHuman?: string;
  professionalName?: string;
}

const Join: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [joinInfo, setJoinInfo] = useState<JoinInfoResponse | null>(null);

  // Extraire le token depuis ?t=
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get("t");

  const fetchJoinInfo = async () => {
    if (!token) {
      setError("Token manquant dans l'URL");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const joinInfoFn = httpsCallable(functions, "joinInfo");
      const result = await joinInfoFn({ token });
      const data = result.data as JoinInfoResponse;

      setJoinInfo(data);

      // Si c'est OK, rediriger immédiatement vers la room
      if (data.status === "ok" && data.roomPath) {
        navigate(data.roomPath);
        return;
      }
    } catch (err: any) {
      console.error("Erreur lors de la vérification du token:", err);
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJoinInfo();
  }, [token]);

  const handleRetry = () => {
    fetchJoinInfo();
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sage-soft">
            <RefreshCw className="h-8 w-8 animate-spin text-sage" />
          </div>
          <h2 className="font-display mb-2 text-xl font-semibold text-ink">
            Vérification en cours...
          </h2>
          <p className="text-ink-soft">
            Nous vérifions votre lien de consultation.
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
            <AlertCircle className="h-8 w-8 text-danger" />
          </div>
          <h2 className="font-display mb-2 text-xl font-semibold text-ink">Erreur</h2>
          <p className="mb-6 text-ink-soft">{error}</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={handleRetry}
              className="flex items-center justify-center rounded-card bg-ink px-6 py-3 font-semibold text-white transition-colors hover:bg-ink/90"
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Réessayer
            </button>
            <Link
              to="/"
              className="flex items-center justify-center rounded-card border border-line bg-card px-6 py-3 font-semibold text-ink-soft transition-colors hover:bg-paper"
            >
              <Home className="mr-2 h-5 w-5" />
              Accueil
            </Link>
          </div>
        </div>
      );
    }

    if (!joinInfo) {
      return null;
    }

    switch (joinInfo.status) {
      case "too_early":
        return (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warn/10">
              <Clock className="h-8 w-8 text-warn" />
            </div>
            <h2 className="font-display mb-2 text-xl font-semibold text-ink">
              Ce n'est pas encore l'heure
            </h2>
            <p className="mb-4 text-ink-soft">
              Votre consultation avec{" "}
              <strong className="text-ink">{joinInfo.professionalName}</strong> aura lieu le{" "}
              <strong className="text-ink">{joinInfo.startsAtHuman}</strong>.
            </p>
            <p className="mb-6 text-ink-soft">
              Revenez à ce moment-là pour accéder à votre consultation.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={handleRetry}
                className="flex items-center justify-center rounded-card bg-ink px-6 py-3 font-semibold text-white transition-colors hover:bg-ink/90"
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                Réessayer
              </button>
              <Link
                to="/"
                className="flex items-center justify-center rounded-card border border-line bg-card px-6 py-3 font-semibold text-ink-soft transition-colors hover:bg-paper"
              >
                <Home className="mr-2 h-5 w-5" />
                Accueil
              </Link>
            </div>
          </div>
        );

      case "finished":
        return (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-line">
              <Clock className="h-8 w-8 text-muted" />
            </div>
            <h2 className="font-display mb-2 text-xl font-semibold text-ink">
              Consultation terminée
            </h2>
            <p className="mb-6 text-ink-soft">
              Cette consultation est maintenant terminée.
            </p>
            <Link
              to="/"
              className="mx-auto flex max-w-xs items-center justify-center rounded-card border border-line bg-card px-6 py-3 font-semibold text-ink-soft transition-colors hover:bg-paper"
            >
              <Home className="mr-2 h-5 w-5" />
              Accueil
            </Link>
          </div>
        );

      case "invalid":
      default:
        return (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
              <AlertCircle className="h-8 w-8 text-danger" />
            </div>
            <h2 className="font-display mb-2 text-xl font-semibold text-ink">
              Lien invalide ou expiré
            </h2>
            <p className="mb-6 text-ink-soft">
              Ce lien de consultation n'est pas valide ou a expiré.
            </p>
            <Link
              to="/"
              className="mx-auto flex max-w-xs items-center justify-center rounded-card border border-line bg-card px-6 py-3 font-semibold text-ink-soft transition-colors hover:bg-paper"
            >
              <Home className="mr-2 h-5 w-5" />
              Accueil
            </Link>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-md rounded-block border border-line bg-card p-8 shadow-lift">
        {renderContent()}
      </div>
    </div>
  );
};

export default Join;
