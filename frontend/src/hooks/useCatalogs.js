import { useEffect, useState } from 'react';
import api from '../api/client';

let cache = null; // cache a nivel de módulo: se piden una sola vez por sesión de la app

export function useCatalogs() {
  const [catalogs, setCatalogs] = useState(cache || { documentTypes: [], phoneCodes: [] });
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    Promise.all([
      api.get('/catalogs/tipos-documento'),
      api.get('/catalogs/codigos-telefonicos'),
    ]).then(([docRes, phoneRes]) => {
      cache = { documentTypes: docRes.data, phoneCodes: phoneRes.data };
      setCatalogs(cache);
      setLoading(false);
    });
  }, []);

  return { ...catalogs, loading };
}
