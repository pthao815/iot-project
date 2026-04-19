import { type LucideIcon, Loader2 } from 'lucide-react';
import { MickeyIcon } from './MickeyIcon';

type Color = 'cyan' | 'pink' | 'amber';

interface DeviceCardProps {
  name:         string;
  sub:          string;
  icon:         LucideIcon;
  isOn:         boolean;   // toggle color: original state during pending, db state otherwise
  onToggle:     () => void;
  color:        Color;
  isPending?:   boolean;   // blocks clicks + cursor-wait
  showSpinner?: boolean;   // replaces knob with spinner inside toggle
}

const toggleColors: Record<Color, string> = {
  cyan:  'bg-sky-400 shadow-sky-200',
  pink:  'bg-pink-400 shadow-pink-200',
  amber: 'bg-amber-400 shadow-amber-200',
};

const iconColors: Record<Color, string> = {
  cyan:  'text-sky-500 bg-sky-100',
  pink:  'text-pink-500 bg-pink-100',
  amber: 'text-amber-500 bg-amber-100',
};

export function DeviceCard({
  name, sub, icon: Icon, isOn, onToggle, color, isPending, showSpinner,
}: DeviceCardProps) {
  return (
    <div
      onClick={isPending ? undefined : onToggle}
      className={`relative rounded-[2.5rem] p-5 border transition-all duration-500 overflow-hidden group glass-panel border-white shadow-lg ${
        isPending ? 'cursor-wait opacity-80' : 'cursor-pointer hover:-translate-y-1'
      }`}
    >
      <div className="flex flex-col justify-between h-full gap-5">
        {/* Icon + toggle row */}
        <div className="flex justify-between items-center">
          <div
            className={`p-4 rounded-full transition-all duration-300 group-hover:scale-110 ${
              isOn ? iconColors[color] : 'bg-slate-100 text-slate-400'
            }`}
          >
            <Icon size={24} strokeWidth={2.5} />
          </div>

          {/* Toggle: color = original state, knob replaced by spinner while pending */}
          <div
            className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 relative ${
              isOn ? toggleColors[color] : 'bg-slate-200'
            }`}
          >
            {showSpinner ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={16} className="text-white animate-spin" />
              </div>
            ) : (
              <div
                className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                  isOn ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            )}
          </div>
        </div>

        {/* Label */}
        <div>
          <h4 className="text-lg font-bold text-slate-800">{name}</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{sub}</p>
        </div>
      </div>

      <MickeyIcon
        size={80}
        className="absolute -right-4 -bottom-4 text-pink-100/40 pointer-events-none"
      />
    </div>
  );
}
