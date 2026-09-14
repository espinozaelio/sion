import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Pencil, UserX, UserCheck, Shield, X, UserCog, Eye, EyeOff, Trash2, KeyRound, Copy, Check } from 'lucide-react';
import api from '../api/client';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/format';

const emptyForm = { full_name: '', email: '', password: '', role: 'vendedor' };

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(true);
  const [error, setError] = useState('');
  const [rowError, setRowError] = useState('');
  const [resetLinkInfo, setResetLinkInfo] = useState(null); // { correo, url }
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total_pages: 1, total: 0 });

  const load = useCallback(() => {
    api.get('/users', { params: { ...(search ? { search } : {}), page, page_size: 15 } })
      .then(({ data }) => {
        setUsers(data.data);
        setPagination(data.pagination);
      });
  }, [search, page]);

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowPassword(true);
    setShowForm(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ full_name: u.nombre_completo, email: u.correo, password: '', role: u.rol });
    setError('');
    setShowPassword(true);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form };
      if (editing && !payload.password) delete payload.password; // no tocar la contraseña si se deja vacía
      if (editing) {
        await api.put(`/users/${editing.id_usuario}`, payload);
      } else {
        await api.post('/users', payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar el usuario.');
    }
  };

  const toggleActive = async (u) => {
    if (String(u.id_usuario) === String(currentUser.id)) {
      alert('No puedes desactivar tu propio usuario.');
      return;
    }
    await api.put(`/users/${u.id_usuario}`, { active: !u.activo });
    load();
  };

  const deleteUser = async (u) => {
    if (String(u.id_usuario) === String(currentUser.id)) {
      alert('No puedes eliminar tu propio usuario.');
      return;
    }
    if (!confirm(`¿Eliminar definitivamente a "${u.nombre_completo}"? Esta acción no se puede deshacer.`)) return;
    setRowError('');
    try {
      await api.delete(`/users/${u.id_usuario}`);
      load();
    } catch (err) {
      setRowError(err.response?.data?.message || 'No se pudo eliminar el usuario.');
    }
  };

  const generateResetLink = async (u) => {
    setRowError('');
    try {
      const { data } = await api.post(`/users/${u.id_usuario}/reset-link`);
      const url = `${window.location.origin}/restablecer-password?token=${data.reset_token}`;
      setResetLinkInfo({ correo: data.correo, url });
    } catch (err) {
      setRowError(err.response?.data?.message || 'No se pudo generar el enlace.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog size={22} className="text-tech-cyan" /> Usuarios
          </h1>
          <p className="text-sm text-petrol-900/50 mt-1">Cuentas de acceso al sistema</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Nuevo usuario</button>
      </div>

      <div className="relative max-w-sm w-full">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-petrol-900/30" />
        <input className="input-field w-full pl-9" placeholder="Buscar por nombre o correo..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {rowError && <p className="text-sm text-danger-700 bg-danger-100 rounded-lg px-3 py-2">{rowError}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-petrol-50 text-petrol-900/60 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Nombre</th>
              <th className="text-left px-4 py-3 font-semibold">Correo</th>
              <th className="text-left px-4 py-3 font-semibold">Rol</th>
              <th className="text-left px-4 py-3 font-semibold">Estado</th>
              <th className="text-left px-4 py-3 font-semibold">Desde</th>
              <th className="text-right px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-petrol-900/5">
            {users.map((u) => (
              <tr key={u.id_usuario} className="hover:bg-petrol-50/50">
                <td className="px-4 py-3 font-medium text-petrol-900">{u.nombre_completo}</td>
                <td className="px-4 py-3 text-petrol-900/60">{u.correo}</td>
                <td className="px-4 py-3">
                  <span className="badge badge-neutral">
                    {u.rol === 'admin' && <Shield size={11} />} {u.rol === 'admin' ? 'Administrador' : 'Vendedor'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.activo ? 'badge-success' : 'badge-danger'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-petrol-900/60">{formatDate(u.creado_en)}</td>
                <td className="px-4 py-3 text-right space-x-1">
                  <button onClick={() => openEdit(u)} className="btn-icon" title="Editar"><Pencil size={15} /></button>
                  <button
                    onClick={() => generateResetLink(u)}
                    className="btn-icon"
                    title="Generar enlace de restablecimiento de contraseña"
                  >
                    <KeyRound size={15} />
                  </button>
                  <button
                    onClick={() => toggleActive(u)}
                    className="btn-icon hover:!bg-danger-100 hover:!text-danger-700"
                    title={u.activo ? 'Desactivar' : 'Reactivar'}
                  >
                    {u.activo ? <UserX size={15} /> : <UserCheck size={15} />}
                  </button>
                  <button
                    onClick={() => deleteUser(u)}
                    className="btn-icon hover:!bg-danger-100 hover:!text-danger-700"
                    title="Eliminar definitivamente"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-petrol-900/40 text-sm">No hay usuarios registrados.</td></tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={pagination.page || page}
          totalPages={pagination.total_pages}
          total={pagination.total}
          onPageChange={setPage}
        />
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-petrol-950/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-petrol-900/10">
              <h2 className="font-display font-bold text-petrol-900">{editing ? 'Editar usuario' : 'Nuevo usuario'}</h2>
              <button onClick={() => setShowForm(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label-field">Nombre completo</label>
                <input required className="input-field" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Correo electrónico</label>
                <input required type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="label-field">{editing ? 'Nueva contraseña (opcional)' : 'Contraseña'}</label>
                <div className="relative">
                  <input
                    required={!editing}
                    type={showPassword ? 'text' : 'password'}
                    className="input-field pr-9"
                    placeholder={editing ? 'Dejar vacío para no cambiarla' : 'Mínimo 6 caracteres'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-petrol-900/30 hover:text-petrol-900/60"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label-field">Rol</label>
                <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {error && <p className="text-sm text-danger-700 bg-danger-100 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetLinkInfo && (
        <ResetLinkModal info={resetLinkInfo} onClose={() => setResetLinkInfo(null)} />
      )}
    </div>
  );
}

function ResetLinkModal({ info, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(info.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Si el navegador bloquea el portapapeles, el enlace ya está seleccionable en pantalla.
    }
  };

  return (
    <div className="fixed inset-0 bg-petrol-950/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-petrol-900/10">
          <h2 className="font-display font-bold text-petrol-900 flex items-center gap-2">
            <KeyRound size={18} className="text-tech-cyan" /> Enlace de restablecimiento
          </h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-petrol-900/60">
            Enlace generado para <span className="font-semibold text-petrol-900">{info.correo}</span>.
            Válido por 30 minutos y de un solo uso. Envíaselo por WhatsApp, mensaje de texto o cualquier
            medio distinto al correo (ya que este negocio no tiene servidor de correo configurado).
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={info.url}
              onFocus={(e) => e.target.select()}
              className="input-field font-mono text-xs flex-1"
            />
            <button onClick={handleCopy} className="btn-secondary shrink-0" title="Copiar enlace">
              {copied ? <Check size={16} className="text-success-700" /> : <Copy size={16} />}
            </button>
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={onClose} className="btn-primary">Listo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
