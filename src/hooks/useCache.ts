import { useState, useEffect, useRef } from 'react';
import { ensureFirestoreReady } from '../utils/firebase';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  set<T>(key: string, data: T, ttl = 5 * 60 * 1000): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const globalCache = new MemoryCache(200);

export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const { ttl = 5 * 60 * 1000, maxSize = 100 } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const fetchAttemptRef = useRef(0);
  const maxRetries = 3;

  const fetchData = async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh && globalCache.has(key)) {
      const cachedData = globalCache.get<T>(key);
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        return cachedData;
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      // CRITICAL: Ensure Firestore is ready before fetching data
      await ensureFirestoreReady();
      
      const result = await fetcher();
      
      if (!isMountedRef.current) return null;
      
      // Cache the result
      globalCache.set(key, result, ttl);
      setData(result);
      setLoading(false);
      fetchAttemptRef.current = 0; // Reset attempt counter on success
      
      return result;
    } catch (err) {
      if (!isMountedRef.current) return null;
      
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
        setLoading(false);
        
        // Retry logic for Firestore errors
        if (fetchAttemptRef.current < maxRetries && 
            (err.message.includes('Firestore') || 
             err.message.includes('Target ID') || 
             err.message.includes('internal assertion'))) {
          
          fetchAttemptRef.current++;
          console.log(`🔄 Retrying fetch (attempt ${fetchAttemptRef.current}/${maxRetries})...`);
          
          // Exponential backoff
          const delay = Math.pow(2, fetchAttemptRef.current) * 1000;
          setTimeout(() => {
            if (isMountedRef.current) {
              fetchData(true);
            }
          }, delay);
        }
      }
      throw err;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchAttemptRef.current = 0;
    
    fetchData();

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [key]);

  const refresh = () => fetchData(true);
  const clearCache = () => globalCache.delete(key);

  return {
    data,
    loading,
    error,
    refresh,
    clearCache,
    isStale: !globalCache.has(key)
  };
}

export { globalCache };