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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deviceId, action }: { deviceId: number; action: 'ON' | 'OFF' }) =>
      postDeviceAction(deviceId, action),
    onSuccess: () => {
      // Refresh both devices list and history after every toggle
      qc.invalidateQueries({ queryKey: ['devices'] });
      qc.invalidateQueries({ queryKey: ['device-actions'] });
    },
  });
}
