import { useState, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Thermometer, Droplets, Sun, Wind, Snowflake, Lightbulb } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { SensorCard }   from '../components/SensorCard';
import { DeviceCard }   from '../components/DeviceCard';
import { MickeyIcon }   from '../components/MickeyIcon';
import { useSensorDataChart }  from '../hooks/useSensorData';
import { useDevices, useDeviceAction } from '../hooks/useDevices';
import { useDeviceWS } from '../hooks/useDeviceWS';
import { patchDeviceAction } from '../lib/api';
import { formatValue }         from '../lib/utils';
import type { SensorData, DeviceAction, PaginatedResponse } from '../types';

// Pick the latest reading matching a sensor_type keyword
function pick(readings: SensorData[], keyword: string) {
  const r = readings.find(d => d.sensor_type?.toLowerCase().includes(keyword));
  return r ? formatValue(r.value, r.unit) : '—';
}

// Format datetime to HH:mm for compact chart ticks
function fmtChartTime(dt: string): string {
  const d = new Date(dt);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Device display meta
const DEVICE_META = [
  { icon: Wind,      color: 'cyan'  as const, sub: 'Tốc độ 3'        },
  { icon: Snowflake, color: 'pink'  as const, sub: '24°C - Cool'      },
  { icon: Lightbulb, color: 'amber' as const, sub: 'Chế độ đọc sách' },
];

type PendingEntry = {
  originalIsOn: boolean; // state BEFORE the toggle click
};

const REVERT_TIMEOUT_MS = 5000; // revert if ESP32 sends no confirmation within 5s

export function Dashboard() {
  const qc = useQueryClient();
  const [latest, setLatest]     = useState<SensorData[]>([]);
  const { data: devices = [] }  = useDevices();
  const { data: chartRaw = [] } = useSensorDataChart();
  const { mutate: doAction }    = useDeviceAction();

  const [pendingMap,      setPendingMap]      = useState<Map<number, PendingEntry>>(new Map());
  // displayOverrides: local state override for display after revert — immune to RQ refetchInterval
  const [displayOverrides, setDisplayOverrides] = useState<Map<number, boolean>>(new Map());

  const timerRefs  = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const mountedRef = useRef(true);
  const cleanedRef = useRef(false); // stale-PENDING cleanup runs once per mount

  useEffect(() => {
    mountedRef.current = true; // re-assert — fixes React StrictMode double-invoke
    return () => {
      mountedRef.current = false;
      timerRefs.current.forEach(r => clearTimeout(r));
    };
  }, []);

  // On mount: patch any stale PENDING actions left from previous sessions
  useEffect(() => {
    if (cleanedRef.current || devices.length === 0) return;
    cleanedRef.current = true;
    let cleaned = false;
    devices.forEach(device => {
      if (device.pending_action_id != null) {
        cleaned = true;
        patchDeviceAction(device.pending_action_id, 'failed').catch(() => {});
      }
    });
    if (cleaned) {
      qc.invalidateQueries({ queryKey: ['devices'] });
      qc.invalidateQueries({ queryKey: ['device-actions'] });
    }
  }, [devices, qc]);

  const clearPending = useCallback((deviceId: number) => {
    const timer = timerRefs.current.get(deviceId);
    if (timer != null) { clearTimeout(timer); timerRefs.current.delete(deviceId); }
    setPendingMap(prev => { const n = new Map(prev); n.delete(deviceId); return n; });
  }, []);

  const { connected } = useDeviceWS(useCallback((msg) => {
    if (msg.type === 'sensor_data') { setLatest(msg.data); return; }
    if (msg.type !== 'device_confirmed') return;
    const { device_id } = msg;
    clearPending(device_id);
    setDisplayOverrides(prev => { const n = new Map(prev); n.delete(device_id); return n; });
    qc.invalidateQueries({ queryKey: ['devices'] });
    qc.invalidateQueries({ queryKey: ['device-actions'] });
  }, [clearPending, qc]));

  const handleToggle = useCallback((deviceId: number, currentStatus: 'ON' | 'OFF') => {
    const nextAction: 'ON' | 'OFF' = currentStatus === 'ON' ? 'OFF' : 'ON';

    clearPending(deviceId);
    setDisplayOverrides(prev => { const n = new Map(prev); n.delete(deviceId); return n; });
    setPendingMap(prev => new Map(prev).set(deviceId, { originalIsOn: currentStatus === 'ON' }));

    let actionId: number | null = null;

    // Timer starts from click — always reverts after 5s regardless of network state
    const r = setTimeout(() => {
      if (!mountedRef.current) return;
      // Stop spinner, force display to original state immediately
      clearPending(deviceId);
      setDisplayOverrides(prev => new Map(prev).set(deviceId, currentStatus === 'ON'));

      if (actionId != null) {
        // Immediately reflect FAILED in history table — no waiting for PATCH response
        qc.setQueriesData<PaginatedResponse<DeviceAction>>(
          { queryKey: ['device-actions'] },
          (old) => {
            if (!old?.data) return old;
            return {
              ...old,
              data: old.data.map(a =>
                a.action_id === actionId ? { ...a, status: 'FAILED' as const } : a
              ),
            };
          }
        );

        // Patch DB in background to persist the revert
        patchDeviceAction(actionId, 'failed')
          .then(async () => {
            if (!mountedRef.current) return;
            // Wait for cache to reflect the reverted DB state BEFORE removing the
            // override — prevents a re-render with stale 'ON' cache between the two calls
            await qc.invalidateQueries({ queryKey: ['devices'] });
            if (!mountedRef.current) return;
            setDisplayOverrides(prev => { const n = new Map(prev); n.delete(deviceId); return n; });
            qc.invalidateQueries({ queryKey: ['device-actions'] });
          })
          .catch(() => {
            // No internet: keep override (button stays at original), sync when possible
            if (!mountedRef.current) return;
            qc.invalidateQueries({ queryKey: ['devices'] });
            qc.invalidateQueries({ queryKey: ['device-actions'] });
          });
      } else {
        // POST never succeeded: DB unchanged, remove override and refresh
        setDisplayOverrides(prev => { const n = new Map(prev); n.delete(deviceId); return n; });
        qc.invalidateQueries({ queryKey: ['devices'] });
        qc.invalidateQueries({ queryKey: ['device-actions'] });
      }
    }, REVERT_TIMEOUT_MS);
    timerRefs.current.set(deviceId, r);

    doAction(
      { deviceId, action: nextAction },
      {
        onSuccess: (data) => {
          const res = data as { action_id: number; mqtt_published: boolean };

          if (!res.mqtt_published) {
            // MQTT broker offline — backend already reverted DB and marked action FAILED.
            // Cancel the 5s timer and clear spinner immediately.
            qc.setQueriesData<PaginatedResponse<DeviceAction>>(
              { queryKey: ['device-actions'] },
              (old) => {
                if (!old?.data) return old;
                return {
                  ...old,
                  data: old.data.map(a =>
                    a.action_id === res.action_id ? { ...a, status: 'FAILED' as const } : a
                  ),
                };
              }
            );
            clearPending(deviceId);
            setDisplayOverrides(prev => new Map(prev).set(deviceId, currentStatus === 'ON'));
            qc.invalidateQueries({ queryKey: ['devices'] }).then(() => {
              if (!mountedRef.current) return;
              setDisplayOverrides(prev => { const n = new Map(prev); n.delete(deviceId); return n; });
            });
            qc.invalidateQueries({ queryKey: ['device-actions'] });
            return;
          }

          actionId = res.action_id;
        },
        onError: () => {
          // Network error — POST never reached server (or timed out), DB is unchanged.
          // Cancel the 5s timer and revert spinner immediately instead of waiting.
          clearPending(deviceId);
          setDisplayOverrides(prev => new Map(prev).set(deviceId, currentStatus === 'ON'));
          qc.invalidateQueries({ queryKey: ['devices'] }).then(() => {
            if (!mountedRef.current) return;
            setDisplayOverrides(prev => { const n = new Map(prev); n.delete(deviceId); return n; });
          });
          qc.invalidateQueries({ queryKey: ['device-actions'] });
        },
      }
    );
  }, [doAction, clearPending, qc]);

  // Format chart rows
  const chartData = chartRaw.map(d => ({
    time:  fmtChartTime(d.recorded_at),
    value: d.value,
    type:  d.sensor_type,
  }));

  const tempRaw   = chartData.filter(d => d.type?.toLowerCase().includes('temp'));
  const humRaw    = chartData.filter(d => d.type?.toLowerCase().includes('hum'));
  const lightData = chartData.filter(d => d.type?.toLowerCase().includes('light'));

  const tempHumData = tempRaw.map((t, i) => ({
    time: t.time,
    temp: t.value,
    hum:  humRaw[i]?.value ?? null,
  }));

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-6">
      {/* Sensor summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <SensorCard title="Nhiệt độ" value={pick(latest, 'temp')}  icon={Thermometer} colorTheme="red"   live={connected} />
        <SensorCard title="Độ ẩm"    value={pick(latest, 'hum')}   icon={Droplets}    colorTheme="blue"  live={connected} />
        <SensorCard title="Ánh sáng" value={pick(latest, 'light')} icon={Sun}         colorTheme="amber" live={connected} />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Charts */}
        <div className="flex-1 flex flex-col gap-5 min-h-0">
          <TempHumChartPanel data={tempHumData} />
          <ChartPanel title="Ánh sáng" data={lightData} color="#eab308" gradientId="cLight" />
        </div>

        {/* Device toggle cards */}
        <div className="flex flex-col gap-6 w-full lg:w-80 shrink-0">
          {devices.map((device, idx) => {
            const meta    = DEVICE_META[idx % DEVICE_META.length];
            const entry   = pendingMap.get(device.device_id);
            const override = displayOverrides.get(device.device_id);

            // Priority: pending entry → local override → DB cache
            const displayIsOn = entry != null
              ? entry.originalIsOn
              : override !== undefined
                ? override
                : device.current_status === 'ON';

            const isPending   = entry != null;
            const showSpinner = isPending;

            return (
              <DeviceCard
                key={device.device_id}
                name={device.device_name}
                sub={meta.sub}
                icon={meta.icon}
                isOn={displayIsOn}
                color={meta.color}
                isPending={isPending}
                showSpinner={showSpinner}
                onToggle={() => handleToggle(device.device_id, device.current_status as 'ON' | 'OFF')}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Temperature + Humidity combined chart — single shared Y-axis ── */
function TempHumChartPanel({ data }: { data: { time: string; temp: number; hum: number | null }[] }) {
  return (
    <div className="glass-panel rounded-[2.5rem] p-6 shadow-xl flex-1 min-h-[180px] flex flex-col relative overflow-hidden border-white">
      <MickeyIcon size={140} className="absolute -top-8 -right-8 text-pink-400 opacity-[0.04] pointer-events-none" />
      <div className="flex items-center justify-between mb-4 shrink-0 relative z-10">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Nhiệt độ &amp; Độ ẩm</h3>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Thống kê gần nhất</p>
        </div>
        <div className="flex items-center gap-3 bg-pink-50/50 px-3 py-1.5 rounded-2xl">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-[9px] font-bold text-slate-600">Nhiệt độ (°C)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-[9px] font-bold text-slate-600">Độ ẩm (%)</span>
          </span>
        </div>
      </div>
      <div className="flex-1 w-full min-h-0 relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="gHum" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#f472b6', fontSize: 9, fontWeight: 700 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#f472b6', fontSize: 9, fontWeight: 700 }} width={40} />
            <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#fbcfe8" opacity={0.5} />
            <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 30px rgba(244,114,182,0.2)', padding: '10px', fontSize: '12px' }} />
            <Area type="monotone" dataKey="temp" name="Nhiệt độ (°C)" stroke="#ef4444" strokeWidth={3} fill="url(#gTemp)" dot={false} />
            <Area type="monotone" dataKey="hum"  name="Độ ẩm (%)"     stroke="#3b82f6" strokeWidth={3} fill="url(#gHum)"  dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Generic single-series chart panel ── */
interface ChartPanelProps {
  title: string;
  data:  { time: string; value: number }[];
  color: string;
  gradientId: string;
}

function ChartPanel({ title, data, color, gradientId }: ChartPanelProps) {
  return (
    <div className="glass-panel rounded-[2.5rem] p-6 shadow-xl flex-1 min-h-[180px] flex flex-col relative overflow-hidden border-white">
      <MickeyIcon size={140} className="absolute -top-8 -right-8 text-pink-400 opacity-[0.04] pointer-events-none" />
      <div className="flex items-center justify-between mb-4 shrink-0 relative z-10">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Thống kê gần nhất</p>
        </div>
        <div className="flex items-center gap-2 bg-pink-50/50 px-3 py-1.5 rounded-2xl">
          <span className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-[9px] font-bold text-slate-600">{title}</span>
        </div>
      </div>
      <div className="flex-1 w-full min-h-0 relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0}   />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#f472b6', fontSize: 9, fontWeight: 700 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#f472b6', fontSize: 9, fontWeight: 700 }} width={40} />
            <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#fbcfe8" opacity={0.5} />
            <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 30px rgba(244,114,182,0.2)', padding: '10px', fontSize: '12px' }} />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={3} fill={`url(#${gradientId})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
