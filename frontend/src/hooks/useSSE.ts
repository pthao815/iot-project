import { useEffect, useRef, useState } from 'react';
import type { SensorData } from '../types';

export function useSSE() {
  const [latest, setLatest] = useState<SensorData[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource('/api/events');
    esRef.current = es;

    es.onopen    = () => setConnected(true);
    es.onerror   = () => setConnected(false);
    es.onmessage = (e) => {
      try {
        const data: SensorData[] = JSON.parse(e.data as string);
        setLatest(data);
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      es.close();
    };
  }, []);

  return { latest, connected };
}
