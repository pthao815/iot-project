import axios from 'axios';
import type {
  Sensor,
  SensorData,
  Device,
  DeviceAction,
  PaginatedResponse,
} from '../types';

// Vite dev proxy forwards /api → http://localhost:3001
const api = axios.create({ baseURL: '/api', timeout: 10_000 });

/* ── Sensors ── */
export const fetchSensors = () =>
  api.get<Sensor[]>('/sensors').then(r => r.data);

/* ── Sensor data ── */
export const fetchLatestSensorData = () =>
  api.get<SensorData[]>('/sensor-data/latest').then(r => r.data);

export const fetchSensorDataChart = (params?: {
  sensor_id?: number;
  limit?: number;
}) => api.get<SensorData[]>('/sensor-data/chart', { params }).then(r => r.data);

export const fetchSensorData = (params?: {
  page?: number;
  limit?: number;
  sensor_id?: number;
  search?: string;
}) =>
  api
    .get<PaginatedResponse<SensorData>>('/sensor-data', { params })
    .then(r => r.data);

/* ── Devices ── */
export const fetchDevices = () =>
  api.get<Device[]>('/devices').then(r => r.data);

export const postDeviceAction = (deviceId: number, action: 'ON' | 'OFF') =>
  api.post(`/devices/${deviceId}/action`, { action }).then(r => r.data);

/* ── Device actions (history) ── */
export const fetchDeviceActions = (params?: {
  page?: number;
  limit?: number;
  device_id?: number;
  action?: string;
  status?: string;
  search?: string;
}) =>
  api
    .get<PaginatedResponse<DeviceAction>>('/device-actions', { params })
    .then(r => r.data);
