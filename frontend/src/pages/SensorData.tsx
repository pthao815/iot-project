import { useState } from 'react';
import { useQuery }  from '@tanstack/react-query';
import { DataTable, type Column } from '../components/DataTable';
import { useSensorDataList } from '../hooks/useSensorData';
import { fetchSensors }      from '../lib/api';
import { formatDateTime, formatValue } from '../lib/utils';

export function SensorDataPage() {
  const [page,     setPage]     = useState(1);
  const [limit,    setLimit]    = useState(10);
  const [search,   setSearch]   = useState('');
  const [sensorId, setSensorId] = useState<number | undefined>();
  const [sortKey,  setSortKey]  = useState('recorded_at');
  const [sortDir,  setSortDir]  = useState<'asc' | 'desc'>('desc');

  function handleSort(key: string) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  }

  const { data, isLoading } = useSensorDataList({
    page, limit, sensor_id: sensorId, search,
    sort_key: sortKey, sort_dir: sortDir,
  });

  const { data: sensors = [] } = useQuery({
    queryKey: ['sensors'],
    queryFn:  fetchSensors,
  });

  const columns: Column[] = [
    { key: 'data_id',     label: 'ID',          sortable: true },
    { key: 'sensor_name', label: 'Tên cảm biến' },
    {
      key: 'value',
      label: 'Giá trị',
      sortable: true,
      render: (_, row) => {
        const type = String(row['sensor_type'] ?? '').toLowerCase();
        const colorClass =
          type.includes('temp')  ? 'bg-red-50 text-red-500'       :
          type.includes('hum')   ? 'bg-blue-50 text-blue-500'     :
          type.includes('light') ? 'bg-yellow-50 text-yellow-600' :
          'bg-slate-50 text-slate-500';
        const val  = Number(row['value']);
        const unit = String(row['unit'] ?? '');
        return (
          <span className={`px-4 py-1.5 rounded-full font-bold text-xs ${colorClass}`}>
            {formatValue(val, unit)}
          </span>
        );
      },
    },
    {
      key: 'recorded_at',
      label: 'Thời gian',
      sortable: true,
      render: (v) => formatDateTime(String(v)),
    },
  ];

  const filters = (
    <select
      value={sensorId ?? ''}
      onChange={e => {
        setSensorId(e.target.value ? Number(e.target.value) : undefined);
        setPage(1);
      }}
      className="px-4 py-2 bg-white border border-pink-100 rounded-xl text-sm font-semibold text-slate-600 focus:ring-4 focus:ring-pink-100 outline-none cursor-pointer hover:bg-pink-50"
    >
      <option value="">Tất cả cảm biến</option>
      {sensors.map(s => (
        <option key={s.sensor_id} value={s.sensor_id}>{s.sensor_name}</option>
      ))}
    </select>
  );

  return (
    <DataTable
      title="Nhật ký cảm biến"
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
