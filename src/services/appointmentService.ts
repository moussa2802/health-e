import { getFirestoreInstance, retryFirestoreOperation, ensureFirestoreReady } from '../utils/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { format, parseISO, addMonths, startOfMonth, endOfMonth } from 'date-fns';

// Types for appointments
export interface Appointment {
  id: string;
  professionalId: string;
  patientId?: string;
  date: string;
  time: string;
  duration: number;
  status: 'available' | 'booked' | 'cancelled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Get available appointments for a professional
export async function getAvailableAppointments(
  professionalId: string,
  startDate: Date,
  endDate: Date
): Promise<Appointment[]> {
  try {
    console.log('📅 Getting available appointments for professional:', professionalId);
    
    // CRITICAL: Ensure Firestore is ready before fetching
    await ensureFirestoreReady();
    
    const db = getFirestoreInstance();
    if (!db) throw new Error('Firestore not available');
    
    // Format dates for string comparison
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    // Query for available appointments
    const appointmentsRef = collection(db, 'appointments');
    const q = query(
      appointmentsRef,
      where('professionalId', '==', professionalId),
      where('date', '>=', startDateStr),
      where('date', '<=', endDateStr),
      where('status', '==', 'available')
    );
    
    const snapshot = await getDocs(q);
    
    const appointments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Appointment));
    
    console.log(`✅ Found ${appointments.length} available appointments`);
    return appointments;
  } catch (error) {
    console.error('❌ Error getting available appointments:', error);
    
    // Try a simpler query without date range if the index doesn't exist
    try {
      console.log('🔄 Trying simpler query without date range...');
      
      const db = getFirestoreInstance();
      if (!db) throw new Error('Firestore not available');
      
      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef,
        where('professionalId', '==', professionalId),
        where('status', '==', 'available')
      );
      
      const snapshot = await getDocs(q);
      
      // Filter on client side
      const appointments = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Appointment))
        .filter(appointment => {
          const appointmentDate = appointment.date;
          return appointmentDate >= format(startDate, 'yyyy-MM-dd') && 
                 appointmentDate <= format(endDate, 'yyyy-MM-dd');
        });
      
      console.log(`✅ Found ${appointments.length} available appointments (client-side filtering)`);
      return appointments;
    } catch (fallbackError) {
      console.error('❌ Fallback query also failed:', fallbackError);
      throw new Error('Failed to get available appointments');
    }
  }
}

