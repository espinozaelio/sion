import { useCatalogs } from '../hooks/useCatalogs';

/**
 * Campos de "tipo de documento + número" y "código telefónico + número" siguiendo
 * el estándar venezolano: V/E/P (persona natural), J/G (persona jurídica),
 * y prefijos móviles 0412/0414/0416/0422/0424/0426 + 7 dígitos.
 *
 * `value` espera: { document_type_id, document_number, phone_code_id, phone_number }
 * `onChange(patch)` recibe un objeto parcial para mezclar con el form del padre.
 */
export default function DocumentPhoneFields({ value, onChange }) {
  const { documentTypes, phoneCodes, loading } = useCatalogs();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-[7rem_1fr] gap-3">
        <div>
          <label className="label-field">Tipo doc.</label>
          <select
            className="input-field"
            disabled={loading}
            value={value.document_type_id || ''}
            onChange={(e) => onChange({ document_type_id: e.target.value || null })}
          >
            <option value="">—</option>
            {documentTypes.map((t) => (
              <option key={t.id_tipo_documento} value={t.id_tipo_documento}>
                {t.codigo} · {t.tipo_persona === 'N' ? 'Natural' : 'Jurídica'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-field">Número de documento</label>
          <input
            className="input-field"
            placeholder="12345678"
            maxLength={10}
            value={value.document_number || ''}
            onChange={(e) => onChange({ document_number: e.target.value.replace(/\D/g, '') })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[7rem_1fr] gap-3">
        <div>
          <label className="label-field">Código</label>
          <select
            className="input-field"
            disabled={loading}
            value={value.phone_code_id || ''}
            onChange={(e) => onChange({ phone_code_id: e.target.value || null })}
          >
            <option value="">—</option>
            {phoneCodes.map((c) => (
              <option key={c.id_codigo_telefonico} value={c.id_codigo_telefonico}>
                {c.codigo}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-field">Número (7 dígitos)</label>
          <input
            className="input-field font-mono"
            placeholder="8326360"
            maxLength={7}
            value={value.phone_number || ''}
            onChange={(e) => onChange({ phone_number: e.target.value.replace(/\D/g, '').slice(0, 7) })}
          />
        </div>
      </div>
    </div>
  );
}
