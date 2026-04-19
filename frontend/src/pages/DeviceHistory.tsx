import { useState }     from 'react';
import { Loader2 }      from 'lucide-react';
import { useQuery }     from '@tanstack/react-query';
import { DataTable, type Column } from '../components/DataTable';
import { useDeviceActions }       from '../hooks/useDeviceActions';
import { fetchDevices }           from '../lib/api';
import { formatDateTime }         from '../lib/utils';

export function DeviceHistoryPage() {
  const [page,         setPage]         = useState(1);
  const [limit,        setLimit]        = useState(10);
  const [search,       setSearch]       = useState('');
  const [deviceId,     setDeviceId]     = useState<number | undefined>();
  const [action,       setAction]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey,      setSortKey]      = useState('action_time');
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('desc');

  function handleSort(key: string) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  }

  const { data, isLoading } = useDeviceActions({
    page, limit,
    device_id: deviceId,
    action:    action || undefined,
    status:    statusFilter || undefined,
    search,
    sort_key:  sortKey,
    sort_dir:  sortDir,
  });

  const { data: devices = [] } = useQuery({
    queryKey: ['devices'],
    queryFn:  fetchDevices,
  });

  const columns: Column[] = [
    { key: 'action_id',   label: 'ID',          sortable: true },
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
        const status = String(v).toUpperCase();
        if (status === 'PENDING') {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-400 font-bold text-xs">
              <Loader2 size={11} className="animate-spin" />
              Đang chờ
            </span>
          );
        }
        if (status === 'FAILED') {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-400 font-bold text-xs">
              Thất bại/Hoàn tác
            </span>
          );
        }
        if (status === 'SUCCESS') {
          return (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-slate-700">Thành công</span>
            </div>
          );
        }
        return <span className="text-xs text-slate-400">{String(v)}</span>;
      },
    },
    {
      key: 'action_time',
      label: 'Thời gian',
      sortable: true,
      render: (v) => formatDateTime(String(v)),
    },
  ];

  const selectClass = 'px-4 py-2 bg-white border border-pink-100 rounded-xl text-sm font-semibold text-slate-600 focus:ring-4 focus:ring-pink-100 outline-none cursor-pointer hover:bg-pink-50';

  const filters = (
    <>
      <select
        value={deviceId ?? ''}
        onChange={e => { setDeviceId(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
        className={selectClass}
      >
        <option value="">Tất cả thiết bị</option>
        {devices.map(d => (
          <option key={d.device_id} value={d.device_id}>{d.device_name}</option>
        ))}
      </select>

      <select
        value={action}
        onChange={e => { setAction(e.target.value); setPage(1); }}
        className={selectClass}
      >
        <option value="">Tất cả hành động</option>
        <option value="ON">Bật</option>
        <option value="OFF">Tắt</option>
      </select>

      <select
        value={statusFilter}
        onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        className={selectClass}
      >
        <option value="">Tất cả trạng thái</option>
        <option value="PENDING">Đang chờ</option>
        <option value="SUCCESS">Thành công</option>
        <option value="FAILED">Thất bại/Hoàn tác</option>
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
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={handleSort}
      pageSize={limit}
      onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
    />
  );
}
