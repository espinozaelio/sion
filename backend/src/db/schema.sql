-- ============================================================================
-- SION — Sistema Integral de Operaciones de Negocio
-- Esquema de base de datos (PostgreSQL) — normalizado hasta 3FN
--
-- Convenciones:
--  - Todas las llaves primarias son SERIAL (enteros autoincrementales legibles,
--    no UUID), con el patrón id_<entidad>.
--  - Nombres de tabla en español, en plural, snake_case.
--  - Catálogos (tipos_documento, codigos_telefonicos) evitan dependencias
--    transitivas: por ejemplo, el tipo de persona (Natural/Jurídica) se
--    obtiene por JOIN a tipos_documento en vez de repetirse en cada cliente
--    o proveedor.
--  - Los "snapshots" (datos_cliente en facturas, nombre_producto en detalle)
--    son una excepción intencional: una factura emitida no debe cambiar
--    aunque el cliente o el producto se editen después. Esto es una práctica
--    estándar de auditoría contable, no una violación de normalización.
-- ============================================================================

-- ============================================================================
-- CATÁLOGOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS tipos_documento (
  id_tipo_documento SERIAL PRIMARY KEY,
  codigo VARCHAR(1) NOT NULL UNIQUE,                 -- V, E, J, G, P
  tipo_persona CHAR(1) NOT NULL CHECK (tipo_persona IN ('N','J')), -- N=Natural, J=Jurídica
  descripcion VARCHAR(60) NOT NULL
);

CREATE TABLE IF NOT EXISTS codigos_telefonicos (
  id_codigo_telefonico SERIAL PRIMARY KEY,
  codigo VARCHAR(4) NOT NULL UNIQUE,                 -- 0412, 0414, 0416, 0422, 0424, 0426
  operadora VARCHAR(30) NOT NULL
);

