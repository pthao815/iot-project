export interface Sensor {
  sensor_id:   number;
  sensor_name: string;
  sensor_type: string;
  unit:        string;
}

export interface SensorData {
  data_id:     number;
  sensor_id:   number;
  value:       number;
  recorded_at: string;
  sensor_name: string;
  sensor_type: string;
  unit:        string;
}

export interface Device {
  device_id:         number;
  device_name:       string;
  current_status:    'ON' | 'OFF';
  created_at:        string;
  pending_action_id: number | null;
}

export interface DeviceAction {
  action_id:   number;
  device_id:   number;
  action:      'ON' | 'OFF';
  status:      'PENDING' | 'SUCCESS' | 'FAILED';
  action_time: string;
  device_name: string;
}

export interface PaginatedResponse<T> {
  data:       T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}
