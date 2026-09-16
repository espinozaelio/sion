-- Migración: módulos opcionales que el administrador puede habilitar/deshabilitar.
-- Los módulos "core" (Ventas, Facturas, Inventario, Clientes, Usuarios, Configuración)
-- NO están en esta tabla a propósito: son indispensables para operar el negocio y
-- no se pueden apagar. Solo los módulos avanzados/opcionales están aquí.
-- Uso: psql -U postgres -d TU_BASE -f src/db/migrations/004_modulos_sistema.sql

CREATE TABLE IF NOT EXISTS modulos_sistema (
  clave VARCHAR(50) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255),
  activo BOOLEAN NOT NULL DEFAULT true,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO modulos_sistema (clave, nombre, descripcion, activo) VALUES
  ('proveedores', 'Proveedores', 'Directorio de proveedores para compras.', true),
  ('compras', 'Compras', 'Órdenes de compra y recepción de mercancía.', true),
  ('cuentas_por_pagar', 'Cuentas por pagar', 'Obligaciones pendientes con proveedores.', true),
  ('cuentas_por_cobrar', 'Cuentas por cobrar', 'Facturas a crédito pendientes de cobro (ej. Cashea).', true)
ON CONFLICT (clave) DO NOTHING;
