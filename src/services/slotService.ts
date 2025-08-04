import { getFirestoreInstance, ensureFirestoreReady } from '../utils/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy, limit, documentId } from 'firebase/firestore';
import { format, startOfDay, endOfDay, addDays, isValid, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';

// Importer le type TimeSlot directement
interface TimeSlot {
  id?: string | null;
  date: Date;
  time: string;
  isBooked?: boolean;
  bookingId?: string;
  day?: string;
}

export const getAvailableTimeSlots = async (
  startDate: Date,
  endDate: Date,
  professionalId: string,
  includeBooked: boolean = false
): Promise<TimeSlot[]> => {
  try {
    // Vérifier que les dates sont valides
    if (!isValid(startDate) || !isValid(endDate)) {
      console.error('❌ Dates invalides:', { startDate, endDate });
      return [];
    }
    
    console.log(`🔍 Recherche des créneaux disponibles du ${format(startDate, 'dd/MM/yyyy')} au ${format(endDate, 'dd/MM/yyyy')}`);
    
    // Ensure Firestore is ready
    await ensureFirestoreReady();
    
    const db = getFirestoreInstance();
    if (!db) throw new Error('Firestore not available');

    const eventsRef = collection(db, 'calendar_events');
    let q = query(
      eventsRef,
      where('professionalId', '==', professionalId), 
      where('start', '>=', startOfDay(startDate)),
      where('start', '<=', endOfDay(endDate))
    );

    const snapshot = await getDocs(q);
    console.log(`📊 Trouvé ${snapshot.docs.length} créneaux dans Firestore`);

    // Convert to TimeSlot format
    const slots: TimeSlot[] = snapshot.docs.map(doc => {
      const data = doc.data();
      let start: Date;
      
      try {
        // Gérer les formats de date potentiellement invalides
        start = data.start.toDate();
      } catch (err) {
        console.error('❌ Error converting date:', err);
        return null;
      }
      
      return {
        id: doc.id,
        date: start,
        time: format(start, 'HH:mm'), 
        isBooked: !data.isAvailable,
        bookingId: data.bookingId
      };
    }).filter(Boolean) as TimeSlot[];

    // Sort by time
    slots.sort((a, b) => a.time.localeCompare(b.time));
    
    // Filtrer les créneaux réservés si nécessaire
    const filteredSlots = includeBooked ? slots : slots.filter(slot => !slot.isBooked);
    
    console.log(`✅ Chargement réussi de ${filteredSlots.length} créneaux disponibles`);
    return filteredSlots;
  } catch (error) {
    console.error('❌ Erreur lors du chargement des créneaux disponibles:', error);
    
    // Essayer une approche alternative en cas d'erreur
    try {
      console.log('🔄 Tentative avec une approche alternative...');
      
      await ensureFirestoreReady();
      const db = getFirestoreInstance();
      if (!db) throw new Error('Firestore not available');
      
      // Requête simplifiée sans filtres de date
      const eventsRef = collection(db, 'calendar_events');
      const q = query(
        eventsRef,
        where('professionalId', '==', professionalId),
        limit(100) // Limiter le nombre de résultats
      );
      
      const snapshot = await getDocs(q);
      console.log(`📊 Trouvé ${snapshot.docs.length} créneaux (approche alternative)`);
      
      // Filtrer côté client
      const slots = snapshot.docs
        .map(doc => {
          const data = doc.data();
          try {
            const start = data.start.toDate();
            return {
              id: doc.id,
              date: start,
              time: format(start, 'HH:mm'),
              isBooked: data.isAvailable === false,
              bookingId: data.bookingId
            };
          } catch (err) {
            return null;
          }
        })
        .filter(Boolean)
        .filter(slot => {
          // Filtrer par plage de dates
          return slot.date >= startOfDay(startDate) && slot.date <= endOfDay(endDate);
        }) as TimeSlot[];
      
      // Trier par date et heure
      const sortedSlots = slots.sort((a, b) => {
        const dateCompare = a.date.getTime() - b.date.getTime();
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });
      
      console.log(`✅ Chargement alternatif réussi: ${sortedSlots.length} créneaux`);
      return sortedSlots;
    } catch (fallbackError) {
      console.error('❌ Échec de l\'approche alternative:', fallbackError);
    }
    
    console.error('❌ Error loading available slots:', error);
    return [];
  }
};

// Fonction pour obtenir les jours disponibles dans une plage de dates
export const getAvailableDays = async (
  startDate: Date,
  endDate: Date,
  professionalId: string,
  includeBooked: boolean = false
): Promise<Date[]> => {
  try {
    console.log(`🔍 Recherche des jours disponibles du ${format(startDate, 'dd/MM/yyyy')} au ${format(endDate, 'dd/MM/yyyy')}`);
    
    // Récupérer tous les créneaux disponibles
    const slots = await getAvailableTimeSlots(startDate, endDate, professionalId, includeBooked);
    
    // Extraire les jours uniques
    const uniqueDays = new Map<string, Date>();
    
    slots.forEach(slot => {
      if (!includeBooked && slot.isBooked) return; // Ignorer les créneaux réservés si demandé
      
      const dateStr = format(slot.date, 'yyyy-MM-dd');
      if (!uniqueDays.has(dateStr)) {
        // Créer une nouvelle date à partir de la chaîne pour éviter les problèmes de fuseau horaire
        const [year, month, day] = dateStr.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        uniqueDays.set(dateStr, dateObj);
      }
    });
    
    const availableDays = Array.from(uniqueDays.values());
    console.log(`✅ Trouvé ${availableDays.length} jours disponibles:`, 
      availableDays.map(d => format(d, 'yyyy-MM-dd')));
    
    return availableDays;
  } catch (error) {
    console.error('❌ Erreur lors du chargement des créneaux disponibles:', error);
    
    // Essayer une approche alternative en cas d'erreur
    try {
      console.log('🔄 Tentative avec une approche alternative...');
      
      await ensureFirestoreReady();
      const db = getFirestoreInstance();
      if (!db) throw new Error('Firestore not available');
      
      // Requête simplifiée sans filtres de date
      const eventsRef = collection(db, 'calendar_events');
      const q = query(
        eventsRef,
        where('professionalId', '==', professionalId), 
        limit(100) // Limiter le nombre de résultats
      );
      
      const snapshot = await getDocs(q);
      console.log(`📊 Trouvé ${snapshot.docs.length} créneaux (approche alternative)`);
      
      // Filtrer côté client
      const slots = snapshot.docs
        .map(doc => {
          const data = doc.data();
          try {
            const start = data.start.toDate();
            return {
              id: doc.id,
              date: start,
              time: format(start, 'HH:mm'), 
              isBooked: data.isAvailable === false,
              bookingId: data.bookingId
            };
          } catch (err) {
            return null;
          }
        })
        .filter(Boolean)
        .filter(slot => {
          // Filtrer par plage de dates
          return slot.date >= startOfDay(startDate) && slot.date <= endOfDay(endDate);
        }) as TimeSlot[];
      
      // Trier par date et heure
      const sortedSlots = slots.sort((a, b) => {
        const dateCompare = a.date.getTime() - b.date.getTime();
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });
      
      console.log(`✅ Chargement alternatif réussi: ${sortedSlots.length} créneaux`);
      return sortedSlots;
    } catch (fallbackError) {
      console.error('❌ Échec de l\'approche alternative:', fallbackError);
    }
    
    console.error('❌ Error loading available slots:', error);
    return [];
  }
};