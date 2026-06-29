import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { FiUsers, FiArrowLeft, FiShield, FiShieldOff, FiTrash2, FiCheck, FiX, FiKey } from 'react-icons/fi';

export default function AdminUsers() {
  const { isAuthenticated, isAdmin, authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetUser, setResetUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) router.replace('/login');
    else if (!isAdmin) router.replace('/');
  }, [isAuthenticated, isAdmin, authLoading, router]);

  const fetchUsers = () => {
    setLoading(true);
    api.get('/api/admin/users').then(r => setUsers(r.data)).catch(() => toast.error('Failed to load users')).finally(() => setLoading(false));
  };

  useEffect(() => { if (isAdmin) fetchUsers(); }, [isAdmin]);

  if (authLoading) return null;
  if (!isAuthenticated || !isAdmin) return null;

  const toggleAdmin = async (id: number) => {
    try { await api.put(`/api/admin/users/${id}/toggle-admin`); toast.success('Updated'); fetchUsers(); } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const toggleActive = async (id: number) => {
    try { await api.put(`/api/admin/users/${id}/toggle-active`); toast.success('Updated'); fetchUsers(); } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const resetUserPassword = async () => {
    if (!newPassword || newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.error('Password must be 8+ chars with uppercase, lowercase, and a number');
      return;
    }
    setResetting(true);
    try {
      await api.post(`/api/admin/users/${resetUser.id}/reset-password`, { password: newPassword });
      toast.success('Password reset successfully');
      setResetUser(null);
      setNewPassword('');
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  const deleteUser = async (id: number, username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try { await api.delete(`/api/admin/users/${id}`); toast.success('User deleted'); fetchUsers(); } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-tamil-400 transition-colors">
        <FiArrowLeft size={14} /> Back to Admin
      </Link>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <FiUsers size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Manage Users</h1>
          <p className="text-gray-400 text-sm">View and manage platform users</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-300">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-300">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="text-left px-4 py-3 font-medium text-gray-300">User</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-300">Email</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-300">Admin</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-300">Active</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-tamil-500 to-tamil-600 flex items-center justify-center text-white text-xs font-bold">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white">{u.username}</p>
                          <p className="text-xs text-gray-300">{u.full_name || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{u.email}</td>
                    <td className="px-4 py-3 text-center">
                      {u.is_superuser ? <FiShield className="inline text-tamil-400" size={16} /> : <FiShieldOff className="inline text-gray-400" size={16} />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.is_active ? <FiCheck className="inline text-green-500" size={16} /> : <FiX className="inline text-red-400" size={16} />}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setResetUser(u)} className="p-1.5 text-gray-300 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors" title="Reset password">
                          <FiKey size={15} />
                        </button>
                        <button onClick={() => toggleAdmin(u.id)} className="p-1.5 text-gray-300 hover:text-tamil-400 hover:bg-tamil-500/10 rounded-lg transition-colors" title="Toggle admin">
                          {u.is_superuser ? <FiShieldOff size={15} /> : <FiShield size={15} />}
                        </button>
                        <button onClick={() => toggleActive(u.id)} className="p-1.5 text-gray-300 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors" title="Toggle active">
                          {u.is_active ? <FiX size={15} /> : <FiCheck size={15} />}
                        </button>
                        <button onClick={() => deleteUser(u.id, u.username)} className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete user">
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setResetUser(null); setNewPassword(''); }}>
          <div className="card-glass p-6 max-w-sm w-full animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-1">Reset Password</h2>
            <p className="text-sm text-gray-400 mb-4">Setting new password for <span className="text-white font-medium">{resetUser.username}</span></p>
            <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="New password (8+ chars, A-Z, a-z, 0-9)"
              className="w-full h-10 px-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-tamil-500/40 focus:border-tamil-500/50 transition-all mb-4" />
            <div className="flex gap-2">
              <button onClick={() => { setResetUser(null); setNewPassword(''); }} className="flex-1 btn-outline text-sm h-10">Cancel</button>
              <button onClick={resetUserPassword} disabled={resetting} className="flex-1 btn-primary text-sm h-10">
                {resetting ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
