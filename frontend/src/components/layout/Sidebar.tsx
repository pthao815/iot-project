import { LayoutDashboard, Database, History, User, type LucideIcon } from 'lucide-react';
import { MickeyIcon } from '../MickeyIcon';

export type Tab = 'dashboard' | 'datasensor' | 'history' | 'profile';

interface SidebarProps {
  activeTab:    Tab;
  setActiveTab: (tab: Tab) => void;
  isOpen:       boolean;
  setIsOpen:    (open: boolean) => void;
}

const menuItems: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard',  label: 'Dashboard',        icon: LayoutDashboard },
  { id: 'datasensor', label: 'Dữ liệu cảm biến', icon: Database        },
  { id: 'history',    label: 'Lịch sử thiết bị', icon: History         },
  { id: 'profile',    label: 'Cá nhân',           icon: User            },
];

export function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-pink-900/10 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar panel */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 glass-sidebar transform transition-transform duration-500 lg:transform-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } flex flex-col shadow-2xl shadow-pink-200/40`}
      >
        {/* Logo */}
        <div className="h-28 flex flex-col items-center justify-center px-6 shrink-0 relative overflow-hidden">
          <MickeyIcon size={80} className="absolute -top-4 -left-4 text-pink-100/50 rotate-12" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-12 h-12 rounded-full bg-pink-400 flex items-center justify-center text-white shadow-lg shadow-pink-300">
              <MickeyIcon size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-tight">IoT</h1>
              <p className="text-[10px] text-pink-400 font-bold uppercase tracking-tighter">
                Disney Home System
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-2 py-6 overflow-y-auto">
          {menuItems.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsOpen(false); }}
                className={`w-full flex items-center space-x-3 px-5 py-3.5 rounded-[1.5rem] transition-all duration-300 font-semibold relative overflow-hidden ${
                  active
                    ? 'bg-pink-400 text-white shadow-xl shadow-pink-200 scale-[1.02]'
                    : 'text-slate-500 hover:bg-pink-50 hover:text-pink-600'
                }`}
              >
                <Icon size={20} strokeWidth={2.5} />
                <span className="text-sm">{item.label}</span>
                {active && (
                  <MickeyIcon size={16} className="absolute right-3 opacity-30" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
