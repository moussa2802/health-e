import { getFirestoreInstance } from '../utils/firebase'; // Use getter function instead of direct import
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  DocumentSnapshot
} from 'firebase/firestore';
import { globalCache } from '../hooks/useCache';
import { retryFirestoreOperation } from '../utils/firebase';

// Cache keys
const CACHE_KEYS = {
  USERS: 'users',
  PROFESSIONALS: 'professionals',
  APPOINTMENTS: 'appointments',
  STATISTICS: 'statistics',
  RECENT_TRANSACTIONS: 'recent_transactions'
};

// Cache TTL (Time To Live) in milliseconds
const CACHE_TTL = {
  SHORT: 2 * 60 * 1000,    // 2 minutes
  MEDIUM: 5 * 60 * 1000,   // 5 minutes
  LONG: 15 * 60 * 1000     // 15 minutes
};

// Optimized service with caching and pagination
export class OptimizedFirebaseService {
  // Get users with caching
  static async getUsers(useCache = true) {
    const cacheKey = CACHE_KEYS.USERS;
    
    if (useCache && globalCache.has(cacheKey)) {
      return globalCache.get(cacheKey);
    }

    try {
      const users = await retryFirestoreOperation(async () => {
        const db = getFirestoreInstance();
        if (!db) throw new Error('Firestore not available');
        
        const snapshot = await getDocs(collection(db, 'users'));
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      });

      globalCache.set(cacheKey, users, CACHE_TTL.MEDIUM);
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      
      // Return cached data if available, even if expired
      if (globalCache.has(cacheKey)) {
        console.warn('Returning cached users data due to error');
        return globalCache.get(cacheKey);
      }
      
      // Return empty array instead of throwing to prevent app crashes
      console.warn('No cached data available, returning empty array');
      return [];
    }
  }

  // Get professionals with caching and filtering
  static async getProfessionals(filterType?: 'mental' | 'sexual', useCache = true) {
    const cacheKey = `${CACHE_KEYS.PROFESSIONALS}_${filterType || 'all'}`;
    
    if (useCache && globalCache.has(cacheKey)) {
      return globalCache.get(cacheKey);
    }

    try {
      const professionals = await retryFirestoreOperation(async () => {
        const db = getFirestoreInstance();
        if (!db) throw new Error('Firestore not available');
        
        let q = collection(db, 'professionals');
        
        if (filterType) {
          q = query(
            collection(db, 'professionals'),
            where('type', '==', filterType),
            where('isActive', '==', true)
          ) as any;
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      });

      globalCache.set(cacheKey, professionals, CACHE_TTL.MEDIUM);
      return professionals;
    } catch (error) {
      console.error('Error fetching professionals:', error);
      
      // Return cached data if available, even if expired
      if (globalCache.has(cacheKey)) {
        console.warn('Returning cached professionals data due to error');
        return globalCache.get(cacheKey);
      }
      
      // Return empty array instead of throwing to prevent app crashes
      console.warn('No cached professionals data available, returning empty array');
      return [];
    }
  }

  // Paginated appointments
  static async getAppointmentsPaginated(
    pageSize = 20,
    lastDoc?: DocumentSnapshot,
    useCache = true
  ) {
    const cacheKey = `${CACHE_KEYS.APPOINTMENTS}_page_${lastDoc?.id || 'first'}`;
    
    if (useCache && globalCache.has(cacheKey)) {
      return globalCache.get(cacheKey);
    }

    try {
      const result = await retryFirestoreOperation(async () => {
        const db = getFirestoreInstance();
        if (!db) throw new Error('Firestore not available');
        
        let q = query(
          collection(db, 'appointments'),
          orderBy('createdAt', 'desc'),
          limit(pageSize)
        );

        if (lastDoc) {
          q = query(
            collection(db, 'appointments'),
            orderBy('createdAt', 'desc'),
            startAfter(lastDoc),
            limit(pageSize)
          );
        }

        const snapshot = await getDocs(q);
        const appointments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        return {
          appointments,
          lastDoc: snapshot.docs[snapshot.docs.length - 1],
          hasMore: snapshot.docs.length === pageSize
        };
      });

      globalCache.set(cacheKey, result, CACHE_TTL.SHORT);
      return result;
    } catch (error) {
      console.error('Error fetching appointments:', error);
      
      // Return cached data if available, even if expired
      if (globalCache.has(cacheKey)) {
        console.warn('Returning cached appointments data due to error');
        return globalCache.get(cacheKey);
      }
      
      // Return empty result instead of throwing
      console.warn('No cached appointments data available, returning empty result');
      return {
        appointments: [],
        lastDoc: null,
        hasMore: false
      };
    }
  }

  // Optimized statistics with aggressive caching
  static async getStatistics(useCache = true) {
    const cacheKey = CACHE_KEYS.STATISTICS;
    
    if (useCache && globalCache.has(cacheKey)) {
      return globalCache.get(cacheKey);
    }

    try {
      const stats = await retryFirestoreOperation(async () => {
        const db = getFirestoreInstance();
        if (!db) throw new Error('Firestore not available');
        
        // Use Promise.all for parallel requests
        const [usersSnapshot, professionalsSnapshot, appointmentsSnapshot] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'professionals')),
          getDocs(query(collection(db, 'appointments'), limit(1000))) // Limit for performance
        ]);

        const users = usersSnapshot.docs.map(doc => doc.data());
        const professionals = professionalsSnapshot.docs.map(doc => doc.data());
        const appointments = appointmentsSnapshot.docs.map(doc => doc.data());

        // Calculate statistics
        return {
          users: {
            total: users.length,
            patients: users.filter(u => u.type === 'patient').length,
            professionals: users.filter(u => u.type === 'professional').length
          },
          appointments: {
            total: appointments.length,
            completed: appointments.filter(a => a.status === 'completed').length,
            upcoming: appointments.filter(a => a.status === 'upcoming').length,
            cancelled: appointments.filter(a => a.status === 'cancelled').length
          },
          professionals: {
            mental: professionals.filter(p => p.type === 'mental').length,
            sexual: professionals.filter(p => p.type === 'sexual').length,
            active: professionals.filter(p => p.isActive).length
          }
        };
      });

      globalCache.set(cacheKey, stats, CACHE_TTL.LONG);
      return stats;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      
      // Return cached data if available, even if expired
      if (globalCache.has(cacheKey)) {
        console.warn('Returning cached statistics data due to error');
        return globalCache.get(cacheKey);
      }
      
      // Return default statistics instead of throwing
      console.warn('No cached statistics data available, returning default stats');
      return {
        users: { total: 0, patients: 0, professionals: 0 },
        appointments: { total: 0, completed: 0, upcoming: 0, cancelled: 0 },
        professionals: { mental: 0, sexual: 0, active: 0 }
      };
    }
  }

  // Clear specific cache
  static clearCache(key?: string) {
    if (key) {
      globalCache.delete(key);
    } else {
      globalCache.clear();
    }
  }

  // Preload critical data
  static async preloadCriticalData() {
    try {
      // Preload in parallel
      await Promise.all([
        this.getProfessionals('mental'),
        this.getProfessionals('sexual'),
        this.getStatistics()
      ]);
    } catch (error) {
      console.error('Error preloading data:', error);
    }
  }
}