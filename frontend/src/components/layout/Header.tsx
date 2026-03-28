import { Menu } from 'lucide-react';
import { MickeyIcon } from '../MickeyIcon';

interface HeaderProps {
  title:       string;
  onMenuClick: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  return (
    <div className="mb-6 shrink-0 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-3 bg-white rounded-2xl text-pink-400 shadow-md"
        >
          <Menu size={24} />
        </button>

        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
            {title}
            <MickeyIcon size={24} className="text-pink-300" />
          </h2>
          <p className="text-pink-400 font-bold text-xs uppercase tracking-widest">
            Chào mừng trở lại, Phương Thảo!
          </p>
        </div>
      </div>

      {/* User badge */}
      <div className="flex items-center gap-4 bg-white/80 p-2 rounded-3xl border border-white shadow-sm pr-6">
        <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 font-bold text-lg border-2 border-white shadow-inner">
          A
        </div>
        <div className="hidden sm:block">
          <p className="text-[9px] text-pink-400 font-black uppercase tracking-widest">ADMIN</p>
          <p className="text-sm font-bold text-slate-800">Phương Thảo</p>
        </div>
      </div>
    </div>
  );
}
