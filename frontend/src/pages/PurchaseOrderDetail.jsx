import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ClipboardList, Send, CheckCircle2, PackageCheck, Ban, Landmark,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/format';

const STATUS_LABELS = {
  borrador: { label: 'Borrador', tone: 'badge-neutral' },
  pendiente_aprobacion: { label: 'Pendiente de aprobación', tone: 'badge-warning' },
  aprobada: { label: 'Aprobada', tone: 'badge-success' },
  recibida: { label: 'Recibida', tone: 'badge-success' },
  cancelada: { label: 'Cancelada', tone: 'badge-danger' },
};

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get(`/purchase-orders/${id}`).then(({ data }) => setOrder(data));
  };

  useEffect(() => { load(); }, [id]);

  const runAction = async (action) => {
    setError('');
    setBusy(true);
    try {
      await api.post(`/purchase-orders/${id}/${action}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo completar la acción.');
    } finally {
      setBusy(false);
    }
  };

  if (!order) return <p className="text-petrol-900/50 text-sm">Cargando orden de compra...</p>;

  const s = STATUS_LABELS[order.status] || { label: order.status, tone: 'badge-neutral' };

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/compras')} className="inline-flex items-center gap-1.5 text-sm text-petrol-700 font-medium hover:underline">
        <ArrowLeft size={16} /> Volver a compras
      </button>

      {error && <p className="text-sm text-danger-700 bg-danger-100 rounded-lg px-3 py-2">{error}</p>}

      <div className="card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-petrol-900/10 pb-5">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList size={22} className="text-tech-cyan" /> {order.numero_orden}
            </h1>
            <p className="text-sm text-petrol-900/50 mt-1">Proveedor: <span className="font-medium text-petrol-900">{order.supplier_name}</span></p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <span className={`badge ${s.tone}`}>{s.label}</span>
            <p className="text-xs text-petrol-900/50">Creada el {formatDate(order.created_at)}</p>
          </div>
        </div>

        {/* Línea de tiempo simple */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase font-semibold text-petrol-900/50">Solicitada por</p>
            <p className="text-petrol-900 font-medium">{order.requested_by_name || '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-petrol-900/50">Aprobada</p>
            <p className="text-petrol-900 font-medium">{order.approved_at ? formatDate(order.approved_at) : '—'}</p>
            {order.approved_by_name && <p className="text-xs text-petrol-900/50">por {order.approved_by_name}</p>}
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-petrol-900/50">Recibida</p>
            <p className="text-petrol-900 font-medium">{order.received_at ? formatDate(order.received_at) : '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-petrol-900/50">Cancelada</p>
            <p className="text-petrol-900 font-medium">{order.cancelled_at ? formatDate(order.cancelled_at) : '—'}</p>
          </div>
        </div>

        {/* Qué se compró */}
        <div>
          <h2 className="font-display font-bold text-petrol-900 mb-3">Productos de esta orden</h2>
          <div className="overflow-x-auto border border-petrol-900/10 rounded-lg">
            <table className="w-full text-sm min-w-[520px]">
              <thead className="bg-petrol-50 text-petrol-900/60 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Producto</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Cantidad</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Costo unit.</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Total línea</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-petrol-900/5">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2.5 text-petrol-900">{item.product_name}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{item.quantity}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(item.unit_cost, order.currency)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">{formatCurrency(item.line_total, order.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totales */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between text-petrol-900/60">
              <span>Subtotal</span><span className="font-mono">{formatCurrency(order.subtotal, order.currency)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-petrol-900 border-t border-petrol-900/10 pt-2 mt-1">
              <span>Total</span><span className="font-mono">{formatCurrency(order.total, order.currency)}</span>
            </div>
          </div>
        </div>

        {order.notes && (
          <p className="text-sm text-petrol-900/60 border-t border-petrol-900/10 pt-4">Notas: {order.notes}</p>
        )}

        {/* Cuenta por pagar asociada */}
        {order.payable && (
          <div className="border-t border-petrol-900/10 pt-4">
            <Link
              to="/cuentas-por-pagar"
              className="inline-flex items-center gap-2 text-sm font-semibold text-petrol-700 hover:underline"
            >
              <Landmark size={16} /> Ver cuenta por pagar generada ({formatCurrency(order.payable.balance, order.payable.currency)} pendiente)
            </Link>
          </div>
        )}

        {/* Acciones de flujo */}
        <div className="flex flex-wrap gap-3 border-t border-petrol-900/10 pt-5">
          {order.status === 'borrador' && (
            <button onClick={() => runAction('submit')} disabled={busy} className="btn-primary">
              <Send size={16} /> Enviar a flujo
            </button>
          )}
          {order.status === 'pendiente_aprobacion' && user?.role === 'admin' && (
            <button onClick={() => runAction('approve')} disabled={busy} className="btn-primary">
              <CheckCircle2 size={16} /> Aprobar
            </button>
          )}
          {order.status === 'aprobada' && (
            <button onClick={() => runAction('receive')} disabled={busy} className="btn-primary">
              <PackageCheck size={16} /> Recibir mercancía
            </button>
          )}
          {['borrador', 'pendiente_aprobacion', 'aprobada'].includes(order.status) && (
            <button
              onClick={() => { if (confirm('¿Cancelar esta orden de compra?')) runAction('cancel'); }}
              disabled={busy}
              className="btn-danger"
            >
              <Ban size={16} /> Cancelar orden
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
