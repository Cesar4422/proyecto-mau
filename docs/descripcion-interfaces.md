# Descripción de las once interfaces – DW Manager

Cada interfaz incluye: descripción breve, funcionalidades y elementos de la interfaz.

---

## 1. Interfaz de Login (Iniciar sesión)

**Ubicación:** `login.html` — pestaña «Iniciar Sesión».

**Descripción:** Pantalla para autenticarse con correo y contraseña. Valida credenciales y usuario activo; si es correcto inicia sesión y redirige al panel principal; si no, muestra «Credenciales incorrectas».

**Funcionalidades:**
- Ingresar correo electrónico y contraseña.
- Validar que los campos no estén vacíos.
- Verificar usuario en BD y contraseña cifrada.
- Iniciar sesión y redirigir al panel principal.
- Mostrar mensaje de error en caso de fallo.

**Elementos de la interfaz:**
- Logo y nombre de la aplicación.
- Pestañas: Iniciar Sesión / Registrarse.
- Campo: Correo Electrónico (input email).
- Campo: Contraseña (input password con botón mostrar/ocultar).
- Botón: Iniciar Sesión.
- Área de alertas (mensajes de error/éxito).

---

## 2. Interfaz de Registro (Registrarse)

**Ubicación:** `login.html` — pestaña «Registrarse».

**Descripción:** Formulario para crear cuenta: nombre, correo (dominios gmail, hotmail, dw), contraseña mín. 8 caracteres y confirmación. Tras validar, guarda usuario, inicia sesión y redirige al panel.

**Funcionalidades:**
- Ingresar nombre completo, correo, contraseña y confirmar contraseña.
- Validar campos vacíos, dominio de correo y coincidencia de contraseñas.
- Comprobar que el correo no esté registrado.
- Guardar usuario con contraseña cifrada e iniciar sesión automática.
- Redirigir al panel principal tras registro exitoso.

**Elementos de la interfaz:**
- Pestañas: Iniciar Sesión / Registrarse.
- Campo: Nombre Completo.
- Campo: Correo Electrónico.
- Campo: Contraseña (mín. 8 caracteres) con mostrar/ocultar.
- Campo: Confirmar Contraseña con mostrar/ocultar.
- Botón: Registrarse.
- Área de alertas.

---

## 3. Interfaz del Panel Principal

**Ubicación:** `index.html` — sección «Panel Principal».

**Descripción:** Vista de resumen con métricas de inventario (productos agotados, pedidos pendientes, ocupación del almacén) y alertas de productos bajo punto de reorden. Solo lectura.

**Funcionalidades:**
- Consultar cantidad de productos con stock cero.
- Consultar órdenes pendientes de surtir.
- Consultar ocupación del almacén (unidades totales).
- Listar productos bajo punto de reorden (alertas).
- Navegar al panel desde el banner de alertas (si existe).

**Elementos de la interfaz:**
- Título y subtítulo de la sección.
- Tarjetas KPI: Productos agotados, Órdenes pendientes, Ocupación del almacén (con unidades).
- Bloque de alertas de stock mínimo (lista con scroll).
- (Opcional) Banner superior de alertas con botón «Ver panel».

---

## 4. Interfaz de Productos (Gestión de productos)

**Ubicación:** `index.html` — sección «Productos».

**Descripción:** CRUD de productos con búsqueda y filtro. Campos: nombre, código, categoría, precio, stock, punto de reorden, pasillo, estante, nivel. Valida tipos de dato y evita espacios al inicio.

**Funcionalidades:**
- Buscar por nombre o código.
- Filtrar por categoría.
- Crear producto (formulario completo).
- Editar producto (desde tabla).
- Eliminar producto (con confirmación implícita).
- Listar productos en tabla con columnas: ID, código, nombre, categoría, ubicación, precio, stock, acciones.

**Elementos de la interfaz:**
- Título y subtítulo.
- Card búsqueda: input nombre/código, select categoría, botón Buscar.
- Card formulario: nombre, código, categoría, precio, stock, punto de reorden, pasillo, estante, nivel; botones Guardar Producto y Cancelar.
- Tabla: lista de productos con botones Editar y Eliminar.

