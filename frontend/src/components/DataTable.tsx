import { useState, type ReactNode } from 'react';
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { MickeyIcon } from './MickeyIcon';

export interface Column {
  key:     string;
  label:   string;
  render?: (value: unknown, row: Record<string, unknown>) => ReactNode;
}

interface DataTableProps {
  title:        string;
  data:         Record<string, unknown>[];
  columns:      Column[];
  total:        number;
  page:         number;
  totalPages:   number;
  onPageChange: (page: number) => void;
  onSearch:     (search: string) => void;
  filters?:     ReactNode;
  isLoading?:   boolean;
}

export function DataTable({
  title, data, columns, total, page, totalPages,
  onPageChange, onSearch, filters, isLoading,
}: DataTableProps) {
  const [search, setSearch] = useState('');

  const handleSearch = (v: string) => {
    setSearch(v);
    onSearch(v);
  };

  return (
    <div className="glass-panel rounded-[3rem] shadow-xl border-white overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="p-8 border-b border-pink-50 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <MickeyIcon size={20} className="text-pink-400" />
              {title}
            </h3>
            <p className="text-xs text-slate-400 font-medium">Tổng: {total} bản ghi</p>
          </div>
          <div className="relative group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-300 group-focus-within:text-pink-500 transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={search}
              className="pl-11 pr-6 py-2.5 bg-pink-50/50 border-none rounded-2xl text-sm focus:ring-4 focus:ring-pink-100 outline-none w-full md:w-64"
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
        </div>

        {filters && (
          <div className="flex flex-wrap items-center gap-2">
            <Filter size={16} className="text-pink-400" />
            <span className="text-xs font-bold text-slate-600">Lọc theo:</span>
            {filters}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-400 rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10">
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    className="p-5 text-[10px] font-black text-pink-300 uppercase tracking-widest"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50">
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-pink-50/30 transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className="p-5 text-sm text-slate-600 font-semibold">
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="p-10 text-center text-slate-400 text-sm"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer / Pagination */}
      <div className="p-6 bg-pink-50/20 border-t border-pink-50 flex justify-between items-center shrink-0">
        <span className="text-[10px] font-bold text-pink-400 uppercase">
          Trang {page} / {totalPages || 1}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-2 rounded-xl bg-white shadow-sm hover:bg-pink-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-2 rounded-xl bg-white shadow-sm hover:bg-pink-100 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
