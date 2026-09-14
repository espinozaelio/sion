import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Ban, AlertCircle, Wallet } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PaymentModal } from './Payables';
import { formatCurrency, formatDate, taxTypeLabel } from '../utils/format';

export default function InvoiceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [voiding, setVoiding] = useState(false);
  const [error, setError] = useState('');
  const [payments, setPayments] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);

  const loadInvoice = () => {
    api.get(`/invoices/${id}`).then(({ data }) => setInvoice(data));
  };

  useEffect(() => { loadInvoice(); }, [id]);

  useEffect(() => {
    if (invoice?.is_credit) {
      api.get(`/receivables/${id}/payments`).then(({ data }) => setPayments(data));
    }
  }, [invoice?.is_credit, id]);

  const handleVoid = async () => {
    const reason = prompt('Motivo de la anulación:');
    if (reason === null) return;
    setVoiding(true);
    setError('');
    try {
      await api.post(`/invoices/${id}/void`, { reason });
      loadInvoice();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo anular la factura.');
    } finally {
      setVoiding(false);
    }
  };

  if (!invoice) return <p className="text-petrol-900/50 text-sm">Cargando factura...</p>;

  const { company } = invoice;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <button onClick={() => navigate('/facturas')} className="inline-flex items-center gap-1.5 text-sm text-petrol-700 font-medium hover:underline">
          <ArrowLeft size={16} /> Volver a facturas
        </button>
        <div className="flex gap-3">
          {invoice.status === 'emitida' && user?.role === 'admin' && (
            <button onClick={handleVoid} disabled={voiding} className="btn-danger">
              <Ban size={16} /> {voiding ? 'Anulando...' : 'Anular factura'}
            </button>
          )}
          <button onClick={() => window.print()} className="btn-primary">
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-danger-700 bg-danger-100 rounded-lg px-3 py-2 print:hidden">{error}</p>}

      {invoice.status === 'anulada' && (
        <div className="bg-danger-100 text-danger-700 text-sm rounded-lg px-4 py-3 flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>
            Esta factura fue <strong>anulada</strong> el {formatDate(invoice.voided_at)}
            {invoice.void_reason ? ` — Motivo: ${invoice.void_reason}` : ''}. El inventario fue restituido.
          </span>
        </div>
      )}

      <div className="card p-8 print:shadow-none print:border-none">
        {/* Encabezado fiscal */}
        <div className="flex items-start justify-between border-b border-petrol-900/10 pb-6 mb-6">
          <div>
            <h1 className="font-display font-extrabold text-xl text-petrol-900">{company?.razon_social}</h1>
            <p className="text-sm text-petrol-900/60 mt-1">RIF: <span className="font-mono">{company?.rif}</span></p>
            <p className="text-sm text-petrol-900/60">{company?.domicilio_fiscal}</p>
            {company?.telefono && <p className="text-sm text-petrol-900/60">Tel: {company.telefono}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="fiscal-stamp">
              <span className="label">Factura Nº</span>
              <span className="value">{invoice.invoice_number}</span>
            </div>
            <div className="fiscal-stamp">
              <span className="label">Nº de control</span>
              <span className="value">{invoice.control_number}</span>
            </div>
          </div>
        </div>

        {/* Datos del cliente */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="label-field">Facturar a</p>
            <p className="text-sm font-semibold text-petrol-900">{invoice.customer_snapshot?.name}</p>
            <p className="text-sm text-petrol-900/60">
              {invoice.customer_snapshot?.rif_cedula ? `RIF/CI: ${invoice.customer_snapshot.rif_cedula}` : 'Consumidor Final'}
            </p>
            {invoice.customer_snapshot?.address && (
              <p className="text-sm text-petrol-900/60">{invoice.customer_snapshot.address}</p>
            )}
          </div>
          <div className="text-right">
            <p className="label-field">Fecha de emisión</p>
            <p className="text-sm font-semibold text-petrol-900">{formatDate(invoice.created_at)}</p>
            <p className="text-sm text-petrol-900/60 mt-2">Método de pago: {invoice.payment_method}</p>
            <p className="text-sm text-petrol-900/60">Moneda: {invoice.currency}</p>
            <p className="text-sm text-petrol-900/60">Tasa BCV: {Number(invoice.exchange_rate).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs./$</p>
          </div>
        </div>

        {/* Líneas de la factura */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-petrol-900/20 text-xs uppercase tracking-wide text-petrol-900/60">
              <th className="text-left py-2">Descripción</th>
              <th className="text-right py-2">Cant.</th>
              <th className="text-right py-2">P. Unit.</th>
              <th className="text-right py-2">IVA</th>
              <th className="text-right py-2">Total</th>
              <th className="text-right py-2">Total $</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-petrol-900/5">
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2 text-petrol-900">{item.product_name}</td>
                <td className="py-2 text-right font-mono">{item.quantity}</td>
                <td className="py-2 text-right font-mono">{formatCurrency(item.unit_price, invoice.currency)}</td>
                <td className="py-2 text-right text-xs text-petrol-900/50">{taxTypeLabel(item.tax_rate_type)}</td>
                <td className="py-2 text-right font-mono font-semibold">{formatCurrency(item.line_total, invoice.currency)}</td>
                <td className="py-2 text-right font-mono text-stamp-700">{formatCurrency(item.line_total_usd, 'USD')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between text-petrol-900/60">
              <span>Base imponible</span><span className="font-mono">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>
            {Number(invoice.discount_total) > 0 && (
              <div className="flex justify-between text-petrol-900/60">
                <span>Descuento</span><span className="font-mono">-{formatCurrency(invoice.discount_total, invoice.currency)}</span>
              </div>
            )}
            {Number(invoice.tax_general) > 0 && (
              <div className="flex justify-between text-petrol-900/60">
                <span>IVA General (16%)</span><span className="font-mono">{formatCurrency(invoice.tax_general, invoice.currency)}</span>
              </div>
            )}
            {Number(invoice.tax_reducida) > 0 && (
              <div className="flex justify-between text-petrol-900/60">
                <span>IVA Reducido (8%)</span><span className="font-mono">{formatCurrency(invoice.tax_reducida, invoice.currency)}</span>
              </div>
            )}
            {Number(invoice.tax_suntuario) > 0 && (
              <div className="flex justify-between text-petrol-900/60">
                <span>IVA Suntuario (31%)</span><span className="font-mono">{formatCurrency(invoice.tax_suntuario, invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-petrol-900 border-t border-petrol-900/10 pt-2 mt-2">
              <span>Total</span><span className="font-mono">{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-stamp-700 pt-1">
              <span>Total en $ (Bs. {Number(invoice.exchange_rate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}/$)</span>
              <span className="font-mono">{formatCurrency(invoice.total_usd, 'USD')}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <p className="mt-6 text-sm text-petrol-900/60 border-t border-petrol-900/10 pt-4">Notas: {invoice.notes}</p>
        )}

        <p className="mt-8 text-xs text-petrol-900/40 border-t border-petrol-900/10 pt-4">
          Documento generado por SION — Sistema Integral de Operaciones de Negocio. Emitido por {invoice.created_by_name}.
        </p>
      </div>

      {invoice.is_credit && (
        <div className="card p-6 print:hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-petrol-900 flex items-center gap-2">
              <Wallet size={18} className="text-tech-cyan" /> Cuenta por cobrar
            </h2>
            {Number(invoice.balance_due) > 0 && invoice.status === 'emitida' && (
              <button onClick={() => setShowPayModal(true)} className="btn-primary">Registrar abono</button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-sm">
            <div>
              <p className="text-petrol-900/50 text-xs uppercase font-semibold">Vencimiento</p>
              <p className="font-semibold text-petrol-900">{formatDate(invoice.due_date)}</p>
            </div>
            <div>
              <p className="text-petrol-900/50 text-xs uppercase font-semibold">Saldo pendiente</p>
              <p className="font-semibold text-petrol-900 font-mono">{formatCurrency(invoice.balance_due, invoice.currency)}</p>
            </div>
            <div>
              <p className="text-petrol-900/50 text-xs uppercase font-semibold">Estado</p>
              <span className={`badge ${Number(invoice.balance_due) <= 0 ? 'badge-success' : (new Date(invoice.due_date) < new Date() ? 'badge-danger' : 'badge-neutral')}`}>
                {Number(invoice.balance_due) <= 0 ? 'Pagada' : (new Date(invoice.due_date) < new Date() ? 'Vencida' : 'Pendiente')}
              </span>
            </div>
          </div>
          {payments.length > 0 && (
            <div className="border-t border-petrol-900/10 pt-3">
              <p className="text-xs font-semibold uppercase text-petrol-900/50 mb-2">Historial de abonos</p>
              <div className="space-y-1">
                {payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span className="text-petrol-900/60">{formatDate(p.created_at)} · {p.payment_method}{p.reference ? ` (${p.reference})` : ''}</span>
                    <span className="font-mono font-semibold text-petrol-900">{formatCurrency(p.amount, invoice.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showPayModal && (
        <PaymentModal
          title={`Abono de ${invoice.customer_snapshot?.name}`}
          balance={invoice.balance_due}
          currency={invoice.currency}
          onClose={() => setShowPayModal(false)}
          onSubmit={async (payload) => {
            await api.post(`/receivables/${id}/payments`, payload);
            setShowPayModal(false);
            loadInvoice();
          }}
        />
      )}
    </div>
  );
}
