import { useQuery } from '@tanstack/react-query';
import { getMe } from './api';
import { MeResponse } from '../../types/api';

export const useMe = () => {
  return useQuery<MeResponse, Error>({
    queryKey: ['meProfile'],
    queryFn: getMe,
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
  });
};
