import { useEffect, useState } from 'react';
import { useCache } from './useCache';
import { OptimizedFirebaseService } from '../services/optimizedFirebaseService';

interface Professional {
  id: string;
  name: string;
  specialty: string;
  profileImage: string;
  description: string;
  rating: number;
  reviews: number;
  languages: string[];
  price: number | null;
  currency: string;
  isAvailableNow: boolean;
  availability: {
    day: string;
    slots: string[];
  }[];
  education: string[];
  experience: string;
  type: 'mental' | 'sexual';
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

export const useOptimizedProfessionals = (filterType?: 'mental' | 'sexual') => {
  const cacheKey = `professionals_${filterType || 'all'}`;
  
  const { data, loading, error, refresh } = useCache(
    cacheKey,
    () => OptimizedFirebaseService.getProfessionals(filterType),
    { ttl: 5 * 60 * 1000 } // 5 minutes cache
  );

  return {
    professionals: data || [],
    loading,
    error,
    refresh
  };
};