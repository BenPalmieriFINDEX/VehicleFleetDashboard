import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { formatDate, daysUntil } from '../utils/format';
import Badge from '../components/Badge';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';
import toast from 'react-hot-toast';

function ContractStatus({ expiryDate }) {
  const days = daysUntil(expiryDate);
  if (days === null) return <Badge color="gray">—</Badge>;
  if (days < 0) return <Badge color="red">Expired</Badge>;
  if (days <= 30) return <Badge color="red">{days}d — URGENT</Badge>;
  if (days <= 90) return <Badge color="orange">{days}d</Badge>;
  return <Badge color="green">{days}d</Badge>;
}

export default function Contracts() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ state: '', country: '', status: '' });

  const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v))).toString();

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['contracts', params],
    queryFn: () => api.get(`/contracts?${params}`).then(r => r.data),
  });

  const handleExportPDF = async () => {
    try {
      toast.loading('Generating PDF...', { id: 'pdf' });
      const res = await api.post('/export/pdf/contracts', {}, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `findex-contracts-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded', { id: 'pdf' });
    } catch { toast.error('Export failed', { id: 'pdf' }); }
  };

  const counts = vehicles ? {
    expired: vehicles.filter(v => daysUntil(v.contractExpiryDate) !== null && daysUntil(v.contractExpiryDate) < 0).length,
    urgent: vehicles.filter(v => { const d = daysUntil(v.contractExpiryDate); return d !== null && d >= 0 && d <= 30; }).length,
    warning: vehicles.filter(v => { const d = daysUntil(v.contractExpiryDate); return d !== null && d > 30 && d <= 90; }).length,
    ok: vehicles.filter(v => { const d = daysUntil(v.contractExpiryDate); return d !== null && d > 90; }).length,
  } : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contracts & Renewals"
        subtitle="All vehicles sorted by contract expiry date"
        actions={<button onClick={handleExportPDF} className="btn-secondary text-sm">Export PDF</button>}
      />

      {/* Traffic light summary */}
      {counts && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Expired', count: counts.expired, color: 'text-red-400', bg: 'bg-red-900/20 border-red-700/30' },
            { label: '≤30 Days', count: counts.urgent, color: 'text-red-400', bg: 'bg-red-900/10 border-red-700/20' },
            { label: '31–90 Days', count: counts.warning, color: 'text-orange-400', bg: 'bg-orange-900/10 border-orange-700/20' },
            { label: '>90 Days', count: counts.ok, color: 'text-emerald-400', bg: 'bg-emerald-900/10 border-emerald-700/20' },
          ].map(({ label, count, color, bg }) => (
            <div key={label} className={`card border ${bg} text-center`}>
              <div className={`text-2xl font-bold ${color}`}>{count}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card flex flex-wrap gap-2">
        <select className="input w-auto text-sm" value={filters.state} onChange={e => setFilters(f => ({ ...f, state: e.target.value }))}>
          <option value="">All States</option>
          {['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA', 'Auckland', 'Wellington'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="input w-auto text-sm" value={filters.country} onChange={e => setFilters(f => ({ ...f, country: e.target.value }))}>
          <option value="">AU + NZ</option>
          <option value="AU">Australia</option>
          <option value="NZ">New Zealand</option>
        </select>
        <select className="input w-auto text-sm" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Statuses</option>
          <option>Active</option>
          <option>Expired</option>
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-findex-midnight-border bg-findex-midnight-lighter">
                <th className="px-4 py-3 font-semibold uppercase">Rego</th>
                <th className="px-4 py-3 font-semibold uppercase">Vehicle</th>
                <th className="px-4 py-3 font-semibold uppercase">Driver</th>
                <th className="px-4 py-3 font-semibold uppercase">State</th>
                <th className="px-4 py-3 font-semibold uppercase">Contract Start</th>
                <th className="px-4 py-3 font-semibold uppercase">Contract Expiry</th>
                <th className="px-4 py-3 font-semibold uppercase">Days Left</th>
                <th className="px-4 py-3 font-semibold uppercase">Rego Renewal</th>
                <th className="px-4 py-3 font-semibold uppercase">Distance</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="p-6"><SkeletonTable rows={8} cols={9} /></td></tr>
              ) : !vehicles?.length ? (
                <tr><td colSpan={9} className="p-6"><EmptyState title="No contracts found" /></td></tr>
              ) : (
                vehicles.map(v => {
                  const days = daysUntil(v.contractExpiryDate);
                  const rowBg = days !== null && days < 0 ? 'bg-red-900/5' : days !== null && days <= 30 ? 'bg-red-900/5' : '';
                  const regoDays = daysUntil(v.registrationPlateRenewalDate);
                  return (
                    <tr
                      key={v.id}
                      className={`table-row-hover border-b border-findex-midnight-border/40 ${rowBg}`}
                      onClick={() => navigate(`/fleet/${v.registration}`)}
                    >
                      <td className="px-4 py-3 font-bold text-findex-orange">{v.registration}</td>
                      <td className="px-4 py-3 text-white">{v.make} {v.model}</td>
                      <td className="px-4 py-3 text-gray-400">{v.driverName || 'Pool'}</td>
                      <td className="px-4 py-3 text-gray-400">{v.state}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(v.contractStartDate)}</td>
                      <td className="px-4 py-3 text-gray-300">{formatDate(v.contractExpiryDate)}</td>
                      <td className="px-4 py-3"><ContractStatus expiryDate={v.contractExpiryDate} /></td>
                      <td className="px-4 py-3">
                        <span className={regoDays !== null && regoDays <= 30 ? 'text-orange-400 font-semibold' : 'text-gray-500'}>
                          {formatDate(v.registrationPlateRenewalDate)}
                          {regoDays !== null && regoDays <= 30 && ` (${regoDays}d)`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{v.contractDistance ? `${v.contractDistance.toLocaleString()} km` : '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
