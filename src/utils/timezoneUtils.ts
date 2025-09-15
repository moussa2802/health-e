/**
 * Utilitaires pour la gestion des fuseaux horaires
 * Gère le décalage entre le Canada (UTC-4 à UTC-8) et le Sénégal (UTC+0)
 */

// Fuseaux horaires des pays
export const TIMEZONES = {
  CANADA: {
    // Fuseaux principaux du Canada
    ATLANTIC: "America/Halifax", // UTC-4 (heure d'été), UTC-3 (heure d'hiver)
    EASTERN: "America/Toronto", // UTC-5 (heure d'été), UTC-4 (heure d'hiver)
    CENTRAL: "America/Winnipeg", // UTC-6 (heure d'été), UTC-5 (heure d'hiver)
    MOUNTAIN: "America/Edmonton", // UTC-7 (heure d'été), UTC-6 (heure d'hiver)
    PACIFIC: "America/Vancouver", // UTC-8 (heure d'été), UTC-7 (heure d'hiver)
  },
  SENEGAL: "Africa/Dakar", // UTC+0 (pas de changement d'heure)
} as const;

// Décalage horaire approximatif (en heures)
export const TIME_OFFSETS = {
  CANADA_EASTERN_TO_SENEGAL: 4, // Canada Eastern (UTC-4) → Sénégal (UTC+0) = +4h
  CANADA_PACIFIC_TO_SENEGAL: 8, // Canada Pacific (UTC-8) → Sénégal (UTC+0) = +8h
} as const;

/**
 * Détecte le fuseau horaire de l'utilisateur
 * @returns Le fuseau horaire détecté ou null si non détectable
 */
export function detectUserTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * Vérifie si l'utilisateur est au Canada
 * @param timezone Le fuseau horaire à vérifier
 * @returns true si le fuseau horaire est canadien
 */
export const isCanadianTimezone = (timezone: string): boolean => {
  return Object.values(TIMEZONES.CANADA).includes(timezone as any);
};

/**
 * Vérifie si l'utilisateur est au Sénégal
 * @param timezone Le fuseau horaire à vérifier
 * @returns true si le fuseau horaire est sénégalais
 */
export const isSenegaleseTimezone = (timezone: string): boolean => {
  return timezone === TIMEZONES.SENEGAL;
};

/**
 * Convertit une heure du fuseau sénégalais vers le fuseau local du patient
 * @param senegalTime Heure sénégalaise (format: "19:00")
 * @param targetTz Fuseau horaire de destination (ex: "America/Toronto")
 * @returns Heure convertie au format local (format: "15:00")
 */
export function convertFromSenegalTime(
  senegalTime: string,
  targetTz: string
): string {
  const [H, M] = senegalTime.split(":").map(Number);
  if (isNaN(H) || isNaN(M)) return senegalTime;

  // Dakar = UTC+0 : on crée un instant UTC à HH:MM du jour courant
  const now = new Date();
  const dakarUTC = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      H,
      M,
      0,
      0
    )
  );

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: targetTz,
  }).format(dakarUTC);
}

/**
 * Convertit une heure du fuseau local vers le fuseau sénégalais
 * @param localTime Heure locale (format: "15:00")
 * @param fromTimezone Fuseau horaire source (ex: "America/Toronto")
 * @returns Heure convertie au format sénégalais (format: "19:00")
 */
export const convertToSenegalTime = (
  localTime: string,
  fromTimezone: string
): string => {
  try {
    if (!localTime || !fromTimezone) {
      console.warn("⚠️ [TIMEZONE] Paramètres manquants:", {
        localTime,
        fromTimezone,
      });
      return localTime;
    }

    // Si c'est déjà le fuseau sénégalais, pas de conversion
    if (isSenegaleseTimezone(fromTimezone)) {
      return localTime;
    }

    // Créer une date avec l'heure locale
    const [hours, minutes] = localTime.split(":").map(Number);
    const today = new Date();
    const localDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDay(),
      hours,
      minutes
    );

    // Convertir vers le fuseau sénégalais
    const senegalTime = localDate.toLocaleTimeString("fr-FR", {
      timeZone: TIMEZONES.SENEGAL,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return senegalTime;
  } catch (error) {
    console.error("❌ [TIMEZONE] Erreur de conversion:", error);
    return localTime;
  }
};

/**
 * Affiche l'heure dans les deux fuseaux horaires
 * @param senegalTime Heure sénégalaise
 * @param localTimezone Fuseau horaire local
 * @returns Objet avec les heures dans les deux fuseaux
 */
export const displayDualTime = (
  senegalTime: string,
  localTimezone: string
): { local: string; senegal: string } => {
  const localTime = convertFromSenegalTime(senegalTime, localTimezone);

  return {
    local: `${localTime} (${localTimezone})`,
    senegal: `${senegalTime} (Sénégal)`,
  };
};

/**
 * Vérifie si une heure est dans les heures de travail du Sénégal
 * @param senegalTime Heure sénégalaise
 * @returns true si l'heure est dans les heures de travail (8h-18h Sénégal)
 */
export const isWorkingHourInSenegal = (senegalTime: string): boolean => {
  try {
    const [hours] = senegalTime.split(":").map(Number);

    // Heures de travail au Sénégal : 8h-18h
    const isWorkingHour = hours >= 8 && hours < 18;

    return isWorkingHour;
  } catch (error) {
    return false;
  }
};

/**
 * Génère un avertissement si l'heure n'est pas dans les heures de travail
 * @param senegalTime Heure sénégalaise
 * @returns Message d'avertissement ou null
 */
export const getWorkingHourWarning = (senegalTime: string): string | null => {
  if (isWorkingHourInSenegal(senegalTime)) {
    return null;
  }

  return `⚠️ Attention : Cette heure (${senegalTime} Sénégal) est en dehors des heures de travail habituelles (8h-18h Sénégal). Le professionnel pourrait ne pas être disponible.`;
};
