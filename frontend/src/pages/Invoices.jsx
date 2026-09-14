import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, CheckCircle2, XCircle, Receipt } from 'lucide-react';
import api from '../api/client';
import Pagination from '../components/Pagination';
import { formatCurrency, formatDate } from '../utils/format';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total_pages: 1, total: 0 });

  const load = useCallback(() => {
    const params = { page, page_size: 15 };
    if (search) params.search = search;
    if (status) params.status = status;
    api.get('/invoices', { params }).then(({ data }) => {
      setInvoices(data.data);
      setPagination(data.pagination);
    });
  }, [search, status, page]);

  useEffect(() => { setPage(1); }, [search, status]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt size={22} className="text-tech-cyan" /> Facturas
          </h1>
          <p className="text-sm text-petrol-900/50 mt-1">Historial de ventas emitidas</p>
        </div>
        <Link to="/ventas" className="btn-primary"><Plus size={16} /> Nueva venta</Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-petrol-900/30" />
          <input
            className="input-field w-full pl-9"
            placeholder="Buscar por número o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field sm:max-w-[180px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="emitida">Emitidas</option>
          <option value="anulada">Anuladas</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-petrol-50 text-petrol-900/60 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Nº Factura</th>
              <th className="text-left px-4 py-3 font-semibold">Cliente</th>
              <th className="text-left px-4 py-3 font-semibold">Fecha</th>
              <th className="text-left px-4 py-3 font-semibold">Estado</th>
              <th className="text-right px-4 py-3 font-semibold">Total</th>
              <th className="text-right px-4 py-3 font-semibold">Total $</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-petrol-900/5">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-petrol-50/50">
                <td className="px-4 py-3">
                  <Link to={`/facturas/${inv.id}`} className="font-mono font-semibold text-petrol-700 hover:underline">
                    {inv.invoice_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-petrol-900">{inv.customer_snapshot?.name}</td>
                <td className="px-4 py-3 text-petrol-900/60">{formatDate(inv.created_at)}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${inv.status === 'anulada' ? 'badge-danger' : 'badge-success'}`}>
                    {inv.status === 'anulada' ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
                    {inv.status === 'anulada' ? 'Anulada' : 'Emitida'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrency(inv.total, inv.currency)}</td>
                <td className="px-4 py-3 text-right font-mono text-stamp-700">{formatCurrency(inv.total_usd, 'USD')}</td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-petrol-900/40 text-sm">
                <Receipt size={28} className="mx-auto mb-2 text-petrol-900/20" />
                No hay facturas registradas.
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
    </div>
  );
}
