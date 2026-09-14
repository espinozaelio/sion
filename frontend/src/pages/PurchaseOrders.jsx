import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, X, Send, CheckCircle2, PackageCheck, Ban, ClipboardList, Trash2,
} from 'lucide-react';
import api from '../api/client';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/format';

const STATUS_LABELS = {
  borrador: { label: 'Borrador', tone: 'badge-neutral' },
  pendiente_aprobacion: { label: 'Pend. aprobación', tone: 'badge-warning' },
  aprobada: { label: 'Aprobada', tone: 'badge-success' },
  recibida: { label: 'Recibida', tone: 'badge-success' },
  cancelada: { label: 'Cancelada', tone: 'badge-danger' },
};

export default function PurchaseOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total_pages: 1, total: 0 });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  const load = useCallback(() => {
    api.get('/purchase-orders', { params: { ...(status ? { status } : {}), page, page_size: 15 } })
      .then(({ data }) => {
        setOrders(data.data);
        setPagination(data.pagination);
      });
  }, [status, page]);

  useEffect(() => { setPage(1); }, [status]);
  useEffect(() => { load(); }, [load]);

  const runAction = async (id, action, extra) => {
    setActionError('');
    try {
      await api.post(`/purchase-orders/${id}/${action}`, extra || {});
      load();
    } catch (err) {
      setActionError(err.response?.data?.message || 'No se pudo completar la acción.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList size={22} className="text-tech-cyan" /> Compras
          </h1>
          <p className="text-sm text-petrol-900/50 mt-1">Órdenes de compra y recepción de mercancía</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} /> Nueva orden</button>
      </div>

      <select className="input-field sm:max-w-[220px]" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">Todos los estados</option>
        <option value="borrador">Borrador</option>
        <option value="pendiente_aprobacion">Pendiente de aprobación</option>
        <option value="aprobada">Aprobada</option>
        <option value="recibida">Recibida</option>
        <option value="cancelada">Cancelada</option>
      </select>

      {actionError && <p className="text-sm text-danger-700 bg-danger-100 rounded-lg px-3 py-2">{actionError}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-petrol-50 text-petrol-900/60 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Nº Orden</th>
              <th className="text-left px-4 py-3 font-semibold">Proveedor</th>
              <th className="text-left px-4 py-3 font-semibold">Fecha</th>
              <th className="text-left px-4 py-3 font-semibold">Estado</th>
              <th className="text-right px-4 py-3 font-semibold">Total</th>
              <th className="text-right px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-petrol-900/5">
            {orders.map((o) => {
              const s = STATUS_LABELS[o.status] || { label: o.status, tone: 'badge-neutral' };
              return (
                <tr key={o.id} className="hover:bg-petrol-50/50">
                  <td className="px-4 py-3">
                    <Link to={`/compras/${o.id}`} className="font-mono font-semibold text-petrol-700 hover:underline">
                      {o.numero_orden}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-petrol-900">{o.supplier_name}</td>
                  <td className="px-4 py-3 text-petrol-900/60">{formatDate(o.created_at)}</td>
                  <td className="px-4 py-3"><span className={`badge ${s.tone}`}>{s.label}</span></td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrency(o.total, o.currency)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                    {o.status === 'borrador' && (
                      <button onClick={() => runAction(o.id, 'submit')} className="btn-icon" title="Enviar a flujo"><Send size={15} /></button>
                    )}
                    {o.status === 'pendiente_aprobacion' && user?.role === 'admin' && (
                      <button onClick={() => runAction(o.id, 'approve')} className="btn-icon" title="Aprobar"><CheckCircle2 size={15} /></button>
                    )}
                    {o.status === 'aprobada' && (
                      <button onClick={() => runAction(o.id, 'receive')} className="btn-icon" title="Recibir mercancía"><PackageCheck size={15} /></button>
                    )}
                    {['borrador', 'pendiente_aprobacion', 'aprobada'].includes(o.status) && (
                      <button
                        onClick={() => { if (confirm('¿Cancelar esta orden de compra?')) runAction(o.id, 'cancel'); }}
                        className="btn-icon hover:!bg-danger-100 hover:!text-danger-700"
                        title="Cancelar"
                      >
                        <Ban size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-petrol-900/40 text-sm">
                <ClipboardList size={28} className="mx-auto mb-2 text-petrol-900/20" />
                No hay órdenes de compra registradas.
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
        <NewPurchaseOrderModal
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function NewPurchaseOrderModal({ onClose, onCreated }) {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [isCredit, setIsCredit] = useState(false);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]); // [{ product_id, product_name, quantity, unit_cost }]
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/suppliers', { params: { page_size: 100 } }).then(({ data }) => setSuppliers(data.data));
  }, []);

  // Recarga el catálogo de productos cada vez que cambia el proveedor elegido,
  // trayendo solo los que están asignados a ese proveedor (ver Inventario).
  useEffect(() => {
    if (!supplierId) {
      setProducts([]);
      return;
    }
    api.get('/products', { params: { supplier_id: supplierId, page_size: 200 } })
      .then(({ data }) => setProducts(data.data));
    setItems([]); // las líneas ya agregadas pueden no pertenecer al nuevo proveedor
  }, [supplierId]);

  const addItem = () => {
    setItems([...items, { product_id: '', product_name: '', quantity: 1, unit_cost: 0 }]);
  };

  const updateItem = (idx, patch) => {
    setItems(items.map((it, i) => {
      if (i !== idx) return it;
      const merged = { ...it, ...patch };
      if (patch.product_id) {
        const p = products.find((prod) => String(prod.id) === String(patch.product_id));
        if (p) merged.product_name = p.name;
      }
      return merged;
    }));
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const total = items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.unit_cost || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!supplierId) return setError('Selecciona un proveedor.');
    if (items.length === 0 || items.some((it) => !it.product_id)) {
      return setError('Agrega al menos un producto válido a la orden.');
    }
    setSubmitting(true);
    try {
      await api.post('/purchase-orders', {
        supplier_id: supplierId,
        is_credit: isCredit,
        notes,
        items: items.map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          quantity: Number(it.quantity),
          unit_cost: Number(it.unit_cost),
        })),
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear la orden de compra.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-petrol-950/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-petrol-900/10">
          <h2 className="font-display font-bold text-petrol-900">Nueva orden de compra</h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Proveedor</label>
              <select required className="input-field" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Selecciona...</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-petrol-900/70">
                <input type="checkbox" checked={isCredit} onChange={(e) => setIsCredit(e.target.checked)} />
                Compra a crédito (genera cuenta por pagar al recibir)
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="label-field !mb-0">Productos</label>
              <button
                type="button"
                onClick={addItem}
                disabled={!supplierId}
                className="text-xs font-semibold text-petrol-700 hover:underline disabled:text-petrol-900/30 disabled:no-underline disabled:cursor-not-allowed"
              >
                + Agregar línea
              </button>
            </div>
            {!supplierId && (
              <p className="text-sm text-petrol-900/40">Selecciona un proveedor para ver sus productos.</p>
            )}
            {supplierId && products.length === 0 && (
              <p className="text-sm text-stamp-700 bg-stamp-100/50 rounded-lg px-3 py-2">
                Este proveedor no tiene productos asignados todavía. Asígnalos desde Inventario → editar producto → "Proveedores que suministran este producto".
              </p>
            )}
            {items.map((it, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center border border-petrol-900/10 rounded-lg p-3">
                <select
                  className="input-field flex-1"
                  value={it.product_id}
                  onChange={(e) => updateItem(idx, { product_id: e.target.value })}
                >
                  <option value="">Selecciona producto...</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
                <input
                  type="number" min="0.01" step="0.01" placeholder="Cant."
                  className="input-field w-full sm:w-24"
                  value={it.quantity}
                  onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                />
                <input
                  type="number" min="0" step="0.01" placeholder="Costo unit."
                  className="input-field w-full sm:w-32"
                  value={it.unit_cost}
                  onChange={(e) => updateItem(idx, { unit_cost: e.target.value })}
                />
                <button type="button" onClick={() => removeItem(idx)} className="btn-icon hover:!bg-danger-100 hover:!text-danger-700 shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {items.length === 0 && <p className="text-sm text-petrol-900/40">Aún no has agregado productos.</p>}
          </div>

          <div>
            <label className="label-field">Notas (opcional)</label>
            <input className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex justify-between items-center border-t border-petrol-900/10 pt-3">
            <span className="text-sm font-semibold text-petrol-900">Total estimado</span>
            <span className="font-mono font-bold text-petrol-900">{formatCurrency(total)}</span>
          </div>

          {error && <p className="text-sm text-danger-700 bg-danger-100 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Creando...' : 'Crear orden (borrador)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
