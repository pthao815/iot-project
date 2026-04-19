import { useEffect, useRef, useState } from 'react';
import type { SensorData } from '../types';

export type WSMessage =
  | { type: 'device_confirmed'; device_id: number }
  | { type: 'sensor_data'; data: SensorData[] };

export function useDeviceWS(onMessage: (msg: WSMessage) => void) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let reconnectDelay = 1000;
    let stopped = false;

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

      ws.onopen = () => {
        setConnected(true);
        reconnectDelay = 1000;
      };

      ws.onclose = () => {
        setConnected(false);
        if (!stopped) {
          reconnectTimer = setTimeout(connect, reconnectDelay);
          reconnectDelay = Math.min(reconnectDelay * 2, 30000);
        }
      };

      ws.onerror = () => {
        setConnected(false);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string) as WSMessage;
          onMessageRef.current(msg);
        } catch {
          // ignore malformed frames
        }
      };
    }

    connect();

    return () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  return { connected };
}
