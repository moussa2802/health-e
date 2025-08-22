import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, UserType } from "../../contexts/AuthContext";
import { getAuth } from "firebase/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  userType?: UserType;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  userType,
}) => {
  const { isAuthenticated, currentUser, loading } = useAuth();
  const auth = getAuth();

  // Ajouter un délai de grâce pour éviter les redirections prématurées
  // pendant les opérations Firestore
  const [gracePeriod, setGracePeriod] = useState(true);

  useEffect(() => {
    // Délai très court de 100ms pour éviter les blocages
    const timer = setTimeout(() => {
      setGracePeriod(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Log de débogage pour comprendre l'état
  console.log("🔒 ProtectedRoute Debug:", {
    isAuthenticated,
    gracePeriod,
    loading,
    currentUser: currentUser?.id,
    userType: currentUser?.type,
  });

  // Si l'utilisateur est authentifié, autoriser l'accès immédiatement
  if (isAuthenticated && currentUser?.id) {
    console.log("🔒 Utilisateur authentifié, accès autorisé");

    // Si un type d'utilisateur spécifique est requis, vérifier
    if (userType && currentUser.type !== userType) {
      console.log("🔒 Type d'utilisateur incorrect, redirection");
      if (currentUser.type === "patient") {
        return <Navigate to="/patient/dashboard" replace />;
      } else if (currentUser.type === "professional") {
        return <Navigate to="/professional/dashboard" replace />;
      } else {
        return <Navigate to="/" replace />;
      }
    }

    // Accès autorisé
    return <>{children}</>;
  }

  // Pendant la période de grâce, ne pas rediriger mais afficher un loader plus court
  if (gracePeriod) {
    console.log("🔒 Période de grâce active, affichage du loader");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si en chargement, afficher un loader
  if (loading) {
    console.log("🔒 En chargement, affichage du loader");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si on arrive ici, l'utilisateur n'est pas authentifié
  console.log("🔒 Redirection vers /patient - utilisateur non authentifié");
  return <Navigate to="/patient" replace />;

  // Check if email verification is required
  if (auth.currentUser && !auth.currentUser.emailVerified && !currentUser) {
    // Allow demo accounts to bypass email verification
    const isDemoAccount =
      auth.currentUser.email &&
      (auth.currentUser.email.includes("@demo.com") ||
        auth.currentUser.email === "admin@demo.com");

    // Only redirect to email verification if user doesn't have a Firestore document
    // (currentUser being null indicates no Firestore document was found)
    if (!isDemoAccount && !currentUser) {
      return <Navigate to="/verify-email" replace />;
    }
  }
  // If a specific user type is required, check it
  if (userType && currentUser?.type !== userType) {
    // User is authenticated but not the required type
    // Redirect to appropriate dashboard
    if (currentUser?.type === "patient") {
      return <Navigate to="/patient/dashboard" replace />;
    } else if (currentUser?.type === "professional") {
      return <Navigate to="/professional/dashboard" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  // User is authenticated and has the required type (if specified)
  return <>{children}</>;
};

export default ProtectedRoute;
