import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDevices, postDeviceAction } from '../lib/api';

export function useDevices() {
  return useQuery({
    queryKey: ['devices'],
    queryFn:  fetchDevices,
    refetchInterval: 10_000,
  });
}

export function useDeviceAction() {
  return useMutation({
    mutationFn: ({ deviceId, action }: { deviceId: number; action: 'ON' | 'OFF' }) =>
      postDeviceAction(deviceId, action),
  });
}
