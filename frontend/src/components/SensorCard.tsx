import { type LucideIcon } from 'lucide-react';
import { MickeyIcon } from './MickeyIcon';

type ColorTheme = 'red' | 'blue' | 'amber';

interface SensorCardProps {
  title:      string;
  value:      string;
  icon:       LucideIcon;
  colorTheme: ColorTheme;
  live?:      boolean;
}

const themes: Record<ColorTheme, { bg: string; text: string; iconBg: string; shadow: string }> = {
  red:   { bg: 'bg-red-100/80',    text: 'text-red-600',    iconBg: 'bg-white/60', shadow: 'shadow-red-200/50'    },
  blue:  { bg: 'bg-blue-100/80',   text: 'text-blue-600',   iconBg: 'bg-white/60', shadow: 'shadow-blue-200/50'   },
  amber: { bg: 'bg-yellow-100/80', text: 'text-yellow-600', iconBg: 'bg-white/60', shadow: 'shadow-yellow-200/50' },
};

export function SensorCard({ title, value, icon: Icon, colorTheme, live }: SensorCardProps) {
  const t = themes[colorTheme];
  return (
    <div className={`relative overflow-hidden rounded-3xl p-4 glass-panel-sensor ${t.bg} ${t.shadow} hover:shadow-xl transition-all duration-500 group`}>
      {live && (
        <span className="absolute top-3 right-3 flex items-center gap-1 text-[9px] font-bold text-emerald-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          LIVE
        </span>
      )}
      <MickeyIcon
        size={80}
        className="absolute -right-6 -bottom-6 text-white/20 group-hover:rotate-12 transition-transform pointer-events-none"
      />
      <div className="relative z-10 flex items-center gap-3">
        <div className={`p-2.5 rounded-full ${t.iconBg} ${t.text} shadow-sm shrink-0`}>
          <Icon size={18} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-slate-700 font-bold text-[10px] uppercase tracking-wider block mb-1">
            {title}
          </span>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h3>
        </div>
      </div>
    </div>
  );
}
