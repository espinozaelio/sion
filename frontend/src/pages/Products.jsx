import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Search, SlidersHorizontal, Pencil, PackageX, Package, X } from 'lucide-react';
import api from '../api/client';
import Pagination from '../components/Pagination';
import { formatCurrency, taxTypeLabel } from '../utils/format';

const emptyForm = {
  sku: '', name: '', description: '', category_id: '', unit_price: '', cost_price: '',
  tax_rate_type: 'general', stock_quantity: '', min_stock: '5', unit: 'unidad',
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [adjustingProduct, setAdjustingProduct] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total_pages: 1, total: 0 });
  const skuInputRef = useRef(null);
  const nameInputRef = useRef(null);

  const load = useCallback(() => {
    api.get('/products', { params: { ...(search ? { search } : {}), page, page_size: 15 } })
      .then(({ data }) => {
        setProducts(data.data);
        setPagination(data.pagination);
      });
  }, [search, page]);

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/categories').then(({ data }) => setCategories(data)); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
    // Deja el foco listo en SKU para escanear el código de barras de una vez.
    setTimeout(() => skuInputRef.current?.focus(), 50);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      sku: p.sku, name: p.name, description: p.description || '', category_id: p.category_id || '',
      unit_price: p.unit_price, cost_price: p.cost_price, tax_rate_type: p.tax_rate_type,
      stock_quantity: p.stock_quantity, min_stock: p.min_stock, unit: p.unit,
    });
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, category_id: form.category_id || null };
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar el producto.');
    }
  };

  const handleDeactivate = async (p) => {
    if (!confirm(`¿Desactivar "${p.name}"? No aparecerá disponible para nuevas ventas.`)) return;
    await api.delete(`/products/${p.id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package size={22} className="text-tech-cyan" /> Inventario
          </h1>
          <p className="text-sm text-petrol-900/50 mt-1">Gestión de productos y existencias</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Nuevo producto</button>
      </div>

      <div className="relative max-w-sm w-full">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-petrol-900/30" />
        <input
          className="input-field w-full pl-9"
          placeholder="Buscar por nombre o SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-petrol-50 text-petrol-900/60 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">SKU</th>
              <th className="text-left px-4 py-3 font-semibold">Nombre</th>
              <th className="text-left px-4 py-3 font-semibold">Categoría</th>
              <th className="text-right px-4 py-3 font-semibold">Precio</th>
              <th className="text-left px-4 py-3 font-semibold">IVA</th>
              <th className="text-right px-4 py-3 font-semibold">Stock</th>
              <th className="text-right px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-petrol-900/5">
            {products.map((p) => {
              const low = Number(p.stock_quantity) <= Number(p.min_stock);
              return (
                <tr key={p.id} className="hover:bg-petrol-50/50">
                  <td className="px-4 py-3 font-mono text-petrol-900/70">{p.sku}</td>
                  <td className="px-4 py-3 font-medium text-petrol-900">{p.name}</td>
                  <td className="px-4 py-3 text-petrol-900/60">{p.category_name || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.unit_price)}</td>
                  <td className="px-4 py-3 text-petrol-900/60 text-xs">{taxTypeLabel(p.tax_rate_type)}</td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${low ? 'text-stamp-700' : 'text-petrol-900'}`}>
                    {p.stock_quantity} {p.unit}
                  </td>
                  <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                    <button onClick={() => setAdjustingProduct(p)} className="btn-icon" title="Ajustar stock">
                      <SlidersHorizontal size={15} />
                    </button>
                    <button onClick={() => openEdit(p)} className="btn-icon" title="Editar">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDeactivate(p)} className="btn-icon hover:!bg-danger-100 hover:!text-danger-700" title="Desactivar">
                      <PackageX size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-petrol-900/40 text-sm">
                <Package size={28} className="mx-auto mb-2 text-petrol-900/20" />
                No hay productos registrados.
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
        <Modal onClose={() => setShowForm(false)} title={editing ? 'Editar producto' : 'Nuevo producto'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">SKU / Código</label>
                <input
                  required
                  ref={skuInputRef}
                  className="input-field"
                  placeholder="Escanea o escribe el código..."
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      nameInputRef.current?.focus();
                    }
                  }}
                />
              </div>
              <div>
                <label className="label-field">Nombre</label>
                <input required ref={nameInputRef} className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="label-field">Descripción</label>
              <textarea className="input-field" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">Categoría</label>
                <select className="input-field" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">Sin categoría</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label-field">Unidad de medida</label>
                <input className="input-field" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label-field">Precio de venta (sin IVA)</label>
                <input required type="number" step="0.01" min="0" className="input-field" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Costo</label>
                <input type="number" step="0.01" min="0" className="input-field" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Tipo de IVA</label>
                <select className="input-field" value={form.tax_rate_type} onChange={(e) => setForm({ ...form, tax_rate_type: e.target.value })}>
                  <option value="general">General (16%)</option>
                  <option value="reducida">Reducido (8%)</option>
                  <option value="suntuario">Suntuario (31%)</option>
                  <option value="exento">Exento</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!editing && (
                <div>
                  <label className="label-field">Stock inicial</label>
                  <input type="number" step="0.01" min="0" className="input-field" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
                </div>
              )}
              <div>
                <label className="label-field">Stock mínimo (alerta)</label>
                <input type="number" step="0.01" min="0" className="input-field" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
              </div>
            </div>

            {error && <p className="text-sm text-danger-700 bg-danger-100 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" className="btn-primary">Guardar</button>
            </div>
          </form>
        </Modal>
      )}

      {adjustingProduct && (
        <StockAdjustModal
          product={adjustingProduct}
          onClose={() => setAdjustingProduct(null)}
          onDone={() => { setAdjustingProduct(null); load(); }}
        />
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-petrol-950/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-petrol-900/10">
          <h2 className="font-display font-bold text-petrol-900">{title}</h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function StockAdjustModal({ product, onClose, onDone }) {
  const [movementType, setMovementType] = useState('entrada');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/products/${product.id}/stock-adjustment`, {
        movement_type: movementType,
        quantity: Number(quantity),
        reason,
      });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al ajustar el inventario.');
    }
  };

  return (
    <Modal title={`Ajustar stock — ${product.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-petrol-900/60">
          Stock actual: <span className="font-mono font-semibold text-petrol-900">{product.stock_quantity} {product.unit}</span>
        </p>
        <div>
          <label className="label-field">Tipo de movimiento</label>
          <select className="input-field" value={movementType} onChange={(e) => setMovementType(e.target.value)}>
            <option value="entrada">Entrada (compra / reposición)</option>
            <option value="salida">Salida (merma / uso interno)</option>
            <option value="ajuste">Ajuste de conteo (+/-)</option>
          </select>
        </div>
        <div>
          <label className="label-field">
            {movementType === 'ajuste' ? 'Cantidad (usa negativo para restar)' : 'Cantidad'}
          </label>
          <input required type="number" step="0.01" className="input-field" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
        <div>
          <label className="label-field">Motivo (opcional)</label>
          <input className="input-field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: compra a proveedor, conteo físico..." />
        </div>
        {error && <p className="text-sm text-danger-700 bg-danger-100 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" className="btn-primary">Aplicar ajuste</button>
        </div>
      </form>
    </Modal>
  );
}
