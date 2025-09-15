import {
  detectUserTimezone,
  convertFromSenegalTime,
  getWorkingHourWarning,
} from "./timezoneUtils";

/**
 * Utilitaires centralisés pour la gestion des dates et heures
 * Assure la cohérence entre tous les dashboards
 * Gère les fuseaux horaires entre le Canada et le Sénégal
 */

/**
 * Formate une date et une heure de manière cohérente avec gestion des fuseaux horaires
 * @param dateString - La date (format: "2025-08-28" ou "Jeudi")
 * @param timeString - L'heure (format: "13:00")
 * @returns Format: "28 août à 13:00" ou "Jeudi à 13:00"
 */
export const formatDateTime = (
  dateString: string,
  timeString: string
): string => {
  if (!dateString || !timeString) return "Date/heure non disponible";

  try {
    // Si c'est déjà un nom de jour (ex: "Jeudi"), le retourner tel quel
    if (
      [
        "Lundi",
        "Mardi",
        "Mercredi",
        "Jeudi",
        "Vendredi",
        "Samedi",
        "Dimanche",
      ].includes(dateString)
    ) {
      return `${dateString} à ${timeString}`;
    }

    // Créer la date en spécifiant explicitement le fuseau horaire local
    let date: Date;

    if (dateString.includes("-")) {
      // Format YYYY-MM-DD : créer la date en heure locale
      const [year, month, day] = dateString.split("-").map(Number);
      // Créer la date à midi dans le fuseau local pour éviter les problèmes de minuit
      date = new Date(year, month - 1, day, 12, 0, 0);
    } else {
      // Autre format : utiliser le parser standard
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
      // Si ce n'est pas une date valide, retourner la chaîne originale
      console.warn("⚠️ [DATE UTILS] Invalid date:", dateString);
      return `${dateString} à ${timeString}`;
    }

    const formattedDate = date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    });

    return `${formattedDate} à ${timeString}`;
  } catch (error) {
    console.warn("⚠️ [DATE UTILS] Error formatting date:", error, dateString);
    return `${dateString} à ${timeString}`;
  }
};

/**
 * Formate une date et une heure avec affichage des deux fuseaux horaires
 * @param dateString - La date (format: "2025-08-28" ou "Jeudi")
 * @param senegalTime - L'heure sénégalaise (format: "19:00")
 * @returns Format: "28 août à 15:00 (votre heure) / 19:00 (Sénégal)"
 */
export const formatDateTimeWithTimezone = (
  dateString: string,
  senegalTime: string
): string => {
  if (!dateString || !senegalTime) return "Date/heure non disponible";

  try {
    // Détecter le fuseau horaire de l'utilisateur
    const userTimezone = detectUserTimezone();

    if (!userTimezone) {
      // Si pas de fuseau détecté, utiliser le format standard
      return formatDateTime(dateString, senegalTime);
    }

    // Convertir l'heure sénégalaise vers l'heure locale du patient
    const localTime = convertFromSenegalTime(senegalTime, userTimezone);

    // Vérifier si c'est un nom de jour
    if (
      [
        "Lundi",
        "Mardi",
        "Mercredi",
        "Jeudi",
        "Vendredi",
        "Samedi",
        "Dimanche",
      ].includes(dateString)
    ) {
      return `${dateString} à ${localTime} (votre heure) / ${senegalTime} (Sénégal)`;
    }

    // Formater la date
    let date: Date;
    if (dateString.includes("-")) {
      const [year, month, day] = dateString.split("-").map(Number);
      date = new Date(year, month - 1, day, 12, 0, 0);
    } else {
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
      return `${dateString} à ${localTime} (votre heure) / ${senegalTime} (Sénégal)`;
    }

    const formattedDate = date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    });

    return `${formattedDate} à ${localTime} (votre heure) / ${senegalTime} (Sénégal)`;
  } catch (error) {
    console.warn("⚠️ [DATE UTILS] Error formatting date with timezone:", error);
    return formatDateTime(dateString, senegalTime);
  }
};

/**
 * Formate une date seule (sans heure)
 * @param dateString - La date (format: "2025-08-28" ou "Jeudi")
 * @returns Format: "28 août" ou "Jeudi"
 */
