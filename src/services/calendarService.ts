import { getFirestoreInstance, retryFirestoreOperation, ensureFirestoreReady } from '../utils/firebase';
import { 
  collection, 
  collectionGroup,
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
  addDoc,
  writeBatch
} from 'firebase/firestore';
import { format, parseISO, addMonths, startOfMonth, endOfMonth, startOfDay } from 'date-fns';

// Types for calendar events
export interface AvailabilityData {
  day: string;
  slots: string[];
  startTime: string;
  endTime: string;
}

export interface CalendarEvent {
  id: string;
  professionalId: string;
  title: string;
  start: Date;
  end: Date;
  isAvailable: boolean;
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number; // every X days/weeks/months
    endDate: Date;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Create a new availability slot
export async function createAvailabilitySlot(
  professionalId: string,
  start: Date | string,
  end: Date | string,
  isRecurring: boolean = false,
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
  }
): Promise<string> {
  try {
    console.log('📅 Creating new availability slot...');
    
    // Convert string dates to Date objects if needed
    const startDate = typeof start === 'string' ? new Date(start) : start;
    const endDate = typeof end === 'string' ? new Date(end) : end;
    
    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date format');
    }
    
    // CRITICAL: Ensure Firestore is ready before creating
    await ensureFirestoreReady();
    
    const db = getFirestoreInstance();
    if (!db) throw new Error('Firestore not available');
    
    // Create event data
    const eventData: any = {
      professionalId,
      title: 'Available', 
      start: startDate,
      end,
      isAvailable: true,
      isRecurring,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Only include recurringPattern if it's provided and isRecurring is true
    if (isRecurring && recurringPattern) {
      eventData.recurringPattern = { ...recurringPattern, endDate: recurringPattern.endDate || addMonths(new Date(), 3) };
    }
    
    // Add to calendar_events collection
    const eventsRef = collection(db, 'calendar_events');
    const docRef = await addDoc(eventsRef, eventData);
    
    console.log('✅ Availability slot created successfully:', docRef.id);
    
    // If recurring, create recurring instances
    if (isRecurring && recurringPattern) {
      await createRecurringInstances(docRef.id, { ...eventData, start: startDate, end: endDate });
    }
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating availability slot:', error);
    throw new Error('Failed to create availability slot');
  }
}

// Create recurring instances based on pattern
export async function deleteAllCalendarEventsForProfessional(
  professionalId: string
): Promise<void> {
  try {
    console.log('🗑️ Deleting all calendar events for professional:', professionalId);
    
    // CRITICAL: Ensure Firestore is ready before deleting
    await ensureFirestoreReady();
    
    const db = getFirestoreInstance();
    if (!db) throw new Error('Firestore not available');
    
    // Get all events for the professional
    const eventsRef = collection(db, 'calendar_events');
    const q = query(
      eventsRef,
      where('professionalId', '==', professionalId)
    );
    
    const snapshot = await getDocs(q);
    console.log(`Found ${snapshot.docs.length} calendar events to delete`);
    
    if (snapshot.docs.length === 0) {
      console.log('No events to delete');
      return;
    }
    
    // Delete in batches of 500 (Firestore limit)
    const batchSize = 500;
    const batches = [];
    
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const currentBatch = snapshot.docs.slice(i, i + batchSize);
      
      currentBatch.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      batches.push(batch.commit());
    }
    
    await Promise.all(batches);
    console.log(`✅ Deleted ${snapshot.docs.length} calendar events`);
  } catch (error) {
    console.error('❌ Error deleting calendar events:', error);
    throw new Error('Failed to delete calendar events');
  }
}

