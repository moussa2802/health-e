import React, { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  Plus,
  Users,
  X,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Calendar,
  Video,
  User,
  Heart,
  Eye,
  Check,
  BarChart3,
  Phone,
} from "lucide-react";
import {
  createGroupTherapySession,
  getAllGroupTherapySessions,
  updateSessionStatus,
  markSessionAsCompleted,
  markSessionAsNotCompleted,
  updateGroupTherapySession,
  deleteGroupTherapySession,
  getSessionParticipants,
  getGroupTherapyStatistics,
  GroupTherapySession,
  CreateGroupTherapySessionData,
  ParticipantStats,
} from "../../services/groupTherapyService";
import { getProfessionalById } from "../../services/professionalService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  getProfessionals,
  FirebaseProfessional,
} from "../../services/firebaseService";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Timestamp, doc, getDoc } from "firebase/firestore";
import { getFirestoreInstance } from "../../utils/firebase";

const AdminGroupTherapy: React.FC = () => {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const [sessions, setSessions] = useState<GroupTherapySession[]>([]);
  const [professionals, setProfessionals] = useState<FirebaseProfessional[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [professionalNames, setProfessionalNames] = useState<
    Record<string, { name: string; specialty?: string; profileImage?: string }>
  >({});
  const [selectedSession, setSelectedSession] =
    useState<GroupTherapySession | null>(null);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);
  const [participantsList, setParticipantsList] = useState<string[]>([]);
  const [participantsNames, setParticipantsNames] = useState<
    Record<string, string>
  >({});
  const [participantsPhones, setParticipantsPhones] = useState<
    Record<string, string>
  >({});
  const [statistics, setStatistics] = useState<ParticipantStats[]>([]);
  const [loadingStatistics, setLoadingStatistics] = useState(false);

  // Formulaire
  const [formData, setFormData] = useState<CreateGroupTherapySessionData>({
    title: "",
    description: "",
    price: 0,
    date: "",
    time: "",
    capacity: 10,
    primaryHostId: "",
    secondaryHostIds: [],
    createdBy: currentUser?.id || "",
  });

  useEffect(() => {
    fetchSessions();
    fetchProfessionals();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await getAllGroupTherapySessions();
      setSessions(data);

      // Charger les noms des professionnels
      const professionalIds = new Set<string>();
      data.forEach((session) => {
        if (session.primaryHostId) professionalIds.add(session.primaryHostId);
        session.secondaryHostIds?.forEach((id) => professionalIds.add(id));
      });

      const namesMap: Record<
        string,
        { name: string; specialty?: string; profileImage?: string }
      > = {};
      await Promise.all(
        Array.from(professionalIds).map(async (id) => {
          const prof = await getProfessionalById(id);
          if (prof) {
            namesMap[id] = prof;
          }
        })
      );
      setProfessionalNames(namesMap);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfessionals = async () => {
    try {
      const data = await getProfessionals();
      setProfessionals(data.filter((p) => p.isActive));
    } catch (error) {
      console.error("Error fetching professionals:", error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === "capacity") {
      setFormData({
        ...formData,
        capacity: parseInt(value) || 2,
      });
    } else if (name === "price") {
      setFormData({
        ...formData,
        price: value ? parseFloat(value) : 0,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleProfessionalSelect = (
    professionalId: string,
    isHost: boolean
  ) => {
    if (isHost) {
      setFormData({
        ...formData,
        primaryHostId: professionalId,
        // Retirer le host des secondaires s'il y est
        secondaryHostIds: formData.secondaryHostIds.filter(
          (id) => id !== professionalId
        ),
      });
    } else {
      // Ajouter/retirer des secondaires
      const isSelected = formData.secondaryHostIds.includes(professionalId);
      setFormData({
        ...formData,
        secondaryHostIds: isSelected
          ? formData.secondaryHostIds.filter((id) => id !== professionalId)
          : [...formData.secondaryHostIds, professionalId].filter(
              (id) => id !== formData.primaryHostId
            ),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.title.trim()) {
      setFormError("Le titre est obligatoire");
      return;
    }
    if (!formData.description.trim()) {
      setFormError("La description est obligatoire");
      return;
    }
    if (!formData.primaryHostId) {
      setFormError("Veuillez sélectionner un professionnel hôte");
      return;
    }
    if (formData.capacity < 2) {
      setFormError("Le nombre maximum de participants doit être d'au moins 2");
      return;
    }
    if (!formData.date) {
      setFormError("Veuillez sélectionner une date");
      return;
    }
    if (!formData.time) {
      setFormError("Veuillez sélectionner une heure");
      return;
    }

    try {
      setIsSubmitting(true);
      await createGroupTherapySession({
        ...formData,
        createdBy: currentUser?.id || "",
      });

      // Réinitialiser le formulaire
      setFormData({
        title: "",
        description: "",
        price: 0,
        date: "",
        time: "",
        capacity: 10,
        primaryHostId: "",
        secondaryHostIds: [],
        createdBy: currentUser?.id || "",
      });
      setShowForm(false);
      fetchSessions();
    } catch (error) {
      console.error("Error creating session:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "Erreur lors de la création de la session"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (
    sessionId: string,
    currentStatus: boolean
  ) => {
    try {
      await updateSessionStatus(sessionId, !currentStatus);
      fetchSessions();
    } catch (error) {
      console.error("Error updating session status:", error);
    }
  };

  const handleMarkAsCompleted = async (sessionId: string) => {
    try {
      await markSessionAsCompleted(sessionId);
      fetchSessions();
    } catch (error) {
      console.error("Error marking session as completed:", error);
    }
  };

  const handleMarkAsNotCompleted = async (sessionId: string) => {
    try {
      await markSessionAsNotCompleted(sessionId);
      fetchSessions();
    } catch (error) {
      console.error("Error marking session as not completed:", error);
    }
  };

  const handleViewParticipants = async (session: GroupTherapySession) => {
    try {
      setSelectedSession(session);
      const participants = await getSessionParticipants(session.id);
      setParticipantsList(participants);

      // Charger les noms et numéros de téléphone des participants
      const namesMap: Record<string, string> = {};
      const phonesMap: Record<string, string> = {};
      await Promise.all(
        participants.map(async (userId) => {
          try {
            const db = getFirestoreInstance();
            if (db) {
              const userRef = doc(db, "users", userId);
              const userDoc = await getDoc(userRef);
              if (userDoc.exists()) {
                const userData = userDoc.data();
                namesMap[userId] = userData.name || userId;
                // Récupérer le numéro de téléphone (phoneNumber ou phone)
                phonesMap[userId] =
                  userData.phoneNumber || userData.phone || "Non disponible";
              } else {
                namesMap[userId] = userId;
                phonesMap[userId] = "Non disponible";
              }
            }
          } catch (error) {
            console.error("Error fetching user data:", error);
            namesMap[userId] = userId;
            phonesMap[userId] = "Non disponible";
          }
        })
      );
      setParticipantsNames(namesMap);
      setParticipantsPhones(phonesMap);
      setShowParticipantsModal(true);
    } catch (error) {
      console.error("Error fetching participants:", error);
    }
  };

  const handleEdit = (session: GroupTherapySession) => {
    setSelectedSession(session);
    setFormData({
      title: session.title,
      description: session.description,
      price: session.price,
      date: session.date,
      time: session.time,
      capacity: session.capacity,
      primaryHostId: session.primaryHostId,
      secondaryHostIds: session.secondaryHostIds || [],
      createdBy: currentUser?.id || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;

    try {
      setIsSubmitting(true);
      await updateGroupTherapySession(selectedSession.id, formData);
      setShowEditModal(false);
      setSelectedSession(null);
      fetchSessions();
    } catch (error) {
      console.error("Error updating session:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "Erreur lors de la mise à jour de la session"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (
      !window.confirm(
        language === "fr"
          ? "Êtes-vous sûr de vouloir supprimer cette session ? Cette action est irréversible."
          : "Are you sure you want to delete this session? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await deleteGroupTherapySession(sessionId);
      fetchSessions();
    } catch (error) {
      console.error("Error deleting session:", error);
      alert(
        error instanceof Error
          ? error.message
          : language === "fr"
          ? "Erreur lors de la suppression de la session"
          : "Error deleting session"
      );
    }
  };

  const handleShowStatistics = async () => {
    try {
      setLoadingStatistics(true);
      setShowStatisticsModal(true);
      const stats = await getGroupTherapyStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error("Error fetching statistics:", error);
      alert(
        error instanceof Error
          ? error.message
          : language === "fr"
          ? "Erreur lors du chargement des statistiques"
          : "Error loading statistics"
      );
    } finally {
      setLoadingStatistics(false);
    }
  };

  const getProfessionalName = (professionalId: string): string => {
    return professionalNames[professionalId]?.name || professionalId;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="font-display text-2xl font-semibold text-ink">
            {language === "fr" ? "Thérapies de groupe" : "Group Therapy"}
          </h1>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleShowStatistics}
              className="flex items-center space-x-2 px-4 py-2 bg-sage text-white rounded-card hover:bg-sage/90 transition-colors"
            >
              <BarChart3 className="h-5 w-5" />
              <span>{language === "fr" ? "Statistiques" : "Statistics"}</span>
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center space-x-2 px-4 py-2 bg-accent text-white rounded-card hover:bg-accent/90 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>
                {language === "fr" ? "Créer une thérapie" : "Create Therapy"}
              </span>
            </button>
          </div>
        </div>

        {/* Formulaire de création */}
        {showForm && (
          <div className="bg-card rounded-block shadow-soft p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-xl font-semibold text-ink">
                {language === "fr"
                  ? "Nouvelle thérapie de groupe"
                  : "New Group Therapy"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-muted hover:text-ink"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-card">
                  {formError}
                </div>
              )}

              {/* Titre */}
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-1">
                  {language === "fr" ? "Titre *" : "Title *"}
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-line rounded-card focus:ring-2 focus:ring-accent focus:border-accent"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-1">
                  {language === "fr" ? "Description *" : "Description *"}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-line rounded-card focus:ring-2 focus:ring-accent focus:border-accent"
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-1">
                  {language === "fr" ? "Date *" : "Date *"}
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-line rounded-card focus:ring-2 focus:ring-accent focus:border-accent"
                  required
                />
              </div>

              {/* Heure */}
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-1">
                  {language === "fr" ? "Heure *" : "Time *"}
                </label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-line rounded-card focus:ring-2 focus:ring-accent focus:border-accent"
                  required
                />
              </div>

              {/* Prix */}
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-1">
                  {language === "fr"
                    ? "Prix (0 = Gratuit) *"
                    : "Price (0 = Free) *"}
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-line rounded-card focus:ring-2 focus:ring-accent focus:border-accent"
                  required
                />
              </div>

              {/* Capacity */}
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-1">
                  {language === "fr"
                    ? "Capacité (nombre maximum de participants) *"
                    : "Capacity (max participants) *"}
                </label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  min="2"
                  className="w-full px-4 py-2 border border-line rounded-card focus:ring-2 focus:ring-accent focus:border-accent"
                  required
                />
              </div>

              {/* Professionnels */}
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-2">
                  {language === "fr" ? "Professionnels *" : "Professionals *"}
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto border border-line rounded-card p-4">
                  {professionals.map((pro) => (
                    <div
                      key={pro.id}
                      className="flex items-center justify-between p-2 hover:bg-paper rounded-card"
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="host"
                          checked={formData.primaryHostId === pro.id}
                          onChange={() =>
                            handleProfessionalSelect(pro.id, true)
                          }
                          className="w-4 h-4 text-accent"
                        />
                        <span className="font-medium">{pro.name}</span>
                        {formData.primaryHostId === pro.id && (
                          <span className="text-xs bg-accent-soft text-accent px-2 py-1 rounded-pill">
                            {language === "fr" ? "Hôte" : "Host"}
                          </span>
                        )}
                      </div>
                      {formData.primaryHostId !== pro.id && (
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.secondaryHostIds.includes(pro.id)}
                            onChange={() =>
                              handleProfessionalSelect(pro.id, false)
                            }
                            className="w-4 h-4 text-accent"
                          />
                          <span className="text-sm text-muted">
                            {language === "fr" ? "Secondaire" : "Secondary"}
                          </span>
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Boutons */}
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-line rounded-card text-ink-soft hover:bg-paper"
                >
                  {language === "fr" ? "Annuler" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-accent text-white rounded-card hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? language === "fr"
                      ? "Création..."
                      : "Creating..."
                    : language === "fr"
                    ? "Créer"
                    : "Create"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste des sessions en cards */}
        {sessions.length === 0 ? (
          <div className="bg-card rounded-block shadow-soft p-12 text-center">
            <p className="text-muted text-lg">
              {language === "fr"
                ? "Aucune session de thérapie de groupe"
                : "No group therapy sessions"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => {
              const participantsCount =
                session.participantsCount ?? session.participants?.length ?? 0;
              const isFull = participantsCount >= session.capacity;
              const isFree = session.price === 0;

              // Formater la date
              const formattedDate = session.date
                ? format(
                    new Date(session.date + "T00:00:00"),
                    "EEEE d MMMM yyyy",
                    {
                      locale: fr,
                    }
                  )
                : "";

              // Récupérer les infos des hôtes
              const primaryHost = professionalNames[session.primaryHostId];
              const secondaryHosts =
                session.secondaryHostIds
                  ?.map((id) => professionalNames[id])
                  .filter(Boolean) || [];

              return (
                <div
                  key={session.id}
                  className="bg-card rounded-block shadow-soft border border-line hover:shadow-lift transition-all duration-300 overflow-hidden"
                >
                  {/* Header */}
                  <div className="bg-ink p-6 text-paper">
                    <h3 className="text-xl font-bold mb-4">{session.title}</h3>
                    {session.date && (
                      <div className="flex items-center space-x-2 mb-2 text-sm">
                        <Calendar className="h-4 w-4" />
                        <span>{formattedDate}</span>
                      </div>
                    )}
                    {session.time && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Video className="h-4 w-4" />
                        <span>{session.time}</span>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-6">
                    <p className="text-ink-soft text-sm mb-4 line-clamp-3">
                      {session.description}
                    </p>

                    {/* Hôtes */}
                    {(primaryHost || secondaryHosts.length > 0) && (
                      <div className="mb-4">
                        <p className="font-semibold text-sm text-ink-soft mb-2">
                          Hôte(s):
                        </p>
                        {primaryHost && (
                          <div className="flex items-center space-x-2 mb-2">
                            {primaryHost.profileImage ? (
                              <img
                                src={primaryHost.profileImage}
                                alt={primaryHost.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center">
                                <User className="h-4 w-4 text-accent" />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium">
                                  {primaryHost.name}
                                </span>
                                <span className="bg-accent-soft text-accent px-2 py-0.5 rounded-pill text-xs font-semibold">
                                  Principal
                                </span>
                              </div>
                              {primaryHost.specialty && (
                                <p className="text-xs text-muted">
                                  {primaryHost.specialty}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        {secondaryHosts.map((host, idx) => (
                          <div
                            key={idx}
                            className="flex items-center space-x-2 mb-2"
                          >
                            {host.profileImage ? (
                              <img
                                src={host.profileImage}
                                alt={host.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-paper-dark flex items-center justify-center">
                                <User className="h-4 w-4 text-ink-soft" />
                              </div>
                            )}
                            <div className="flex-1">
                              <span className="text-sm font-medium">
                                {host.name}
                              </span>
                              {host.specialty && (
                                <p className="text-xs text-muted">
                                  {host.specialty}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Places et prix */}
                    <div className="flex items-center justify-between mb-4 text-sm">
                      <div className="flex items-center text-ink-soft">
                        <Users className="h-4 w-4 mr-1" />
                        <span>
                          {participantsCount} / {session.capacity} places
                        </span>
                      </div>
                      <div className="flex items-center">
                        {isFree ? (
                          <>
                            <Heart className="h-4 w-4 text-ok mr-1" />
                            <span className="text-ok font-semibold">
                              Gratuit
                            </span>
                          </>
                        ) : (
                          <span className="text-ink font-semibold">
                            {session.price} XOF
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Statut */}
                    <div className="mb-4">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-medium ${
                            session.isActive
                              ? "bg-ok/15 text-ok"
                              : "bg-paper-dark text-ink-soft"
                          }`}
                        >
                          {session.isActive
                            ? language === "fr"
                              ? "Actif"
                              : "Active"
                            : language === "fr"
                            ? "Inactif"
                            : "Inactive"}
                        </span>
                        {session.isCompleted && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-medium bg-sage-soft text-sage">
                            {language === "fr" ? "Terminé" : "Completed"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Boutons d'actions */}
                    <div className="space-y-2">
                      {/* Bouton principal: Participants */}
                      <button
                        onClick={() => handleViewParticipants(session)}
                        className="w-full px-4 py-2 bg-ink text-white rounded-card hover:bg-ink/90 transition-colors flex items-center justify-center text-sm font-medium"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {language === "fr"
                          ? "Voir les participants"
                          : "View Participants"}
                      </button>

                      {/* Actions secondaires en ligne */}
                      <div className="flex gap-2">
                        {/* Modifier */}
                        <button
                          onClick={() => handleEdit(session)}
                          className="flex-1 px-3 py-2 border border-line text-ink-soft rounded-card hover:bg-paper transition-colors flex items-center justify-center text-sm"
                          title={language === "fr" ? "Modifier" : "Edit"}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          <span className="text-xs">
                            {language === "fr" ? "Modifier" : "Edit"}
                          </span>
                        </button>

                        {/* Marquer comme terminé (seulement si pas déjà terminé) */}
                        {!session.isCompleted ? (
                          <button
                            onClick={() => handleMarkAsCompleted(session.id)}
                            className="flex-1 px-3 py-2 bg-ok text-white rounded-card hover:bg-ok/90 transition-colors flex items-center justify-center text-sm font-medium"
                            title={
                              language === "fr"
                                ? "Marquer comme terminé"
                                : "Mark as completed"
                            }
                          >
                            <Check className="h-4 w-4 mr-1" />
                            <span className="text-xs">
                              {language === "fr" ? "Terminer" : "Complete"}
                            </span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMarkAsNotCompleted(session.id)}
                            className="flex-1 px-3 py-2 bg-sage text-white rounded-card hover:bg-sage/90 transition-colors flex items-center justify-center text-sm font-medium"
                            title={
                              language === "fr"
                                ? "Réactiver la session"
                                : "Reactivate session"
                            }
                          >
                            <X className="h-4 w-4 mr-1" />
                            <span className="text-xs">
                              {language === "fr" ? "Réactiver" : "Reactivate"}
                            </span>
                          </button>
                        )}

                        {/* Supprimer */}
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="flex-1 px-3 py-2 bg-danger text-white rounded-card hover:bg-danger/90 transition-colors flex items-center justify-center text-sm font-medium"
                          title={language === "fr" ? "Supprimer" : "Delete"}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          <span className="text-xs">
                            {language === "fr" ? "Supprimer" : "Delete"}
                          </span>
                        </button>
                      </div>

                      {/* Activer/Désactiver */}
                      <button
                        onClick={() =>
                          handleToggleStatus(session.id, session.isActive)
                        }
                        className={`w-full px-3 py-2 rounded-card transition-colors flex items-center justify-center text-sm font-medium ${
                          session.isActive
                            ? "bg-gold text-white hover:bg-gold/90"
                            : "bg-sage text-white hover:bg-sage/90"
                        }`}
                        title={
                          session.isActive
                            ? language === "fr"
                              ? "Désactiver"
                              : "Deactivate"
                            : language === "fr"
                            ? "Activer"
                            : "Activate"
                        }
                      >
                        {session.isActive ? (
                          <>
                            <XCircle className="h-4 w-4 mr-1" />
                            <span className="text-xs">
                              {language === "fr" ? "Désactiver" : "Deactivate"}
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span className="text-xs">
                              {language === "fr" ? "Activer" : "Activate"}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal pour afficher les participants */}
        {showParticipantsModal && selectedSession && (
          <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-block shadow-lift p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-display text-xl font-semibold text-ink">
                  {language === "fr" ? "Participants" : "Participants"} -{" "}
                  {selectedSession.title}
                </h2>
                <button
                  onClick={() => {
                    setShowParticipantsModal(false);
                    setSelectedSession(null);
                  }}
                  className="text-muted hover:text-ink"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-2">
                {participantsList.length === 0 ? (
                  <p className="text-muted text-center py-8">
                    {language === "fr"
                      ? "Aucun participant inscrit"
                      : "No participants registered"}
                  </p>
                ) : (
                  participantsList.map((userId) => (
                    <div
                      key={userId}
                      className="flex items-center space-x-3 p-3 bg-paper rounded-card"
                    >
                      <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center">
                        <User className="h-5 w-5 text-accent" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {participantsNames[userId] || userId}
                        </p>
                        <p className="text-xs text-muted">{userId}</p>
                        <p className="text-sm text-ink-soft mt-1 flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-muted" />
                          {participantsPhones[userId] || "Non disponible"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal pour modifier une session */}
        {showEditModal && selectedSession && (
          <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-block shadow-lift p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-display text-xl font-semibold text-ink">
                  {language === "fr" ? "Modifier la session" : "Edit Session"}
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedSession(null);
                  }}
                  className="text-muted hover:text-ink"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleUpdateSession} className="space-y-4">
                {formError && (
                  <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-card">
                    {formError}
                  </div>
                )}

                {/* Titre */}
                <div>
                  <label className="block text-sm font-medium text-ink-soft mb-1">
                    {language === "fr" ? "Titre *" : "Title *"}
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-line rounded-card focus:ring-2 focus:ring-accent focus:border-accent"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-ink-soft mb-1">
                    {language === "fr" ? "Description *" : "Description *"}
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-2 border border-line rounded-card focus:ring-2 focus:ring-accent focus:border-accent"
                    required
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-ink-soft mb-1">
                    {language === "fr" ? "Date *" : "Date *"}
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-line rounded-card focus:ring-2 focus:ring-accent focus:border-accent"
                    required
                  />
                </div>

                {/* Heure */}
                <div>
                  <label className="block text-sm font-medium text-ink-soft mb-1">
                    {language === "fr" ? "Heure *" : "Time *"}
                  </label>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-line rounded-card focus:ring-2 focus:ring-accent focus:border-accent"
                    required
                  />
                </div>

                {/* Prix */}
                <div>
                  <label className="block text-sm font-medium text-ink-soft mb-1">
                    {language === "fr"
                      ? "Prix (0 = Gratuit) *"
                      : "Price (0 = Free) *"}
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-line rounded-card focus:ring-2 focus:ring-accent focus:border-accent"
                    required
                  />
                </div>

                {/* Capacity */}
                <div>
                  <label className="block text-sm font-medium text-ink-soft mb-1">
                    {language === "fr"
                      ? "Capacité (nombre maximum de participants) *"
                      : "Capacity (max participants) *"}
                  </label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    min="2"
                    className="w-full px-4 py-2 border border-line rounded-card focus:ring-2 focus:ring-accent focus:border-accent"
                    required
                  />
                </div>

                {/* Professionnels */}
                <div>
                  <label className="block text-sm font-medium text-ink-soft mb-2">
                    {language === "fr" ? "Professionnels *" : "Professionals *"}
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-line rounded-card p-4">
                    {professionals.map((pro) => (
                      <div
                        key={pro.id}
                        className="flex items-center justify-between p-2 hover:bg-paper rounded-card"
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="host"
                            checked={formData.primaryHostId === pro.id}
                            onChange={() =>
                              handleProfessionalSelect(pro.id, true)
                            }
                            className="w-4 h-4 text-accent"
                          />
                          <span className="font-medium">{pro.name}</span>
                          {formData.primaryHostId === pro.id && (
                            <span className="text-xs bg-accent-soft text-accent px-2 py-1 rounded-pill">
                              {language === "fr" ? "Hôte" : "Host"}
                            </span>
                          )}
                        </div>
                        {formData.primaryHostId !== pro.id && (
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.secondaryHostIds.includes(
                                pro.id
                              )}
                              onChange={() =>
                                handleProfessionalSelect(pro.id, false)
                              }
                              className="w-4 h-4 text-accent"
                            />
                            <span className="text-sm text-muted">
                              {language === "fr" ? "Secondaire" : "Secondary"}
                            </span>
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Boutons */}
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedSession(null);
                    }}
                    className="px-4 py-2 border border-line rounded-card text-ink-soft hover:bg-paper"
                  >
                    {language === "fr" ? "Annuler" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-accent text-white rounded-card hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting
                      ? language === "fr"
                        ? "Mise à jour..."
                        : "Updating..."
                      : language === "fr"
                      ? "Mettre à jour"
                      : "Update"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal pour les statistiques */}
        {showStatisticsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  {language === "fr"
                    ? "Statistiques des thérapies de groupe"
                    : "Group Therapy Statistics"}
                </h2>
                <button
                  onClick={() => {
                    setShowStatisticsModal(false);
                    setStatistics([]);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {loadingStatistics ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" />
                  <span className="ml-3 text-gray-600">
                    {language === "fr"
                      ? "Chargement des statistiques..."
                      : "Loading statistics..."}
                  </span>
                </div>
              ) : statistics.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    {language === "fr"
                      ? "Aucune statistique disponible"
                      : "No statistics available"}
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    {language === "fr"
                      ? "Aucun participant n'a encore participé à une thérapie de groupe."
                      : "No participants have participated in group therapy sessions yet."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Résumé général */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600">
                          {statistics.length}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {language === "fr"
                            ? "Participants uniques"
                            : "Unique Participants"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-pink-600">
                          {statistics.reduce(
                            (sum, stat) => sum + stat.sessionCount,
                            0
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {language === "fr"
                            ? "Total participations"
                            : "Total Participations"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600">
                          {(
                            statistics.reduce(
                              (sum, stat) => sum + stat.sessionCount,
                              0
                            ) / statistics.length
                          ).toFixed(1)}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {language === "fr"
                            ? "Moyenne par participant"
                            : "Average per Participant"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Liste des participants */}
                  <div className="space-y-3">
                    {statistics.map((stat, index) => (
                      <div
                        key={stat.userId}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {stat.userName}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {stat.userId}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-purple-600">
                              {stat.sessionCount}
                            </div>
                            <div className="text-xs text-gray-500">
                              {language === "fr"
                                ? stat.sessionCount > 1
                                  ? "sessions"
                                  : "session"
                                : stat.sessionCount > 1
                                ? "sessions"
                                : "session"}
                            </div>
                          </div>
                        </div>

                        {/* Liste des thérapies */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs font-semibold text-gray-700 mb-2">
                            {language === "fr"
                              ? "Thérapies suivies:"
                              : "Therapies attended:"}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {stat.sessionTitles.map((title, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                              >
                                {title}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminGroupTherapy;
