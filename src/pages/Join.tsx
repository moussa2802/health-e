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
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Vérification en cours...
          </h2>
          <p className="text-gray-600">
            Nous vérifions votre lien de consultation.
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Réessayer
            </button>
            <Link
              to="/"
              className="flex items-center justify-center px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors"
            >
              <Home className="h-5 w-5 mr-2" />
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
            <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Ce n'est pas encore l'heure
            </h2>
            <p className="text-gray-600 mb-4">
              Votre consultation avec{" "}
              <strong>{joinInfo.professionalName}</strong> aura lieu le{" "}
              <strong>{joinInfo.startsAtHuman}</strong>.
            </p>
            <p className="text-gray-600 mb-6">
              Revenez à ce moment-là pour accéder à votre consultation.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleRetry}
                className="flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Réessayer
              </button>
              <Link
                to="/"
                className="flex items-center justify-center px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors"
              >
                <Home className="h-5 w-5 mr-2" />
                Accueil
              </Link>
            </div>
          </div>
        );

      case "finished":
        return (
          <div className="text-center">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-gray-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Consultation terminée
            </h2>
            <p className="text-gray-600 mb-6">
              Cette consultation est maintenant terminée.
            </p>
            <Link
              to="/"
              className="flex items-center justify-center px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors mx-auto max-w-xs"
            >
              <Home className="h-5 w-5 mr-2" />
              Accueil
            </Link>
          </div>
        );

      case "invalid":
      default:
        return (
          <div className="text-center">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Lien invalide ou expiré
            </h2>
            <p className="text-gray-600 mb-6">
              Ce lien de consultation n'est pas valide ou a expiré.
            </p>
            <Link
              to="/"
              className="flex items-center justify-center px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors mx-auto max-w-xs"
            >
              <Home className="h-5 w-5 mr-2" />
              Accueil
            </Link>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default Join;
