import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { SkeletonTable } from '../components/Skeleton';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const ROLES = ['admin', 'editor', 'viewer'];

const ROLE_COLOURS = {
  admin: 'bg-findex-orange/20 text-findex-orange',
  editor: 'bg-blue-500/20 text-blue-400',
  viewer: 'bg-gray-500/20 text-gray-400',
};

export default function UserManagement() {
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showAdd, setShowAdd] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  const [addForm, setAddForm] = useState({ name: '', email: '', role: 'viewer', password: '', confirm: '' });
  const [resetPwd, setResetPwd] = useState({ password: '', confirm: '' });
  const [editForm, setEditForm] = useState({ name: '', role: '' });

  // Redirect non-admins
  if (me && me.role !== 'admin') {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data.users),
  });

  const createUser = useMutation({
    mutationFn: body => api.post('/users', body),
    onSuccess: () => {
      qc.invalidateQueries(['users']);
      toast.success('User created');
      setShowAdd(false);
      setAddForm({ name: '', email: '', role: 'viewer', password: '', confirm: '' });
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to create user'),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/users/${id}`, body),
    onSuccess: () => { qc.invalidateQueries(['users']); toast.success('User updated'); setEditTarget(null); },
    onError: e => toast.error(e.response?.data?.message || 'Failed to update user'),
  });

  const resetPassword = useMutation({
    mutationFn: ({ id, newPassword }) => api.post(`/users/${id}/reset-password`, { newPassword }),
    onSuccess: () => { toast.success('Password reset'); setResetTarget(null); setResetPwd({ password: '', confirm: '' }); },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteUser = useMutation({
    mutationFn: id => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries(['users']); toast.success('User deleted'); },
    onError: e => toast.error(e.response?.data?.message || 'Failed to delete'),
  });

  function handleAdd(e) {
    e.preventDefault();
    if (addForm.password !== addForm.confirm) return toast.error('Passwords do not match');
    createUser.mutate({ name: addForm.name, email: addForm.email, role: addForm.role, password: addForm.password });
  }

  function handleReset(e) {
    e.preventDefault();
    if (resetPwd.password !== resetPwd.confirm) return toast.error('Passwords do not match');
    resetPassword.mutate({ id: resetTarget.id, newPassword: resetPwd.password });
  }

  function handleEdit(e) {
    e.preventDefault();
    updateUser.mutate({ id: editTarget.id, name: editForm.name, role: editForm.role });
  }

  function confirmDelete(u) {
    if (!window.confirm(`Delete ${u.name}? This cannot be undone.`)) return;
    deleteUser.mutate(u.id);
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Manage who has access and what they can do"
        actions={
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-findex-orange text-white rounded-lg text-sm font-semibold hover:bg-findex-orange/90 transition-colors"
          >
            Add User
          </button>
        }
      />

      <div className="bg-findex-midnight-light rounded-xl border border-findex-midnight-border overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={4} cols={5} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-findex-midnight-border text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Last Login</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-findex-midnight-border">
              {(data || []).map(u => (
                <tr key={u.id} className="hover:bg-findex-midnight-lighter transition-colors">
                  <td className="px-4 py-3 font-medium text-white">
                    {u.name}
                    {u.id === me.id && <span className="ml-2 text-xs text-gray-500">(you)</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${ROLE_COLOURS[u.role] || 'bg-gray-500/20 text-gray-400'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-AU') : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => { setEditTarget(u); setEditForm({ name: u.name, role: u.role }); }}
                      className="text-xs px-2 py-1 rounded bg-findex-midnight-lighter text-gray-300 hover:text-white transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { setResetTarget(u); setResetPwd({ password: '', confirm: '' }); }}
                      className="text-xs px-2 py-1 rounded bg-findex-midnight-lighter text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Reset Password
                    </button>
                    {u.id !== me.id && (
                      <button
                        onClick={() => confirmDelete(u)}
                        className="text-xs px-2 py-1 rounded bg-findex-midnight-lighter text-red-400 hover:text-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add User Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add User">
        <form onSubmit={handleAdd} className="space-y-4">
          <Field label="Full Name">
            <input
              className={inputCls}
              value={addForm.name}
              onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
              required
              placeholder="Jane Smith"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={inputCls}
              value={addForm.email}
              onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
              required
              placeholder="jane@findex.com.au"
            />
          </Field>
          <Field label="Role">
            <select
              className={inputCls}
              value={addForm.role}
              onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
            >
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Password">
            <input
              type="password"
              className={inputCls}
              value={addForm.password}
              onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
              required
              placeholder="Min 8 characters"
            />
          </Field>
          <Field label="Confirm Password">
            <input
              type="password"
              className={inputCls}
              value={addForm.confirm}
              onChange={e => setAddForm(f => ({ ...f, confirm: e.target.value }))}
              required
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className={cancelBtn}>Cancel</button>
            <button type="submit" disabled={createUser.isLoading} className={submitBtn}>
              {createUser.isLoading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit User">
        <form onSubmit={handleEdit} className="space-y-4">
          <Field label="Full Name">
            <input
              className={inputCls}
              value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </Field>
          <Field label="Role">
            <select
              className={inputCls}
              value={editForm.role}
              onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
            >
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </Field>
          <div className="text-xs text-gray-500 space-y-0.5">
            <div><span className="text-findex-orange font-semibold">Admin</span> — full access, manage users</div>
            <div><span className="text-blue-400 font-semibold">Editor</span> — view and edit fleet data</div>
            <div><span className="text-gray-400 font-semibold">Viewer</span> — read-only access</div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditTarget(null)} className={cancelBtn}>Cancel</button>
            <button type="submit" disabled={updateUser.isLoading} className={submitBtn}>
              {updateUser.isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={!!resetTarget} onClose={() => setResetTarget(null)} title={`Reset Password — ${resetTarget?.name}`}>
        <form onSubmit={handleReset} className="space-y-4">
          <Field label="New Password">
            <input
              type="password"
              className={inputCls}
              value={resetPwd.password}
              onChange={e => setResetPwd(f => ({ ...f, password: e.target.value }))}
              required
              placeholder="Min 8 characters"
            />
          </Field>
          <Field label="Confirm Password">
            <input
              type="password"
              className={inputCls}
              value={resetPwd.confirm}
              onChange={e => setResetPwd(f => ({ ...f, confirm: e.target.value }))}
              required
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setResetTarget(null)} className={cancelBtn}>Cancel</button>
            <button type="submit" disabled={resetPassword.isLoading} className={submitBtn}>
              {resetPassword.isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-findex-midnight border border-findex-midnight-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-findex-orange';
const submitBtn = 'px-4 py-2 bg-findex-orange text-white rounded-lg text-sm font-semibold hover:bg-findex-orange/90 transition-colors disabled:opacity-50';
const cancelBtn = 'px-4 py-2 bg-findex-midnight-lighter text-gray-300 rounded-lg text-sm font-semibold hover:text-white transition-colors';
