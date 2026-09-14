-- Catálogo de tipos de documento (Venezuela): Natural vs Jurídica
INSERT INTO tipos_documento (codigo, tipo_persona, descripcion) VALUES
  ('V', 'N', 'Cédula de identidad venezolana'),
  ('E', 'N', 'Cédula de identidad de extranjero'),
  ('P', 'N', 'Pasaporte'),
  ('J', 'J', 'RIF de persona jurídica'),
  ('G', 'J', 'RIF gubernamental')
ON CONFLICT (codigo) DO NOTHING;

-- Catálogo de códigos telefónicos móviles venezolanos
INSERT INTO codigos_telefonicos (codigo, operadora) VALUES
  ('0412', 'Movistar'),
  ('0422', 'Movistar'),
  ('0414', 'Movilnet'),
  ('0424', 'Movilnet'),
  ('0416', 'Digitel'),
  ('0426', 'Digitel')
ON CONFLICT (codigo) DO NOTHING;

-- Usuario administrador inicial. Contraseña: Admin123! (hash bcrypt verificado)
INSERT INTO usuarios (nombre_completo, correo, contrasena_hash, rol)
VALUES (
  'Administrador',
  'admin@miempresa.com',
  '$2b$10$8DvY6tLhoPQ0RIJnsiesy.j25Jum/9rEohf5N.G6BGcHu5..1/AIG',
  'admin'
)
ON CONFLICT (correo) DO NOTHING;

INSERT INTO categorias (nombre) VALUES
  ('General'),
  ('Alimentos'),
  ('Electrónica'),
  ('Ferretería')
ON CONFLICT (nombre) DO NOTHING;

UPDATE configuracion_empresa SET
  razon_social = 'Mi Empresa, C.A.',
  rif = 'J-12345678-9',
  domicilio_fiscal = 'Av. Principal, Caracas, Venezuela',
  telefono = '0212-1234567',
  correo = 'contacto@miempresa.com'
WHERE id = 1;
