// components/auth/ProtectedRoute.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import LoadingSpinner from "../ui/LoadingSpinner";
import { useAuth } from "../../contexts/AuthContext";

type Props = {
  children: React.ReactNode;
  userType?: "admin" | "patient" | "professional";
};

export default function ProtectedRoute({ children, userType }: Props) {
  const {
    authReady, // ✅ Firebase a fini d'annoncer l'état auth
    loadingUserData, // ✅ Firestore user en cours de chargement
    isAuthenticated,
    currentUser,
  } = useAuth();

  const location = useLocation();

  // 1) Tant que l'auth OU le user Firestore n'est pas stabilisé -> aucun redirect
  if (!authReady || loadingUserData) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // 2) Non connecté -> route de login adaptée (et pas de redirect si déjà dessus)
  if (!isAuthenticated) {
    const loginPath =
      userType === "admin"
        ? "/admin/login"
        : userType === "professional"
        ? "/professional/access"
        : "/patient";

    if (location.pathname !== loginPath) {
      return <Navigate to={loginPath} replace state={{ from: location }} />;
    }
    // Si par mégarde ce composant entoure déjà la page login, ne pas re-rediriger
    return <>{children}</>;
  }

  // 3) Connecté mais mauvais rôle -> envoie vers le "home" du rôle réel (sans boucle)
  if (userType && currentUser?.type !== userType) {
    const home =
      currentUser?.type === "admin"
        ? "/admin/dashboard"
        : currentUser?.type === "professional"
        ? "/professional/dashboard"
        : "/patient/dashboard";

    if (location.pathname !== home) {
      return <Navigate to={home} replace />;
    }
  }

  // 4) OK
  return <>{children}</>;
}
