import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { formatRelative } from '../utils/format';
import Badge from '../components/Badge';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const SEVERITY_COLOR = { HIGH: 'red', MEDIUM: 'orange', LOW: 'yellow', INFO: 'blue' };
const TYPE_LABELS = {
  CONTRACT_EXPIRING_7: '🚨 Contract Expiring (7 days)',
  CONTRACT_EXPIRING_30: '⚠️ Contract Expiring (30 days)',
  REGISTRATION_DUE: '📋 Registration Due',
  STALE_ODOMETER: '📏 Stale Odometer Data',
  PERSONAL_USE: '🚗 Personal Use Flag',
};

export default function Alerts() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.get('/alerts').then(r => r.data),
  });

  const dismiss = useMutation({
    mutationFn: id => api.put(`/alerts/${id}/dismiss`),
    onSuccess: () => { qc.invalidateQueries(['alerts']); qc.invalidateQueries(['alerts', 'count']); },
    onError: () => toast.error('Failed to dismiss alert'),
  });

  const refresh = useMutation({
    mutationFn: () => api.post('/alerts/refresh'),
    onSuccess: (res) => {
      qc.invalidateQueries(['alerts']);
      qc.invalidateQueries(['alerts', 'count']);
      toast.success(`Alerts refreshed — ${res.data.created} new alerts generated`);
    },
    onError: () => toast.error('Failed to refresh alerts'),
  });

  const active = alerts?.filter(a => !a.dismissed) || [];
  const dismissed = alerts?.filter(a => a.dismissed) || [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alerts & Notifications"
        subtitle="Proactive fleet alerts — contracts, renewals, and odometer checks"
        actions={
          <button onClick={() => refresh.mutate()} disabled={refresh.isLoading} className="btn-primary text-sm">
            {refresh.isLoading ? 'Refreshing...' : '↻ Refresh Alerts'}
          </button>
        }
      />

      {/* Active alerts */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Active Alerts ({active.length})</h3>
          {active.length > 0 && (
            <button
              onClick={() => active.forEach(a => dismiss.mutate(a.id))}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Dismiss all
            </button>
          )}
        </div>
        {isLoading ? (
          <SkeletonTable rows={5} cols={4} />
        ) : active.length === 0 ? (
          <EmptyState
            title="No active alerts"
            description="Your fleet is up to date. All alerts have been dismissed or there are no outstanding issues."
            icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        ) : (
          <div className="space-y-2">
            {active.map(alert => (
              <div key={alert.id} className={`p-4 rounded-lg border flex items-start gap-4 ${
                alert.severity === 'HIGH' ? 'border-red-700/50 bg-red-900/10' :
                alert.severity === 'MEDIUM' ? 'border-orange-700/50 bg-orange-900/10' :
                'border-findex-midnight-border bg-findex-midnight-lighter'
              }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge color={SEVERITY_COLOR[alert.severity] || 'gray'}>{alert.severity}</Badge>
                    <span className="text-xs text-gray-500 font-semibold">{TYPE_LABELS[alert.alertType] || alert.alertType}</span>
                  </div>
                  <p className="text-white text-sm font-semibold">{alert.title}</p>
                  <p className="text-gray-400 text-sm mt-0.5">{alert.message}</p>
                  <p className="text-xs text-gray-600 mt-1">{formatRelative(alert.createdAt)}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {alert.vehicleId && (
                    <button
                      onClick={() => {
                        // Try to navigate to the vehicle using the message
                        const match = alert.message.match(/^([A-Z0-9]+)/);
                        if (match) navigate(`/fleet/${match[1]}`);
                      }}
                      className="btn-ghost text-xs"
                    >
                      View →
                    </button>
                  )}
                  <button
                    onClick={() => dismiss.mutate(alert.id)}
                    disabled={dismiss.isLoading}
                    className="btn-ghost text-xs text-gray-500"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dismissed alerts */}
      {dismissed.length > 0 && (
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Dismissed ({dismissed.length})</h3>
          <div className="space-y-2 opacity-50">
            {dismissed.slice(0, 10).map(alert => (
              <div key={alert.id} className="p-3 rounded-lg border border-findex-midnight-border flex items-center gap-3">
                <Badge color="gray">{alert.severity}</Badge>
                <p className="text-gray-400 text-sm flex-1">{alert.title}</p>
                <span className="text-xs text-gray-600">{formatRelative(alert.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
