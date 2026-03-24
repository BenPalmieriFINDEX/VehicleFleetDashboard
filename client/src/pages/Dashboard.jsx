import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, Legend
} from 'recharts';
import api from '../utils/api';
import { formatDate, formatCurrencyDollars, daysUntil } from '../utils/format';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import PageHeader from '../components/PageHeader';
import { SkeletonCard, SkeletonTable } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

const ORANGE = '#D43D27';
const CHART_COLORS = ['#D43D27', '#F4693A', '#1d9bf0', '#22c55e', '#a855f7', '#f59e0b', '#6b7280'];

function ContractBadge({ expiryDate }) {
  const days = daysUntil(expiryDate);
  if (days === null) return <Badge color="gray">—</Badge>;
  if (days < 0) return <Badge color="red">Expired</Badge>;
  if (days <= 30) return <Badge color="red">{days}d left</Badge>;
  if (days <= 90) return <Badge color="orange">{days}d left</Badge>;
  return <Badge color="green">Active</Badge>;
}

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['reporting', 'summary'],
    queryFn: () => api.get('/reporting/summary').then(r => r.data),
  });

  const { data: byState, isLoading: stateLoading } = useQuery({
    queryKey: ['reporting', 'fleet-by-state'],
    queryFn: () => api.get('/reporting/fleet-by-state').then(r => r.data),
  });

  const { data: byMake, isLoading: makeLoading } = useQuery({
    queryKey: ['reporting', 'fleet-by-make'],
    queryFn: () => api.get('/reporting/fleet-by-make').then(r => r.data),
  });

  const { data: expiringData } = useQuery({
    queryKey: ['contracts', 'expiring30'],
    queryFn: () => api.get('/contracts/expiring?days=30').then(r => r.data),
  });

  const { data: flagsData } = useQuery({
    queryKey: ['personal-use', 'flags', 'open'],
    queryFn: () => api.get('/personal-use/flags?resolved=false').then(r => r.data),
  });

  const { data: importHistory } = useQuery({
    queryKey: ['import', 'history'],
    queryFn: () => api.get('/import/history').then(r => r.data),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet Overview"
        subtitle="FINDEX Vehicle Fleet Dashboard — SG Fleet managed"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {summaryLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Fleet"
              value={summary?.totalVehicles}
              sub={`${summary?.auVehicles} AU · ${summary?.nzVehicles} NZ`}
              icon={<CarIcon />}
              onClick={() => navigate('/fleet')}
            />
            <StatCard
              label="Active Contracts"
              value={summary?.activeContracts}
              icon={<FileIcon />}
              onClick={() => navigate('/contracts')}
            />
            <StatCard
              label="Expiring ≤90 Days"
              value={summary?.expiring90}
              color={summary?.expiring90 > 0 ? 'orange' : 'default'}
              sub={`${summary?.expiring30 || 0} within 30 days`}
              icon={<ClockIcon />}
              onClick={() => navigate('/contracts')}
            />
            <StatCard
              label="Take Home Vehicles"
              value={summary?.takeHome}
              icon={<HomeIcon />}
              onClick={() => navigate('/personal-use')}
            />
            <StatCard
              label="Open Use Flags"
              value={summary?.openFlags}
              color={summary?.openFlags > 0 ? 'red' : 'green'}
              icon={<FlagIcon />}
              onClick={() => navigate('/personal-use')}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By State */}
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Fleet by State</h3>
          {stateLoading ? (
            <div className="h-48 skeleton rounded" />
          ) : byState?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byState} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="state" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#252C30', border: '1px solid #3A444A', borderRadius: 8, color: '#fff' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="count" fill={ORANGE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No data yet" description="Import fleet data to see this chart" />
          )}
        </div>

        {/* By Make */}
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Fleet by Make</h3>
          {makeLoading ? (
            <div className="h-48 skeleton rounded" />
          ) : byMake?.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie
                    data={byMake.slice(0, 7)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="count"
                    nameKey="make"
                  >
                    {byMake.slice(0, 7).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#252C30', border: '1px solid #3A444A', borderRadius: 8, color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {byMake.slice(0, 7).map((item, i) => (
                  <div key={item.make} className="flex items-center gap-2 text-sm">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-gray-300 flex-1 truncate">{item.make}</span>
                    <span className="text-gray-500 font-semibold">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="No data yet" description="Import fleet data to see this chart" />
          )}
        </div>
      </div>

      {/* Bottom tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring contracts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Contracts Expiring Soon</h3>
            <button onClick={() => navigate('/contracts')} className="text-findex-orange text-sm hover:underline">View all →</button>
          </div>
          {!expiringData ? (
            <SkeletonTable rows={4} cols={4} />
          ) : expiringData.length === 0 ? (
            <EmptyState title="No expiring contracts" description="No contracts due within 30 days" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs border-b border-findex-midnight-border">
                  <th className="pb-2 font-semibold">Rego</th>
                  <th className="pb-2 font-semibold">Vehicle</th>
                  <th className="pb-2 font-semibold">Driver</th>
                  <th className="pb-2 font-semibold">Expires</th>
                </tr>
              </thead>
              <tbody>
                {expiringData.slice(0, 6).map(v => (
                  <tr
                    key={v.id}
                    className="table-row-hover border-b border-findex-midnight-border/50"
                    onClick={() => navigate(`/fleet/${v.registration}`)}
                  >
                    <td className="py-2.5 text-findex-orange font-semibold">{v.registration}</td>
                    <td className="py-2.5 text-gray-300">{v.make} {v.model}</td>
                    <td className="py-2.5 text-gray-400 truncate max-w-[100px]">{v.driverName || 'Pool'}</td>
                    <td className="py-2.5"><ContractBadge expiryDate={v.contractExpiryDate} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Personal use flags */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Personal Use Alerts</h3>
            <button onClick={() => navigate('/personal-use')} className="text-findex-orange text-sm hover:underline">View all →</button>
          </div>
          {!flagsData ? (
            <SkeletonTable rows={4} cols={3} />
          ) : flagsData.length === 0 ? (
            <EmptyState
              title="No open flags"
              description="All personal use flags are resolved"
              icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs border-b border-findex-midnight-border">
                  <th className="pb-2 font-semibold">Rego</th>
                  <th className="pb-2 font-semibold">Driver</th>
                  <th className="pb-2 font-semibold">Severity</th>
                  <th className="pb-2 font-semibold">Discrepancy</th>
                </tr>
              </thead>
              <tbody>
                {flagsData.slice(0, 6).map(f => (
                  <tr
                    key={f.id}
                    className="table-row-hover border-b border-findex-midnight-border/50"
                    onClick={() => navigate(`/fleet/${f.vehicle?.registration}`)}
                  >
                    <td className="py-2.5 text-findex-orange font-semibold">{f.vehicle?.registration}</td>
                    <td className="py-2.5 text-gray-300 truncate max-w-[100px]">{f.vehicle?.driverName || '—'}</td>
                    <td className="py-2.5">
                      <Badge color={f.severity === 'ALERT' ? 'red' : 'orange'}>{f.severity}</Badge>
                    </td>
                    <td className="py-2.5 text-gray-400">
                      {f.discrepancyKm ? `+${f.discrepancyKm.toLocaleString()} km` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent imports */}
      {importHistory?.length > 0 && (
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Recent Imports</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs border-b border-findex-midnight-border">
                <th className="pb-2 font-semibold">File</th>
                <th className="pb-2 font-semibold">Type</th>
                <th className="pb-2 font-semibold">Period</th>
                <th className="pb-2 font-semibold">Rows</th>
                <th className="pb-2 font-semibold">Imported By</th>
                <th className="pb-2 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {importHistory.slice(0, 5).map(imp => (
                <tr key={imp.id} className="border-b border-findex-midnight-border/50">
                  <td className="py-2.5 text-gray-300 font-mono text-xs truncate max-w-[180px]">{imp.filename}</td>
                  <td className="py-2.5"><Badge color="blue">{imp.fileType}</Badge></td>
                  <td className="py-2.5 text-gray-400">{imp.fyPeriod}</td>
                  <td className="py-2.5 text-gray-400">{imp.rowCount}</td>
                  <td className="py-2.5 text-gray-400">{imp.importedBy?.name}</td>
                  <td className="py-2.5 text-gray-500">{formatDate(imp.importDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CarIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM3 11V7a2 2 0 011.447-1.923l4-1.143A2 2 0 0110 4h4a2 2 0 011.553.934l2 3A2 2 0 0119 9h1a1 1 0 011 1v2a1 1 0 01-1 1H3z" /></svg>; }
function FileIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>; }
function ClockIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function HomeIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>; }
function FlagIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21V4m0 0l7-1 4 1 7-1v13l-7 1-4-1-7 1V4z" /></svg>; }