// Create available appointment slots
export async function createAvailableAppointments(
  professionalId: string,
  slots: { date: string; time: string; duration?: number }[]
): Promise<string[]> {
  try {
    console.log('📅 Creating available appointments for professional:', professionalId);
    
    // CRITICAL: Ensure Firestore is ready before creating
    await ensureFirestoreReady();
    
    const db = getFirestoreInstance();
    if (!db) throw new Error('Firestore not available');
    
    // Create appointments in batches
    const appointmentIds: string[] = [];
    const batchSize = 20;
    
    for (let i = 0; i < slots.length; i += batchSize) {
      const batch = slots.slice(i, i + batchSize);
      
      const promises = batch.map(async slot => {
        const appointmentsRef = collection(db, 'appointments');
        
        const appointmentData = {
          professionalId,
          date: slot.date,
          time: slot.time,
          duration: slot.duration || 30, // Default 30 minutes
          status: 'available',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        const docRef = await addDoc(appointmentsRef, appointmentData);
        return docRef.id;
      });
      
      const ids = await Promise.all(promises);
      appointmentIds.push(...ids);
      
      // Small delay between batches
      if (i + batchSize < slots.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`✅ Created ${appointmentIds.length} available appointments`);
    return appointmentIds;
  } catch (error) {
    console.error('❌ Error creating available appointments:', error);
    throw new Error('Failed to create available appointments');
  }
}

// Book an appointment
export async function bookAppointment(
  appointmentId: string,
  patientId: string
): Promise<void> {
  try {
    console.log('📅 Booking appointment:', appointmentId);
    
    // CRITICAL: Ensure Firestore is ready before booking
    await ensureFirestoreReady();
    
    const db = getFirestoreInstance();
    if (!db) throw new Error('Firestore not available');
    
    // Get the appointment
    const appointmentRef = doc(db, 'appointments', appointmentId);
    const appointmentSnap = await getDoc(appointmentRef);
    
    if (!appointmentSnap.exists()) {
      throw new Error('Appointment not found');
    }
    
    const appointmentData = appointmentSnap.data();
    
    if (appointmentData.status !== 'available') {
      throw new Error('Appointment is not available');
    }
    
    // Update the appointment
    await updateDoc(appointmentRef, {
      patientId,
      status: 'booked',
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Appointment booked successfully');
  } catch (error) {
    console.error('❌ Error booking appointment:', error);
    throw new Error('Failed to book appointment');
  }
}

// Cancel an appointment
export async function cancelAppointment(
  appointmentId: string
): Promise<void> {
  try {
    console.log('📅 Cancelling appointment:', appointmentId);
    
    // CRITICAL: Ensure Firestore is ready before cancelling
    await ensureFirestoreReady();
    
    const db = getFirestoreInstance();
    if (!db) throw new Error('Firestore not available');
    
    // Get the appointment
    const appointmentRef = doc(db, 'appointments', appointmentId);
    const appointmentSnap = await getDoc(appointmentRef);
    
    if (!appointmentSnap.exists()) {
      throw new Error('Appointment not found');
    }
    
    // Update the appointment
    await updateDoc(appointmentRef, {
      status: 'cancelled',
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Appointment cancelled successfully');
  } catch (error) {
    console.error('❌ Error cancelling appointment:', error);
    throw new Error('Failed to cancel appointment');
  }
}

// Get appointments for a patient
export async function getPatientAppointments(
  patientId: string
): Promise<Appointment[]> {
  try {
    console.log('📅 Getting appointments for patient:', patientId);
    
    // CRITICAL: Ensure Firestore is ready before fetching
    await ensureFirestoreReady();
    
    const db = getFirestoreInstance();
    if (!db) throw new Error('Firestore not available');
    
    // Query for patient appointments
    const appointmentsRef = collection(db, 'appointments');
    const q = query(
      appointmentsRef,
      where('patientId', '==', patientId),
      where('status', '==', 'booked')
    );
    
    const snapshot = await getDocs(q);
    
    const appointments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Appointment));
    
    console.log(`✅ Found ${appointments.length} appointments for patient`);
    return appointments;
  } catch (error) {
    console.error('❌ Error getting patient appointments:', error);
    throw new Error('Failed to get patient appointments');
  }
}

// Convert professional availability to appointment slots
export async function convertAvailabilityToAppointments(
  professionalId: string,
  availability: { day: string; slots: string[] }[],
  weeks: number = 4
): Promise<string[]> {
  try {
    console.log('📅 Converting availability to appointments for professional:', professionalId);
    
    // Generate appointment slots
    const slots: { date: string; time: string; duration?: number }[] = [];
    
    // Map day names to day numbers (0 = Sunday, 1 = Monday, etc.)
    const dayMap: Record<string, number> = {
      'Dimanche': 0,
      'Lundi': 1,
      'Mardi': 2,
      'Mercredi': 3,
      'Jeudi': 4,
      'Vendredi': 5,
      'Samedi': 6
    };
    
    // For each day in the availability
    availability.forEach(avail => {
      const dayNumber = dayMap[avail.day];
      if (dayNumber === undefined) {
        console.warn(`⚠️ Unknown day: ${avail.day}, skipping`);
        return;
      }
      
      // For each week
      for (let week = 0; week < weeks; week++) {
        // Calculate the date for this day in this week
        const today = new Date();
        const daysUntilNext = (dayNumber - today.getDay() + 7) % 7;
        const nextOccurrence = new Date(today);
        nextOccurrence.setDate(today.getDate() + daysUntilNext + (week * 7));
        
        // Format the date
        const dateStr = format(nextOccurrence, 'yyyy-MM-dd');
        
        // Add each time slot
        avail.slots.forEach(time => {
          slots.push({
            date: dateStr,
            time,
            duration: 30 // Default 30 minutes
          });
        });
      }
    });
    
    // Create the appointments
    return await createAvailableAppointments(professionalId, slots);
  } catch (error) {
    console.error('❌ Error converting availability to appointments:', error);
    throw new Error('Failed to convert availability to appointments');
  }
}