async function createRecurringInstances(
  parentEventId: string,
  parentEvent: any
): Promise<void> {
  try {
    console.log('🔄 Creating recurring instances for event:', parentEventId);
    
    const { recurringPattern, start, end, professionalId, title } = parentEvent;
    if (!recurringPattern) return;
    
    const { frequency, interval, endDate } = recurringPattern;
    
    // Limit to 3 months in advance to avoid creating too many events
    const maxEndDate = endDate || addMonths(new Date(), 3);
    
    // Generate recurring dates based on frequency
    const instances = generateRecurringDates(
      start,
      end,
      frequency,
      interval,
      maxEndDate
    );
    
    console.log(`Generated ${instances.length} recurring instances for ${format(start, 'yyyy-MM-dd HH:mm')}`);
    
    // Save instances to Firestore
    const db = getFirestoreInstance();
    if (!db) throw new Error('Firestore not available');
    
    const eventsRef = collection(db, 'calendar_events');
    
    // Create instances in batches to avoid overwhelming Firestore
    const batchSize = 20;
    for (let i = 0; i < instances.length; i += batchSize) {
      const batch = instances.slice(i, i + batchSize);
      
      const promises = batch.map(instance => {
        return addDoc(eventsRef, {
          professionalId,
          title: 'Available (Recurring)',
          start: instance.start, 
          end: instance.end,
          isAvailable: true,
          isRecurring: false, // Individual instances are not recurring themselves
          parentEventId, // Reference to the parent recurring event
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      
      await Promise.all(promises);
      
      // Small delay between batches
      if (i + batchSize < instances.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    console.log('✅ Recurring instances created successfully');
  } catch (error) {
    console.error('❌ Error creating recurring instances:', error);
    // Don't throw, just log the error to avoid blocking the parent event creation
  } 
}

// Generate recurring dates based on pattern
function generateRecurringDates(
  start: Date,
  end: Date,
  frequency: 'daily' | 'weekly' | 'monthly',
  interval: number,
  endDate: Date 
): Array<{ start: Date; end: Date }> {
  const instances: Array<{ start: Date; end: Date }> = [];
  const durationMs = end.getTime() - start.getTime();
  
  let currentStart = new Date(start);
  
  while (currentStart <= endDate) {
    // Skip the first instance if it's the parent event
    if (currentStart.getTime() !== start.getTime()) {
      const currentEnd = new Date(currentStart.getTime() + durationMs);
      instances.push({ start: currentStart, end: currentEnd });
    }
    
    // Move to next instance based on frequency
    if (frequency === 'daily') {
      const newStart = new Date(currentStart);
      currentStart = newStart;
      currentStart.setDate(currentStart.getDate() + interval);
    } else if (frequency === 'weekly') {
      const newStart = new Date(currentStart);
      currentStart.setDate(currentStart.getDate() + (interval * 7));
    } else if (frequency === 'monthly') {
      const newStart = new Date(currentStart);
      currentStart.setMonth(currentStart.getMonth() + interval);
    }
  }
  
  return instances;
}

// Update an availability slot
export async function updateAvailabilitySlot(
  eventId: string,
  updates: Partial<CalendarEvent>,
  updateRecurring: boolean = false
): Promise<void> {
  try {
    console.log('🔄 Updating availability slot:', eventId);
    
    // CRITICAL: Ensure Firestore is ready before updating
    await ensureFirestoreReady();
    
    const db = getFirestoreInstance();
    if (!db) throw new Error('Firestore not available');
    
    // Get the event to check if it's recurring
    const eventRef = doc(db, 'calendar_events', eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      throw new Error('Event not found');
    }
    
    const eventData = eventSnap.data();
    
    // Update the event
    await updateDoc(eventRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Availability slot updated successfully');
    
    // If it's a recurring event and updateRecurring is true, update all future instances
    if (eventData.isRecurring && updateRecurring) {
      console.log('🔄 Updating future recurring instances...');
      
      // Get all future instances
      const eventsRef = collection(db, 'calendar_events');
      const q = query(
        eventsRef,
        where('parentEventId', '==', eventId),
        where('start', '>=', new Date())
      );
      
      const snapshot = await getDocs(q);
      
      // Update each instance
      const updatePromises = snapshot.docs.map(doc => {
        return updateDoc(doc.ref, {
          ...updates,
          updatedAt: serverTimestamp()
        });
      });
      
      await Promise.all(updatePromises);
      
      console.log(`✅ Updated ${snapshot.docs.length} future recurring instances`);
    }
  } catch (error) {
    console.error('❌ Error updating availability slot:', error);
    throw new Error('Failed to update availability slot');
  }
}

// Delete an availability slot
export async function deleteAvailabilitySlot(
  eventId: string,
  deleteFutureRecurring: boolean = false
): Promise<void> {
  try {
    console.log('🗑️ Deleting availability slot:', eventId);
    
    // CRITICAL: Ensure Firestore is ready before deleting
    await ensureFirestoreReady();
    
    const db = getFirestoreInstance();
    if (!db) throw new Error('Firestore not available');
    
    // Get the event to check if it's recurring
    const eventRef = doc(db, 'calendar_events', eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      throw new Error('Event not found');
    }
    
    const eventData = eventSnap.data();
    
    // Delete the event
    await deleteDoc(eventRef);
    
    console.log('✅ Availability slot deleted successfully');
    
    // If it's a recurring event and deleteFutureRecurring is true, delete all future instances
    if (eventData.isRecurring && deleteFutureRecurring) {
      console.log('🗑️ Deleting future recurring instances...');
      
      // Get all future instances
      const eventsRef = collection(db, 'calendar_events');
      const q = query(
        eventsRef,
        where('parentEventId', '==', eventId),
        where('start', '>=', new Date())
      );
      
      const snapshot = await getDocs(q);
      
      // Delete each instance
      const deletePromises = snapshot.docs.map(doc => {
        return deleteDoc(doc.ref);
      });
      
      await Promise.all(deletePromises);
      
      console.log(`✅ Deleted ${snapshot.docs.length} future recurring instances`);
    }
  } catch (error) {
    console.error('❌ Error deleting availability slot:', error);
    throw new Error('Failed to delete availability slot');
  }
}


// Get professional availability data directly from the professionals collection
export async function getProfessionalAvailabilityData(professionalId: string): Promise<AvailabilityData[]> {
  try {
    console.log('📅 Getting direct availability data for professional:', professionalId);
    
    // CRITICAL: Ensure Firestore is ready before fetching
    await ensureFirestoreReady();
    
    const db = getFirestoreInstance();
    if (!db) throw new Error('Firestore not available');
    
    // Get the professional document
    const professionalRef = doc(db, 'professionals', professionalId);
    const professionalSnap = await getDoc(professionalRef);
    
    if (!professionalSnap.exists()) {
      console.warn('⚠️ Professional not found');
      return [];
    }
    
    const professionalData = professionalSnap.data();
    
    // Check if availability exists and is an array
    if (!professionalData.availability || !Array.isArray(professionalData.availability)) {
      console.warn('⚠️ No availability data found for professional in document');
      return [];
    }
    
    // Ensure each availability item has the required fields
    const availability = professionalData.availability
      .filter((avail: any) => avail && avail.day)
      .map((avail: any) => ({
        day: avail.day,
        slots: Array.isArray(avail.slots) && avail.slots.length > 0 
          ? avail.slots 
          : generateTimeSlots(avail.startTime || '08:00', avail.endTime || '17:00'),
        startTime: avail.startTime || avail.slots[0],
        endTime: avail.endTime || avail.slots[avail.slots.length - 1]
      }));
    
    console.log(`✅ Found ${availability.length} availability entries with ${availability.reduce((sum, avail) => sum + (Array.isArray(avail.slots) ? avail.slots.length : 0), 0)} total slots`);
    return availability;
  } catch (error) {
    console.error('❌ Error getting professional availability data:', error);
    throw new Error('Failed to get professional availability data');
  }
}

// Get availability slots for a professional within a date range
export async function getProfessionalAvailability(
  professionalId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  try {
    console.log('📅 Getting availability for professional:', professionalId);
    
    // First, try to get availability data directly from the professional document
    const availabilityData = await getProfessionalAvailabilityData(professionalId);
    
    if (availabilityData.length > 0) {
      console.log('✅ Using availability data from professional document');
      
      // Convert availability data to calendar events
      const events: CalendarEvent[] = [];
      
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
      availabilityData.forEach(avail => {
        const dayNumber = dayMap[avail.day];
        if (dayNumber === undefined) {
          console.warn(`⚠️ Unknown day: ${avail.day}, skipping`);
          return;
        }
        
        // Calculate dates for this day within the date range
        const dates: Date[] = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
          if (currentDate.getDay() === dayNumber) {
            dates.push(new Date(currentDate));
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // For each date, create events for each time slot
        dates.forEach(date => {
          avail.slots.forEach(timeSlot => {
            const [hour, minute] = timeSlot.split(':').map(Number);
            
            const start = new Date(date);
            start.setHours(hour, minute, 0, 0);
            
            const end = new Date(start);
            end.setHours(hour + 1, minute, 0, 0); // Default to 1 hour slots
            
            events.push({
              id: `generated_${professionalId}_${format(start, 'yyyy-MM-dd_HH-mm')}`,
              professionalId,
              title: 'Available',
              start,
              end,
              isAvailable: true,
              isRecurring: false,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now()
            });
          });
        });
      });
      
      console.log(`✅ Generated ${events.length} availability events from professional data`);
      return events;
    }
    
    // CRITICAL: Ensure Firestore is ready before fetching
    await ensureFirestoreReady();
    
    const db = getFirestoreInstance();
    if (!db) throw new Error('Firestore not available');
    
    // Query for events in the date range
    const eventsRef = collection(db, 'calendar_events');
    const q = query(
      eventsRef,
      where('professionalId', '==', professionalId),
      where('isAvailable', '==', true),
      where('start', '>=', startDate),
      where('start', '<=', endDate),
      orderBy('start', 'asc')
    );
    
    const snapshot = await getDocs(q);
    
    const events = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        start: data.start.toDate(),
        end: data.end.toDate(),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      } as CalendarEvent;
    });
    
    console.log(`✅ Found ${events.length} availability slots`);
    return events;
  } catch (error) {
    console.error('❌ Error getting professional availability:', error);
    
    // Try a simpler query without date range if the index doesn't exist
    try {
      console.log('🔄 Trying simpler query without date range...');
      
      const db = getFirestoreInstance();
      if (!db) throw new Error('Firestore not available');
      
      const eventsRef = collection(db, 'calendar_events');
      const q = query(
        eventsRef,
        where('professionalId', '==', professionalId),
        where('isAvailable', '==', true)
      );
      
      const snapshot = await getDocs(q);
      
      // Filter on client side
      const events = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            start: data.start.toDate(),
            end: data.end.toDate(),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          } as CalendarEvent;
        })
        .filter(event => 
          event.start >= startDate && 
          event.start <= endDate
        )
        .sort((a, b) => a.start.getTime() - b.start.getTime());
      
      console.log(`✅ Found ${events.length} availability slots (client-side filtering)`);
      return events;
    } catch (fallbackError) {
      console.error('❌ Fallback query also failed:', fallbackError);
      throw new Error('Failed to get professional availability');
    }
  }
}

// Get available time slots for a specific date
export async function getAvailableTimeSlots(
  professionalId: string,
  date: Date,
  useDirectData: boolean = true
): Promise<Array<{ start: Date; end: Date }>> {
  try {
    console.log('🕒 Getting available time slots for date:', date);
    
    // Set start and end of the selected date
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999); 
    
    // If useDirectData is true, try to get availability data directly first
    if (useDirectData) {
      try {
        const availabilityData = await getProfessionalAvailabilityData(professionalId);
        
        if (availabilityData.length > 0) {
          console.log('✅ Using availability data from professional document for time slots');
          
          // Get day name for the date
          const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
          const dayName = dayNames[date.getDay()];
          
          // Find availability for this day
          const dayAvailability = availabilityData.find(avail => avail.day === dayName);
          
          if (dayAvailability && Array.isArray(dayAvailability.slots) && dayAvailability.slots.length > 0) {
            console.log(`✅ Found ${dayAvailability.slots.length} slots for ${dayName} on ${format(date, 'yyyy-MM-dd')}`);
            
            // Convert time strings to Date objects
            const timeSlots = dayAvailability.slots.map(timeStr => {
              const [hour, minute] = timeStr.split(':').map(Number);
              
              const start = new Date(date);
              start.setHours(hour, minute, 0, 0);
              
              const end = new Date(start);
              end.setHours(hour + 1, minute, 0, 0); // Default to 1 hour slots
              
              return { start, end };
            });
            
            // Get booked appointments for the date
            const bookedSlots = await getBookedAppointments(
              professionalId, 
              dayStart, 
              dayEnd 
            );
            
            // Filter out booked slots
            const availableSlots = timeSlots.filter(slot => {
              return !bookedSlots.some(bookedSlot => {
                return (
                  (slot.start >= bookedSlot.start && slot.start < bookedSlot.end) ||
                  (slot.end > bookedSlot.start && slot.end <= bookedSlot.end) ||
                  (slot.start <= bookedSlot.start && slot.end >= bookedSlot.end)
                );
              });
            });
            
            console.log(`✅ Found ${availableSlots.length} available time slots for ${dayName}`);
            return availableSlots;
          }
        }
      } catch (directError) {
        console.warn('⚠️ Error getting direct availability data:', directError);
        // Continue with the regular method
      }
    }
    
    // Get availability slots for the date
    const availabilitySlots = await getProfessionalAvailability(
      professionalId,
      dayStart, 
      dayEnd 
    );
    
    // Get booked appointments for the date
    const bookedSlots = await getBookedAppointments(
      professionalId,
      dayStart, 
      dayEnd 
    );
    
    // Convert availability slots to time slots
    const timeSlots: Array<{ start: Date; end: Date }> = [];
    
    availabilitySlots.forEach(slot => {
      // Split availability into 1-hour slots
      const slotDuration = 60 * 60 * 1000; // 1 hour in milliseconds
      const slotStart = slot.start.getTime();
      const slotEnd = slot.end.getTime();
      
      for (let time = slotStart; time < slotEnd; time += slotDuration) {
        const start = new Date(time);
        const end = new Date(time + slotDuration);
        
        // Check if this slot overlaps with any booked appointment
        const isBooked = bookedSlots.some(bookedSlot => {
          const bookedStart = bookedSlot.start.getTime();
          const bookedEnd = bookedSlot.end.getTime();
          
          return (
            (start.getTime() >= bookedStart && start.getTime() < bookedEnd) ||
            (end.getTime() > bookedStart && end.getTime() <= bookedEnd) ||
            (start.getTime() <= bookedStart && end.getTime() >= bookedEnd)
          );
        });
        
        if (!isBooked) {
          timeSlots.push({ start, end });
        }
      }
    });
    
    console.log(`✅ Found ${timeSlots.length} available time slots`);
    return timeSlots;
  } catch (error) {
    console.error('❌ Error getting available time slots:', error);
    
    // Try fallback method
    try {
      console.log('🔄 Trying fallback method for time slots...');
      
      const availabilityData = await getProfessionalAvailabilityData(professionalId);
      
      if (availabilityData.length > 0) {
        // Get day name for the date
        const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        const dayName = dayNames[date.getDay()];
        
        // Find availability for this day
        const dayAvailability = availabilityData.find(avail => avail.day === dayName);
        
        if (dayAvailability && dayAvailability.slots.length > 0) {
          // Convert time strings to Date objects
          const timeSlots = dayAvailability.slots.map(timeStr => {
            const [hour, minute] = timeStr.split(':').map(Number);
            
            const start = new Date(date);
            start.setHours(hour, minute, 0, 0);
            
            const end = new Date(start);
            end.setHours(hour + 1, minute, 0, 0); // Default to 1 hour slots
            
            return { start, end };
          });
          
          console.log(`✅ Found ${timeSlots.length} time slots for ${dayName} (fallback)`);
          return timeSlots;
        }
      }
      
      return [];
    } catch (fallbackError) {
      console.error('❌ Fallback method also failed:', fallbackError);
      return [];
    }
  }
}

// Get booked appointments for a date range
async function getBookedAppointments(
  professionalId: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ start: Date; end: Date }>> {
  try {
    console.log('📋 Getting booked appointments...');
    
    // CRITICAL: Ensure Firestore is ready before fetching
    await ensureFirestoreReady();
    
    const db = getFirestoreInstance();
    if (!db) throw new Error('Firestore not available');
    
    // Query for bookings in the date range
    const bookingsRef = collection(db, 'bookings');
    
    // Format dates for string comparison (since bookings store date as string)
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    const q = query(
      bookingsRef,
      where('professionalId', '==', professionalId),
      where('date', '>=', startDateStr),
      where('date', '<=', endDateStr),
      where('status', 'in', ['en_attente', 'confirmé'])
    );
    
    const snapshot = await getDocs(q);
    
    const bookedSlots = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Parse date and time strings
      const dateStr = data.date;
      const startTimeStr = data.startTime;
      const endTimeStr = data.endTime;
      
      // Create Date objects
      const [startHour, startMinute] = startTimeStr.split(':').map(Number);
      const [endHour, endMinute] = endTimeStr.split(':').map(Number);
      
      const start = new Date(`${dateStr}T${startTimeStr}`);
      const end = new Date(`${dateStr}T${endTimeStr}`);
      
      return { start, end };
    });
    
    console.log(`✅ Found ${bookedSlots.length} booked appointments`);
    return bookedSlots;
  } catch (error) {
    console.error('❌ Error getting booked appointments:', error);
    return []; // Return empty array to avoid blocking the availability check
  }
}

