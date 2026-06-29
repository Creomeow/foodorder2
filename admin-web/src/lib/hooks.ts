import { useQuery } from '@tanstack/react-query';
import type { Restaurant, Brand } from '@foodorder/shared';
import { api } from './api';

export function useRestaurants() {
  return useQuery<Restaurant[]>({
    queryKey: ['restaurants'],
    queryFn: async () => (await api.get('/restaurants')).data,
  });
}

export function useBrands(enabled = true) {
  return useQuery<(Brand & { _count?: { restaurants: number } })[]>({
    queryKey: ['brands'],
    enabled,
    queryFn: async () => (await api.get('/brands')).data,
  });
}
