import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, Truck, X } from 'lucide-react';
import api from '../api/client';
import Pagination from '../components/Pagination';
import DocumentPhoneFields from '../components/DocumentPhoneFields';

const emptyForm = {
  name: '', document_type_id: '', document_number: '', contact_name: '',
  phone_code_id: '', phone_number: '', email: '', address: '',
  payment_terms_days: 0, always_requires_approval: false,
};

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total_pages: 1, total: 0 });

  const load = useCallback(() => {
    api.get('/suppliers', { params: { ...(search ? { search } : {}), page, page_size: 15 } })
      .then(({ data }) => {
        setSuppliers(data.data);
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

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name,
      document_type_id: s.document_type_id || '',
      document_number: s.document_number || '',
      contact_name: s.contact_name || '',
      phone_code_id: s.phone_code_id || '',
      phone_number: s.phone_number || '',
      email: s.email || '',
      address: s.address || '',
      payment_terms_days: s.payment_terms_days ?? 0,
      always_requires_approval: s.always_requires_approval,
    });
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/suppliers/${editing.id}`, form);
      } else {
        await api.post('/suppliers', form);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar el proveedor.');
    }
  };

  const handleDelete = async (s) => {
    if (!confirm(`¿Desactivar a "${s.name}"?`)) return;
    await api.delete(`/suppliers/${s.id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck size={22} className="text-tech-cyan" /> Proveedores
          </h1>
          <p className="text-sm text-petrol-900/50 mt-1">Directorio de proveedores para compras</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Nuevo proveedor</button>
      </div>

      <div className="relative max-w-sm w-full">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-petrol-900/30" />
        <input className="input-field w-full pl-9" placeholder="Buscar por nombre o documento..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-petrol-50 text-petrol-900/60 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Nombre</th>
              <th className="text-left px-4 py-3 font-semibold">Documento</th>
              <th className="text-left px-4 py-3 font-semibold">Contacto</th>
              <th className="text-left px-4 py-3 font-semibold">Teléfono</th>
              <th className="text-right px-4 py-3 font-semibold">Días crédito</th>
              <th className="text-right px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-petrol-900/5">
            {suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-petrol-50/50">
                <td className="px-4 py-3 font-medium text-petrol-900">
                  {s.name}
                  {s.always_requires_approval && (
                    <span className="badge badge-warning ml-2">Siempre requiere aprobación</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-petrol-900/70">{s.document_display || '—'}</td>
                <td className="px-4 py-3 text-petrol-900/60">{s.contact_name || '—'}</td>
                <td className="px-4 py-3 font-mono text-petrol-900/60">{s.phone || '—'}</td>
                <td className="px-4 py-3 text-right text-petrol-900/60">{s.payment_terms_days > 0 ? `${s.payment_terms_days} días` : 'Contado'}</td>
                <td className="px-4 py-3 text-right space-x-1">
                  <button onClick={() => openEdit(s)} className="btn-icon" title="Editar"><Pencil size={15} /></button>
                  <button onClick={() => handleDelete(s)} className="btn-icon hover:!bg-danger-100 hover:!text-danger-700" title="Desactivar"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-petrol-900/40 text-sm">
                <Truck size={28} className="mx-auto mb-2 text-petrol-900/20" />
                No hay proveedores registrados.
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
              <h2 className="font-display font-bold text-petrol-900">{editing ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
              <button onClick={() => setShowForm(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label-field">Nombre / Razón social</label>
                <input required className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <DocumentPhoneFields value={form} onChange={(patch) => setForm({ ...form, ...patch })} />

              <div>
                <label className="label-field">Persona de contacto</label>
                <input className="input-field" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Email</label>
                  <input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="label-field">Días de crédito</label>
                  <input type="number" min="0" className="input-field" value={form.payment_terms_days} onChange={(e) => setForm({ ...form, payment_terms_days: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="label-field">Dirección</label>
                <input className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>

              <label className="flex items-center gap-2 text-sm text-petrol-900/70">
                <input
                  type="checkbox"
                  checked={form.always_requires_approval}
                  onChange={(e) => setForm({ ...form, always_requires_approval: e.target.checked })}
                />
                Las compras a este proveedor siempre requieren aprobación (sin importar el monto)
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
