import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

export function useAlertCount() {
  return useQuery({
    queryKey: ['alerts', 'count'],
    queryFn: () => api.get('/alerts/count').then(r => r.data.count),
    refetchInterval: 60 * 1000, // refresh every minute
  });
}
