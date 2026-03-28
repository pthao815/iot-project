import { FileText, Github, Code, Figma } from 'lucide-react';
import { MickeyIcon } from '../components/MickeyIcon';

const INFO_ITEMS = [
  { label: 'Mã sinh viên', value: 'B21DCCN001' },
  { label: 'Ngày sinh',    value: '01/01/2003'  },
  { label: 'Quê quán',     value: 'Hà Nội'      },
  { label: 'Sở thích',     value: 'IoT & Web'   },
];

const SOCIAL_ITEMS = [
  { icon: FileText, label: 'Báo cáo' },
  { icon: Github,   label: 'Code'    },
  { icon: Code,     label: 'API Doc' },
  { icon: Figma,    label: 'Figma'   },
];

export function Profile() {
  return (
    <div className="max-w-4xl mx-auto py-6 h-full flex items-center">
      <div className="glass-panel rounded-[4rem] p-12 shadow-2xl shadow-pink-200 border-white relative overflow-hidden w-full">
        <MickeyIcon
          size={400}
          className="absolute -top-20 -right-20 text-pink-400 opacity-[0.05] rotate-12 pointer-events-none"
        />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
          {/* Avatar */}
          <div className="relative group shrink-0">
            <div className="w-48 h-48 rounded-full p-2 bg-gradient-to-tr from-pink-400 to-rose-400 shadow-2xl group-hover:rotate-12 transition-transform duration-500">
              <div className="w-full h-full rounded-full overflow-hidden bg-white border-4 border-white">
                <img
                  src="https://api.dicebear.com/7.x/notionists/svg?seed=Mickey&backgroundColor=fce7f3"
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-white p-3 rounded-full shadow-lg border border-pink-100">
              <MickeyIcon size={24} className="text-pink-400" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-5xl font-bold text-slate-800 tracking-tighter mb-2">
              Phương Thảo
            </h2>
            <p className="text-pink-500 font-bold text-lg mb-8 tracking-widest uppercase">
              Sinh viên IoT
            </p>

            <div className="grid grid-cols-2 gap-4 mb-10">
              {INFO_ITEMS.map(item => (
                <div key={item.label} className="bg-white/50 p-4 rounded-3xl border border-pink-50">
                  <p className="text-[10px] text-pink-300 font-black uppercase mb-1 tracking-widest">
                    {item.label}
                  </p>
                  <p className="text-slate-700 font-bold text-sm">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              {SOCIAL_ITEMS.map(btn => {
                const BtnIcon = btn.icon;
                return (
                  <button
                    key={btn.label}
                    className="flex items-center gap-2 px-6 py-3 bg-white rounded-full text-slate-600 font-bold text-sm shadow-md hover:scale-105 transition-all active:scale-95 border border-pink-50"
                  >
                    <BtnIcon size={16} />
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
