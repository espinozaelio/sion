# SION — Sistema Integral de Operaciones de Negocio

Aplicación full-stack para un negocio pequeño (una sucursal, pocos usuarios) que cubre:

- **Inventario**: productos, categorías, stock con alertas de mínimo, historial de movimientos (entradas, salidas, ajustes, ventas, devoluciones).
- **Ventas**: punto de venta simple (carrito) que descuenta inventario automáticamente.
- **Facturación fiscal ajustada a Venezuela**: RIF del emisor y el receptor, número de factura y número de control correlativos, desglose de IVA por tasa (general 16%, reducida 8%, suntuaria 31%, exento), consumidor final sin RIF, anulación de facturas con restitución de inventario, y equivalente en $ según la tasa BCV vigente.

**Stack:** React + Tailwind CSS (frontend) · Node.js + Express (backend) · PostgreSQL (base de datos).

> ⚠️ **Nota legal importante**: este sistema genera facturas con los campos fiscales básicos que exige el SENIAT (RIF, número de control, IVA discriminado, etc.), pero **no está homologado** ante el SENIAT. Para operar en pleno cumplimiento normativo necesitas integrarlo con una máquina fiscal, una imprenta digital autorizada, o un proveedor de facturación homologado, según tu condición de contribuyente. Revisa la sección "Configuración fiscal" dentro de la app para más detalle.

---

## 1. Estructura del proyecto

```
sion/
├── backend/          → API REST (Node + Express + Postgres)
│   └── src/
│       ├── config/    → conexión a la base de datos
│       ├── controllers/
│       ├── middleware/ → autenticación JWT, manejo de errores
│       ├── routes/
│       ├── utils/      → paginación reutilizable
│       └── db/        → schema.sql, seed.sql, migraciones, script de inicialización
└── frontend/          → Interfaz web (React + Vite + Tailwind)
    └── src/
        ├── api/        → cliente axios
        ├── context/    → contexto de autenticación
        ├── components/ → Layout, Paginación, rutas protegidas, tarjetas
        └── pages/      → Login, Dashboard, Ventas, Facturas, Inventario, Clientes, Configuración
```

---

## 2. Requisitos previos

- Node.js 18 o superior
- PostgreSQL 14 o superior (local o remoto)
- npm

---

## 3. Configurar la base de datos

> ⚠️ **Si ya tenías una instalación previa de SION**: el esquema fue reescrito por completo (normalización a 3FN, IDs seriales en vez de UUID, nombres de tablas en español, catálogos de documento/teléfono venezolanos). No hay una migración incremental posible para un cambio de esta magnitud — la recomendación es **recrear la base de datos desde cero** con los pasos de abajo. Si tienes datos reales que no quieres perder, expórtalos primero (`pg_dump`) y vuelve a insertarlos manualmente adaptados al nuevo esquema.

1. Crea una base de datos vacía en Postgres, por ejemplo:

   ```bash
   createdb sistema_ventas
   ```

2. Copia el archivo de variables de entorno del backend:

   ```bash
   cd backend
   cp .env.example .env
   ```

3. Edita `.env` y ajusta `DATABASE_URL` con tus credenciales, por ejemplo:

   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sistema_ventas
   ```

4. Instala las dependencias e inicializa el esquema + datos de ejemplo:

   ```bash
   npm install
   npm run db:init
   ```

   Esto crea todas las tablas y siembra:
   - Un usuario administrador: **admin@miempresa.com / Admin123!**
   - Categorías básicas de ejemplo
   - Datos fiscales de ejemplo de la empresa (puedes editarlos luego desde "Configuración fiscal" en la app)

---

## 4. Levantar el backend

```bash
cd backend
npm run dev
```

La API quedará disponible en `http://localhost:4000/api`. Puedes verificar que esté viva en `http://localhost:4000/api/health`.

Variables de entorno relevantes (`backend/.env`):

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (por defecto 4000) |
| `DATABASE_URL` | Cadena de conexión a Postgres |
| `JWT_SECRET` | Secreto para firmar los tokens (cámbialo en producción) |
| `JWT_EXPIRES_IN` | Duración del token (ej. `8h`) |
| `CORS_ORIGIN` | URL del frontend permitida (ej. `http://localhost:5173`) |

---

## 5. Levantar el frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173` en el navegador. Si tu backend corre en una URL distinta a `http://localhost:4000/api`, crea un archivo `frontend/.env` con:

