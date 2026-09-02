import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  Key,
  Unlink2,
  Eye,
  EyeOff,
  Coins,
  ClipboardList,
  Save,
  Edit2,
} from "lucide-react";
import {
  getOnboardingProfile,
  saveOnboardingProfile,
} from "../../utils/onboardingProfile";
import { saveOnboardingToProfile } from "../../services/evaluationService";
import { getKorisBalance } from "../../services/korisService";
import type {
  OnboardingProfile as OnboardingProfileType,
  Genre,
  SituationRelationnelle,
  DeuilVecu,
  EvenementDifficile,
  SituationMariage,
  SituationEnfants,
} from "../../types/onboarding";
import {
  getPatientProfile,
  updatePatientProfile,
  createDefaultPatientProfile,
  type PatientProfile as PatientProfileType,
} from "../../services/profileService";
import {
  getFirestoreInstance,
} from "../../utils/firebase";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { getDoc, doc as firestoreDoc, Timestamp } from "firebase/firestore";

function withTimeout<T>(p: Promise<T>, ms = 7000, label = "operation"): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout ${ms}ms on ${label}`)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

function normalizeProfile(p: any, currentUser?: any) {
  return {
    name: p?.name || currentUser?.name || "",
    email: p?.email || currentUser?.email || "",
    phone: p?.phone ? String(p.phone) : "",
    gender: p?.gender || "F",
  } as Partial<PatientProfileType>;
}

const SITUATION_LABELS: Record<string, string> = {
  celibataire: "Célibataire",
  en_couple: "En couple",
  marie: "Marié(e)",
  polygamie: "Polygamie",
  separe_divorce: "Séparé(e)/Divorcé(e)",
  veuf: "Veuf(ve)",
  complique: "Situation complexe",
};
const DEUIL_LABELS: Record<string, string> = { non: "Non", recent: "Oui, récent", ancien: "Oui, ancien" };
const TRAUMA_LABELS: Record<string, string> = { non: "Non", oui: "Oui", np: "Préfère ne pas répondre" };
const MARIAGE_LABELS: Record<string, string> = { jamais: "Jamais marié(e)", actuellement: "Actuellement marié(e)", plus_maintenant: "Plus maintenant" };
const ENFANTS_LABELS: Record<string, string> = { oui: "Oui", non: "Non", perte: "Perte d'un enfant" };

const PatientProfile: React.FC = () => {
  const { currentUser, getProviders, linkGoogleAccount, linkEmailToAccount, unlinkPhone } = useAuth();

  const [loading, setLoading] = useState(true);
  const [patientInfo, setPatientInfo] = useState<Partial<PatientProfileType>>({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    phone: "",
    gender: "F",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Auth linking state
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [linkingEmail, setLinkingEmail] = useState(false);
  const [unlinkingPhone, setUnlinkingPhone] = useState(false);
  const [showLinkEmailForm, setShowLinkEmailForm] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkPassword, setLinkPassword] = useState("");
  const [linkPasswordConfirm, setLinkPasswordConfirm] = useState("");
  const [showLinkPassword, setShowLinkPassword] = useState(false);
  const [authMsg, setAuthMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Intake state
  const [intakeProfile, setIntakeProfile] = useState<OnboardingProfileType | null>(null);
  const [editingIntake, setEditingIntake] = useState(false);
  const [intakeForm, setIntakeForm] = useState<Partial<OnboardingProfileType>>({});
  const [savingIntake, setSavingIntake] = useState(false);

  // Koris
  const [korisBalance, setKorisBalance] = useState<number | null>(null);

  const isMountedRef = useRef(true);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Load profile
  useEffect(() => {
    if (!currentUser?.id || hasLoadedRef.current) return;
    (async () => {
      try {
        setLoading(true);
        let profile = await withTimeout(getPatientProfile(currentUser.id), 8000, "getPatientProfile");
        if (!profile) {
          const db = getFirestoreInstance();
          if (db) {
            const userSnap = await withTimeout(getDoc(firestoreDoc(db, "users", currentUser.id)), 6000, "getDoc(users)");
            const userData = userSnap.exists() ? userSnap.data() : {};
            profile = await withTimeout(
              createDefaultPatientProfile(currentUser.id, userData?.name || currentUser.name || "", userData?.email || currentUser.email || ""),
              8000, "createDefaultPatientProfile"
            );
          }
        }
        if (isMountedRef.current && profile) {
          setPatientInfo(normalizeProfile(profile, currentUser));
          hasLoadedRef.current = true;
        }
      } catch {
        if (isMountedRef.current) {
          setPatientInfo({ name: currentUser.name || "", email: currentUser.email || "", phone: "", gender: "F" });
        }
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    })();
  }, [currentUser?.id]);

  // Load intake + koris
  useEffect(() => {
    const profile = getOnboardingProfile();
    setIntakeProfile(profile);
    if (profile) setIntakeForm({ ...profile });
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    getKorisBalance(currentUser.id).then((b) => { if (isMountedRef.current) setKorisBalance(b); });
  }, [currentUser?.id]);

  const providers = getProviders();
  const hasGoogle = providers.includes("google.com");
  const hasEmail = providers.includes("password");
  const hasPhone = providers.includes("phone");

  // Save personal info
  const handleSave = async () => {
    if (!currentUser?.id) return;
    setIsSaving(true);
    setMsg(null);
    try {
      await updatePatientProfile(currentUser.id, patientInfo);
      setMsg({ type: "ok", text: "Profil mis à jour !" });
      setIsEditing(false);
      setTimeout(() => setMsg(null), 3000);
    } catch {
      setMsg({ type: "err", text: "Erreur lors de la sauvegarde." });
    } finally {
      setIsSaving(false);
    }
  };

  // Auth handlers
  const handleLinkGoogle = async () => {
    setLinkingGoogle(true);
    setAuthMsg(null);
    try {
      await linkGoogleAccount();
      setAuthMsg({ type: "ok", text: "Compte Google associé !" });
    } catch (e: any) {
      const m = e?.code === "auth/credential-already-in-use"
        ? "Ce compte Google est déjà utilisé par un autre utilisateur."
        : e?.message || "Erreur lors de l'association Google.";
      setAuthMsg({ type: "err", text: m });
    } finally {
      setLinkingGoogle(false);
    }
  };

  const handleLinkEmail = async () => {
    if (linkPassword.length < 6) { setAuthMsg({ type: "err", text: "Mot de passe : 6 caractères minimum." }); return; }
    if (linkPassword !== linkPasswordConfirm) { setAuthMsg({ type: "err", text: "Les mots de passe ne correspondent pas." }); return; }
    setLinkingEmail(true);
    setAuthMsg(null);
    try {
      await linkEmailToAccount(linkEmail, linkPassword);
      setAuthMsg({ type: "ok", text: "Email associé avec succès !" });
      setShowLinkEmailForm(false);
      setLinkEmail(""); setLinkPassword(""); setLinkPasswordConfirm("");
    } catch (e: any) {
      const m = e?.code === "auth/email-already-in-use" ? "Cet email est déjà utilisé."
        : e?.code === "auth/invalid-email" ? "Adresse email invalide."
        : e?.message || "Erreur lors de l'association.";
      setAuthMsg({ type: "err", text: m });
    } finally {
      setLinkingEmail(false);
    }
  };

  const handleUnlinkPhone = async () => {
    setUnlinkingPhone(true);
    setAuthMsg(null);
    try {
      await unlinkPhone();
      setAuthMsg({ type: "ok", text: "Téléphone retiré." });
    } catch (e: any) {
      setAuthMsg({ type: "err", text: e?.message || "Erreur." });
    } finally {
      setUnlinkingPhone(false);
    }
  };

  // Intake save
  const handleSaveIntake = async () => {
    if (!currentUser?.id || !intakeForm.genre) return;
    setSavingIntake(true);
    try {
      const updated: OnboardingProfileType = {
        prenom: intakeForm.prenom || intakeProfile?.prenom || "",
        age: intakeForm.age || intakeProfile?.age || "18-25",
        genre: intakeForm.genre as Genre,
        situation_relationnelle: (intakeForm.situation_relationnelle || "celibataire") as SituationRelationnelle,
        deuil: (intakeForm.deuil || "non") as DeuilVecu,
        evenement_traumatisant: (intakeForm.evenement_traumatisant || "non") as EvenementDifficile,
        situation_mariage: (intakeForm.situation_mariage || "jamais") as SituationMariage,
        enfants: (intakeForm.enfants || "non") as SituationEnfants,
        completedAt: new Date().toISOString(),
      };
      saveOnboardingProfile(updated);
      await saveOnboardingToProfile(currentUser.id, updated as unknown as Record<string, string>);
      setIntakeProfile(updated);
      setIntakeForm({ ...updated });
      setEditingIntake(false);
    } catch {
      // silent
    } finally {
      setSavingIntake(false);
    }
  };

  // ── Render ──

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl bg-card border border-line text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors";
  const selectClass = inputClass;
  const sectionClass = "bg-card border border-line rounded-card p-5 shadow-soft";

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-lg mx-auto px-4 py-6 pb-20">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/assessment" className="p-2 -ml-2 rounded-xl text-muted hover:text-ink hover:bg-card transition-colors no-underline">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-xl font-semibold text-ink m-0">Mon Profil</h1>
        </div>

        {/* Status message */}
        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${
            msg.type === "ok" ? "bg-sage-soft text-sage border border-sage/20" : "bg-danger/10 text-danger border border-danger/20"
          }`}>
            {msg.type === "ok" ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
            {msg.text}
          </div>
        )}

        <div className="space-y-4">

          {/* ── Avatar + Name ── */}
          <div className={sectionClass}>
            <div className="flex items-center gap-4">
              {currentUser?.profileImage ? (
                <img src={currentUser.profileImage} alt="" className="w-14 h-14 rounded-2xl object-cover border-2 border-line" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-accent-soft flex items-center justify-center">
                  <User className="h-6 w-6 text-accent" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-ink m-0 truncate">{patientInfo.name || "Patient"}</p>
                <p className="text-xs text-muted m-0 mt-0.5">{patientInfo.email || patientInfo.phone || ""}</p>
              </div>
              <button
                onClick={() => { if (isEditing) handleSave(); else setIsEditing(true); }}
                disabled={isSaving}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors border-none cursor-pointer ${
                  isEditing
                    ? "bg-sage text-white hover:bg-sage/90"
                    : "bg-card border border-line text-ink-soft hover:text-ink hover:bg-paper"
                } disabled:opacity-50`}
              >
                {isEditing ? (isSaving ? "..." : "Enregistrer") : "Modifier"}
              </button>
            </div>
          </div>

          {/* ── Informations personnelles ── */}
          {isEditing && (
            <div className={sectionClass}>
              <h2 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-accent" />
                Informations personnelles
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Nom complet</label>
                  <input type="text" value={patientInfo.name || ""} onChange={(e) => setPatientInfo((p) => ({ ...p, name: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Email</label>
                  <input type="email" value={patientInfo.email || ""} onChange={(e) => setPatientInfo((p) => ({ ...p, email: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Téléphone</label>
                  <input type="tel" value={patientInfo.phone || ""} onChange={(e) => setPatientInfo((p) => ({ ...p, phone: e.target.value }))} className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {/* ── Compte & Connexion ── */}
          <div className={sectionClass}>
            <h2 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
              <Key className="h-4 w-4 text-accent" />
              Compte &amp; Connexion
            </h2>

            {authMsg && (
              <div className={`mb-3 px-3 py-2 rounded-xl text-xs flex items-center gap-2 ${
                authMsg.type === "ok" ? "bg-sage-soft text-sage border border-sage/20" : "bg-danger/10 text-danger border border-danger/20"
              }`}>
                {authMsg.type === "ok" ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {authMsg.text}
              </div>
            )}

            <div className="space-y-2.5">
              {/* Google */}
              <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-paper">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasGoogle ? "bg-sage-soft" : "bg-paper-dark"}`}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink m-0">Google</p>
                    <p className="text-[11px] text-muted m-0">{hasGoogle ? "Connecté" : "Non associé"}</p>
                  </div>
                </div>
                {hasGoogle ? (
                  <span className="px-2.5 py-1 bg-sage-soft text-sage text-[11px] font-semibold rounded-pill">Actif</span>
                ) : (
                  <button onClick={handleLinkGoogle} disabled={linkingGoogle} className="px-3 py-1.5 bg-accent text-white text-[11px] font-semibold rounded-pill border-none cursor-pointer hover:bg-accent/90 disabled:opacity-50 transition-colors">
                    {linkingGoogle ? "..." : "Associer"}
                  </button>
                )}
              </div>

              {/* Email */}
              <div className="rounded-xl bg-paper">
                <div className="flex items-center justify-between py-2.5 px-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasEmail ? "bg-sage-soft" : "bg-paper-dark"}`}>
                      <Mail className="h-4 w-4 text-ink-soft" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink m-0">Email &amp; Mot de passe</p>
                      <p className="text-[11px] text-muted m-0">{hasEmail ? "Connecté" : "Non associé"}</p>
                    </div>
                  </div>
                  {hasEmail ? (
                    <span className="px-2.5 py-1 bg-sage-soft text-sage text-[11px] font-semibold rounded-pill">Actif</span>
                  ) : (
                    <button onClick={() => setShowLinkEmailForm(!showLinkEmailForm)} className="px-3 py-1.5 bg-accent text-white text-[11px] font-semibold rounded-pill border-none cursor-pointer hover:bg-accent/90 transition-colors">
                      Associer
                    </button>
                  )}
                </div>
                {showLinkEmailForm && !hasEmail && (
                  <div className="px-3 pb-3 space-y-2.5 border-t border-line pt-3 mx-3">
                    <input type="email" placeholder="Adresse email" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} className={inputClass} />
                    <div className="relative">
                      <input type={showLinkPassword ? "text" : "password"} placeholder="Mot de passe (6 car. min)" value={linkPassword} onChange={(e) => setLinkPassword(e.target.value)} className={`${inputClass} pr-10`} />
                      <button type="button" onClick={() => setShowLinkPassword(!showLinkPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted bg-transparent border-none cursor-pointer p-0">
                        {showLinkPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <input type={showLinkPassword ? "text" : "password"} placeholder="Confirmer le mot de passe" value={linkPasswordConfirm} onChange={(e) => setLinkPasswordConfirm(e.target.value)} className={inputClass} />
                    <button onClick={handleLinkEmail} disabled={linkingEmail || !linkEmail || !linkPassword} className="w-full py-2.5 bg-accent text-white text-sm font-semibold rounded-xl border-none cursor-pointer hover:bg-accent/90 disabled:opacity-50 transition-colors">
                      {linkingEmail ? "Association..." : "Associer l'email"}
                    </button>
                  </div>
                )}
              </div>

              {/* Phone */}
              <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-paper">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasPhone ? "bg-sage-soft" : "bg-paper-dark"}`}>
                    <Phone className="h-4 w-4 text-ink-soft" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink m-0">Téléphone (SMS)</p>
                    <p className="text-[11px] text-muted m-0">{hasPhone ? "Connecté" : "Inactif"}</p>
                  </div>
                </div>
                {hasPhone ? (
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-sage-soft text-sage text-[11px] font-semibold rounded-pill">Actif</span>
                    {(hasGoogle || hasEmail) && (
                      <button onClick={handleUnlinkPhone} disabled={unlinkingPhone} className="px-2.5 py-1 text-[11px] font-medium text-danger border border-danger/20 rounded-pill bg-transparent cursor-pointer hover:bg-danger/5 disabled:opacity-50 transition-colors flex items-center gap-1">
                        <Unlink2 className="h-3 w-3" />
                        {unlinkingPhone ? "..." : "Retirer"}
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="px-2.5 py-1 bg-paper-dark text-muted text-[11px] font-medium rounded-pill">Inactif</span>
                )}
              </div>
            </div>
          </div>

          {/* ── Profil d'évaluation ── */}
          {intakeProfile && (
            <div className={sectionClass}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-ink flex items-center gap-2 m-0">
                  <ClipboardList className="h-4 w-4 text-sage" />
                  Profil d'évaluation
                </h2>
                <button
                  onClick={() => {
                    if (editingIntake) { setIntakeForm({ ...intakeProfile }); setEditingIntake(false); }
                    else { setIntakeForm({ ...intakeProfile }); setEditingIntake(true); }
                  }}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-pill border-none cursor-pointer transition-colors ${
                    editingIntake ? "bg-paper-dark text-ink-soft hover:bg-line" : "bg-sage text-white hover:bg-sage/90"
                  }`}
                >
                  {editingIntake ? "Annuler" : "Modifier"}
                </button>
              </div>
              <p className="text-[11px] text-muted mb-3 m-0">
                Ces informations influencent les tests proposés et ton totem.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Genre */}
                <FieldCard label="Genre" editMode={editingIntake}
                  display={intakeProfile.genre === "homme" ? "Homme" : "Femme"}
                  editor={<select value={intakeForm.genre || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, genre: e.target.value as Genre }))} className={selectClass}>
                    <option value="homme">Homme</option><option value="femme">Femme</option>
                  </select>}
                />
                {/* Situation relationnelle */}
                <FieldCard label="Situation" editMode={editingIntake}
                  display={SITUATION_LABELS[intakeProfile.situation_relationnelle] || intakeProfile.situation_relationnelle}
                  editor={<select value={intakeForm.situation_relationnelle || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, situation_relationnelle: e.target.value as SituationRelationnelle }))} className={selectClass}>
                    {Object.entries(SITUATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>}
                />
                {/* Deuil */}
                <FieldCard label="Deuil vécu" editMode={editingIntake}
                  display={DEUIL_LABELS[intakeProfile.deuil] || intakeProfile.deuil}
                  editor={<select value={intakeForm.deuil || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, deuil: e.target.value as DeuilVecu }))} className={selectClass}>
                    {Object.entries(DEUIL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>}
                />
                {/* Trauma */}
                <FieldCard label="Événement difficile" editMode={editingIntake}
                  display={TRAUMA_LABELS[intakeProfile.evenement_traumatisant] || intakeProfile.evenement_traumatisant}
                  editor={<select value={intakeForm.evenement_traumatisant || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, evenement_traumatisant: e.target.value as EvenementDifficile }))} className={selectClass}>
                    {Object.entries(TRAUMA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>}
                />
                {/* Mariage */}
                <FieldCard label="Mariage" editMode={editingIntake}
                  display={MARIAGE_LABELS[intakeProfile.situation_mariage] || intakeProfile.situation_mariage}
                  editor={<select value={intakeForm.situation_mariage || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, situation_mariage: e.target.value as SituationMariage }))} className={selectClass}>
                    {Object.entries(MARIAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>}
                />
                {/* Enfants */}
                <FieldCard label="Enfants" editMode={editingIntake}
                  display={ENFANTS_LABELS[intakeProfile.enfants] || intakeProfile.enfants}
                  editor={<select value={intakeForm.enfants || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, enfants: e.target.value as SituationEnfants }))} className={selectClass}>
                    {Object.entries(ENFANTS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>}
                />
              </div>
              {editingIntake && (
                <button onClick={handleSaveIntake} disabled={savingIntake} className="mt-3 w-full py-2.5 bg-sage text-white text-sm font-semibold rounded-xl border-none cursor-pointer hover:bg-sage/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  <Save className="h-4 w-4" />
                  {savingIntake ? "Sauvegarde..." : "Enregistrer les modifications"}
                </button>
              )}
            </div>
          )}

          {/* ── Koris ── */}
          {korisBalance !== null && (
            <div className={sectionClass}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gold-soft flex items-center justify-center">
                  <Coins className="h-6 w-6 text-gold" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-ink m-0">{korisBalance} <span className="text-sm font-medium text-muted">Koris</span></p>
                  <p className="text-[11px] text-muted m-0 mt-0.5">Crédits disponibles</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

function FieldCard({ label, display, editor, editMode }: { label: string; display: string; editor: React.ReactNode; editMode: boolean }) {
  return (
    <div className="rounded-xl bg-paper px-3 py-2.5">
      <p className="text-[11px] font-medium text-muted m-0 mb-1">{label}</p>
      {editMode ? editor : <p className="text-sm font-medium text-ink m-0">{display}</p>}
    </div>
  );
}

export default PatientProfile;
