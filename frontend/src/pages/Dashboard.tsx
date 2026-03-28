import { Thermometer, Droplets, Sun, Wind, Snowflake, Lightbulb } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { SensorCard }   from '../components/SensorCard';
import { DeviceCard }   from '../components/DeviceCard';
import { MickeyIcon }   from '../components/MickeyIcon';
import { useSSE }            from '../hooks/useSSE';
import { useSensorDataChart } from '../hooks/useSensorData';
import { useDevices, useDeviceAction } from '../hooks/useDevices';
import { formatValue, formatDateTime } from '../lib/utils';
import type { SensorData } from '../types';

// Pick the latest reading matching a sensor_type keyword
function pick(readings: SensorData[], keyword: string) {
  const r = readings.find(d => d.sensor_type?.toLowerCase().includes(keyword));
  return r ? formatValue(r.value, r.unit) : '—';
}

// Device display meta (index-based fallback for arbitrary number of devices)
const DEVICE_META = [
  { icon: Wind,      color: 'cyan'  as const, sub: 'Tốc độ 3'        },
  { icon: Snowflake, color: 'pink'  as const, sub: '24°C - Cool'      },
  { icon: Lightbulb, color: 'amber' as const, sub: 'Chế độ đọc sách' },
];

export function Dashboard() {
  const { latest, connected }   = useSSE();
  const { data: devices = [] }  = useDevices();
  const { data: chartRaw = [] } = useSensorDataChart();
  const { mutate: doAction, isPending, variables } = useDeviceAction();

  // Format chart rows for Recharts
  const chartData = chartRaw.map(d => ({
    time:  formatDateTime(d.recorded_at).split(' ')[1] ?? '',
    value: d.value,
    type:  d.sensor_type,
  }));

  const tempData  = chartData.filter(d => d.type?.toLowerCase().includes('temp'));
  const lightData = chartData.filter(d => d.type?.toLowerCase().includes('light'));

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
          <ChartPanel
            title="Nhiệt độ"
            data={tempData}
            color="#ef4444"
            gradientId="cTemp"
          />
          <ChartPanel
            title="Ánh sáng"
            data={lightData}
            color="#eab308"
            gradientId="cLight"
          />
        </div>

        {/* Device toggle cards */}
        <div className="flex flex-col gap-6 w-full lg:w-80 shrink-0">
          {devices.map((device, idx) => {
            const meta      = DEVICE_META[idx % DEVICE_META.length];
            const pending   = isPending && variables?.deviceId === device.device_id;
            const nextAction: 'ON' | 'OFF' = device.current_status === 'ON' ? 'OFF' : 'ON';
            return (
              <DeviceCard
                key={device.device_id}
                name={device.device_name}
                sub={meta.sub}
                icon={meta.icon}
                isOn={device.current_status === 'ON'}
                color={meta.color}
                isPending={pending}
                onToggle={() => doAction({ deviceId: device.device_id, action: nextAction })}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Inline chart panel ── */
interface ChartPanelProps {
  title:      string;
  data:       { time: string; value: number }[];
  color:      string;
  gradientId: string;
}

function ChartPanel({ title, data, color, gradientId }: ChartPanelProps) {
  return (
    <div className="glass-panel rounded-[2.5rem] p-6 shadow-xl flex-1 min-h-[180px] flex flex-col relative overflow-hidden border-white">
      <MickeyIcon
        size={140}
        className="absolute -top-8 -right-8 text-pink-400 opacity-[0.04] pointer-events-none"
      />
      <div className="flex items-center justify-between mb-4 shrink-0 relative z-10">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
            Thống kê gần nhất
          </p>
        </div>
        <div className="flex items-center gap-2 bg-pink-50/50 px-3 py-1.5 rounded-2xl">
          <span className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-[9px] font-bold text-slate-600">{title}</span>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0 relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0}   />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              axisLine={false} tickLine={false}
              tick={{ fill: '#f472b6', fontSize: 9, fontWeight: 700 }}
              dy={8}
            />
            <YAxis
              axisLine={false} tickLine={false}
              tick={{ fill: '#f472b6', fontSize: 9, fontWeight: 700 }}
              width={35}
            />
            <CartesianGrid
              strokeDasharray="5 5" vertical={false}
              stroke="#fbcfe8" opacity={0.5}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '15px', border: 'none',
                boxShadow: '0 10px 30px rgba(244,114,182,0.2)',
                padding: '10px', fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={3}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