// Get all events for a professional's calendar
export async function getProfessionalCalendar(
  professionalId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  try {
    console.log('📅 Getting calendar for professional:', professionalId);
    
    // CRITICAL: Ensure Firestore is ready before fetching
    await ensureFirestoreReady();
    
    const db = getFirestoreInstance();
    if (!db) throw new Error('Firestore not available');
    
    // Query for all events (availability and bookings)
    const eventsRef = collection(db, 'calendar_events');
    const q = query(
      eventsRef,
      where('professionalId', '==', professionalId),
      where('start', '>=', startDate),
      where('start', '<=', endDate),
      orderBy('start', 'asc')
    );
    
    const snapshot = await getDocs(q);
    
    const events = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        start: data.start.toDate(),
        end: data.end.toDate(),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      } as CalendarEvent;
    });
    
    // Also get bookings and convert them to calendar events
    const bookingsRef = collection(db, 'bookings');
    
    // Format dates for string comparison (since bookings store date as string)
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    const bookingsQuery = query(
      bookingsRef,
      where('professionalId', '==', professionalId),
      where('date', '>=', startDateStr),
      where('date', '<=', endDateStr)
    );
    
    const bookingsSnapshot = await getDocs(bookingsQuery);
    
    const bookingEvents = bookingsSnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Parse date and time strings
      const dateStr = data.date;
      const startTimeStr = data.startTime;
      const endTimeStr = data.endTime;
      
      // Create Date objects
      const start = new Date(`${dateStr}T${startTimeStr}`);
      const end = new Date(`${dateStr}T${endTimeStr}`);
      
      return {
        id: `booking_${doc.id}`,
        professionalId,
        title: `Appointment: ${data.patientName}`,
        start,
        end,
        isAvailable: false,
        isRecurring: false,
        bookingId: doc.id,
        patientId: data.patientId,
        patientName: data.patientName,
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      } as CalendarEvent;
    });
    
    // Combine availability events and booking events
    const allEvents = [...events, ...bookingEvents];
    
    console.log(`✅ Found ${allEvents.length} calendar events`);
    return allEvents;
  } catch (error) {
    console.error('❌ Error getting professional calendar:', error);
    
    // Try a simpler query without date range if the index doesn't exist
    try {
      console.log('🔄 Trying simpler query without date range...');
      
      const db = getFirestoreInstance();
      if (!db) throw new Error('Firestore not available');
      
      // Get all events for the professional
      const eventsRef = collection(db, 'calendar_events');
      const q = query(
        eventsRef,
        where('professionalId', '==', professionalId)
      );
      
      const snapshot = await getDocs(q);
      
      // Filter on client side
      const events = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            start: data.start.toDate(),
            end: data.end.toDate(),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          } as CalendarEvent;
        })
        .filter(event => 
          event.start >= startDate && 
          event.start <= endDate
        )
        .sort((a, b) => a.start.getTime() - b.start.getTime());
      
      // Get bookings (simplified query)
      const bookingsRef = collection(db, 'bookings');
      const bookingsQuery = query(
        bookingsRef,
        where('professionalId', '==', professionalId)
      );
      
      const bookingsSnapshot = await getDocs(bookingsQuery);
      
      // Filter and convert bookings on client side
      const bookingEvents = bookingsSnapshot.docs
        .map(doc => {
          const data = doc.data();
          
          try {
            // Parse date and time strings
            const dateStr = data.date;
            const startTimeStr = data.startTime;
            const endTimeStr = data.endTime;
            
            // Create Date objects
            const start = new Date(`${dateStr}T${startTimeStr}`);
            const end = new Date(`${dateStr}T${endTimeStr}`);
            
            // Filter by date range
            if (start >= startDate && start <= endDate) {
              return {
                id: `booking_${doc.id}`,
                professionalId,
                title: `Appointment: ${data.patientName}`,
                start,
                end,
                isAvailable: false,
                isRecurring: false,
                bookingId: doc.id,
                patientId: data.patientId,
                patientName: data.patientName,
                status: data.status,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt
              } as CalendarEvent;
            }
            return null;
          } catch (parseError) {
            console.warn('⚠️ Error parsing booking date:', parseError);
            return null;
          }
        })
        .filter(Boolean) as CalendarEvent[];
      
      // Combine availability events and booking events
      const allEvents = [...events, ...bookingEvents];
      
      console.log(`✅ Found ${allEvents.length} calendar events (client-side filtering)`);
      return allEvents;
    } catch (fallbackError) {
      console.error('❌ Fallback query also failed:', fallbackError);
      throw new Error('Failed to get professional calendar');
    }
  }
}

