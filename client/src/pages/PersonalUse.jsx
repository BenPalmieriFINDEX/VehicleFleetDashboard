import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { formatDate } from '../utils/format';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';
import toast from 'react-hot-toast';

export default function PersonalUse() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showResolve, setShowResolve] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterResolved, setFilterResolved] = useState('false');

  const { data: summary } = useQuery({
    queryKey: ['personal-use', 'summary'],
    queryFn: () => api.get('/personal-use/summary').then(r => r.data),
  });

  const { data: flags, isLoading } = useQuery({
    queryKey: ['personal-use', 'flags', filterResolved, filterSeverity],
    queryFn: () => api.get(`/personal-use/flags?${new URLSearchParams({ ...(filterResolved && { resolved: filterResolved }), ...(filterSeverity && { severity: filterSeverity }) })}`).then(r => r.data),
  });

  const resolveFlag = useMutation({
    mutationFn: ({ id, notes }) => api.put(`/personal-use/flags/${id}/resolve`, { resolutionNotes: notes }),
    onSuccess: () => {
      qc.invalidateQueries(['personal-use']);
      toast.success('Flag resolved');
      setShowResolve(null);
      setResolutionNotes('');
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  });

  const handleExportPDF = async () => {
    try {
      toast.loading('Generating PDF...', { id: 'pdf' });
      const res = await api.post('/export/pdf/personal-use', {}, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `findex-personal-use-flags-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded', { id: 'pdf' });
    } catch { toast.error('Export failed', { id: 'pdf' }); }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Personal Use Monitor"
        subtitle="Take Home vehicle odometer discrepancy tracking"
        actions={
          <button onClick={handleExportPDF} className="btn-secondary text-sm">Export PDF</button>
        }
      />

      {/* Summary table for take-home vehicles */}
      <div className="card">
        <h3 className="text-white font-semibold mb-4">Take Home Vehicle Status</h3>
        {!summary ? (
          <SkeletonTable rows={5} cols={6} />
        ) : summary.vehicles?.length === 0 ? (
          <EmptyState title="No take home vehicles" description="No vehicles with Take Home status found" />
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-3">Discrepancy threshold: <span className="text-white font-semibold">{summary.threshold}%</span></p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-findex-midnight-border">
                    <th className="pb-2 font-semibold">Rego</th>
                    <th className="pb-2 font-semibold">Vehicle</th>
                    <th className="pb-2 font-semibold">Driver</th>
                    <th className="pb-2 font-semibold">Latest Odo</th>
                    <th className="pb-2 font-semibold">Expected Odo</th>
                    <th className="pb-2 font-semibold">Discrepancy</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Open Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.vehicles?.map(item => (
                    <tr
                      key={item.vehicle.id}
                      className="table-row-hover border-b border-findex-midnight-border/40"
                      onClick={() => navigate(`/fleet/${item.vehicle.registration}`)}
                    >
                      <td className="py-3 text-findex-orange font-bold">{item.vehicle.registration}</td>
                      <td className="py-3 text-gray-300">{item.vehicle.make} {item.vehicle.model}</td>
                      <td className="py-3 text-gray-400">{item.vehicle.driverName || '—'}</td>
                      <td className="py-3 text-white">{item.latestOdo ? `${item.latestOdo.km.toLocaleString()} km` : <span className="text-gray-600">No reading</span>}</td>
                      <td className="py-3 text-gray-400">{item.expectedKm ? `${item.expectedKm.toLocaleString()} km` : '—'}</td>
                      <td className="py-3">
                        {item.discrepancyPct !== null ? (
                          <span className={item.discrepancyPct > 25 ? 'text-red-400 font-semibold' : item.discrepancyPct > summary.threshold ? 'text-orange-400 font-semibold' : 'text-emerald-400'}>
                            {item.discrepancyPct > 0 ? '+' : ''}{item.discrepancyPct}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-3">
                        {item.severity === 'ALERT' ? <Badge color="red">ALERT</Badge> :
                         item.severity === 'WARNING' ? <Badge color="orange">WARNING</Badge> :
                         item.latestOdo ? <Badge color="green">OK</Badge> : <Badge color="gray">No Data</Badge>}
                      </td>
                      <td className="py-3">
                        {item.openFlags > 0 ? <Badge color="red">{item.openFlags} open</Badge> : <span className="text-gray-600">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* GPS Integration Placeholder */}
      <div className="card border border-dashed border-findex-midnight-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">GPS Integration</h3>
            <p className="text-gray-500 text-sm mt-1">Real-time odometer data via GPS telematics — coming soon</p>
          </div>
          <button disabled className="btn-secondary text-sm opacity-50 cursor-not-allowed">
            Connect GPS ↗
          </button>
        </div>
      </div>

      {/* Flags table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Personal Use Flags</h3>
          <div className="flex gap-2">
            <select className="input w-auto text-sm" value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
              <option value="">All Severities</option>
              <option value="ALERT">ALERT</option>
              <option value="WARNING">WARNING</option>
            </select>
            <select className="input w-auto text-sm" value={filterResolved} onChange={e => setFilterResolved(e.target.value)}>
              <option value="false">Open Flags</option>
              <option value="true">Resolved</option>
              <option value="">All</option>
            </select>
          </div>
        </div>
        {isLoading ? (
          <SkeletonTable rows={5} cols={7} />
        ) : flags?.length === 0 ? (
          <EmptyState
            title={filterResolved === 'false' ? 'No open flags' : 'No flags found'}
            description={filterResolved === 'false' ? 'All personal use flags have been resolved' : 'Try adjusting your filters'}
          />
        ) : (
          <div className="space-y-3">
            {flags?.map(f => (
              <div
                key={f.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  f.severity === 'ALERT' ? 'border-red-700/50 bg-red-900/10 hover:border-red-600' : 'border-orange-700/50 bg-orange-900/10 hover:border-orange-600'
                }`}
                onClick={() => navigate(`/fleet/${f.vehicle?.registration}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge color={f.severity === 'ALERT' ? 'red' : 'orange'}>{f.severity}</Badge>
                      <span className="text-white font-bold">{f.vehicle?.registration}</span>
                      <span className="text-gray-400 text-sm">{f.vehicle?.make} {f.vehicle?.model}</span>
                      <span className="text-gray-600 text-xs">{f.vehicle?.driverName}</span>
                    </div>
                    <p className="text-sm text-gray-300">{f.reason || 'Odometer discrepancy detected'}</p>
                    <div className="text-xs text-gray-500 space-x-4">
                      {f.odoAtFlag && <span>Actual: <span className="text-white">{f.odoAtFlag.toLocaleString()} km</span></span>}
                      {f.expectedOdo && <span>Expected: <span className="text-white">{f.expectedOdo.toLocaleString()} km</span></span>}
                      {f.discrepancyKm && <span>+{f.discrepancyKm.toLocaleString()} km over</span>}
                    </div>
                    <p className="text-xs text-gray-600">{formatDate(f.flagDate)} · Flagged by {f.flaggedBy?.name}</p>
                    {f.resolved && (
                      <p className="text-xs text-emerald-500">✓ Resolved {formatDate(f.resolvedDate)} by {f.resolvedBy?.name}{f.resolutionNotes ? ` — ${f.resolutionNotes}` : ''}</p>
                    )}
                  </div>
                  {!f.resolved && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowResolve(f); }}
                      className="btn-ghost text-sm text-emerald-400 flex-shrink-0"
                    >
                      Resolve ✓
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      <Modal open={!!showResolve} onClose={() => { setShowResolve(null); setResolutionNotes(''); }} title="Resolve Flag">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Resolving flag for <span className="text-white font-semibold">{showResolve?.vehicle?.registration}</span>
          </p>
          <div>
            <label className="label">Resolution Notes (optional)</label>
            <textarea className="input h-24 resize-none" placeholder="Explain how this was resolved..." value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => resolveFlag.mutate({ id: showResolve?.id, notes: resolutionNotes })} disabled={resolveFlag.isLoading} className="btn-primary flex-1">
              {resolveFlag.isLoading ? 'Resolving...' : 'Mark Resolved'}
            </button>
            <button onClick={() => { setShowResolve(null); setResolutionNotes(''); }} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
