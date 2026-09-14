import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Landmark, ClipboardList, DollarSign } from 'lucide-react';
import api from '../api/client';
import { PaymentModal } from './Payables';
import { formatCurrency, formatDate } from '../utils/format';

const AGING_TONE = { pendiente: 'badge-neutral', vencida: 'badge-danger', pagada: 'badge-success' };
const AGING_LABEL = { pendiente: 'Pendiente', vencida: 'Vencida', pagada: 'Pagada' };

export default function PayableDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payable, setPayable] = useState(null);
  const [payments, setPayments] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);

  const load = () => {
    api.get(`/payables/${id}`).then(({ data }) => setPayable(data));
    api.get(`/payables/${id}/payments`).then(({ data }) => setPayments(data));
  };

  useEffect(() => { load(); }, [id]);

  if (!payable) return <p className="text-petrol-900/50 text-sm">Cargando cuenta por pagar...</p>;

  const s = AGING_TONE[payable.aging_status] ? payable.aging_status : 'pendiente';

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/cuentas-por-pagar')} className="inline-flex items-center gap-1.5 text-sm text-petrol-700 font-medium hover:underline">
        <ArrowLeft size={16} /> Volver a cuentas por pagar
      </button>

      <div className="card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-petrol-900/10 pb-5">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Landmark size={22} className="text-tech-cyan" /> {payable.supplier_name}
            </h1>
            <p className="text-sm text-petrol-900/50 mt-1">Cuenta por pagar #{payable.id}</p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <span className={`badge ${AGING_TONE[s]}`}>{AGING_LABEL[s]}</span>
            <p className="text-xs text-petrol-900/50">Creada el {formatDate(payable.created_at)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase font-semibold text-petrol-900/50">Monto original</p>
            <p className="text-petrol-900 font-medium font-mono">{formatCurrency(payable.amount, payable.currency)}</p>
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-petrol-900/50">Saldo pendiente</p>
            <p className="text-petrol-900 font-bold font-mono">{formatCurrency(payable.balance, payable.currency)}</p>
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-petrol-900/50">Vencimiento</p>
            <p className="text-petrol-900 font-medium">{payable.due_date ? formatDate(payable.due_date) : '—'}</p>
            {payable.days_overdue > 0 && <p className="text-xs text-danger-700">{payable.days_overdue} día(s) vencida</p>}
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-petrol-900/50">Días de crédito del proveedor</p>
            <p className="text-petrol-900 font-medium">{payable.payment_terms_days > 0 ? `${payable.payment_terms_days} días` : 'Contado'}</p>
          </div>
        </div>

        {payable.po_number && (
          <div className="border-t border-petrol-900/10 pt-4">
            <Link
              to={`/compras/${payable.purchase_order_id}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-petrol-700 hover:underline"
            >
              <ClipboardList size={16} /> Ver orden de compra que originó esta cuenta ({payable.po_number})
            </Link>
          </div>
        )}

        <div className="border-t border-petrol-900/10 pt-4">
          <h2 className="font-display font-bold text-petrol-900 mb-3">Historial de pagos</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-petrol-900/40 flex items-center gap-2">
              <DollarSign size={16} className="text-petrol-900/20" /> Aún no se han registrado pagos.
            </p>
          ) : (
            <div className="space-y-1">
              {payments.map((p) => (
                <div key={p.id} className="flex justify-between text-sm py-1.5 border-b border-petrol-900/5 last:border-0">
                  <span className="text-petrol-900/60">
                    {formatDate(p.created_at)} · {p.payment_method}{p.reference ? ` (${p.reference})` : ''}
                    {p.created_by_name ? ` · ${p.created_by_name}` : ''}
                  </span>
                  <span className="font-mono font-semibold text-petrol-900">{formatCurrency(p.amount, payable.currency)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {payable.status !== 'pagada' && (
          <div className="border-t border-petrol-900/10 pt-5">
            <button onClick={() => setShowPayModal(true)} className="btn-primary">Registrar pago</button>
          </div>
        )}
      </div>

      {showPayModal && (
        <PaymentModal
          title={`Pagar a ${payable.supplier_name}`}
          balance={payable.balance}
          currency={payable.currency}
          onClose={() => setShowPayModal(false)}
          onSubmit={async (payload) => {
            await api.post(`/payables/${id}/payments`, payload);
            setShowPayModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}
