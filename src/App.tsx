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
  () => import("./pages/professional/ProfessionalSettings")
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
const AdminPatients = lazy(() => import("./pages/admin/AdminPatients"));
const AdminAppointments = lazy(() => import("./pages/admin/AdminAppointments"));
const AdminStatistics = lazy(() => import("./pages/admin/AdminStatistics"));
const AdminContent = lazy(() => import("./pages/admin/AdminContent"));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));
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
        console.log("🔄 Performing initial Firestore reset on app load");
        await resetFirestoreConnection();
        console.log("✅ Initial Firestore reset completed");
      } catch (error) {
        console.warn("⚠️ Initial Firestore reset failed:", error);
      }
    };
    initializeApp();

    return () => {
      isMountedRef.current = false;

      console.log("🧹 App unmounting, cleaning up all Firestore listeners");

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
        console.log("📱 App going to background, cleaning up listeners");
        cleanupAllProfessionalsListeners();
        cleanupAllBookingListeners();
        cleanupAllMessageListeners();
        clearMessageCaches();
      } else if (document.visibilityState === "visible") {
        // Ensure Firestore is ready when app becomes visible again
        console.log("📱 App coming to foreground, ensuring Firestore is ready");
        try {
          await ensureFirestoreReady();
        } catch (error) {
          console.warn(
            "⚠️ Failed to ensure Firestore ready on visibility change:",
            error
          );
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
      console.log("🔄 App mounted, ensuring Firestore is ready");
      try {
        await ensureFirestoreReady();
        console.log("✅ Firestore ready on app mount");

        // Only ensure required collections exist if Firestore is actually ready
        try {
          // Add a small delay to ensure Firestore is fully initialized
          await new Promise((resolve) => setTimeout(resolve, 100));
          await ensureRequiredCollectionsExist();
          console.log("✅ Required collections verified");
        } catch (collectionsError) {
          console.warn(
            "⚠️ Failed to ensure required collections exist:",
            collectionsError
          );
          // Don't throw here - the app can still function without this check
        }
      } catch (error) {
        console.warn(
          "⚠️ Failed to ensure Firestore ready on app mount:",
          error
        );
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
        console.error(
          "🚨 Global Firestore internal error detected:",
          event.error
        );

        // Prevent multiple reset attempts in quick succession
        if (resetAttemptedRef.current) {
          console.log("⚠️ Reset already attempted recently, skipping");
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
          console.log(
            "🔄 Attempting to reset Firestore connection due to global error"
          );
          await resetFirestoreConnection();
          console.log(
            "✅ Firestore connection reset successful after global error"
          );

          // Ensure Firestore is ready after reset
          await ensureFirestoreReady();
          console.log("✅ Firestore ready after reset");
        } catch (resetError) {
          console.error(
            "❌ Failed to reset Firestore connection after global error:",
            resetError
          );
        }
      }
    };

    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("error", handleError);
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
                        path="/professional/access"
                        element={<ProfessionalAccess />}
                      />
                      <Route path="/admin/login" element={<AdminLogin />} />
                      <Route path="/login" element={<Navigate to="/" />} />
                      <Route path="/faq" element={<FAQ />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/confidentialite" element={<Privacy />} />
                      <Route path="/conditions" element={<Terms />} />
                      <Route path="/ethique" element={<Ethics />} />
                      <Route path="/verify-email" element={<VerifyEmail />} />

                      {/* Patient Routes */}
                      <Route
                        path="/professionals/:specialty"
                        element={<ProfessionalsList />}
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

                      {/* Consultation Room */}
                      <Route
                        path="/consultation/:id"
                        element={
                          <ProtectedRoute>
                            <ConsultationRoom />
                          </ProtectedRoute>
                        }
                      />
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