```
VITE_API_URL=http://localhost:4000/api
```

---

## 6. Primer uso

1. Inicia sesión con `admin@miempresa.com` / `Admin123!`.
2. Ve a **Configuración fiscal** y actualiza la razón social, el RIF y el domicilio fiscal de tu negocio real.
3. Ve a **Inventario** y crea tus productos (define bien el tipo de IVA de cada uno: general, reducido, suntuario o exento).
4. Ve a **Clientes** si quieres precargar clientes frecuentes con su RIF/cédula (opcional; también puedes facturar a "Consumidor Final" sin registrarlo).
5. Ve a **Nueva venta**, agrega productos al ticket y genera la factura. El número de factura y el número de control avanzan automáticamente.
6. Desde **Facturas** puedes ver el historial, imprimir cualquier factura (botón "Imprimir") o anularla (solo administradores; restituye el inventario).

---

## 7. Roles de usuario

- **admin**: acceso total, incluida la configuración fiscal, anulación de facturas y creación de nuevos usuarios (vía API `POST /api/auth/users`, aún no tiene pantalla propia en el frontend).
- **vendedor**: puede vender, gestionar inventario y clientes, pero no puede anular facturas ni editar la configuración fiscal.

Para crear un nuevo usuario vendedor puedes usar por ejemplo `curl` o Postman contra el backend ya autenticado como admin:

```bash
curl -X POST http://localhost:4000/api/auth/users \
  -H "Authorization: Bearer TU_TOKEN_DE_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Nombre Apellido","email":"vendedor@miempresa.com","password":"ClaveSegura123","role":"vendedor"}'
```

---

## 8. Diseño responsive

La interfaz está adaptada para escritorio, tablet y móvil:
- En pantallas grandes (`lg` en adelante) la barra lateral es fija.
- En móvil/tablet la navegación se convierte en un menú deslizable (☰) con una barra superior compacta.
- Las tablas (inventario, facturas, clientes) permiten scroll horizontal en pantallas pequeñas sin romper el diseño.
- Los formularios (productos, clientes, configuración) pasan de 2-3 columnas a una sola columna en móvil.

---

## 9. Tasa de cambio BCV

El sistema usa una tasa BCV real en los cálculos y la muestra en dólares junto a los montos en bolívares:

- Ve a **Configuración fiscal** → botón **"Actualizar automáticamente"** para traer la tasa oficial vigente desde una fuente pública (`ve.dolarapi.com`), o edítala manualmente en el mismo campo y guarda con "Guardar cambios".
- Cada factura **congela** la tasa BCV vigente al momento de emitirse (columna `exchange_rate`), así que si actualizas la tasa después, las facturas ya emitidas no cambian — solo las nuevas usarán la tasa más reciente.
- El equivalente en $ aparece en: el ticket de venta, el listado de facturas (columna "Total $") y el detalle/impresión de cada factura (por línea y en el total).

**Si ya habías corrido `npm run db:init` antes de esta funcionalidad**, aplica esta migración pequeña (agrega una columna sin borrar tus datos):

```bash
cd backend
psql -U postgres -d sistema_ventas -f src/db/migrations/001_add_tasa_bcv_updated_at.sql
```

Si es una instalación nueva, no necesitas hacer nada extra: el `schema.sql` ya incluye la columna.

---

## 10. Identidad visual: SION

El sistema se renombró a **SION — Sistema Integral de Operaciones de Negocio**, con una interfaz tipo panel administrativo:

- **Paleta de color**: azul corporativo profundo (confianza, orden y estabilidad financiera) como color de marca — usado en la barra de navegación, el logotipo y las acciones primarias — combinado con un ámbar de "sello fiscal" para acentos relacionados con facturación.
- **Iconos reales** (librería `lucide-react`) en la barra lateral, buscadores, botones de acción (editar, eliminar, ajustar stock, imprimir, anular) y estados vacíos.
- **Badges de estado con icono** (factura emitida ✓ / anulada ✗) y colores semánticos (verde para éxito, rojo para alertas/errores) consistentes en toda la app.

**Si ya tenías el proyecto corriendo**, después de reemplazar los archivos del `frontend` reinstala dependencias para traer `lucide-react` y los estilos nuevos:

```bash
cd frontend
npm install
npm run dev
```

---

## 11. Paginación

