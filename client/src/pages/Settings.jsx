import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { formatDate, formatRelative } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import { SkeletonTable } from '../components/Skeleton';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [settingsForm, setSettingsForm] = useState({ discrepancyThresholdPct: 10, contractExpiryWarningDays: 90, staleOdometerDays: 90 });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data),
    onSuccess: (d) => {
      if (d.settings) setSettingsForm({
        discrepancyThresholdPct: d.settings.discrepancyThresholdPct,
        contractExpiryWarningDays: d.settings.contractExpiryWarningDays,
        staleOdometerDays: d.settings.staleOdometerDays,
      });
    },
  });

  useEffect(() => {
    if (data?.settings) {
      setSettingsForm({
        discrepancyThresholdPct: data.settings.discrepancyThresholdPct,
        contractExpiryWarningDays: data.settings.contractExpiryWarningDays,
        staleOdometerDays: data.settings.staleOdometerDays,
      });
    }
  }, [data]);

  const saveSettings = useMutation({
    mutationFn: data => api.put('/settings', data),
    onSuccess: () => { qc.invalidateQueries(['settings']); toast.success('Settings saved'); },
    onError: e => toast.error(e.response?.data?.message || 'Failed to save'),
  });

  const changePassword = useMutation({
    mutationFn: ({ currentPassword, newPassword }) => api.post('/auth/change-password', { currentPassword, newPassword }),
    onSuccess: () => { toast.success('Password changed successfully'); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  });

  const refreshAlerts = useMutation({
    mutationFn: () => api.post('/alerts/refresh'),
    onSuccess: res => { qc.invalidateQueries(['alerts']); toast.success(`Alerts refreshed — ${res.data.created} new alerts`); },
    onError: () => toast.error('Failed to refresh alerts'),
  });

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    changePassword.mutate({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
  };

  const { data: importHistory } = useQuery({
    queryKey: ['import', 'history'],
    queryFn: () => api.get('/import/history').then(r => r.data),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Application configuration and user management" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fleet Settings */}
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Fleet Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Personal Use Discrepancy Threshold (%)</label>
              <p className="text-xs text-gray-600 mb-1">Flags are raised when odometer exceeds expected KMs by this percentage</p>
              <input
                type="number"
                className="input w-32"
                min={1}
                max={50}
                step={1}
                value={settingsForm.discrepancyThresholdPct}
                onChange={e => setSettingsForm(f => ({ ...f, discrepancyThresholdPct: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Contract Expiry Warning Window (days)</label>
              <p className="text-xs text-gray-600 mb-1">Alert generated when contract expiry is within this many days</p>
              <input
                type="number"
                className="input w-32"
                min={7}
                max={365}
                step={1}
                value={settingsForm.contractExpiryWarningDays}
                onChange={e => setSettingsForm(f => ({ ...f, contractExpiryWarningDays: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Stale Odometer Warning (days)</label>
              <p className="text-xs text-gray-600 mb-1">Alert when no odometer reading has been recorded in this many days</p>
              <input
                type="number"
                className="input w-32"
                min={7}
                max={365}
                step={1}
                value={settingsForm.staleOdometerDays}
                onChange={e => setSettingsForm(f => ({ ...f, staleOdometerDays: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => saveSettings.mutate(settingsForm)}
                disabled={saveSettings.isLoading}
                className="btn-primary text-sm"
              >
                {saveSettings.isLoading ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                onClick={() => refreshAlerts.mutate()}
                disabled={refreshAlerts.isLoading}
                className="btn-secondary text-sm"
              >
                {refreshAlerts.isLoading ? 'Running...' : '↻ Refresh Alerts'}
              </button>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Change Password</h3>
          <p className="text-sm text-gray-500 mb-4">Changing password for: <span className="text-white font-semibold">{user?.name}</span></p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input type="password" className="input" value={passwordForm.currentPassword} onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))} />
            </div>
            <div>
              <label className="label">New Password</label>
              <input type="password" className="input" value={passwordForm.newPassword} onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))} />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input type="password" className="input" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))} />
            </div>
            <button type="submit" disabled={changePassword.isLoading} className="btn-primary text-sm">
              {changePassword.isLoading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Users */}
      <div className="card">
        <h3 className="text-white font-semibold mb-4">System Users</h3>
        {isLoading ? (
          <SkeletonTable rows={3} cols={5} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-findex-midnight-border">
                <th className="pb-2 font-semibold">Name</th>
                <th className="pb-2 font-semibold">Email</th>
                <th className="pb-2 font-semibold">Role</th>
                <th className="pb-2 font-semibold">Last Login</th>
                <th className="pb-2 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {data?.users?.map(u => (
                <tr key={u.id} className="border-b border-findex-midnight-border/40">
                  <td className="py-2.5 text-white font-semibold flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-findex-orange flex items-center justify-center text-xs font-bold text-white">
                      {u.name.charAt(0)}
                    </div>
                    {u.name}
                    {u.id === user?.id && <span className="text-xs text-findex-orange">(you)</span>}
                  </td>
                  <td className="py-2.5 text-gray-400">{u.email}</td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-findex-midnight-lighter border border-findex-midnight-border text-gray-300">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 text-gray-500">{u.lastLogin ? formatRelative(u.lastLogin) : 'Never'}</td>
                  <td className="py-2.5 text-gray-600">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Import History */}
      <div className="card">
        <h3 className="text-white font-semibold mb-4">Import History</h3>
        {!importHistory ? (
          <SkeletonTable rows={4} cols={6} />
        ) : importHistory.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">No imports yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-findex-midnight-border">
                  <th className="pb-2 font-semibold">Filename</th>
                  <th className="pb-2 font-semibold">Type</th>
                  <th className="pb-2 font-semibold">FY Period</th>
                  <th className="pb-2 font-semibold">Rows</th>
                  <th className="pb-2 font-semibold">Size</th>
                  <th className="pb-2 font-semibold">Imported By</th>
                  <th className="pb-2 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {importHistory.map(imp => (
                  <tr key={imp.id} className="border-b border-findex-midnight-border/40">
                    <td className="py-2.5 font-mono text-xs text-gray-300 max-w-[200px] truncate">{imp.filename}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-900/40 text-blue-400">{imp.fileType}</span>
                    </td>
                    <td className="py-2.5 text-gray-400">{imp.fyPeriod}</td>
                    <td className="py-2.5 text-gray-400">{imp.rowCount}</td>
                    <td className="py-2.5 text-gray-500">{imp.fileSize ? `${(imp.fileSize / 1024).toFixed(0)} KB` : '—'}</td>
                    <td className="py-2.5 text-gray-400">{imp.importedBy?.name}</td>
                    <td className="py-2.5 text-gray-600">{formatRelative(imp.importDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