-- ============================================================================
-- USUARIOS Y SEGURIDAD
-- ============================================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario SERIAL PRIMARY KEY,
  nombre_completo VARCHAR(150) NOT NULL,
  correo VARCHAR(150) NOT NULL UNIQUE,
  contrasena_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL DEFAULT 'vendedor' CHECK (rol IN ('admin','vendedor')),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS restablecimientos_contrasena (
  id_restablecimiento SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expira_en TIMESTAMPTZ NOT NULL,
  usado BOOLEAN NOT NULL DEFAULT false,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- CONFIGURACIÓN FISCAL DE LA EMPRESA (fila única)
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuracion_empresa (
  id INT PRIMARY KEY DEFAULT 1,
  razon_social VARCHAR(200) NOT NULL DEFAULT 'Mi Empresa, C.A.',
  rif VARCHAR(20) NOT NULL DEFAULT 'J-00000000-0',
  domicilio_fiscal TEXT NOT NULL DEFAULT 'Venezuela',
  telefono VARCHAR(50),
  correo VARCHAR(150),
  tasa_iva_general NUMERIC(5,2) NOT NULL DEFAULT 16.00,
  tasa_iva_reducida NUMERIC(5,2) NOT NULL DEFAULT 8.00,
  tasa_iva_suntuario NUMERIC(5,2) NOT NULL DEFAULT 31.00,
  moneda_principal VARCHAR(5) NOT NULL DEFAULT 'VES',
  tasa_bcv NUMERIC(14,4) NOT NULL DEFAULT 1.0000,
  tasa_bcv_actualizada_en TIMESTAMPTZ,
  siguiente_numero_factura INT NOT NULL DEFAULT 1,
  siguiente_numero_control INT NOT NULL DEFAULT 1,
  prefijo_factura VARCHAR(10) NOT NULL DEFAULT 'F',
  umbral_aprobacion_compra NUMERIC(14,2) NOT NULL DEFAULT 0,
  siguiente_numero_orden_compra INT NOT NULL DEFAULT 1,
  prefijo_orden_compra VARCHAR(10) NOT NULL DEFAULT 'OC',
  CONSTRAINT config_fila_unica CHECK (id = 1)
);

-- Fila única de configuración (se crea con sus valores DEFAULT; se edita luego, nunca se inserta otra).
INSERT INTO configuracion_empresa (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INVENTARIO
-- ============================================================================

CREATE TABLE IF NOT EXISTS categorias (
  id_categoria SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS productos (
  id_producto SERIAL PRIMARY KEY,
  sku VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  id_categoria INT REFERENCES categorias(id_categoria) ON DELETE SET NULL,
  precio_unitario NUMERIC(14,2) NOT NULL DEFAULT 0,
  precio_costo NUMERIC(14,2) NOT NULL DEFAULT 0,
  tipo_tasa_iva VARCHAR(20) NOT NULL DEFAULT 'general' CHECK (tipo_tasa_iva IN ('general','reducida','suntuario','exento')),
  cantidad_stock NUMERIC(14,2) NOT NULL DEFAULT 0,
  stock_minimo NUMERIC(14,2) NOT NULL DEFAULT 5,
  unidad_medida VARCHAR(20) NOT NULL DEFAULT 'unidad',
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos (nombre);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id_movimiento SERIAL PRIMARY KEY,
  id_producto INT NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
  tipo_movimiento VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('entrada','salida','ajuste','venta','devolucion')),
  cantidad NUMERIC(14,2) NOT NULL,
  motivo VARCHAR(255),
  id_factura_referencia INT,
  id_orden_compra_referencia INT,
  id_usuario_creador INT REFERENCES usuarios(id_usuario),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos_inventario (id_producto);

-- ============================================================================
-- CLIENTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS clientes (
  id_cliente SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  id_tipo_documento INT REFERENCES tipos_documento(id_tipo_documento),
  numero_documento VARCHAR(10),
  es_consumidor_final BOOLEAN NOT NULL DEFAULT false,
  direccion TEXT,
  id_codigo_telefonico INT REFERENCES codigos_telefonicos(id_codigo_telefonico),
  numero_telefono CHAR(7) CHECK (numero_telefono ~ '^[0-9]{7}$'),
  correo VARCHAR(150),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id_tipo_documento, numero_documento)
);

-- ============================================================================
-- FACTURACIÓN (VENTAS + CUENTAS POR COBRAR)
-- ============================================================================

CREATE TABLE IF NOT EXISTS facturas (
  id_factura SERIAL PRIMARY KEY,
  numero_factura VARCHAR(30) UNIQUE NOT NULL,
  numero_control VARCHAR(30) UNIQUE NOT NULL,
  id_cliente INT REFERENCES clientes(id_cliente),
  datos_cliente JSONB NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'emitida' CHECK (estado IN ('emitida','anulada')),
  metodo_pago VARCHAR(30) NOT NULL DEFAULT 'efectivo',
  moneda VARCHAR(5) NOT NULL DEFAULT 'VES',
  tasa_cambio NUMERIC(14,4) NOT NULL DEFAULT 1.0000,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  descuento_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  iva_general NUMERIC(14,2) NOT NULL DEFAULT 0,
  iva_reducido NUMERIC(14,2) NOT NULL DEFAULT 0,
  iva_suntuario NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  es_credito BOOLEAN NOT NULL DEFAULT false,
  fecha_vencimiento DATE,
  saldo_pendiente NUMERIC(14,2) NOT NULL DEFAULT 0,
  pagada_en TIMESTAMPTZ,
  notas TEXT,
  id_usuario_creador INT REFERENCES usuarios(id_usuario),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  anulada_en TIMESTAMPTZ,
  motivo_anulacion TEXT
);

CREATE INDEX IF NOT EXISTS idx_facturas_creado_en ON facturas (creado_en);
CREATE INDEX IF NOT EXISTS idx_facturas_credito ON facturas (es_credito) WHERE es_credito = true;

CREATE TABLE IF NOT EXISTS detalle_facturas (
  id_detalle_factura SERIAL PRIMARY KEY,
  id_factura INT NOT NULL REFERENCES facturas(id_factura) ON DELETE CASCADE,
  id_producto INT REFERENCES productos(id_producto),
  nombre_producto VARCHAR(200) NOT NULL,
  cantidad NUMERIC(14,2) NOT NULL,
  precio_unitario NUMERIC(14,2) NOT NULL,
  tipo_tasa_iva VARCHAR(20) NOT NULL DEFAULT 'general',
  tasa_iva NUMERIC(5,2) NOT NULL DEFAULT 16.00,
  descuento NUMERIC(14,2) NOT NULL DEFAULT 0,
  subtotal_linea NUMERIC(14,2) NOT NULL,
  iva_linea NUMERIC(14,2) NOT NULL,
  total_linea NUMERIC(14,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_detalle_facturas_factura ON detalle_facturas (id_factura);

CREATE TABLE IF NOT EXISTS pagos_por_cobrar (
  id_pago_cobrar SERIAL PRIMARY KEY,
  id_factura INT NOT NULL REFERENCES facturas(id_factura) ON DELETE CASCADE,
  monto NUMERIC(14,2) NOT NULL,
  metodo_pago VARCHAR(30) NOT NULL DEFAULT 'efectivo',
  referencia VARCHAR(100),
  id_usuario_creador INT REFERENCES usuarios(id_usuario),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagos_cobrar_factura ON pagos_por_cobrar (id_factura);

-- ============================================================================
-- PROVEEDORES Y COMPRAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS proveedores (
  id_proveedor SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  id_tipo_documento INT REFERENCES tipos_documento(id_tipo_documento),
  numero_documento VARCHAR(10),
  nombre_contacto VARCHAR(150),
  id_codigo_telefonico INT REFERENCES codigos_telefonicos(id_codigo_telefonico),
  numero_telefono CHAR(7) CHECK (numero_telefono ~ '^[0-9]{7}$'),
  correo VARCHAR(150),
  direccion TEXT,
  dias_credito INT NOT NULL DEFAULT 0,
  requiere_aprobacion_siempre BOOLEAN NOT NULL DEFAULT false,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id_tipo_documento, numero_documento)
);

-- ============================================================================
-- RELACIÓN PRODUCTOS <-> PROVEEDORES (muchos a muchos)
-- Un producto puede ser suministrado por varios proveedores, y un proveedor
-- puede suministrar varios productos. Esta tabla es la que permite filtrar
-- el catálogo de productos según el proveedor elegido en una orden de compra.
-- ============================================================================
CREATE TABLE IF NOT EXISTS productos_proveedores (
  id_producto INT NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
  id_proveedor INT NOT NULL REFERENCES proveedores(id_proveedor) ON DELETE CASCADE,
  PRIMARY KEY (id_producto, id_proveedor)
);

CREATE INDEX IF NOT EXISTS idx_productos_proveedores_proveedor ON productos_proveedores (id_proveedor);
CREATE INDEX IF NOT EXISTS idx_productos_proveedores_producto ON productos_proveedores (id_producto);

CREATE TABLE IF NOT EXISTS ordenes_compra (
  id_orden_compra SERIAL PRIMARY KEY,
  numero_orden VARCHAR(30) UNIQUE NOT NULL,
  id_proveedor INT NOT NULL REFERENCES proveedores(id_proveedor),
  estado VARCHAR(20) NOT NULL DEFAULT 'borrador'
    CHECK (estado IN ('borrador','pendiente_aprobacion','aprobada','recibida','cancelada')),
  moneda VARCHAR(5) NOT NULL DEFAULT 'VES',
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  es_credito BOOLEAN NOT NULL DEFAULT false,
  notas TEXT,
  id_usuario_solicitante INT REFERENCES usuarios(id_usuario),
  id_usuario_aprobador INT REFERENCES usuarios(id_usuario),
  aprobada_en TIMESTAMPTZ,
  recibida_en TIMESTAMPTZ,
  cancelada_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ordenes_compra_estado ON ordenes_compra (estado);

CREATE TABLE IF NOT EXISTS detalle_ordenes_compra (
  id_detalle_orden SERIAL PRIMARY KEY,
  id_orden_compra INT NOT NULL REFERENCES ordenes_compra(id_orden_compra) ON DELETE CASCADE,
  id_producto INT REFERENCES productos(id_producto),
  nombre_producto VARCHAR(200) NOT NULL,
  cantidad NUMERIC(14,2) NOT NULL,
  costo_unitario NUMERIC(14,2) NOT NULL,
  total_linea NUMERIC(14,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_detalle_orden_compra ON detalle_ordenes_compra (id_orden_compra);

-- ============================================================================
-- CUENTAS POR PAGAR (a proveedores)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cuentas_por_pagar (
  id_cuenta_pagar SERIAL PRIMARY KEY,
  id_orden_compra INT REFERENCES ordenes_compra(id_orden_compra),
  id_proveedor INT NOT NULL REFERENCES proveedores(id_proveedor),
  monto NUMERIC(14,2) NOT NULL,
  saldo NUMERIC(14,2) NOT NULL,
  moneda VARCHAR(5) NOT NULL DEFAULT 'VES',
  fecha_vencimiento DATE,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','pagada')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pagos_por_pagar (
  id_pago_pagar SERIAL PRIMARY KEY,
  id_cuenta_pagar INT NOT NULL REFERENCES cuentas_por_pagar(id_cuenta_pagar) ON DELETE CASCADE,
  monto NUMERIC(14,2) NOT NULL,
  metodo_pago VARCHAR(30) NOT NULL DEFAULT 'efectivo',
  referencia VARCHAR(100),
  id_usuario_creador INT REFERENCES usuarios(id_usuario),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagos_pagar_cuenta ON pagos_por_pagar (id_cuenta_pagar);