---

## 5. Interfaz de Entradas / Salidas (Movimientos de inventario)

**Ubicación:** `index.html` — sección «Entradas / Salidas».

**Descripción:** Registrar movimientos (entrada: compra/devolución; salida: venta/baja) con producto, tipo, cantidad y observaciones; actualiza stock. Consultar historial ordenado por fecha. Solo lectura del historial.

**Funcionalidades:**
- Registrar movimiento: seleccionar producto, tipo, cantidad y observaciones.
- Validar cantidad positiva y stock suficiente en salidas.
- Actualizar stock del producto automáticamente.
- Listar historial de movimientos (fecha, producto, tipo, cantidad, observaciones).

**Elementos de la interfaz:**
- Título y subtítulo.
- Formulario: select Producto, select Tipo (entrada compra/devolución, salida venta/baja), input Cantidad, input Observaciones; botón Registrar movimiento.
- Tabla historial: columnas Fecha, Producto, Tipo, Cantidad, Observaciones.

---

## 6. Interfaz de Pedidos

**Ubicación:** `index.html` — sección «Pedidos».

**Descripción:** Crear pedidos (producto, cantidad, prioridad, cliente) en estado pendiente; listar pedidos por estado; ejecutar asignación de stock según la regla activa (FIFO, prioridad, etc.).

**Funcionalidades:**
- Crear pedido: producto, cantidad solicitada, prioridad, cliente/referencia.
- Listar pedidos con estado (pendiente, parcial, surtido) y cantidades solicitada/asignada.
- Ejecutar asignación de stock por producto (botón por fila).
- Actualizar estados y stock tras la asignación.

**Elementos de la interfaz:**
- Título y subtítulo.
- Formulario nuevo pedido: select Producto, input Cantidad, input Prioridad, input Cliente/Referencia; botón Crear pedido.
- Texto explicativo sobre la asignación.
- Tabla pedidos: ID, Producto, Solicitado, Asignado, Estado, Acción (botón Ejecutar asignación).

---

## 7. Interfaz de Reglas de Asignación

**Ubicación:** `index.html` — sección «Reglas de Asignación». Solo visible para administrador.

**Descripción:** Consultar reglas disponibles y activar una (FIFO, mayor prioridad, menor cantidad, prioridad cliente). La regla activa se usa en todas las ejecuciones de asignación.

**Funcionalidades:**
- Listar reglas de asignación y mostrar cuál está activa.
- Seleccionar y activar una regla (desplegable o controles equivalentes).
- Desactivar las demás al activar una nueva.

**Elementos de la interfaz:**
- Título y subtítulo.
- Contenedor de reglas (lista o cards con selector/desplegable por regla y estado activo/inactivo).

---

## 8. Interfaz de Dashboard OLAP

**Ubicación:** `index.html` — sección «Dashboard OLAP».

**Descripción:** Vista de ventas desde el Data Warehouse: KPIs, productos estrella, gráficos (ventas por categoría, top productos, ranking sucursales, tendencia mensual, por región) y tabla de análisis. Solo lectura; datos según carga del cubo.

**Funcionalidades:**
- Refrescar cubo OLAP (sincronizar datos transaccionales con el DW).
- Consultar KPIs: total ventas, unidades vendidas, promedio por transacción, productos únicos.
- Ver productos estrella (top 3 por crecimiento).
- Ver alertas de inventario (bajo stock).
- Exportar reportes (PDF, Excel, CSV, JSON, HTML).
- Consultar gráficos: ventas por categoría, top 5 productos, ranking sucursales, tendencia mensual, por región.
- Consultar tabla de análisis detallado por producto (ranking, producto, categoría, total ventas, unidades, transacciones).

