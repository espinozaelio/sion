import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, TrendingUp, Package, AlertTriangle, Plus, ArrowRight, LayoutDashboard } from 'lucide-react';
import api from '../api/client';
import StatCard from '../components/StatCard';
import { formatCurrency, formatDate } from '../utils/format';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/summary')
      .then(({ data }) => setSummary(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-petrol-900/50 text-sm">Cargando panel...</p>;
  if (!summary) return <p className="text-danger-700 text-sm">No se pudo cargar el panel.</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard size={22} className="text-tech-cyan" /> Panel general
          </h1>
          <p className="text-sm text-petrol-900/50 mt-1">Resumen de operaciones de hoy</p>
        </div>
        <Link to="/ventas" className="btn-primary">
          <Plus size={16} /> Nueva venta
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Ventas de hoy"
          value={formatCurrency(summary.today_sales_total)}
          sub={`${summary.today_sales_count} factura(s)`}
          icon={DollarSign}
          tone="stamp"
        />
        <StatCard
          label="Ventas del mes"
          value={formatCurrency(summary.month_sales_total)}
          sub={`${summary.month_sales_count} factura(s)`}
          icon={TrendingUp}
          tone="petrol"
        />
        <StatCard
          label="Productos activos"
          value={summary.total_active_products}
          icon={Package}
          tone="petrol"
        />
        <StatCard
          label="Productos con stock bajo"
          value={summary.low_stock_products.length}
          sub={summary.low_stock_products.length > 0 ? 'Requieren reposición' : 'Todo en orden'}
          icon={AlertTriangle}
          tone={summary.low_stock_products.length > 0 ? 'danger' : 'success'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="card p-5">
          <h2 className="font-display font-bold text-petrol-900 mb-4">Últimas facturas</h2>
          {summary.recent_invoices.length === 0 ? (
            <p className="text-sm text-petrol-900/50">Aún no hay facturas emitidas.</p>
          ) : (
            <div className="space-y-1">
              {summary.recent_invoices.map((inv) => (
                <Link
                  key={inv.id}
                  to={`/facturas/${inv.id}`}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-petrol-50 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-mono font-semibold text-petrol-900">{inv.invoice_number}</p>
                    <p className="text-xs text-petrol-900/50">{inv.customer_name} · {formatDate(inv.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-petrol-900">{formatCurrency(inv.total, inv.currency)}</p>
                    <ArrowRight size={14} className="text-petrol-900/30 group-hover:text-petrol-900/60 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-display font-bold text-petrol-900 mb-4">Stock bajo mínimo</h2>
          {summary.low_stock_products.length === 0 ? (
            <p className="text-sm text-petrol-900/50">No hay productos por debajo del mínimo.</p>
          ) : (
            <div className="space-y-2">
              {summary.low_stock_products.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-stamp-100/50">
                  <AlertTriangle size={16} className="text-stamp-700 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-petrol-900 truncate">{p.name}</p>
                    <p className="text-xs text-petrol-900/50 font-mono">{p.sku}</p>
                  </div>
                  <p className="text-sm font-semibold text-stamp-700 shrink-0">
                    {p.stock_quantity} / {p.min_stock}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
