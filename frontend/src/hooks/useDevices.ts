// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { fetchDevices, postDeviceAction } from '../lib/api';

// export function useDevices() {
//   return useQuery({
//     queryKey: ['devices'],
//     queryFn:  fetchDevices,
//     refetchInterval: 10_000,
//   });
// }

// export function useDeviceAction() {
//   return useMutation({
//     mutationFn: ({ deviceId, action }: { deviceId: number; action: 'ON' | 'OFF' }) =>
//       postDeviceAction(deviceId, action),
//   });
// }


import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchDevices, postDeviceAction } from '../lib/api';

export function useDevices() {
  return useQuery({
    queryKey: ['devices'],
    queryFn: fetchDevices,

    // TẮT polling để tránh overwrite UI
    refetchInterval: false,

    // optional
    staleTime: 5000,
  });
}

export function useDeviceAction() {
  return useMutation({
    mutationFn: ({ deviceId, action }: { deviceId: number; action: 'ON' | 'OFF' }) =>
      postDeviceAction(deviceId, action),
  });
}