export const formatDateOnly = (dateString: string): string => {
  if (!dateString) return "Date non disponible";

  try {
    // Si c'est déjà un nom de jour (ex: "Jeudi"), le retourner tel quel
    if (
      [
        "Lundi",
        "Mardi",
        "Mercredi",
        "Jeudi",
        "Vendredi",
        "Samedi",
        "Dimanche",
      ].includes(dateString)
    ) {
      return dateString;
    }

    // Créer la date en spécifiant explicitement le fuseau horaire local
    let date: Date;

    if (dateString.includes("-")) {
      // Format YYYY-MM-DD : créer la date en heure locale
      const [year, month, day] = dateString.split("-").map(Number);
      // Créer la date à midi dans le fuseau local pour éviter les problèmes de minuit
      date = new Date(year, month - 1, day, 12, 0, 0);
    } else {
      // Autre format : utiliser le parser standard
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
      // Si ce n'est pas une date valide, retourner la chaîne originale
      console.warn("⚠️ [DATE UTILS] Invalid date:", dateString);
      return dateString;
    }

    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    });
  } catch (error) {
    console.warn("⚠️ [DATE UTILS] Error formatting date:", error, dateString);
    return dateString;
  }
};

/**
 * Vérifie si une date est passée (comparaison locale)
 * @param dateString - La date à vérifier
 * @returns true si la date est passée, false sinon
 */
export const isDatePassed = (dateString: string): boolean => {
  try {
    // Si c'est déjà un nom de jour (ex: "Jeudi"), retourner false (pas encore passé)
    if (
      [
        "Lundi",
        "Mardi",
        "Mercredi",
        "Jeudi",
        "Vendredi",
        "Samedi",
        "Dimanche",
      ].includes(dateString)
    ) {
      return false;
    }

    // Créer la date en spécifiant explicitement le fuseau horaire local
    let bookingDate: Date;

    if (dateString.includes("-")) {
      // Format YYYY-MM-DD : créer la date en heure locale
      const [year, month, day] = dateString.split("-").map(Number);
      // Créer la date à midi dans le fuseau local pour éviter les problèmes de minuit
      bookingDate = new Date(year, month - 1, day, 12, 0, 0);
    } else {
      // Autre format : utiliser le parser standard
      bookingDate = new Date(dateString);
    }

    const today = new Date();

    // Vérifier si la date est valide
    if (isNaN(bookingDate.getTime())) {
      return false;
    }

    // Comparer directement les composants de date (année, mois, jour)
    const isPassed =
      bookingDate.getFullYear() < today.getFullYear() ||
      (bookingDate.getFullYear() === today.getFullYear() &&
        bookingDate.getMonth() < today.getMonth()) ||
      (bookingDate.getFullYear() === today.getFullYear() &&
        bookingDate.getMonth() === today.getMonth() &&
        bookingDate.getDate() < today.getDate());

    return isPassed;
  } catch (error) {
    console.error("❌ Error in isDatePassed:", error);
    return false; // En cas d'erreur, traiter comme non passée
  }
};

/**
 * Vérifie si une date est dans moins de 2 jours (pour désactiver la modification)
 * @param dateString - La date à vérifier
 * @returns true si la date est dans moins de 2 jours, false sinon
 */
export const isWithinTwoDays = (dateString: string): boolean => {
  try {
    const dayNames = [
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi",
      "Dimanche",
    ];
    if (!dateString || dayNames.includes(dateString)) return false;

    // Normalise la date du RDV à 12:00 locale (évite les bascules à minuit)
    let booking: Date;
    if (dateString.includes("-")) {
      const [y, m, d] = dateString.split("-").map(Number);
      booking = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
    } else {
      const tmp = new Date(dateString);
      if (isNaN(tmp.getTime())) return false;
      booking = new Date(
        tmp.getFullYear(),
        tmp.getMonth(),
        tmp.getDate(),
        12,
        0,
        0,
        0
      );
    }

    // Normalise "aujourd'hui" à 12:00 locale aussi
    const now = new Date();
    const todayNoon = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      12,
      0,
      0,
      0
    );

    const diffDays = Math.floor(
      (booking.getTime() - todayNoon.getTime()) / (1000 * 60 * 60 * 24)
    );
    // Bloqué pour J (0), J+1 (1), J+2 (2)
    return diffDays >= 0 && diffDays <= 2;
  } catch {
    return false;
  }
};

/**
 * Formate une heure seule (sans date)
 * @param timeString - L'heure (format: "13:00")
 * @returns Format: "13:00"
 */
export const formatTimeOnly = (timeString: string): string => {
  if (!timeString) return "Heure non disponible";

  // Retourner l'heure telle quelle (déjà au bon format)
  return timeString;
};

/**
 * Génère un avertissement pour les heures problématiques
 * @param senegalTime - L'heure sénégalaise à vérifier (format: "19:00")
 * @returns Message d'avertissement ou null
 */
export const getTimeWarning = (senegalTime: string): string | null => {
  if (!senegalTime) return null;

  try {
    return getWorkingHourWarning(senegalTime);
  } catch (error) {
    console.warn("⚠️ [DATE UTILS] Error getting time warning:", error);
    return null;
  }
};
