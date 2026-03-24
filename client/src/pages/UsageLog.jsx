import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { formatDateTime, formatDate } from '../utils/format';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';
import toast from 'react-hot-toast';

export default function UsageLog() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showLogModal, setShowLogModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(null);
  const [filters, setFilters] = useState({ driverName: '', status: '', dateFrom: '', dateTo: '' });
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ vehicleSearch: '', vehicleId: '', driverName: '', purpose: '', pickupDatetime: '', dropoffDatetime: '', pickupOdometer: '', dropoffOdometer: '', notes: '' });
  const [returnForm, setReturnForm] = useState({ dropoffDatetime: '', dropoffOdometer: '', notes: '' });

  const params = new URLSearchParams({ page, limit: 50, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) }).toString();

  const { data, isLoading } = useQuery({
    queryKey: ['usage-log', params],
    queryFn: () => api.get(`/usage-log?${params}`).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles', 'all'],
    queryFn: () => api.get('/vehicles?limit=500').then(r => r.data.vehicles),
    enabled: showLogModal,
  });

  const addEntry = useMutation({
    mutationFn: data => api.post('/usage-log', data),
    onSuccess: () => {
      qc.invalidateQueries(['usage-log']);
      toast.success('Usage entry logged');
      setShowLogModal(false);
      setForm({ vehicleSearch: '', vehicleId: '', driverName: '', purpose: '', pickupDatetime: '', dropoffDatetime: '', pickupOdometer: '', dropoffOdometer: '', notes: '' });
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  });

  const returnVehicle = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/usage-log/${id}/return`, data),
    onSuccess: () => {
      qc.invalidateQueries(['usage-log']);
      toast.success('Vehicle marked as returned');
      setShowReturnModal(null);
      setReturnForm({ dropoffDatetime: '', dropoffOdometer: '', notes: '' });
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  });

  const handleExport = async (type) => {
    try {
      toast.loading(`Generating ${type.toUpperCase()}...`, { id: 'export' });
      const res = await api.post('/export/pdf/usage-log', {}, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `findex-usage-log-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded', { id: 'export' });
    } catch { toast.error('Export failed', { id: 'export' }); }
  };

  const entries = data?.entries || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 50);

  const filteredVehicles = vehicles?.filter(v => {
    const q = form.vehicleSearch.toLowerCase();
    return !q || v.registration.toLowerCase().includes(q) || `${v.make} ${v.model}`.toLowerCase().includes(q) || (v.driverName || '').toLowerCase().includes(q);
  }).slice(0, 10) || [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vehicle Usage Log"
        subtitle="Track staff usage of fleet vehicles"
        actions={
          <div className="flex gap-2">
            <button onClick={() => handleExport('pdf')} className="btn-secondary text-sm">Export PDF</button>
            <button onClick={() => setShowLogModal(true)} className="btn-primary text-sm">+ Log Usage</button>
          </div>
        }
      />

      {/* Filters */}
      <div className="card flex flex-wrap gap-3">
        <input type="text" className="input w-48 text-sm" placeholder="Driver name..." value={filters.driverName} onChange={e => setFilters(f => ({ ...f, driverName: e.target.value }))} />
        <select className="input w-auto text-sm" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <input type="date" className="input w-auto text-sm" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} />
        <input type="date" className="input w-auto text-sm" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} />
        {Object.values(filters).some(Boolean) && (
          <button onClick={() => setFilters({ driverName: '', status: '', dateFrom: '', dateTo: '' })} className="btn-ghost text-sm text-findex-orange">Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-findex-midnight-border bg-findex-midnight-lighter">
                <th className="px-4 py-3 font-semibold uppercase">Vehicle</th>
                <th className="px-4 py-3 font-semibold uppercase">Driver</th>
                <th className="px-4 py-3 font-semibold uppercase">Purpose</th>
                <th className="px-4 py-3 font-semibold uppercase">Pickup</th>
                <th className="px-4 py-3 font-semibold uppercase">Dropoff</th>
                <th className="px-4 py-3 font-semibold uppercase">Trip KM</th>
                <th className="px-4 py-3 font-semibold uppercase">Status</th>
                <th className="px-4 py-3 font-semibold uppercase">Logged By</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="p-6"><SkeletonTable rows={6} cols={8} /></td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={9} className="p-6"><EmptyState title="No usage entries" description="Log vehicle usage to get started" /></td></tr>
              ) : (
                entries.map(entry => {
                  const isStale = entry.status === 'ACTIVE' && new Date() - new Date(entry.pickupDatetime) > 24 * 60 * 60 * 1000;
                  return (
                    <tr
                      key={entry.id}
                      className={`border-b border-findex-midnight-border/40 ${isStale ? 'bg-orange-900/10' : 'hover:bg-findex-midnight-lighter'} transition-colors`}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/fleet/${entry.vehicle?.registration}`)}
                          className="text-findex-orange font-bold hover:underline"
                        >
                          {entry.vehicle?.registration}
                        </button>
                        <div className="text-xs text-gray-500">{entry.vehicle?.make} {entry.vehicle?.model}</div>
                      </td>
                      <td className="px-4 py-3 text-white font-semibold">{entry.driverName}</td>
                      <td className="px-4 py-3 text-gray-400 max-w-[140px] truncate">{entry.purpose || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDateTime(entry.pickupDatetime)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{entry.dropoffDatetime ? formatDateTime(entry.dropoffDatetime) : <span className="text-gray-600">—</span>}</td>
                      <td className="px-4 py-3 text-gray-300">{entry.tripKm ? `${entry.tripKm.toLocaleString()} km` : '—'}</td>
                      <td className="px-4 py-3">
                        <Badge color={entry.status === 'ACTIVE' ? 'green' : entry.status === 'CANCELLED' ? 'red' : 'gray'}>
                          {entry.status}{isStale && ' ⚠'}
                        </Badge>
                        {isStale && <div className="text-xs text-orange-400 mt-0.5">Over 24h — review</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{entry.loggedBy?.name}</td>
                      <td className="px-4 py-3">
                        {entry.status === 'ACTIVE' && (
                          <button onClick={() => setShowReturnModal(entry)} className="text-xs text-findex-orange hover:underline whitespace-nowrap">
                            Mark Returned →
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-findex-midnight-border">
            <span className="text-sm text-gray-500">Showing {Math.min((page - 1) * 50 + 1, total)}–{Math.min(page * 50, total)} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost text-sm disabled:opacity-40">← Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost text-sm disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Log Usage Modal */}
      <Modal open={showLogModal} onClose={() => setShowLogModal(false)} title="Log Vehicle Usage" size="lg">
        <div className="space-y-4">
          {/* Vehicle search */}
          <div>
            <label className="label">Vehicle *</label>
            <input
              type="text"
              className="input"
              placeholder="Search by registration, make/model or driver..."
              value={form.vehicleSearch}
              onChange={e => setForm(f => ({ ...f, vehicleSearch: e.target.value, vehicleId: '' }))}
            />
            {form.vehicleSearch && !form.vehicleId && filteredVehicles.length > 0 && (
              <div className="mt-1 bg-findex-midnight-lighter border border-findex-midnight-border rounded-lg overflow-hidden">
                {filteredVehicles.map(v => (
                  <button
                    key={v.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-findex-midnight-border transition-colors"
                    onClick={() => setForm(f => ({ ...f, vehicleId: v.id, vehicleSearch: `${v.registration} — ${v.make} ${v.model}` }))}
                  >
                    <span className="text-findex-orange font-bold">{v.registration}</span>
                    <span className="text-gray-300 ml-2">{v.make} {v.model}</span>
                    {v.driverName && <span className="text-gray-500 ml-2">({v.driverName})</span>}
                  </button>
                ))}
              </div>
            )}
            {form.vehicleId && <p className="text-xs text-emerald-400 mt-1">✓ Vehicle selected</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Staff Member Name *</label>
              <input type="text" className="input" placeholder="Any employee name" value={form.driverName} onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Purpose of Use</label>
              <input type="text" className="input" placeholder="e.g. Client visit — Melbourne CBD, Site inspection" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} />
            </div>
            <div>
              <label className="label">Pickup Date & Time *</label>
              <input type="datetime-local" className="input" value={form.pickupDatetime} onChange={e => setForm(f => ({ ...f, pickupDatetime: e.target.value }))} />
            </div>
            <div>
              <label className="label">Dropoff Date & Time (optional)</label>
              <input type="datetime-local" className="input" value={form.dropoffDatetime} onChange={e => setForm(f => ({ ...f, dropoffDatetime: e.target.value }))} />
            </div>
            <div>
              <label className="label">Pickup Odometer (optional)</label>
              <input type="number" className="input" placeholder="km" value={form.pickupOdometer} onChange={e => setForm(f => ({ ...f, pickupOdometer: e.target.value }))} />
            </div>
            <div>
              <label className="label">Dropoff Odometer (optional)</label>
              <input type="number" className="input" placeholder="km" value={form.dropoffOdometer} onChange={e => setForm(f => ({ ...f, dropoffOdometer: e.target.value }))} />
            </div>
            {form.pickupOdometer && form.dropoffOdometer && (
              <div className="col-span-2 text-sm text-emerald-400">
                Estimated trip: {(parseInt(form.dropoffOdometer) - parseInt(form.pickupOdometer)).toLocaleString()} km
              </div>
            )}
            <div className="col-span-2">
              <label className="label">Notes (optional)</label>
              <input type="text" className="input" placeholder="Any additional notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => addEntry.mutate({ vehicleId: form.vehicleId, driverName: form.driverName, purpose: form.purpose, pickupDatetime: form.pickupDatetime, dropoffDatetime: form.dropoffDatetime || undefined, pickupOdometer: form.pickupOdometer || undefined, dropoffOdometer: form.dropoffOdometer || undefined, notes: form.notes })}
              disabled={addEntry.isLoading || !form.vehicleId || !form.driverName || !form.pickupDatetime}
              className="btn-primary flex-1"
            >
              {addEntry.isLoading ? 'Logging...' : 'Log Usage'}
            </button>
            <button onClick={() => setShowLogModal(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Mark Returned Modal */}
      <Modal open={!!showReturnModal} onClose={() => setShowReturnModal(null)} title="Mark Vehicle Returned">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            <span className="text-white font-semibold">{showReturnModal?.vehicle?.registration}</span> — driver: <span className="text-white">{showReturnModal?.driverName}</span>
          </p>
          <div>
            <label className="label">Dropoff Date & Time</label>
            <input type="datetime-local" className="input" value={returnForm.dropoffDatetime} onChange={e => setReturnForm(f => ({ ...f, dropoffDatetime: e.target.value }))} />
          </div>
          <div>
            <label className="label">Dropoff Odometer (optional)</label>
            <input type="number" className="input" placeholder="km" value={returnForm.dropoffOdometer} onChange={e => setReturnForm(f => ({ ...f, dropoffOdometer: e.target.value }))} />
          </div>
          {showReturnModal?.pickupOdometer && returnForm.dropoffOdometer && (
            <p className="text-sm text-emerald-400">Trip: {(parseInt(returnForm.dropoffOdometer) - showReturnModal.pickupOdometer).toLocaleString()} km</p>
          )}
          <div>
            <label className="label">Notes (optional)</label>
            <input type="text" className="input" value={returnForm.notes} onChange={e => setReturnForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => returnVehicle.mutate({ id: showReturnModal?.id, ...returnForm })}
              disabled={returnVehicle.isLoading}
              className="btn-primary flex-1"
            >
              {returnVehicle.isLoading ? 'Saving...' : 'Confirm Return'}
            </button>
            <button onClick={() => setShowReturnModal(null)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
