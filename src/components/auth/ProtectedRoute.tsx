import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../ui/LoadingSpinner";

type Props = {
  children: JSX.Element;
  userType?: "admin" | "patient" | "professional";
};

export default function ProtectedRoute({ children, userType }: Props) {
  const { authReady, isAuthenticated, currentUser } = useAuth();
  const location = useLocation();

  // 1) Tant que Firebase n'a pas fini de s'initialiser, ne redirige pas
  if (!authReady) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // 2) Non connecté -> on envoie vers la bonne page de login
  if (!isAuthenticated) {
    const loginPath =
      userType === "admin"
        ? "/admin/login"
        : userType === "professional"
        ? "/professional/access"
        : "/patient"; // patient par défaut

    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  // 3) Connecté mais mauvais rôle -> on retourne à l'accueil
  if (userType && currentUser?.type !== userType) {
    return <Navigate to="/" replace />;
  }

  // 4) OK
  return children;
}
