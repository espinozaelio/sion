import { useEffect, useState } from 'react';
import { RefreshCw, Save, Info, Settings as SettingsIcon } from 'lucide-react';
import ModuleToggles from '../components/ModuleToggles';
import api from '../api/client';

export default function Settings() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');

  useEffect(() => {
    api.get('/settings').then(({ data }) => setForm(data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    try {
      const { data } = await api.put('/settings', form);
      setForm(data);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar la configuración.');
    }
  };

  const handleRefreshBcv = async () => {
    setRefreshing(true);
    setError('');
    setRefreshMsg('');
    try {
      const { data } = await api.post('/settings/refresh-bcv-rate');
      setForm(data);
      setRefreshMsg(`Tasa actualizada: ${Number(data.tasa_bcv).toLocaleString('es-VE', { minimumFractionDigits: 2 })} VES por USD`);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo actualizar la tasa BCV automáticamente. Ingrésala manualmente.');
    } finally {
      setRefreshing(false);
    }
  };
 

  
  if (!form) return <p className="text-petrol-900/50 text-sm">Cargando configuración...</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon size={22} className="text-tech-cyan" /> Configuración fiscal
        </h1>
        <p className="text-sm text-petrol-900/50 mt-1">
          Datos del emisor y tasas de IVA usadas para generar las facturas.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="label-field">Razón social</label>
          <input required className="input-field" value={form.razon_social} onChange={(e) => setForm({ ...form, razon_social: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-field">RIF</label>
            <input required className="input-field font-mono" value={form.rif} onChange={(e) => setForm({ ...form, rif: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Prefijo de factura</label>
            <input className="input-field" value={form.prefijo_factura} onChange={(e) => setForm({ ...form, prefijo_factura: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label-field">Domicilio fiscal</label>
          <input className="input-field" value={form.domicilio_fiscal} onChange={(e) => setForm({ ...form, domicilio_fiscal: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-field">Teléfono</label>
            <input className="input-field" value={form.telefono || ''} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Email</label>
            <input className="input-field" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>

        <div className="border-t border-petrol-900/10 pt-4">
          <p className="text-sm font-semibold text-petrol-900 mb-3">Tasas de IVA (SENIAT)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label-field">General %</label>
              <input type="number" step="0.01" className="input-field" value={form.tasa_iva_general} onChange={(e) => setForm({ ...form, tasa_iva_general: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Reducida %</label>
              <input type="number" step="0.01" className="input-field" value={form.tasa_iva_reducida} onChange={(e) => setForm({ ...form, tasa_iva_reducida: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Suntuaria %</label>
              <input type="number" step="0.01" className="input-field" value={form.tasa_iva_suntuario} onChange={(e) => setForm({ ...form, tasa_iva_suntuario: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="border-t border-petrol-900/10 pt-4">
          <p className="text-sm font-semibold text-petrol-900 mb-1">Tasa de cambio BCV (VES por USD)</p>
          <p className="text-xs text-petrol-900/50 mb-3">
            Esta tasa se usa para mostrar el equivalente en dólares en el ticket de venta y en la factura.
            Cada factura guarda la tasa vigente al momento de emitirse, así que ventas pasadas no cambian
            aunque actualices la tasa después.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 w-full">
              <label className="label-field">Tasa actual</label>
              <input
                type="number"
                step="0.0001"
                className="input-field font-mono"
                value={form.tasa_bcv}
                onChange={(e) => setForm({ ...form, tasa_bcv: e.target.value })}
              />
            </div>
            <button
              type="button"
              onClick={handleRefreshBcv}
              disabled={refreshing}
              className="btn-secondary whitespace-nowrap"
            >
              {refreshing ? 'Consultando BCV...' : <><RefreshCw size={15} /> Actualizar automáticamente</>}
            </button>
          </div>
          {form.tasa_bcv_updated_at && (
            <p className="text-xs text-petrol-900/40 mt-2">
              Última actualización: {new Date(form.tasa_bcv_updated_at).toLocaleString('es-VE')}
            </p>
          )}
          {refreshMsg && (
            <p className="text-sm text-success-700 bg-success-100 rounded-lg px-3 py-2 mt-3">{refreshMsg}</p>
          )}
        </div>

        {error && <p className="text-sm text-danger-700 bg-danger-100 rounded-lg px-3 py-2">{error}</p>}
        {saved && <p className="text-sm text-success-700 bg-success-100 rounded-lg px-3 py-2">Configuración guardada correctamente.</p>}

        <button type="submit" className="btn-primary"><Save size={16} /> Guardar cambios</button>
      </form>

      <div className="card p-5 bg-stamp-100/40 border-stamp-600/30">
        <p className="text-sm text-stamp-700 font-semibold mb-1 flex items-center gap-1.5">
          <Info size={15} /> Nota sobre homologación SENIAT
        </p>
        <p className="text-sm text-petrol-900/70">
          Este sistema genera facturas con los campos fiscales básicos exigidos (RIF, número de control,
          desglose de IVA, etc.). Para operar 100% en cumplimiento con la normativa vigente (máquinas fiscales,
          imprentas digitales autorizadas o proveedores de facturación homologados), deberás integrar este
          sistema con un proveedor certificado por el SENIAT según tu tipo de contribuyente.
        </p>
      </div>
      <ModuleToggles />
    </div>
    
  );
}