// Export to iCalendar format
export function exportToICalendar(events: CalendarEvent[]): string {
  // iCalendar format: https://tools.ietf.org/html/rfc5545
  let icalContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Health-e//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];
  
  events.forEach(event => {
    icalContent = [
      ...icalContent,
      'BEGIN:VEVENT',
      `UID:${event.id}@health-e.com`,
      `DTSTAMP:${formatICalDate(new Date())}`,
      `DTSTART:${formatICalDate(event.start)}`,
      `DTEND:${formatICalDate(event.end)}`,
      `SUMMARY:${event.title}`,
      'END:VEVENT'
    ];
  });
  
  icalContent.push('END:VCALENDAR');
  
  return icalContent.join('\r\n');
}

// Format date for iCalendar
function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// Generate Google Calendar URL for adding events
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const startTime = event.start.toISOString().replace(/-|:|\.\d+/g, '');
  const endTime = event.end.toISOString().replace(/-|:|\.\d+/g, '');
  
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startTime}/${endTime}&details=${encodeURIComponent('Health-e Calendar Event')}`;
}

// Migrate availability to calendar events
export async function migrateAvailabilityToCalendar(professionalId: string): Promise<number> {
  try {
    console.log('🔄 Migrating availability to calendar for professional:', professionalId);
    
    // CRITICAL: Ensure Firestore is ready before migrating
    await ensureFirestoreReady();
    
    const db = getFirestoreInstance();
    if (!db) throw new Error('Firestore not available');
    
    // Get professional profile to access old availability
    const professionalRef = doc(db, 'professionals', professionalId);
    const professionalSnap = await getDoc(professionalRef);
    
    if (!professionalSnap.exists()) {
      throw new Error('Professional not found');
    }
    
    const professionalData = professionalSnap.data();
    const oldAvailability = professionalData.availability || [];
    
    if (!Array.isArray(oldAvailability) || oldAvailability.length === 0) {
      console.log('⚠️ No availability data to migrate');
      return 0;
    }
    
    console.log(`📊 Found ${oldAvailability.length} availability entries to migrate`);
    
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
    
    // Create calendar events for each availability slot
    const eventsRef = collection(db, 'calendar_events');
    let createdCount = 0;
    
    for (const slot of oldAvailability) {
      try {
        if (!slot.day || !slot.startTime || !slot.endTime) {
          console.warn('⚠️ Invalid availability slot, skipping:', slot);
          continue;
        }
        
        const dayNumber = dayMap[slot.day];
        if (dayNumber === undefined) {
          console.warn(`⚠️ Unknown day: ${slot.day}, skipping`);
          continue;
        }
        
        // Create a date for the next occurrence of this day
        const today = new Date();
        const daysUntilNext = (dayNumber - today.getDay() + 7) % 7;
        const nextOccurrence = new Date(today);
        nextOccurrence.setDate(today.getDate() + daysUntilNext);
        
        // Set the time
        const [startHour, startMinute] = slot.startTime.split(':').map(Number);
        const [endHour, endMinute] = slot.endTime.split(':').map(Number);
        
        const start = new Date(nextOccurrence);
        start.setHours(startHour, startMinute, 0, 0);
        
        const end = new Date(nextOccurrence);
        end.setHours(endHour, endMinute, 0, 0);
        
        // Create recurring event
        const eventData = {
          professionalId,
          title: `Available: ${slot.day}`,
          start,
          end,
          isAvailable: true,
          isRecurring: true,
          recurringPattern: {
            frequency: 'weekly' as const,
            interval: 1,
            endDate: addMonths(new Date(), 3) // 3 months in advance
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        const docRef = await addDoc(eventsRef, eventData);
        console.log(`✅ Created recurring event for ${slot.day}: ${docRef.id}`);
        
        // Create recurring instances
        await createRecurringInstances(docRef.id, eventData);
        
        createdCount++;
      } catch (slotError) {
        console.error(`❌ Error migrating slot for ${slot.day}:`, slotError);
      }
    }
    
    console.log(`🎉 Migration completed! Created ${createdCount} recurring events`);
    return createdCount;
  } catch (error) {
    console.error('❌ Error migrating availability to calendar:', error);
    throw new Error('Failed to migrate availability to calendar');
  }
}