import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import WelcomeScreen from "./screens/WelcomeScreen";
import SituationScreen from "./screens/SituationScreen";
import CycleEstimateScreen from "./screens/CycleEstimateScreen";
import CheckinScreen, { type CheckinSubmission } from "./screens/CheckinScreen";
import DrLoResponseScreen from "./screens/DrLoResponseScreen";
import DashboardScreen from "./screens/DashboardScreen";
import InstallBanner from "./components/InstallBanner";
import ReminderOptIn from "./components/ReminderOptIn";
import { getSituationById, type SituationOption } from "./data/situations";
import { calculateCyclePhase, estimateCycleStartDate } from "./data/cyclePhases";
import { getDrLoResponse } from "./data/drLoResponses";
import { detectVigilanceSignal, vigilanceMessage } from "./data/vigilance";
import {
  getCompanionData,
  getRecentCheckins,
  getTodayCheckin,
  saveCheckin,
  saveOnboarding,
} from "./services/companionService";
import { useInstallPrompt } from "./hooks/useInstallPrompt";
import { useDailyReminder } from "./hooks/useDailyReminder";
import { migrateOldCompanionServiceWorker, markCheckinDoneForReminder, todayDateString } from "./utils";
import { PAGE_OUTER_BG, SCREEN_BG } from "./theme";
import type { Checkin, MoodType } from "./types";

// Machine à états de navigation, avec historique pour le bouton retour. Au
// montage, on lit le profil companion Firestore (onboardingDone, check-in du
// jour) pour reprendre directement au Dashboard plutôt que de toujours
// repartir de l'accueil.
type CompanionStep =
  | "welcome"
  | "situation"
  | "cycle-estimate"
  | "dashboard"
  | "checkin"
  | "dr-lo-response";

interface OnboardingDraft {
  situation: SituationOption | null;
  cycleStartDate: string | null;
  cycleKnown: boolean;
}

