import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// Fonction pour formater une date locale sans conversion de fuseau horaire
export function formatLocalDate(date: Date | string, formatStr = 'yyyy-MM-dd') {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr, { locale: fr });
}

// Fonction pour formater une heure locale sans conversion de fuseau horaire
export function formatLocalTime(date: Date | string, formatStr = 'HH:mm') {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr, { locale: fr });
}

// Fonction pour créer une date à partir d'une date et d'une heure sans conversion de fuseau horaire
export function createDateWithTime(dateStr: string, timeStr: string): Date {
  // Créer une date ISO complète
  const isoString = `${dateStr}T${timeStr}:00`;
  
  // Créer un objet Date à partir de la chaîne ISO
  const date = new Date(isoString);
  
  return date;
}

// Fonction pour formater une date en respectant le fuseau horaire de Dakar (UTC+0)
export function formatInDakarTime(date: Date | string, formatStr = 'HH:mm') {
  // Convertir en objet Date si c'est une chaîne
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  // Formater directement sans conversion de fuseau horaire
  return format(dateObj, formatStr, { locale: fr });
}

/**
 * Normalise une date en format YYYY-MM-DD
 * @param date Date à normaliser
 * @returns Date normalisée au format YYYY-MM-DD
 */
export function normalizeDate(date: any): string {
  if (!date) return '';
  
  try {
    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (date?.toDate && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else if (typeof date === 'string') {
      // Ajouter l'heure si elle n'est pas présente pour éviter les problèmes de fuseau horaire
      dateObj = new Date(date.includes('T') ? date : `${date}T00:00:00`);
    } else {
      console.warn('Type de date non reconnu:', typeof date, date);
      return '';
    }
    
    if (isNaN(dateObj.getTime())) {
      console.warn('⚠️ Date invalide après conversion:', date);
      return '';
    }
    
    return format(dateObj, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error normalizing date:', error, date);
    return '';
  }
}

/**
 * Vérifie si deux dates sont égales (même jour)
 * @param date1 Première date
 * @param date2 Deuxième date
 * @returns true si les dates représentent le même jour
 */
export function areDatesEqual(date1: any, date2: any): boolean {
  const normalized1 = normalizeDate(date1);
  const normalized2 = normalizeDate(date2);
  return normalized1 === normalized2 && normalized1 !== '' && normalized2 !== '';
}

/**
 * Génère une clé unique pour un créneau horaire
 * @param date Date du créneau
 * @param time Heure du créneau
 * @returns Clé unique au format YYYY-MM-DD-HH:MM
 */
export function generateSlotKey(date: any, time: string): string {
  const normalizedDate = normalizeDate(date);
  if (!normalizedDate || !time) return '';
  
  // Nettoyer l'heure pour éviter les problèmes d'espaces
  const cleanTime = time.trim();
  const key = `${normalizedDate}-${cleanTime}`;
  
  console.log(`🔑 [KEY DEBUG] generateSlotKey: date=${normalizedDate}, time="${cleanTime}", key="${key}"`);
  return key;
}

export function getWeekdayName(date: Date): string {
  const daysFr = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return daysFr[date.getDay()];
}