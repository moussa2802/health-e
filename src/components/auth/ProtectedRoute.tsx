import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, UserType } from "../../contexts/AuthContext";
import { getAuth } from "firebase/auth";

type Props = { children: React.ReactNode; userType?: UserType };

const loader = (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
      <p className="mt-4 text-lg text-gray-600">Chargement…</p>
    </div>
  </div>
);

const dashboards: Record<string, string> = {
  patient: "/patient/dashboard",
  professional: "/professional/dashboard",
  admin: "/admin/dashboard",
};

const ProtectedRoute: React.FC<Props> = ({ children, userType }) => {
  const { isAuthenticated, currentUser, loading } = useAuth();
  const [grace, setGrace] = useState(true);
  const location = useLocation();
  const auth = getAuth();

  // petite marge pour éviter les redirections prématurées
  useEffect(() => {
    const t = setTimeout(() => setGrace(false), 300);
    return () => clearTimeout(t);
  }, []);

  // 1) tant que ça charge (auth OU grace) → spinner
  if (loading || grace) return loader;

  // 2) non authentifié → vers les pages d'accès appropriées
  if (!isAuthenticated) {
    const pending = localStorage.getItem("pending-user-type");
    const target =
      pending === "professional"
        ? "/professional/access"
        : pending === "patient"
        ? "/patient/access"
        : "/";
    return <Navigate to={target} replace state={{ from: location }} />;
  }

  // 3) authentifié Firebase mais profil Firestore pas encore prêt → patienter
  if (isAuthenticated && !currentUser) return loader;

  // 4) gate vérification email (comme tu voulais : seulement si pas de doc Firestore)
  if (
    auth.currentUser &&
    !auth.currentUser.emailVerified &&
    !currentUser // pas de doc => on force la vérif
  ) {
    const email = auth.currentUser.email || "";
    const isDemo = email.endsWith("@demo.com") || email === "admin@demo.com";
    if (!isDemo) {
      return <Navigate to="/verify-email" replace state={{ from: location }} />;
    }
  }

  // 5) garde par rôle quand un type est exigé
  if (userType && currentUser.type !== userType) {
    return <Navigate to={dashboards[currentUser.type] || "/"} replace />;
  }

  // OK
  return <>{children}</>;
};

export default ProtectedRoute;
