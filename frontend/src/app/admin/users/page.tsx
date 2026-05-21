'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { User } from '@/types';
import { getStoredUser } from '@/lib/auth';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { UserPlus, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name:       z.string().min(2),
  email:      z.string().email(),
  password:   z.string().min(8, 'Minimum 8 characters'),
  role:       z.enum(['ADMIN', 'RECRUITER']),
  department: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function UsersPage() {
  const router      = useRouter();
  const currentUser = getStoredUser();
  const [users,     setUsers]    = useState<User[]>([]);
  const [loading,   setLoading]  = useState(true);
  const [showForm,  setShowForm] = useState(false);
  const [creating,  setCreating] = useState(false);
  const [deleting,  setDeleting] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'RECRUITER' },
  });

  useEffect(() => {
    if (currentUser?.role !== 'SUPER_ADMIN') { router.replace('/admin'); return; }
    fetchUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/users');
      setUsers(data.data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const createUser = async (values: FormValues) => {
    setCreating(true);
    try {
      await api.post('/auth/users', values);
      toast.success('User created');
      reset();
      setShowForm(false);
      await fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create user';
      toast.error(msg);
    } finally { setCreating(false); }
  };

  const toggleActive = async (user: User) => {
    try {
      await api.patch(`/auth/users/${user.id}`, { isActive: !user.isActive });
      toast.success('User updated');
      await fetchUsers();
    } catch { toast.error('Failed to update user'); }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    setDeleting(id);
    try {
      await api.delete(`/auth/users/${id}`);
      toast.success('User deleted');
      await fetchUsers();
    } catch { toast.error('Failed to delete user'); }
    finally { setDeleting(null); }
  };

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm">Manage Admin and Recruiter accounts</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl px-4 py-2 transition-colors"
        >
          <UserPlus size={16} />
          {showForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {/* Create User Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">New User</h2>
          <form onSubmit={handleSubmit(createUser)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input {...register('name')} className={inputClass} placeholder="Jane Smith" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input {...register('email')} type="email" className={inputClass} placeholder="jane@company.com" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input {...register('password')} type="password" className={inputClass} placeholder="Min 8 characters" />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select {...register('role')} className={inputClass}>
                <option value="RECRUITER">Recruiter</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Department (optional)</label>
              <input {...register('department')} className={inputClass} placeholder="e.g. Engineering, Sales" />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl px-6 py-2 flex items-center gap-2 transition-colors"
              >
                {creating ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Name', 'Email', 'Role', 'Department', 'Active', 'Created', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10"><Loader2 size={24} className="animate-spin text-brand-600 mx-auto" /></td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700'
                        : u.role === 'ADMIN'   ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.department ?? '–'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(u)} className="focus:outline-none">
                      {u.isActive
                        ? <CheckCircle size={18} className="text-green-500" />
                        : <XCircle    size={18} className="text-gray-300" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{format(new Date(u.createdAt!), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3">
                    {u.role !== 'SUPER_ADMIN' && (
                      <button
                        onClick={() => deleteUser(u.id)}
                        disabled={deleting === u.id}
                        className="text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors"
                      >
                        {deleting === u.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
