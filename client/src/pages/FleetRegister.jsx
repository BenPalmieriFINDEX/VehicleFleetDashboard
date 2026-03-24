import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { formatDate, getContractBadge } from '../utils/format';
import Badge from '../components/Badge';
import PageHeader from '../components/PageHeader';
import { SkeletonTable } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import toast from 'react-hot-toast';

const STATES_AU = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];
const STATES_NZ = ['Auckland', 'Wellington', 'Canterbury', 'Otago', 'Waikato'];

function ContractBadgeCell({ expiryDate, contractStatus }) {
  const { label, color } = getContractBadge(expiryDate, contractStatus);
  return <Badge color={color}>{label}</Badge>;
}

export default function FleetRegister() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ state: '', country: '', contractStatus: '', assetClass: '', fuelType: '', takeHome: '', poolCar: '' });
  const [sortBy, setSortBy] = useState('registration');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);

  const queryParams = new URLSearchParams({
    page, limit: 50, sortBy, sortOrder,
    ...(search && { search }),
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
  }).toString();

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', queryParams],
    queryFn: () => api.get(`/vehicles?${queryParams}`).then(r => r.data),
    keepPreviousData: true,
  });

  const handleSort = (col) => {
    if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortOrder('asc'); }
    setPage(1);
  };

  const handleSearch = useCallback((e) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const handleFilter = (key, val) => {
    setFilters(f => ({ ...f, [key]: val }));
    setPage(1);
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/export/csv/fleet', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `findex-fleet-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
  };

  const handleExportPDF = async () => {
    try {
      toast.loading('Generating PDF...', { id: 'pdf' });
      const res = await api.post('/export/pdf/fleet', {}, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `findex-fleet-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded', { id: 'pdf' });
    } catch { toast.error('Export failed', { id: 'pdf' }); }
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span className="opacity-30">↕</span>;
    return <span className="text-findex-orange">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  const vehicles = data?.vehicles || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fleet Register"
        subtitle={`${total} vehicles total`}
        actions={
          <div className="flex gap-2">
            <button onClick={handleExportCSV} className="btn-secondary text-sm flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
              CSV
            </button>
            <button onClick={handleExportPDF} className="btn-secondary text-sm flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              PDF
            </button>
          </div>
        }
      />

      {/* Search & Filters */}
      <div className="card space-y-3">
        <input
          type="text"
          className="input"
          placeholder="Search by registration, driver name, make, model, location..."
          value={search}
          onChange={handleSearch}
        />
        <div className="flex flex-wrap gap-2">
          <select className="input w-auto text-sm" value={filters.state} onChange={e => handleFilter('state', e.target.value)}>
            <option value="">All States</option>
            {STATES_AU.map(s => <option key={s}>{s}</option>)}
            {STATES_NZ.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="input w-auto text-sm" value={filters.country} onChange={e => handleFilter('country', e.target.value)}>
            <option value="">AU + NZ</option>
            <option value="AU">Australia</option>
            <option value="NZ">New Zealand</option>
          </select>
          <select className="input w-auto text-sm" value={filters.contractStatus} onChange={e => handleFilter('contractStatus', e.target.value)}>
            <option value="">All Statuses</option>
            <option>Active</option>
            <option>Expired</option>
            <option>Pending</option>
          </select>
          <select className="input w-auto text-sm" value={filters.assetClass} onChange={e => handleFilter('assetClass', e.target.value)}>
            <option value="">All Classes</option>
            <option>Passenger</option>
            <option>SUV</option>
            <option>Ute</option>
            <option>Van</option>
          </select>
          <select className="input w-auto text-sm" value={filters.fuelType} onChange={e => handleFilter('fuelType', e.target.value)}>
            <option value="">All Fuel Types</option>
            <option>Petrol</option>
            <option>Diesel</option>
            <option>Hybrid</option>
            <option>PHEV</option>
            <option>Electric</option>
          </select>
          <select className="input w-auto text-sm" value={filters.takeHome} onChange={e => handleFilter('takeHome', e.target.value)}>
            <option value="">Take Home: All</option>
            <option value="true">Take Home Only</option>
            <option value="false">Not Take Home</option>
          </select>
          <select className="input w-auto text-sm" value={filters.poolCar} onChange={e => handleFilter('poolCar', e.target.value)}>
            <option value="">Pool Cars: All</option>
            <option value="true">Pool Cars Only</option>
            <option value="false">Assigned Only</option>
          </select>
          {Object.values(filters).some(Boolean) && (
            <button
              onClick={() => { setFilters({ state: '', country: '', contractStatus: '', assetClass: '', fuelType: '', takeHome: '', poolCar: '' }); setPage(1); }}
              className="btn-ghost text-sm text-findex-orange"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-findex-midnight-border bg-findex-midnight-lighter">
                {[
                  ['registration', 'Rego'],
                  ['make', 'Make / Model'],
                  [null, 'Variant'],
                  [null, 'Year'],
                  ['driverName', 'Driver'],
                  ['state', 'State'],
                  [null, 'Type'],
                  [null, 'Take Home'],
                  ['contractExpiryDate', 'Contract'],
                  [null, ''],
                ].map(([col, label], i) => (
                  <th
                    key={i}
                    className={`px-4 py-3 font-semibold uppercase tracking-wide ${col ? 'cursor-pointer hover:text-white' : ''}`}
                    onClick={col ? () => handleSort(col) : undefined}
                  >
                    {label} {col && <SortIcon col={col} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="p-6"><SkeletonTable rows={8} cols={10} /></td></tr>
              ) : vehicles.length === 0 ? (
                <tr><td colSpan={10} className="p-6">
                  <EmptyState
                    title="No vehicles found"
                    description={search || Object.values(filters).some(Boolean) ? "Try adjusting your search or filters" : "Import fleet data to get started"}
                  />
                </td></tr>
              ) : (
                vehicles.map(v => {
                  const openFlags = v.personalUseFlags?.length || 0;
                  return (
                    <tr
                      key={v.id}
                      className="table-row-hover border-b border-findex-midnight-border/40"
                      onClick={() => navigate(`/fleet/${v.registration}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-findex-orange">{v.registration}</span>
                          {openFlags > 0 && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Open personal use flag" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white font-semibold">{v.make} {v.model}</td>
                      <td className="px-4 py-3 text-gray-400">{v.variant || '—'}</td>
                      <td className="px-4 py-3 text-gray-400">{v.modelYear || '—'}</td>
                      <td className="px-4 py-3 text-gray-300">{v.driverName || <span className="text-gray-600">Pool</span>}</td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400">{v.state}</span>
                        {v.country === 'NZ' && <Badge color="blue" className="ml-1">NZ</Badge>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{v.assetClass || '—'}</td>
                      <td className="px-4 py-3">
                        {v.takeHome && <Badge color="orange">Take Home</Badge>}
                        {v.poolCar && <Badge color="blue">Pool</Badge>}
                        {!v.takeHome && !v.poolCar && <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <ContractBadgeCell expiryDate={v.contractExpiryDate} contractStatus={v.contractStatus} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-findex-midnight-border">
            <span className="text-sm text-gray-500">
              Showing {Math.min((page - 1) * 50 + 1, total)}–{Math.min(page * 50, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost text-sm disabled:opacity-40"
              >← Prev</button>
              <span className="text-sm text-gray-400 flex items-center px-2">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-ghost text-sm disabled:opacity-40"
              >Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
