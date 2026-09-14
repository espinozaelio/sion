import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Wallet, Receipt, DollarSign } from 'lucide-react';
import api from '../api/client';
import { PaymentModal } from './Payables';
import { formatCurrency, formatDate } from '../utils/format';

const AGING_TONE = { pendiente: 'badge-neutral', vencida: 'badge-danger', pagada: 'badge-success' };
const AGING_LABEL = { pendiente: 'Pendiente', vencida: 'Vencida', pagada: 'Pagada' };

export default function ReceivableDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receivable, setReceivable] = useState(null);
  const [payments, setPayments] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);

  const load = () => {
    api.get(`/receivables/${id}`).then(({ data }) => setReceivable(data));
    api.get(`/receivables/${id}/payments`).then(({ data }) => setPayments(data));
  };

  useEffect(() => { load(); }, [id]);

  if (!receivable) return <p className="text-petrol-900/50 text-sm">Cargando cuenta por cobrar...</p>;

  const s = AGING_TONE[receivable.aging_status] ? receivable.aging_status : 'pendiente';

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/cuentas-por-cobrar')} className="inline-flex items-center gap-1.5 text-sm text-petrol-700 font-medium hover:underline">
        <ArrowLeft size={16} /> Volver a cuentas por cobrar
      </button>

      <div className="card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-petrol-900/10 pb-5">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wallet size={22} className="text-tech-cyan" /> {receivable.customer_snapshot?.name}
            </h1>
            <p className="text-sm text-petrol-900/50 mt-1">Cuenta por cobrar #{receivable.id}</p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <span className={`badge ${AGING_TONE[s]}`}>{AGING_LABEL[s]}</span>
            <p className="text-xs text-petrol-900/50">Creada el {formatDate(receivable.created_at)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase font-semibold text-petrol-900/50">Total de la factura</p>
            <p className="text-petrol-900 font-medium font-mono">{formatCurrency(receivable.total, receivable.currency)}</p>
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-petrol-900/50">Saldo pendiente</p>
            <p className="text-petrol-900 font-bold font-mono">{formatCurrency(receivable.balance_due, receivable.currency)}</p>
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-petrol-900/50">Vencimiento</p>
            <p className="text-petrol-900 font-medium">{receivable.due_date ? formatDate(receivable.due_date) : '—'}</p>
            {receivable.days_overdue > 0 && <p className="text-xs text-danger-700">{receivable.days_overdue} día(s) vencida</p>}
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-petrol-900/50">Pagada el</p>
            <p className="text-petrol-900 font-medium">{receivable.paid_at ? formatDate(receivable.paid_at) : '—'}</p>
          </div>
        </div>

        <div className="border-t border-petrol-900/10 pt-4">
          <Link
            to={`/facturas/${receivable.id}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-petrol-700 hover:underline"
          >
            <Receipt size={16} /> Ver factura fiscal ({receivable.invoice_number})
          </Link>
        </div>

        <div className="border-t border-petrol-900/10 pt-4">
          <h2 className="font-display font-bold text-petrol-900 mb-3">Historial de abonos</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-petrol-900/40 flex items-center gap-2">
              <DollarSign size={16} className="text-petrol-900/20" /> Aún no se han registrado abonos.
            </p>
          ) : (
            <div className="space-y-1">
              {payments.map((p) => (
                <div key={p.id} className="flex justify-between text-sm py-1.5 border-b border-petrol-900/5 last:border-0">
                  <span className="text-petrol-900/60">
                    {formatDate(p.created_at)} · {p.payment_method}{p.reference ? ` (${p.reference})` : ''}
                    {p.created_by_name ? ` · ${p.created_by_name}` : ''}
                  </span>
                  <span className="font-mono font-semibold text-petrol-900">{formatCurrency(p.amount, receivable.currency)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {Number(receivable.balance_due) > 0 && (
          <div className="border-t border-petrol-900/10 pt-5">
            <button onClick={() => setShowPayModal(true)} className="btn-primary">Registrar abono</button>
          </div>
        )}
      </div>

      {showPayModal && (
        <PaymentModal
          title={`Abono de ${receivable.customer_snapshot?.name}`}
          balance={receivable.balance_due}
          currency={receivable.currency}
          onClose={() => setShowPayModal(false)}
          onSubmit={async (payload) => {
            await api.post(`/receivables/${id}/payments`, payload);
            setShowPayModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}