**Elementos de la interfaz:**
- Título y subtítulo.
- Botones exportación: PDF, Excel, CSV, JSON, HTML.
- Card actualización: botón Refrescar Cubo OLAP.
- Card alertas de inventario (lista).
- Card productos estrella (grid de 3).
- Grid de KPIs (4 tarjetas).
- Gráficos: Ventas por Categoría, Top 5 Productos, Ranking Sucursales, Tendencia Mensual, Por Región (canvas/Chart.js).
- Tabla análisis detallado (ranking, producto, categoría, total ventas, unidades, transacciones).

---

## 9. Interfaz de Sucursales

**Ubicación:** `index.html` — sección «Sucursales».

**Descripción:** CRUD de sucursales (nombre, ciudad, estado, región). Valida solo letras y espacios en nombre, ciudad y estado. Para reportes y análisis.

**Funcionalidades:**
- Crear sucursal.
- Editar sucursal (desde tabla).
- Eliminar sucursal.
- Listar sucursales en tabla.

**Elementos de la interfaz:**
- Título y subtítulo.
- Formulario: nombre, ciudad, estado, select región (Norte, Sur, Centro, Occidente, Oriente); botones Guardar Sucursal y Cancelar.
- Tabla: ID, Nombre, Ciudad, Estado, Región, Acciones (Editar, Eliminar).

---

## 10. Interfaz de Categorías

**Ubicación:** `index.html` — sección «Categorías».

**Descripción:** CRUD de categorías (nombre; solo letras y espacios). Los cambios se usan en el catálogo de productos.

**Funcionalidades:**
- Crear categoría.
- Editar categoría (desde tabla).
- Eliminar categoría.
- Listar categorías en tabla.

**Elementos de la interfaz:**
- Título y subtítulo.
- Formulario: input Nombre de la categoría; botones Guardar Categoría y Cancelar.
- Tabla: ID, Nombre, Acciones (Editar, Eliminar).

---

## 11. Interfaz de Análisis Temporal

**Ubicación:** `index.html` — sección «Análisis Temporal».

**Descripción:** Análisis de ventas por periodo (día, mes, trimestre, año) con roll-up y drill-down. Gráfico de evolución y exportación. Solo lectura; datos del almacén de reportes.

**Funcionalidades:**
- Seleccionar nivel temporal: Por Día, Por Mes, Por Trimestre, Por Año.
- Consultar evolución de ventas (gráfico).
- Exportar análisis (PDF, Excel, CSV, JSON, HTML).
- Navegación jerárquica (roll-up / drill-down) según nivel.

**Elementos de la interfaz:**
- Título y subtítulo.
- Botones exportación: PDF, Excel, CSV, JSON, HTML.
- Card nivel de análisis: texto explicativo y botones Por Día, Por Mes, Por Trimestre, Por Año.
- Gráfico: Evolución de Ventas (canvas).

---

## Resumen

| # | Interfaz            | Página/Sección   | Descripción breve                                              |
|---|---------------------|------------------|----------------------------------------------------------------|
| 1 | Login               | login.html       | Autenticación con correo y contraseña.                         |
| 2 | Registro            | login.html       | Alta de usuario; validación de dominio y contraseña.           |
| 3 | Panel Principal     | index → Panel    | Métricas e alertas de inventario (solo lectura).                |
| 4 | Productos           | index → Productos | CRUD productos, búsqueda y filtro por categoría.               |
| 5 | Entradas / Salidas  | index → Entradas/Salidas | Registrar movimientos y consultar historial.           |
| 6 | Pedidos             | index → Pedidos  | Crear pedidos, listar, ejecutar asignación.                    |
| 7 | Reglas de Asignación| index → Reglas   | Configurar regla activa (solo administrador).                  |
| 8 | Dashboard OLAP      | index → Dashboard| KPIs, gráficos y tendencias; exportar; refrescar cubo.          |
| 9 | Sucursales          | index → Sucursales | CRUD sucursales (nombre, ciudad, estado, región).           |
| 10| Categorías          | index → Categorías | CRUD categorías (nombre).                                   |
| 11| Análisis Temporal   | index → Análisis Temporal | Ventas por periodo; roll-up/drill-down; exportar.     |
