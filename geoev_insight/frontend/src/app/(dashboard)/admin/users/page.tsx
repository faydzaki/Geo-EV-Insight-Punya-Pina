'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  UserRecord,
} from '@/lib/api'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { Plus, Trash2, Edit2, KeyRound, ShieldCheck } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  viewer: 'Viewer',
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700',
  admin: 'bg-blue-100 text-blue-700',
  viewer: 'bg-gray-100 text-gray-700',
}

const inputCls = 'border border-primary-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-300 bg-white/80 w-full text-slate-700 transition-colors'
const labelCls = 'block text-xs font-semibold text-indigo-700/70 uppercase tracking-wide mb-1'

export default function UsersPage() {
  const { isAdmin } = useAuth()
  const router = useRouter()
  const qc = useQueryClient()

  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<UserRecord | null>(null)
  const [changePwUser, setChangePwUser] = useState<UserRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Create form
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'viewer'>('viewer')
  const [newDisplayName, setNewDisplayName] = useState('')

  // Edit form
  const [editRole, setEditRole] = useState<string>('viewer')
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editActive, setEditActive] = useState<0 | 1>(1)

  // Change password form
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  useEffect(() => {
    if (!isAdmin) router.replace('/peta')
  }, [isAdmin, router])

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    enabled: isAdmin,
  })

  const users = data?.data ?? []

  const createMut = useMutation({
    mutationFn: (p: { username: string; password: string; role: string; display_name?: string }) =>
      createUser(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setShowCreate(false)
      setNewUsername(''); setNewPassword(''); setNewDisplayName(''); setNewRole('viewer')
      setMsg({ ok: true, text: 'User berhasil dibuat.' })
    },
    onError: (e: unknown) => {
      const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setMsg({ ok: false, text: err ?? 'Gagal membuat user.' })
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateUser>[1] }) =>
      updateUser(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setEditUser(null)
      setMsg({ ok: true, text: 'User berhasil diperbarui.' })
    },
    onError: (e: unknown) => {
      const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setMsg({ ok: false, text: err ?? 'Gagal memperbarui user.' })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setDeleteTarget(null)
      setMsg({ ok: true, text: 'User berhasil dihapus.' })
    },
    onError: (e: unknown) => {
      const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setDeleteTarget(null)
      setMsg({ ok: false, text: err ?? 'Gagal menghapus user.' })
    },
  })

  const changePwMut = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      updateUser(id, { password }),
    onSuccess: () => {
      setChangePwUser(null)
      setNewPw(''); setConfirmPw('')
      setMsg({ ok: true, text: 'Password berhasil diubah.' })
    },
    onError: (e: unknown) => {
      const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setMsg({ ok: false, text: err ?? 'Gagal mengubah password.' })
    },
  })

  if (!isAdmin) return null

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-primary-500 uppercase tracking-widest">ADMIN</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Manajemen User</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola akun pengguna sistem GeoEV Insight.</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setMsg(null) }}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Tambah user
        </button>
      </div>

      {/* Feedback */}
      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${msg.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      {/* Create user form */}
      {showCreate && (
        <div className="card-glass rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-indigo-900">Buat User Baru</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Username *</label>
              <input value={newUsername} onChange={e => setNewUsername(e.target.value)} className={inputCls} placeholder="username" />
            </div>
            <div>
              <label className={labelCls}>Password *</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputCls} placeholder="minimal 6 karakter" />
            </div>
            <div>
              <label className={labelCls}>Nama tampilan</label>
              <input value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} className={inputCls} placeholder="Nama lengkap" />
            </div>
            <div>
              <label className={labelCls}>Role</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value as 'admin' | 'viewer')} className={inputCls}>
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (!newUsername || !newPassword) {
                  setMsg({ ok: false, text: 'Username dan password wajib diisi.' })
                  return
                }
                createMut.mutate({ username: newUsername, password: newPassword, role: newRole, display_name: newDisplayName || undefined })
              }}
              disabled={createMut.isPending}
              className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              {createMut.isPending ? 'Menyimpan…' : 'Simpan'}
            </button>
            <button onClick={() => setShowCreate(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Edit user form */}
      {editUser && (
        <div className="card-glass rounded-2xl border border-primary-200 p-6 space-y-4">
          <h3 className="font-semibold text-indigo-900">Edit User: <span className="text-primary-600">{editUser.username}</span></h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nama tampilan</label>
              <input value={editDisplayName} onChange={e => setEditDisplayName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Role</label>
              <select value={editRole} onChange={e => setEditRole(e.target.value)} className={inputCls}>
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Status akun</label>
              <select value={editActive} onChange={e => setEditActive(Number(e.target.value) as 0 | 1)} className={inputCls}>
                <option value={1}>Aktif</option>
                <option value={0}>Nonaktif</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => updateMut.mutate({ id: editUser.id, payload: { role: editRole, display_name: editDisplayName, active: editActive } })}
              disabled={updateMut.isPending}
              className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              {updateMut.isPending ? 'Menyimpan…' : 'Simpan perubahan'}
            </button>
            <button onClick={() => setEditUser(null)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Batal</button>
          </div>
        </div>
      )}

      {/* Change password form */}
      {changePwUser && (
        <div className="card-glass rounded-2xl border border-amber-200 p-6 space-y-4">
          <h3 className="font-semibold text-indigo-900">Ubah Password: <span className="text-amber-600">{changePwUser.username}</span></h3>
          <div className="grid grid-cols-1 gap-4 max-w-sm">
            <div>
              <label className={labelCls}>Password baru *</label>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className={inputCls} placeholder="minimal 6 karakter" />
            </div>
            <div>
              <label className={labelCls}>Konfirmasi password *</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (newPw.length < 6) { setMsg({ ok: false, text: 'Password minimal 6 karakter.' }); return }
                if (newPw !== confirmPw) { setMsg({ ok: false, text: 'Konfirmasi password tidak cocok.' }); return }
                changePwMut.mutate({ id: changePwUser.id, password: newPw })
              }}
              disabled={changePwMut.isPending}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              {changePwMut.isPending ? 'Mengubah…' : 'Ubah password'}
            </button>
            <button onClick={() => { setChangePwUser(null); setNewPw(''); setConfirmPw('') }} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Batal</button>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="card-glass rounded-2xl border border-primary-100/50">
        <div className="px-6 py-4 border-b border-primary-100/40">
          <h3 className="font-semibold text-indigo-900">Daftar Pengguna ({users.length})</h3>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Memuat data pengguna…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Belum ada pengguna.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Username</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nama</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dibuat</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800">{u.username}</td>
                    <td className="px-6 py-4 text-gray-600">{u.display_name || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-700'}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {u.created_at ? u.created_at.split('T')[0] : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditUser(u)
                            setEditRole(u.role)
                            setEditDisplayName(u.display_name ?? '')
                            setEditActive(u.active)
                            setMsg(null)
                          }}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => { setChangePwUser(u); setNewPw(''); setConfirmPw(''); setMsg(null) }}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Ubah password"
                        >
                          <KeyRound size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget(u)
                            setMsg(null)
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
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

      {/* Security note */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <ShieldCheck size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700">
          <p className="font-semibold mb-1">Keamanan akun</p>
          <p>Password disimpan menggunakan enkripsi bcrypt. Hapus akun hanya jika benar-benar diperlukan dan pastikan ada akun super_admin lain yang aktif.</p>
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteTarget !== null}
        title="Konfirmasi Hapus Pengguna"
        message={
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Hapus user &ldquo;{deleteTarget?.username}&rdquo;?
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Tindakan ini tidak dapat dibatalkan. Akun ini tidak akan dapat login lagi ke sistem.
            </p>
          </div>
        }
        confirmText="Hapus Pengguna"
        cancelText="Batal"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMut.mutate(deleteTarget.id)
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

