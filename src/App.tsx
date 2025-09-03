import React, { Suspense, lazy, useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import { TermsProvider } from "./contexts/TermsContext";
import OptimizedHeader from "./components/layout/OptimizedHeader";
import Footer from "./components/layout/Footer";
import LoadingSpinner from "./components/ui/LoadingSpinner";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import ScrollToTop from "./components/utils/ScrollToTop";
import { cleanupAllProfessionalsListeners } from "./hooks/useProfessionals";
import { cleanupAllBookingListeners } from "./hooks/useBookings";
import {
  cleanupAllMessageListeners,
  clearMessageCaches,
} from "./services/messageService";
import {
  ensureFirestoreReady,
  resetFirestoreConnection,
  ensureRequiredCollectionsExist,
} from "./utils/firebase";

// Lazy load pages for better performance
const HomePage = lazy(() => import("./pages/OptimizedHomePage"));
const PatientDashboard = lazy(() => import("./pages/patient/PatientDashboard"));
const ProfessionalDashboard = lazy(
  () => import("./pages/professional/ProfessionalDashboard")
);
const PatientAccess = lazy(() => import("./pages/patient/PatientAccess"));
const ForgotPassword = lazy(() => import("./components/auth/ForgotPassword"));
const ForgotPasswordProfessional = lazy(
  () => import("./components/auth/ForgotPasswordProfessional")
);
const ProfessionalAccess = lazy(
  () => import("./pages/professional/ProfessionalAccess")
);
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const ProfessionalsList = lazy(
  () => import("./pages/patient/ProfessionalsList")
);
const ProfessionalProfile = lazy(
  () => import("./pages/patient/ProfessionalProfile")
);
const BookAppointment = lazy(() => import("./pages/patient/BookAppointment"));
const AppointmentSuccess = lazy(
  () => import("./pages/patient/AppointmentSuccess")
);

const ConsultationRoom = lazy(
  () => import("./pages/consultation/ConsultationRoom")
);
const PatientProfile = lazy(() => import("./pages/patient/PatientProfile"));
const ProfessionalSettings = lazy(
  () => import("./pages/professional/StableProfessionalSettings")
);
const AvailabilityManagement = lazy(
  () => import("./pages/professional/AvailabilityManagement")
);
const PatientsList = lazy(() => import("./pages/professional/PatientsList"));
const PatientMessages = lazy(() => import("./pages/patient/Messages"));
const ProfessionalMessages = lazy(
  () => import("./pages/professional/Messages")
);
const FinancialDetails = lazy(
  () => import("./pages/professional/FinancialDetails")
);
const ProtectedRoute = lazy(() => import("./components/auth/ProtectedRoute"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminProfessionals = lazy(
  () => import("./pages/admin/AdminProfessionals")
);
const AdminPatients = lazy(() => import("./pages/admin/AdminPatients"));
const AdminAppointments = lazy(() => import("./pages/admin/AdminAppointments"));
const AdminStatistics = lazy(() => import("./pages/admin/AdminStatistics"));
const AdminContent = lazy(() => import("./pages/admin/AdminContent"));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));
const AdminWithdrawals = lazy(() => import("./pages/admin/WithdrawalsPage"));
const AdminNotifications = lazy(
  () => import("./pages/admin/AdminNotificationsPage")
);
const FAQ = lazy(() => import("./pages/FAQ"));
const Contact = lazy(() => import("./pages/Contact"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Ethics = lazy(() => import("./pages/Ethics"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-lg text-gray-600">Chargement de la page...</p>
    </div>
  </div>
);

function App() {
  // Track if component is mounted
  const isMountedRef = useRef(true);
  const resetAttemptedRef = useRef(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // CRITICAL: Clean up all Firestore listeners when the app unmounts
  useEffect(() => {
    // Clean browser storage on initial load to prevent persistence issues
    const initializeApp = async () => {
      // CRITICAL: Reset Firestore connection on app initialization
      try {
        await resetFirestoreConnection();
      } catch (error) {
        // Handle initial reset error silently
      }
    };
    initializeApp();

    return () => {
      isMountedRef.current = false;

      // App unmounting, cleaning up all Firestore listeners

      // Clean up all Firestore listeners to prevent "Target ID already exists" errors
      cleanupAllProfessionalsListeners();
      cleanupAllBookingListeners();
      cleanupAllMessageListeners();
      clearMessageCaches();

      // Clear any pending reset timeouts
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
    };
  }, []);

  // CRITICAL: Handle page visibility changes to manage listeners
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "hidden") {
        // App going to background, cleaning up listeners
        cleanupAllProfessionalsListeners();
        cleanupAllBookingListeners();
        cleanupAllMessageListeners();
        clearMessageCaches();
      } else if (document.visibilityState === "visible") {
        // Ensure Firestore is ready when app becomes visible again
        try {
          await ensureFirestoreReady();
        } catch (error) {
          // Failed to ensure Firestore ready on visibility change
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // CRITICAL: Ensure Firestore is ready when the app mounts
  useEffect(() => {
    const initializeFirestore = async () => {
      try {
        await ensureFirestoreReady();

        // Only ensure required collections exist if Firestore is actually ready
        try {
          // Add a small delay to ensure Firestore is fully initialized
          await new Promise((resolve) => setTimeout(resolve, 100));
          await ensureRequiredCollectionsExist();
        } catch (collectionsError) {
          // Failed to ensure required collections exist
          // Don't throw here - the app can still function without this check
        }
      } catch (error) {
        // Failed to ensure Firestore ready on app mount
      }
    };

    initializeFirestore();
  }, []);

  // CRITICAL: Handle Firestore internal errors globally
  useEffect(() => {
    const handleError = async (event: ErrorEvent) => {
      // Check if this is a Firestore internal error
      if (
        event.error &&
        typeof event.error.message === "string" &&
        (event.error.message.includes("INTERNAL ASSERTION FAILED") ||
          event.error.message.includes("Target ID already exists") ||
          event.error.message.includes("client has already been terminated") ||
          event.error.message.includes("Unexpected state"))
      ) {
        // Prevent multiple reset attempts in quick succession
        if (resetAttemptedRef.current) {
          return;
        }

        resetAttemptedRef.current = true;

        // Clear any existing timeout
        if (resetTimeoutRef.current) {
          clearTimeout(resetTimeoutRef.current);
        }

        // Set a timeout to allow reset attempts again after 10 seconds
        resetTimeoutRef.current = setTimeout(() => {
          resetAttemptedRef.current = false;
        }, 10000);

        // Clean up all listeners first
        cleanupAllProfessionalsListeners();
        cleanupAllBookingListeners();
        cleanupAllMessageListeners();
        clearMessageCaches();

        // Try to reset Firestore connection - this already handles IndexedDB cleanup
        try {
          await resetFirestoreConnection();

          // Ensure Firestore is ready after reset
          await ensureFirestoreReady();
        } catch (resetError) {
          // Failed to reset Firestore connection after global error
        }
      }
    };

    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("error", handleError);
    };
  }, []);

  // Auto-reload si les chunks lazy échouent (nouveau build déployé)
  useEffect(() => {
    const handler = (e: any) => {
      const msg = String(e?.message || e?.reason?.message || e?.reason || "");

      // Vite/webpack: quand un nouvel artefact est déployé, l'ancien onglet
      // n'arrive plus à charger les chunks -> on recharge proprement.
      if (
        /ChunkLoadError|Loading chunk \d+ failed|CSS_CHUNK_LOAD_FAILED/i.test(
          msg
        )
      ) {
        console.warn("🆕 Nouveau build détecté. Recharge de la page…");
        window.location.reload();
      }
    };

    window.addEventListener("error", handler);
    window.addEventListener("unhandledrejection", handler);
    return () => {
      window.removeEventListener("error", handler);
      window.removeEventListener("unhandledrejection", handler);
    };
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <LanguageProvider>
            <TermsProvider>
              <ScrollToTop />
              <div id="recaptcha-container" style={{ display: "none" }} />
              <div className="min-h-screen flex flex-col bg-gray-50">
                <OptimizedHeader />
                <main className="flex-1">
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<HomePage />} />

                      <Route path="/patient" element={<PatientAccess />} />
                      <Route
                        path="/patient/access"
                        element={<PatientAccess />}
                      />
                      <Route
                        path="/patient/forgot-password"
                        element={<ForgotPassword />}
                      />
                      <Route
                        path="/professional/access"
                        element={<ProfessionalAccess />}
                      />
                      <Route
                        path="/professional/forgot-password"
                        element={<ForgotPasswordProfessional />}
                      />
                      <Route path="/admin/login" element={<AdminLogin />} />
                      <Route path="/login" element={<Navigate to="/" />} />
                      <Route path="/faq" element={<FAQ />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/confidentialite" element={<Privacy />} />
                      <Route path="/conditions" element={<Terms />} />
                      <Route path="/cgu" element={<Terms />} />
                      <Route path="/ethique" element={<Ethics />} />
                      <Route path="/verify-email" element={<VerifyEmail />} />

                      {/* Patient Routes */}
                      <Route
                        path="/professionals/:specialty"
                        element={<ProfessionalsList />}
                      />

                      {/* Legacy redirects for old specialty URLs */}
                      <Route
                        path="/professionals/psychologie"
                        element={
                          <Navigate
                            to="/professionals/psychologue-clinicien"
                            replace
                          />
                        }
                      />
                      <Route
                        path="/professionals/psychiatrie"
                        element={
                          <Navigate to="/professionals/psychiatre" replace />
                        }
                      />
                      <Route
                        path="/professionals/psychologue"
                        element={
                          <Navigate
                            to="/professionals/psychologue-clinicien"
                            replace
                          />
                        }
                      />
                      <Route
                        path="/professionals/sexologue"
                        element={
                          <Navigate
                            to="/professionals/sexologue-clinicien"
                            replace
                          />
                        }
                      />
                      <Route
                        path="/professionals/gynecologie"
                        element={
                          <Navigate to="/professionals/gynecologue" replace />
                        }
                      />
                      <Route
                        path="/professionals/urologie"
                        element={
                          <Navigate to="/professionals/urologue" replace />
                        }
                      />
                      <Route
                        path="/professional/:id"
                        element={<ProfessionalProfile />}
                      />
                      <Route
                        path="/book/:professionalId"
                        element={<BookAppointment />}
                      />
                      <Route
                        path="/appointment-success/:bookingId"
                        element={<AppointmentSuccess />}
                      />
                      <Route
                        path="/patient/dashboard"
                        element={
                          <ProtectedRoute userType="patient">
                            <PatientDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/patient/profile"
                        element={
                          <ProtectedRoute userType="patient">
                            <PatientProfile />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/patient/messages"
                        element={
                          <ProtectedRoute userType="patient">
                            <PatientMessages />
                          </ProtectedRoute>
                        }
                      />

                      {/* Professional Routes */}
                      <Route
                        path="/professional/dashboard"
                        element={
                          <ProtectedRoute userType="professional">
                            <ProfessionalDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/professional/settings"
                        element={
                          <ProtectedRoute userType="professional">
                            <ProfessionalSettings />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/professional/availability"
                        element={
                          <ProtectedRoute userType="professional">
                            <AvailabilityManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/professional/patients"
                        element={
                          <ProtectedRoute userType="professional">
                            <PatientsList />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/professional/messages"
                        element={
                          <ProtectedRoute userType="professional">
                            <ProfessionalMessages />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/professional/financial-details"
                        element={
                          <ProtectedRoute userType="professional">
                            <FinancialDetails />
                          </ProtectedRoute>
                        }
                      />

                      {/* Admin Routes */}
                      <Route
                        path="/admin/dashboard"
                        element={
                          <ProtectedRoute userType="admin">
                            <AdminDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/users"
                        element={
                          <ProtectedRoute userType="admin">
                            <AdminUsers />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/professionals"
                        element={
                          <ProtectedRoute userType="admin">
                            <AdminProfessionals />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/patients"
                        element={
                          <ProtectedRoute userType="admin">
                            <AdminPatients />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/appointments"
                        element={
                          <ProtectedRoute userType="admin">
                            <AdminAppointments />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/statistics"
                        element={
                          <ProtectedRoute userType="admin">
                            <AdminStatistics />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/content"
                        element={
                          <ProtectedRoute userType="admin">
                            <AdminContent />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/messages"
                        element={
                          <ProtectedRoute userType="admin">
                            <AdminMessages />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/support"
                        element={
                          <ProtectedRoute userType="admin">
                            <AdminSupport />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/admin/withdrawals"
                        element={
                          <ProtectedRoute userType="admin">
                            <AdminWithdrawals />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/notifications"
                        element={
                          <ProtectedRoute userType="admin">
                            <AdminNotifications />
                          </ProtectedRoute>
                        }
                      />

                      {/* Consultation Room */}
                      <Route
                        path="/consultation/:id"
                        element={
                          <ProtectedRoute>
                            <ConsultationRoom />
                          </ProtectedRoute>
                        }
                      />

                      {/* Fallback route - évite les 404 "profonds" */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </main>
                <Footer />
              </div>
            </TermsProvider>
          </LanguageProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
