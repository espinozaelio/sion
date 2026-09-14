import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Wallet, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Pagination from '../components/Pagination';
import StatCard from '../components/StatCard';
import { PaymentModal } from './Payables';
import { formatCurrency, formatDate } from '../utils/format';

const AGING_TONE = { pendiente: 'badge-neutral', vencida: 'badge-danger', pagada: 'badge-success' };
const AGING_LABEL = { pendiente: 'Pendiente', vencida: 'Vencida', pagada: 'Pagada' };

export default function Receivables() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('pendiente');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total_pages: 1, total: 0 });
  const [summary, setSummary] = useState(null);
  const [collecting, setCollecting] = useState(null);

  const load = useCallback(() => {
    api.get('/receivables', { params: { ...(status ? { status } : {}), ...(search ? { search } : {}), page, page_size: 15 } })
      .then(({ data }) => {
        setItems(data.data);
        setPagination(data.pagination);
      });
  }, [status, search, page]);

  useEffect(() => { setPage(1); }, [status, search]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/receivables/summary').then(({ data }) => setSummary(data)); }, [items]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet size={22} className="text-tech-cyan" /> Cuentas por cobrar
        </h1>
        <p className="text-sm text-petrol-900/50 mt-1">Facturas a crédito (ej. Cashea u otro financiamiento) pendientes de cobro</p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard label="Saldo por cobrar total" value={formatCurrency(summary.total_pending)} sub={`${summary.pending_count} factura(s)`} icon={Wallet} tone="petrol" />
          <StatCard label="Vencido" value={formatCurrency(summary.total_overdue)} sub={`${summary.overdue_count} factura(s)`} icon={AlertTriangle} tone={Number(summary.total_overdue) > 0 ? 'danger' : 'success'} />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-petrol-900/30" />
          <input className="input-field w-full pl-9" placeholder="Buscar por factura o cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field sm:max-w-[220px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="pendiente">Pendientes</option>
          <option value="vencida">Vencidas</option>
          <option value="pagada">Pagadas</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-petrol-50 text-petrol-900/60 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Factura</th>
              <th className="text-left px-4 py-3 font-semibold">Cliente</th>
              <th className="text-left px-4 py-3 font-semibold">Vencimiento</th>
              <th className="text-left px-4 py-3 font-semibold">Estado</th>
              <th className="text-right px-4 py-3 font-semibold">Saldo</th>
              <th className="text-right px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-petrol-900/5">
            {items.map((it) => (
              <tr key={it.id} className="hover:bg-petrol-50/50">
                <td className="px-4 py-3">
                  <Link to={`/facturas/${it.id}`} className="font-mono font-semibold text-petrol-700 hover:underline">{it.invoice_number}</Link>
                </td>
                <td className="px-4 py-3 text-petrol-900">
                  <Link to={`/cuentas-por-cobrar/${it.id}`} className="hover:underline">{it.customer_snapshot?.name}</Link>
                </td>
                <td className="px-4 py-3 text-petrol-900/60">
                  {it.due_date ? formatDate(it.due_date) : '—'}
                  {it.days_overdue > 0 && <span className="text-danger-700 text-xs ml-1">({it.days_overdue}d)</span>}
                </td>
                <td className="px-4 py-3"><span className={`badge ${AGING_TONE[it.aging_status]}`}>{AGING_LABEL[it.aging_status]}</span></td>
                <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrency(it.balance_due, it.currency)}</td>
                <td className="px-4 py-3 text-right">
                  {Number(it.balance_due) > 0 && (
                    <button onClick={() => setCollecting(it)} className="text-xs font-semibold text-petrol-700 hover:underline">
                      Registrar abono
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-petrol-900/40 text-sm">
                <Wallet size={28} className="mx-auto mb-2 text-petrol-900/20" />
                No hay cuentas por cobrar en este estado.
              </td></tr>
            )}
          </tbody>
        </table>
        <Pagination page={pagination.page || page} totalPages={pagination.total_pages} total={pagination.total} onPageChange={setPage} />
      </div>

      {collecting && (
        <PaymentModal
          title={`Abono de ${collecting.customer_snapshot?.name}`}
          balance={collecting.balance_due}
          currency={collecting.currency}
          onClose={() => setCollecting(null)}
          onSubmit={async (payload) => {
            await api.post(`/receivables/${collecting.id}/payments`, payload);
            setCollecting(null);
            load();
          }}
        />
      )}
    </div>
  );
}
