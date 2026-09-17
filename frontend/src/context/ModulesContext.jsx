import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const ModulesContext = createContext(null);

/**
 * Carga el estado de los módulos opcionales (Proveedores, Compras, Cuentas por
 * Pagar, Cuentas por Cobrar) una vez que hay sesión iniciada, y expone
 * isEnabled(clave) para que el Layout oculte los ítems del menú correspondientes.
 *
 * Los módulos "core" (Ventas, Facturas, Inventario, Clientes, Usuarios,
 * Configuración) no pasan por aquí — nunca se pueden apagar.
 */
export function ModulesProvider({ children }) {
  const { user } = useAuth();
  const [modules, setModules] = useState(null); // null = todavía no cargó

  const load = useCallback(() => {
    if (!user) {
      setModules(null);
      return;
    }
    api.get('/modules')
      .then(({ data }) => setModules(data))
      .catch(() => setModules([]));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const isEnabled = (clave) => {
    if (!modules) return true; // mientras carga, no ocultar de golpe (evita parpadeo)
    const mod = modules.find((m) => m.clave === clave);
    return mod ? mod.activo : true; // clave no encontrada = módulo core, siempre visible
  };

  return (
    <ModulesContext.Provider value={{ modules, isEnabled, reload: load }}>
      {children}
    </ModulesContext.Provider>
  );
}

export function useModules() {
  return useContext(ModulesContext);
}
