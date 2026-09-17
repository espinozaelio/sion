import { useEffect, useState } from 'react';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../api/client';
import { useModules } from '../context/ModulesContext';

/**
 * Bloque para insertar dentro de Settings.jsx (pantalla ya restringida a admin).
 * Permite prender/apagar los módulos opcionales: Proveedores, Compras,
 * Cuentas por Pagar y Cuentas por Cobrar. Los módulos core no aparecen aquí
 * porque nunca se pueden apagar.
 */
export default function ModuleToggles() {
  const { reload } = useModules();
  const [modules, setModules] = useState([]);
  const [savingKey, setSavingKey] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api.get('/modules').then(({ data }) => setModules(data));
  };

  useEffect(() => { load(); }, []);

  const toggle = async (mod) => {
    setError('');
    setSavingKey(mod.clave);
    try {
      await api.put(`/modules/${mod.clave}`, { active: !mod.activo });
      load();
      reload?.(); // refresca también el menú lateral de inmediato
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo actualizar el módulo.');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="card p-6 space-y-4">
      <div>
        <h2 className="font-display font-bold text-petrol-900">Módulos del sistema</h2>
        <p className="text-sm text-petrol-900/50 mt-1">
          Apaga los módulos que tu negocio no use todavía. Los módulos apagados desaparecen
          del menú para todos los usuarios y quedan bloqueados también por seguridad, aunque
          alguien intente acceder directo por la URL.
        </p>
      </div>

      {error && <p className="text-sm text-danger-700 bg-danger-100 rounded-lg px-3 py-2">{error}</p>}

      <div className="divide-y divide-petrol-900/10">
        {modules.map((mod) => (
          <div key={mod.clave} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-petrol-900">{mod.nombre}</p>
              {mod.descripcion && <p className="text-xs text-petrol-900/50">{mod.descripcion}</p>}
            </div>
            <button
              onClick={() => toggle(mod)}
              disabled={savingKey === mod.clave}
              className="disabled:opacity-50"
              title={mod.activo ? 'Deshabilitar' : 'Habilitar'}
            >
              {mod.activo ? (
                <ToggleRight size={32} className="text-tech-cyan" />
              ) : (
                <ToggleLeft size={32} className="text-petrol-900/30" />
              )}
            </button>
          </div>
        ))}
        {modules.length === 0 && (
          <p className="text-sm text-petrol-900/40 py-3">Cargando módulos...</p>
        )}
      </div>
    </div>
    
  );
}
