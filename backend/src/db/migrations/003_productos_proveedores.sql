-- Migración: relación muchos-a-muchos entre productos y proveedores.
-- Necesaria para poder filtrar el catálogo de productos según el proveedor
-- elegido en una orden de compra (antes no existía ninguna relación entre
-- ambas tablas, por lo que se listaban todos los productos sin distinción).
-- Uso: psql -U postgres -d sion -f src/db/migrations/003_productos_proveedores.sql

CREATE TABLE IF NOT EXISTS productos_proveedores (
  id_producto INT NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
  id_proveedor INT NOT NULL REFERENCES proveedores(id_proveedor) ON DELETE CASCADE,
  PRIMARY KEY (id_producto, id_proveedor)
);

CREATE INDEX IF NOT EXISTS idx_productos_proveedores_proveedor ON productos_proveedores (id_proveedor);
CREATE INDEX IF NOT EXISTS idx_productos_proveedores_producto ON productos_proveedores (id_producto);
