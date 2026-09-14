import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, DollarSign, X, Landmark } from 'lucide-react';
import api from '../api/client';
import Pagination from '../components/Pagination';
import StatCard from '../components/StatCard';
import { formatCurrency, formatDate } from '../utils/format';

const AGING_TONE = { pendiente: 'badge-neutral', vencida: 'badge-danger', pagada: 'badge-success' };
const AGING_LABEL = { pendiente: 'Pendiente', vencida: 'Vencida', pagada: 'Pagada' };

export default function Payables() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('pendiente');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total_pages: 1, total: 0 });
  const [summary, setSummary] = useState(null);
  const [paying, setPaying] = useState(null);

  const load = useCallback(() => {
    api.get('/payables', { params: { ...(status ? { status } : {}), page, page_size: 15 } })
      .then(({ data }) => {
        setItems(data.data);
        setPagination(data.pagination);
      });
  }, [status, page]);

  useEffect(() => { setPage(1); }, [status]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/payables/summary').then(({ data }) => setSummary(data)); }, [items]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Landmark size={22} className="text-tech-cyan" /> Cuentas por pagar
        </h1>
        <p className="text-sm text-petrol-900/50 mt-1">Obligaciones pendientes con proveedores</p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard label="Saldo pendiente total" value={formatCurrency(summary.total_pending)} sub={`${summary.pending_count} cuenta(s)`} icon={Landmark} tone="petrol" />
          <StatCard label="Vencido" value={formatCurrency(summary.total_overdue)} sub={`${summary.overdue_count} cuenta(s)`} icon={AlertTriangle} tone={Number(summary.total_overdue) > 0 ? 'danger' : 'success'} />
        </div>
      )}

      <select className="input-field sm:max-w-[220px]" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">Todos</option>
        <option value="pendiente">Pendientes</option>
        <option value="vencida">Vencidas</option>
        <option value="pagada">Pagadas</option>
      </select>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-petrol-50 text-petrol-900/60 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Proveedor</th>
              <th className="text-left px-4 py-3 font-semibold">Orden</th>
              <th className="text-left px-4 py-3 font-semibold">Vencimiento</th>
              <th className="text-left px-4 py-3 font-semibold">Estado</th>
              <th className="text-right px-4 py-3 font-semibold">Saldo</th>
              <th className="text-right px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-petrol-900/5">
            {items.map((it) => (
              <tr key={it.id} className="hover:bg-petrol-50/50">
                <td className="px-4 py-3 font-medium text-petrol-900">
                  <Link to={`/cuentas-por-pagar/${it.id}`} className="hover:underline">{it.supplier_name}</Link>
                </td>
                <td className="px-4 py-3 font-mono text-petrol-900/60">{it.po_number || '—'}</td>
                <td className="px-4 py-3 text-petrol-900/60">
                  {it.due_date ? formatDate(it.due_date) : '—'}
                  {it.days_overdue > 0 && <span className="text-danger-700 text-xs ml-1">({it.days_overdue}d)</span>}
                </td>
                <td className="px-4 py-3"><span className={`badge ${AGING_TONE[it.aging_status]}`}>{AGING_LABEL[it.aging_status]}</span></td>
                <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrency(it.balance, it.currency)}</td>
                <td className="px-4 py-3 text-right">
                  {it.status !== 'pagada' && (
                    <button onClick={() => setPaying(it)} className="text-xs font-semibold text-petrol-700 hover:underline">
                      Registrar pago
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-petrol-900/40 text-sm">
                <DollarSign size={28} className="mx-auto mb-2 text-petrol-900/20" />
                No hay cuentas por pagar en este estado.
              </td></tr>
            )}
          </tbody>
        </table>
        <Pagination page={pagination.page || page} totalPages={pagination.total_pages} total={pagination.total} onPageChange={setPage} />
      </div>

      {paying && (
        <PaymentModal
          title={`Pagar a ${paying.supplier_name}`}
          balance={paying.balance}
          currency={paying.currency}
          onClose={() => setPaying(null)}
          onSubmit={async (payload) => {
            await api.post(`/payables/${paying.id}/payments`, payload);
            setPaying(null);
            load();
          }}
        />
      )}
    </div>
  );
}

export function PaymentModal({ title, balance, currency, onClose, onSubmit }) {
  const [amount, setAmount] = useState(balance);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({ amount: Number(amount), payment_method: paymentMethod, reference });
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrar el pago.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-petrol-950/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-petrol-900/10">
          <h2 className="font-display font-bold text-petrol-900">{title}</h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-petrol-900/60">Saldo pendiente: <span className="font-mono font-semibold text-petrol-900">{formatCurrency(balance, currency)}</span></p>
          <div>
            <label className="label-field">Monto a pagar/abonar</label>
            <input required type="number" min="0.01" step="0.01" max={balance} className="input-field" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="label-field">Método de pago</label>
            <select className="input-field" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="efectivo">Efectivo</option>
              <option value="pago_movil">Pago móvil</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="cashea">Cashea</option>
              <option value="divisas">Divisas (USD)</option>
            </select>
          </div>
          <div>
            <label className="label-field">Referencia (opcional)</label>
            <input className="input-field" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          {error && <p className="text-sm text-danger-700 bg-danger-100 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Guardando...' : 'Confirmar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
