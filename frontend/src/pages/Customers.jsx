import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, Users as UsersIcon, X } from 'lucide-react';
import api from '../api/client';
import Pagination from '../components/Pagination';
import DocumentPhoneFields from '../components/DocumentPhoneFields';

const emptyForm = {
  name: '', document_type_id: '', document_number: '', is_final_consumer: false,
  address: '', phone_code_id: '', phone_number: '', email: '',
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total_pages: 1, total: 0 });

  const load = useCallback(() => {
    api.get('/customers', { params: { ...(search ? { search } : {}), page, page_size: 15 } })
      .then(({ data }) => {
        setCustomers(data.data);
        setPagination(data.pagination);
      });
  }, [search, page]);

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name,
      document_type_id: c.document_type_id || '',
      document_number: c.document_number || '',
      is_final_consumer: c.is_final_consumer,
      address: c.address || '',
      phone_code_id: c.phone_code_id || '',
      phone_number: c.phone_number || '',
      email: c.email || '',
    });
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/customers/${editing.id}`, form);
      } else {
        await api.post('/customers', form);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar el cliente.');
    }
  };

  const handleDelete = async (c) => {
    if (!confirm(`¿Eliminar a "${c.name}"?`)) return;
    await api.delete(`/customers/${c.id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UsersIcon size={22} className="text-tech-cyan" /> Clientes
          </h1>
          <p className="text-sm text-petrol-900/50 mt-1">Directorio de clientes para facturación</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Nuevo cliente</button>
      </div>

      <div className="relative max-w-sm w-full">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-petrol-900/30" />
        <input className="input-field w-full pl-9" placeholder="Buscar por nombre o documento..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead className="bg-petrol-50 text-petrol-900/60 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Nombre</th>
              <th className="text-left px-4 py-3 font-semibold">Documento</th>
              <th className="text-left px-4 py-3 font-semibold">Tipo</th>
              <th className="text-left px-4 py-3 font-semibold">Teléfono</th>
              <th className="text-left px-4 py-3 font-semibold">Email</th>
              <th className="text-right px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-petrol-900/5">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-petrol-50/50">
                <td className="px-4 py-3 font-medium text-petrol-900">{c.name}</td>
                <td className="px-4 py-3 font-mono text-petrol-900/70">{c.document_display || '—'}</td>
                <td className="px-4 py-3">
                  {c.person_type && (
                    <span className="badge badge-neutral">{c.person_type === 'N' ? 'Natural' : 'Jurídica'}</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-petrol-900/60">{c.phone || '—'}</td>
                <td className="px-4 py-3 text-petrol-900/60">{c.email || '—'}</td>
                <td className="px-4 py-3 text-right space-x-1">
                  <button onClick={() => openEdit(c)} className="btn-icon" title="Editar"><Pencil size={15} /></button>
                  <button onClick={() => handleDelete(c)} className="btn-icon hover:!bg-danger-100 hover:!text-danger-700" title="Eliminar"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-petrol-900/40 text-sm">
                <UsersIcon size={28} className="mx-auto mb-2 text-petrol-900/20" />
                No hay clientes registrados.
              </td></tr>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-petrol-900/10">
              <h2 className="font-display font-bold text-petrol-900">{editing ? 'Editar cliente' : 'Nuevo cliente'}</h2>
              <button onClick={() => setShowForm(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label-field">Nombre / Razón social</label>
                <input required className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <DocumentPhoneFields value={form} onChange={(patch) => setForm({ ...form, ...patch })} />

              <div>
                <label className="label-field">Dirección</label>
                <input className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>

              <div>
                <label className="label-field">Email</label>
                <input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>

              <label className="flex items-center gap-2 text-sm text-petrol-900/70">
                <input
                  type="checkbox"
                  checked={form.is_final_consumer}
                  onChange={(e) => setForm({ ...form, is_final_consumer: e.target.checked })}
                />
                Consumidor final (sin documento fiscal)
              </label>

              {error && <p className="text-sm text-danger-700 bg-danger-100 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