Los listados de **Inventario**, **Facturas** y **Clientes** ahora están paginados (15 registros por página) en vez de cargar todo de una vez:

- El backend acepta `?page=1&page_size=15` en `GET /api/products`, `GET /api/customers` y `GET /api/invoices`, y responde con `{ data: [...], pagination: { page, page_size, total, total_pages } }`.
- El frontend muestra controles de página (◀ ▶) debajo de cada tabla, con el total de registros encontrados.
- La búsqueda y los filtros reinician la paginación a la página 1 automáticamente.

---

## 12. Corrección: error al registrar un cliente con dirección

Se corrigió un error en `POST /api/customers` donde el campo **Dirección** provocaba un fallo al **crear** un cliente (aunque funcionaba bien al **editar** uno existente). La causa era un `COALESCE` mal ubicado en la consulta SQL de inserción, que forzaba el valor de dirección (texto) a compararse con un booleano. Ya está corregido: ahora se puede registrar un cliente nuevo con dirección sin problemas.

---


## 13. Base de datos normalizada (3FN) e IDs seriales

El esquema fue rediseñado desde cero siguiendo formas normales:

- **1FN**: todos los campos son atómicos (por ejemplo, el teléfono se separa en `id_codigo_telefonico` + `numero_telefono` en vez de un solo string mixto; el documento de identidad se separa en `id_tipo_documento` + `numero_documento`).
- **2FN**: no hay dependencias parciales — todas las tablas con llave primaria simple (serial autoincremental) garantizan que cada columna dependa de toda la clave.
- **3FN**: se eliminaron dependencias transitivas moviendo datos repetibles a catálogos propios: `tipos_documento` (V, E, J, G, P — con su `tipo_persona` Natural/Jurídica) y `codigos_telefonicos` (0412, 0414, 0416, 0422, 0424, 0426), en vez de guardar esos valores repetidos en cada cliente/proveedor.

**IDs**: todas las tablas usan `SERIAL`/`BIGSERIAL` (enteros autoincrementales, ej. `id_cliente = 1, 2, 3...`) en vez de UUID, para que sean legibles y no parezcan "encriptados".

**Nombres de tablas en español**, siguiendo un estándar consistente: `usuarios`, `clientes`, `proveedores`, `productos`, `categorias`, `facturas`, `detalle_facturas`, `ordenes_compra`, `detalle_ordenes_compra`, `cuentas_por_pagar`, `pagos_por_pagar`, `pagos_por_cobrar`, `movimientos_inventario`, `configuracion_empresa`, `tipos_documento`, `codigos_telefonicos`, `restablecimientos_contrasena`.

---

## 14. Dominio venezolano: persona natural/jurídica y teléfonos

- **Tipo de documento** (`tipos_documento`): V y E para persona **Natural**, J y G para persona **Jurídica**, P para pasaporte. Cada cliente/proveedor guarda `id_tipo_documento` + `numero_documento`, y la API expone un campo calculado `document_display` (ej. `"J-301234567"`) y `person_type` (`"N"` o `"J"`) listos para mostrar en el frontend.
- **Teléfonos**: el catálogo `codigos_telefonicos` solo permite los prefijos móviles venezolanos vigentes: `0412`, `0414`, `0416`, `0422`, `0424`, `0426`. El número se guarda como `CHAR(7)` con un `CHECK` que exige exactamente 7 dígitos. La API expone el campo combinado `phone` ya formateado (ej. `"0412-8326360"`).
- El formulario reutilizable `DocumentPhoneFields` (frontend) muestra estos selects/inputs en Clientes y Proveedores, alimentados por `GET /api/catalogs/tipos-documento` y `GET /api/catalogs/codigos-telefonicos`.

---

## 15. Módulos de Compras, Cuentas por Pagar y Cuentas por Cobrar (implementados)

### Proveedores (`/proveedores`)
CRUD completo con documento, teléfono, persona de contacto, días de crédito y la opción "siempre requiere aprobación".