const CompanionApp: React.FC = () => {
  const { currentUser } = useAuth();
  const [sessionLoading, setSessionLoading] = useState(true);
  const [history, setHistory] = useState<CompanionStep[]>(["welcome"]);
  const step = history[history.length - 1];
  const goTo = (next: CompanionStep) => setHistory((h) => [...h, next]);
  const goBack = () =>
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));

  const [onboarding, setOnboarding] = useState<OnboardingDraft>({
    situation: null,
    cycleStartDate: null,
    cycleKnown: false,
  });
  const [mood, setMood] = useState<MoodType | null>(null);
  const [vigilance, setVigilance] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [streak, setStreak] = useState(0);
  const [recentCheckins, setRecentCheckins] = useState<Checkin[]>([]);
  const { platform: installPlatform, install, dismiss } = useInstallPrompt();
  const {
    platform: reminderPlatform,
    enable: enableReminder,
    dismiss: dismissReminder,
  } = useDailyReminder();

  useEffect(() => {
    migrateOldCompanionServiceWorker();
  }, []);

  // Reprise de session : onboarding déjà fait ? check-in du jour déjà fait ?
  // Dans les deux cas on reprend sur le Dashboard, qui affiche lui-même
  // l'état du jour (invitation ou réponse déjà donnée).
  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      if (!currentUser?.id) {
        setSessionLoading(false);
        return;
      }
      try {
        const companion = await getCompanionData(currentUser.id);
        if (!companion.onboardingDone) {
          if (!cancelled) setSessionLoading(false);
          return;
        }

        if (cancelled) return;
        setOnboarding({
          situation: companion.situation
            ? getSituationById(companion.situation)
            : null,
          cycleStartDate: companion.cycleStartDate,
          cycleKnown: companion.cycleKnown,
        });
        setStreak(companion.checkinStreak);

        const [todayCheckin, recent] = await Promise.all([
          getTodayCheckin(currentUser.id),
          getRecentCheckins(currentUser.id, 7),
        ]);
        if (cancelled) return;
        setRecentCheckins(recent);
        if (todayCheckin) {
          setMood(todayCheckin.mood);
          setVigilance(todayCheckin.vigilanceFlag);
        }
        setHistory(["dashboard"]);
      } catch {
        // Échec réseau : on repart de l'accueil plutôt que de bloquer l'app.
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  // "Je ne sais pas" -> on bascule sur la grille émotionnelle même si la
  // situation choisie était "cycling" (cf. cahier des charges Phase 4.2).
  const effectiveGrid =
    onboarding.situation?.grid === "cyclical" && !onboarding.cycleKnown
      ? "emotional"
      : onboarding.situation?.grid ?? "emotional";

  const cycleInfo =
    effectiveGrid === "cyclical" && onboarding.cycleStartDate
      ? calculateCyclePhase(onboarding.cycleStartDate)
      : null;

  const drLoResponse = mood
    ? vigilance
      ? vigilanceMessage
      : getDrLoResponse(effectiveGrid, mood, cycleInfo?.phase)
    : null;

  if (sessionLoading) {
    return (
      <div className={`min-h-screen ${PAGE_OUTER_BG} flex items-center justify-center`}>
        <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${PAGE_OUTER_BG} flex justify-center`}>
      <div className={`w-full max-w-md min-h-screen ${SCREEN_BG} flex flex-col relative`}>
        {history.length > 1 && (
          <button
            onClick={goBack}
            aria-label="Retour"
            className="absolute top-5 left-5 z-10 w-9 h-9 rounded-full flex items-center justify-center text-ink-soft hover:bg-line/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {step === "welcome" && (
          <WelcomeScreen onStart={() => goTo("situation")} />
        )}

        {step === "situation" && (
          <SituationScreen
            onSelect={(selected) => {
              setOnboarding({
                situation: selected,
                cycleStartDate: null,
                cycleKnown: false,
              });
              if (selected.asksCycle) {
                goTo("cycle-estimate");
                return;
              }
              if (currentUser?.id) {
                saveOnboarding(currentUser.id, {
                  situation: selected.id,
                  cycleStartDate: null,
                  cycleLength: 28,
                  cycleKnown: false,
                }).catch(() => {});
              }
              goTo("dashboard");
            }}
          />
        )}

        {step === "cycle-estimate" && (
          <CycleEstimateScreen
            onEstimate={(choice) => {
              const cycleStartDate = estimateCycleStartDate(choice);
              const cycleKnown = choice !== "unknown";
              setOnboarding((prev) => ({ ...prev, cycleStartDate, cycleKnown }));
              if (currentUser?.id && onboarding.situation) {
                saveOnboarding(currentUser.id, {
                  situation: onboarding.situation.id,
                  cycleStartDate,
                  cycleLength: 28,
                  cycleKnown,
                }).catch(() => {});
              }
              goTo("dashboard");
            }}
          />
        )}

        {step === "dashboard" && (
          <DashboardScreen
            firstName={currentUser?.name?.split(" ")[0]}
            streak={streak}
            cycleInfo={cycleInfo}
            todayCheckin={mood && drLoResponse ? { mood, response: drLoResponse } : null}
            recentCheckins={recentCheckins}
            onStartCheckin={() => goTo(mood ? "dr-lo-response" : "checkin")}
          />
        )}

        {step === "checkin" && (
          <CheckinScreen
            firstName={currentUser?.name?.split(" ")[0]}
            submitting={submitting}
            onSubmit={async (data: CheckinSubmission) => {
              setMood(data.mood);
              setSubmitting(true);
              let signal = false;
              if (currentUser?.id) {
                try {
                  const recent = await getRecentCheckins(currentUser.id, 3);
                  signal = detectVigilanceSignal([
                    ...recent,
                    { mood: data.mood },
                  ]);
                  const checkinData: Omit<Checkin, "id" | "date" | "createdAt"> = {
                    mood: data.mood,
                    energy: data.energy,
                    readingGrid: effectiveGrid,
                    vigilanceFlag: signal,
                    ...(data.note ? { note: data.note } : {}),
                    ...(cycleInfo
                      ? { cyclePhase: cycleInfo.phase, cycleDay: cycleInfo.cycleDay }
                      : {}),
                  };
                  await saveCheckin(currentUser.id, checkinData);
                  markCheckinDoneForReminder(todayDateString()).catch(() => {});
                  const [companion, recentWeek] = await Promise.all([
                    getCompanionData(currentUser.id),
                    getRecentCheckins(currentUser.id, 7),
                  ]);
                  setStreak(companion.checkinStreak);
                  setRecentCheckins(recentWeek);
                } catch {
                  signal = false;
                }
              }
              setVigilance(signal);
              setSubmitting(false);
              goTo("dr-lo-response");
            }}
          />
        )}

        {step === "dr-lo-response" && drLoResponse && (
          <DrLoResponseScreen
            response={drLoResponse}
            cycleInfo={cycleInfo}
            vigilance={vigilance}
          />
        )}

        {step === "dr-lo-response" && installPlatform && (
          <InstallBanner
            platform={installPlatform}
            onInstall={install}
            onDismiss={dismiss}
          />
        )}

        {step === "dr-lo-response" && !installPlatform && reminderPlatform && (
          <ReminderOptIn
            platform={reminderPlatform}
            onEnable={enableReminder}
            onDismiss={dismissReminder}
          />
        )}
      </div>
    </div>
  );
};

export default CompanionApp;
