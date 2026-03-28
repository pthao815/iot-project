import { useQuery } from '@tanstack/react-query';
import {
  fetchLatestSensorData,
  fetchSensorDataChart,
  fetchSensorData,
} from '../lib/api';

export function useLatestSensorData() {
  return useQuery({
    queryKey: ['sensor-data', 'latest'],
    queryFn:  fetchLatestSensorData,
    refetchInterval: 10_000,
  });
}

export function useSensorDataChart(sensorId?: number) {
  return useQuery({
    queryKey: ['sensor-data', 'chart', sensorId],
    queryFn:  () => fetchSensorDataChart({ sensor_id: sensorId, limit: 24 }),
    refetchInterval: 15_000,
  });
}

export function useSensorDataList(params: {
  page: number;
  limit: number;
  sensor_id?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: ['sensor-data', 'list', params],
    queryFn:  () => fetchSensorData(params),
    placeholderData: (prev) => prev,
  });
}