### Compras (`/compras`)
Flujo de aprobación **mixto según proveedor/monto**:
1. Se crea la orden en estado `borrador`.
2. Al enviarla (`POST /purchase-orders/:id/submit`), el sistema decide automáticamente: si el proveedor tiene "siempre requiere aprobación" **o** el total supera el `umbral_aprobacion_compra` (configurable en Configuración fiscal), pasa a `pendiente_aprobacion`; si no, se **aprueba automáticamente**.
3. Un admin aprueba (`pendiente_aprobacion → aprobada`).
4. Al **recibir** la mercancía (`aprobada → recibida`): se suma el inventario, se actualiza el costo del producto, y si la compra es a crédito, se genera automáticamente una **cuenta por pagar** con vencimiento según los días de crédito del proveedor.
5. Se puede **cancelar** en cualquier estado previo a "recibida".

### Cuentas por pagar (`/cuentas-por-pagar`)
Listado con antigüedad de saldos (pendiente / vencida / pagada), resumen de totales, y registro de pagos parciales o totales a proveedores.

### Cuentas por cobrar (`/cuentas-por-cobrar`)
Cualquier factura marcada como **crédito** en el punto de venta (por ejemplo, ventas por **Cashea** u otro financiamiento) genera automáticamente una cuenta por cobrar con fecha límite. Desde esta pantalla o desde el detalle de la factura se registran abonos del cliente hasta saldar la deuda.

---

## 16. Módulo de usuarios (CRUD completo)

Pantalla `/usuarios` (solo administradores): crear, editar (nombre, correo, rol, contraseña opcional) y activar/desactivar usuarios. Un administrador no puede desactivar su propia cuenta. La API vive en `/api/users`.

---

## 17. Inicio de sesión rediseñado (identidad técnica)

Se refactorizaron **solo** las pantallas de autenticación (`Login`, `ForgotPassword`, `ResetPassword`) y sus componentes de apoyo (`AuthSidePanel`, `NetworkBackground`) — el resto de la app conserva su paleta e identidad de marca (azul petróleo + ámbar) sin cambios.

**Diseño:**
- Paleta técnica dedicada (`tech.*` en `tailwind.config.js`): fondo casi negro `#0D1117`, azul eléctrico `#2563EB`, cian `#06B6D4`, blanco `#F8FAFC`, gris `#64748B`.
- Tipografía monospace (`IBM Plex Mono`) para el logotipo "SION_", sans-serif para el resto.
- **Firma visual**: animación de nodos interconectados en canvas (`NetworkBackground.jsx`) en el panel izquierdo oscuro — reinterpretando la idea de "red" como la integración de los módulos del negocio (ventas, inventario, facturación, compras, cuentas), en vez de un contexto literal de redes WiFi. Respeta `prefers-reduced-motion`.
- **Layout dividido**: panel izquierdo oscuro con el logo, eslogan y reloj en vivo; panel derecho claro con el formulario, para máximo contraste.

**Funcionalidad:**
- Validación de campos vacíos/formato inválido con mensajes de error inline por campo (correo y contraseña), antes de llamar a la API.
- Botón de mostrar/ocultar contraseña (ícono de ojo) en login y restablecimiento.
- Atajo de teclado Enter (nativo del formulario; en login, Enter en el campo de correo mueve el foco a contraseña).
- Banner de éxito animado (fade-in) tras un login correcto, con una breve pausa antes de redirigir al panel.
- **Recuperar contraseña**: flujo completo con `/olvide-password` → token de un solo uso válido por 30 minutos → `/restablecer-password?token=...`.
  > Nota: como no hay un servidor de correo (SMTP) configurado, el enlace de restablecimiento se muestra directamente en pantalla en modo desarrollo en vez de enviarse por email. Para producción, conecta un proveedor de correo (ej. Resend, SendGrid) en `authController.js` donde se genera el `reset_token`.

---

## 18. Paginación (verificada)

Se probó de extremo a extremo contra una base de datos Postgres real: los listados de Productos, Clientes, Proveedores, Facturas, Órdenes de Compra, Cuentas por Pagar y Cuentas por Cobrar devuelven `{ data, pagination: { page, page_size, total, total_pages } }`, y el componente `Pagination` se oculta automáticamente cuando solo hay una página de resultados (comportamiento esperado, no un error).

---

## 19. Próximos pasos sugeridos

- Conectar un proveedor de correo real para el flujo de "olvidé mi contraseña".
- Exportar facturas y órdenes de compra a PDF.
- Reporte formal de antigüedad de saldos por rangos (0-30, 31-60, 61-90, +90 días) para cuentas por pagar y cobrar.
- Soporte multi-sucursal si el negocio crece.
- Integración con un proveedor de facturación electrónica homologado por el SENIAT.
