import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ShoppingCart, FileCheck, Plus, Minus } from 'lucide-react';
import api from '../api/client';
import { formatCurrency, taxTypeLabel } from '../utils/format';

const TAX_RATES = { general: 16, reducida: 8, suntuario: 31, exento: 0 };

export default function Sales() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]); // [{ product, quantity, discount }]
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [finalConsumerName, setFinalConsumerName] = useState('Consumidor Final');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [currency, setCurrency] = useState('VES');
  const [isCredit, setIsCredit] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bcvRate, setBcvRate] = useState(null);
  const [scanNotice, setScanNotice] = useState('');
  const searchInputRef = useRef(null);

  // Enfoca el campo de búsqueda al entrar y tras cada escaneo, para que la
  // pistola de código de barras (que "escribe" y presiona Enter) siempre
  // tenga dónde depositar el código, sin que el cajero tenga que hacer clic.
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!scanNotice) return;
    const timer = setTimeout(() => setScanNotice(''), 2500);
    return () => clearTimeout(timer);
  }, [scanNotice]);

  useEffect(() => {
    api.get('/settings').then(({ data }) => setBcvRate(Number(data.tasa_bcv) || null));
  }, []);

  useEffect(() => {
    api.get('/products', { params: { ...(search ? { search } : {}), page_size: 100 } })
      .then(({ data }) => setProducts(data.data));
  }, [search]);

  useEffect(() => {
    api.get('/customers', { params: { page_size: 100 } }).then(({ data }) => setCustomers(data.data));
  }, []);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  };

  // Se dispara al presionar Enter en el buscador. Una pistola de código de
  // barras "escribe" el código y remata con Enter automáticamente, así que
  // este mismo campo de búsqueda funciona como zona de escaneo sin necesidad
  // de hardware/driver especial.
  const handleScan = async (code) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    const exactLocal = products.find((p) => p.sku.toLowerCase() === trimmed.toLowerCase());
    if (exactLocal) {
      addToCart(exactLocal);
      setScanNotice(`✓ ${exactLocal.name} agregado`);
      setSearch('');
      searchInputRef.current?.focus();
      return;
    }

    try {
      const { data } = await api.get('/products', { params: { search: trimmed, page_size: 5 } });
      const match = data.data.find((p) => p.sku.toLowerCase() === trimmed.toLowerCase());
      if (match) {
        addToCart(match);
        setScanNotice(`✓ ${match.name} agregado`);
      } else {
        setScanNotice(`✗ No se encontró ningún producto con el código "${trimmed}"`);
      }
    } catch {
      setScanNotice('✗ Error al buscar el código escaneado.');
    } finally {
      setSearch('');
      searchInputRef.current?.focus();
    }
  };

  const updateCartItem = (productId, field, value) => {
    setCart((prev) => prev.map((i) => (i.product.id === productId ? { ...i, [field]: value } : i)));
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    for (const item of cart) {
      const lineSubtotal = Number(item.product.unit_price) * Number(item.quantity || 0) - Number(item.discount || 0);
      const rate = TAX_RATES[item.product.tax_rate_type] ?? 0;
      subtotal += lineSubtotal;
      tax += lineSubtotal * (rate / 100);
    }
    return { subtotal, tax, total: subtotal + tax };
  }, [cart]);

  const handleSubmit = async () => {
    setError('');
    if (cart.length === 0) {
      setError('Agrega al menos un producto a la venta.');
      return;
    }
    if (isCredit && !dueDate) {
      setError('Las ventas a crédito requieren una fecha límite de pago.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        customer_id: customerId || null,
        customer_final_consumer: customerId ? undefined : { name: finalConsumerName || 'Consumidor Final' },
        payment_method: paymentMethod,
        currency,
        is_credit: isCredit,
        due_date: isCredit ? dueDate : undefined,
        notes,
        items: cart.map((i) => ({
          product_id: i.product.id,
          quantity: Number(i.quantity),
          discount: Number(i.discount || 0),
        })),
      };
      const { data } = await api.post('/invoices', payload);
      navigate(`/facturas/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al generar la factura.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart size={22} className="text-tech-cyan" /> Nueva venta
        </h1>
        <p className="text-sm text-petrol-900/50 mt-1">Selecciona productos y genera la factura fiscal</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Catálogo de productos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-petrol-900/30" />
            <input
              ref={searchInputRef}
              className="input-field pl-9"
              placeholder="Buscar producto, o escanear código de barras..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleScan(search);
                }
              }}
            />
          </div>
          {scanNotice && (
            <p className={`text-sm font-medium ${scanNotice.startsWith('✓') ? 'text-success-700' : 'text-danger-700'}`}>
              {scanNotice}
            </p>
          )}
          <div className="card divide-y divide-petrol-900/5 max-h-[520px] overflow-y-auto">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={Number(p.stock_quantity) <= 0}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-petrol-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div>
                  <p className="text-sm font-medium text-petrol-900">{p.name}</p>
                  <p className="text-xs text-petrol-900/50 font-mono">{p.sku} · {taxTypeLabel(p.tax_rate_type)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-petrol-900">{formatCurrency(p.unit_price)}</p>
                  <p className="text-xs text-petrol-900/40">Stock: {p.stock_quantity}</p>
                </div>
              </button>
            ))}
            {products.length === 0 && (
              <p className="text-center py-8 text-sm text-petrol-900/40">Sin resultados.</p>
            )}
          </div>
        </div>

        {/* Carrito / factura en curso */}
        <div className="card p-5 space-y-4 h-fit lg:sticky lg:top-8">
          <h2 className="font-display font-bold text-petrol-900 flex items-center gap-2">
            <ShoppingCart size={18} className="text-tech-cyan" /> Ticket de venta
          </h2>

          <div className="space-y-3 max-h-60 overflow-y-auto">
            {cart.length === 0 && (
              <p className="text-sm text-petrol-900/40 flex items-center gap-2 py-2">
                <ShoppingCart size={16} className="text-petrol-900/20" /> Aún no has agregado productos.
              </p>
            )}
            {cart.map((item) => (
              <div key={item.product.id} className="border-b border-petrol-900/5 pb-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-petrol-900 truncate pr-2">{item.product.name}</p>
                  <button onClick={() => removeFromCart(item.product.id)} className="text-danger-600 hover:text-danger-700" title="Quitar">
                    <X size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateCartItem(item.product.id, 'quantity', e.target.value)}
                    className="input-field !py-1 w-20 text-sm"
                  />
                  <span className="text-xs text-petrol-900/50">x {formatCurrency(item.product.unit_price)}</span>
                  <span className="ml-auto text-sm font-mono font-semibold">
                    {formatCurrency(item.product.unit_price * item.quantity - (item.discount || 0))}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="label-field">Cliente</label>
            <select className="input-field" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Consumidor Final</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} {c.document_display ? `(${c.document_display})` : ''}</option>)}
            </select>
          </div>
          {!customerId && (
            <div>
              <label className="label-field">Nombre del consumidor final</label>
              <input className="input-field" value={finalConsumerName} onChange={(e) => setFinalConsumerName(e.target.value)} />
            </div>
          )}

          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-3">
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
              <label className="label-field">Moneda</label>
              <select className="input-field" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="VES">Bolívares (VES)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>
          </div>

          <div className="border border-petrol-900/10 rounded-lg p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm text-petrol-900/70">
              <input type="checkbox" checked={isCredit} onChange={(e) => setIsCredit(e.target.checked)} />
              Venta a crédito (ej. Cashea) — genera cuenta por cobrar
            </label>
            {isCredit && (
              <div>
                <label className="label-field">Fecha límite de pago</label>
                <input required type="date" className="input-field" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            )}
          </div>

          <div>
            <label className="label-field">Notas (opcional)</label>
            <input className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="border-t border-petrol-900/10 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-petrol-900/60">
              <span>Base imponible</span><span className="font-mono">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-petrol-900/60">
              <span>IVA</span><span className="font-mono">{formatCurrency(totals.tax)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-petrol-900 pt-1">
              <span>Total</span><span className="font-mono">{formatCurrency(totals.total)}</span>
            </div>
            {bcvRate > 0 && (
              <div className="flex justify-between text-sm text-stamp-700 font-semibold pt-1">
                <span>Equivalente en $ (BCV {bcvRate.toLocaleString('es-VE', { minimumFractionDigits: 2 })})</span>
                <span className="font-mono">{formatCurrency(totals.total / bcvRate, 'USD')}</span>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-danger-700 bg-danger-100 rounded-lg px-3 py-2">{error}</p>}

          <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Generando factura...' : <><FileCheck size={16} /> Generar factura</>}
          </button>
        </div>
      </div>
    </div>
  );
}
