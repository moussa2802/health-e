import React from "react";
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
  const { isAuthenticated, currentUser } = useAuth();
  const auth = getAuth();

  if (!isAuthenticated) {
    // User is not authenticated, redirect to patient access page
    return <Navigate to="/patient" replace />;
  }

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
