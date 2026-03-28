import { useState }     from 'react';
import { Loader2 }      from 'lucide-react';
import { useQuery }     from '@tanstack/react-query';
import { DataTable, type Column } from '../components/DataTable';
import { useDeviceActions }       from '../hooks/useDeviceActions';
import { fetchDevices }           from '../lib/api';
import { formatDateTime }         from '../lib/utils';

export function DeviceHistoryPage() {
  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState('');
  const [deviceId, setDeviceId] = useState<number | undefined>();
  const [action,   setAction]   = useState('');

  const { data, isLoading } = useDeviceActions({
    page, limit: 10,
    device_id: deviceId,
    action:    action || undefined,
    search,
  });

  const { data: devices = [] } = useQuery({
    queryKey: ['devices'],
    queryFn:  fetchDevices,
  });

  const columns: Column[] = [
    { key: 'action_id',  label: 'ID' },
    { key: 'device_name', label: 'Tên thiết bị' },
    {
      key: 'action',
      label: 'Hành động',
      render: (v) => (
        <span
          className={`px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest ${
            v === 'ON'
              ? 'bg-emerald-50 text-emerald-500'
              : 'bg-slate-50 text-slate-400'
          }`}
        >
          {v === 'ON' ? 'Bật' : 'Tắt'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (v) => {
        const isPending = String(v).toUpperCase() === 'PENDING';
        const isOn      = String(v).toUpperCase() === 'ON';
        return (
          <div className="flex items-center gap-2">
            {isPending ? (
              <Loader2 size={12} className="text-amber-400 animate-spin" />
            ) : (
              <div
                className={`w-2 h-2 rounded-full ${isOn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}
              />
            )}
            <span className="text-xs font-bold">
              {isPending ? 'Đang chờ' : isOn ? 'Bật' : 'Tắt'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'action_time',
      label: 'Thời gian',
      render: (v) => formatDateTime(String(v)),
    },
  ];

  const filters = (
    <>
      <select
        value={deviceId ?? ''}
        onChange={e => { setDeviceId(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
        className="px-4 py-2 bg-white border border-pink-100 rounded-xl text-sm font-semibold text-slate-600 focus:ring-4 focus:ring-pink-100 outline-none cursor-pointer hover:bg-pink-50"
      >
        <option value="">Tất cả thiết bị</option>
        {devices.map(d => (
          <option key={d.device_id} value={d.device_id}>{d.device_name}</option>
        ))}
      </select>

      <select
        value={action}
        onChange={e => { setAction(e.target.value); setPage(1); }}
        className="px-4 py-2 bg-white border border-pink-100 rounded-xl text-sm font-semibold text-slate-600 focus:ring-4 focus:ring-pink-100 outline-none cursor-pointer hover:bg-pink-50"
      >
        <option value="">Tất cả hành động</option>
        <option value="ON">Bật</option>
        <option value="OFF">Tắt</option>
      </select>
    </>
  );

  return (
    <DataTable
      title="Lịch sử thiết bị"
      data={(data?.data ?? []) as unknown as Record<string, unknown>[]}
      columns={columns}
      total={data?.total ?? 0}
      page={page}
      totalPages={data?.totalPages ?? 1}
      onPageChange={setPage}
      onSearch={v => { setSearch(v); setPage(1); }}
      filters={filters}
      isLoading={isLoading}
    />
  );
}
