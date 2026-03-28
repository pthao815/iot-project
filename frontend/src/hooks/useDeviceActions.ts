import { useQuery } from '@tanstack/react-query';
import { fetchDeviceActions } from '../lib/api';

export function useDeviceActions(params: {
  page: number;
  limit: number;
  device_id?: number;
  action?: string;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['device-actions', params],
    queryFn:  () => fetchDeviceActions(params),
    placeholderData: (prev) => prev,
  });
}
