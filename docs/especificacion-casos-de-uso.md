# Especificación de Casos de Uso - DW Manager

Para cada caso de uso se presenta: tabla de información general (Caso de uso, Actores, Tipo, Precondición, Descripción) y tabla de flujo de interacción (Acciones del usuario / Respuesta del sistema).

---

## 1. Diagrama: Autenticación

### CU01 – Registrarse

| **Caso de uso** | Registrarse |
| **Actores** | Usuario no autenticado (I) |
| **Tipo** | Primario, Esencial |
| **Precondición** | Acceso a la pantalla de registro; correo con dominio gmail, hotmail o dw. |
| **Descripción** | El usuario crea una cuenta en el sistema con nombre completo (solo letras y espacios), correo electrónico y contraseña de al menos 8 caracteres para poder acceder al sistema. Tras el registro, la sesión se inicia automáticamente. |

| Acciones del usuario | Respuesta del sistema |
|----------------------|------------------------|
| Acceder al formulario de registro. | Muestra el formulario (nombre, correo, contraseña, confirmar contraseña). |
| Ingresar nombre, correo y contraseña (mín. 8 caracteres); repetir contraseña. | Valida que no haya campos vacíos, que el dominio del correo sea gmail, hotmail o dw, que las contraseñas coincidan y que el correo no esté registrado. |
| Enviar el formulario. | Si es correcto: guarda el usuario con contraseña cifrada, inicia sesión y redirige al panel principal. Si hay error: muestra mensaje indicando el problema. |

---

### CU02 – Iniciar sesión

| **Caso de uso** | Iniciar sesión |
| **Actores** | Usuario no autenticado (I), Usuario autenticado (I) |
| **Tipo** | Primario, Esencial |
| **Precondición** | Acceso a la pantalla de login; existe un usuario registrado con el correo que se ingresará. |
| **Descripción** | El usuario se identifica con su correo y contraseña para obtener acceso al sistema según su rol; el sistema mantiene la sesión activa durante la navegación. |

| Acciones del usuario | Respuesta del sistema |
|----------------------|------------------------|
| Ingresar correo y contraseña en el formulario de inicio de sesión. | Valida que los campos no estén vacíos. |
| Enviar el formulario. | Busca el usuario por correo; verifica que esté activo y que la contraseña coincida con la almacenada. |
| — | Si es correcto: activa la sesión, actualiza último acceso y redirige al panel principal. Si falla: muestra mensaje "Credenciales incorrectas". |

---

### CU03 – Cerrar sesión

| **Caso de uso** | Cerrar sesión |
| **Actores** | Usuario autenticado (I) |
| **Tipo** | Primario, Esencial |
| **Precondición** | El usuario tiene sesión iniciada. |
| **Descripción** | El usuario cierra su sesión de forma segura para que nadie más pueda usar la aplicación con su cuenta en ese equipo. |

| Acciones del usuario | Respuesta del sistema |
|----------------------|------------------------|
| Pulsar "Cerrar sesión". | Solicita confirmación (si está configurado). |
| Confirmar. | Invalida la sesión en el servidor, elimina la identificación en el navegador y redirige a la pantalla de login. |

---

## 2. Diagrama: Panel Principal

### CU04 – Consultar panel principal

| **Caso de uso** | Consultar panel principal |
| **Actores** | Usuario autenticado (I) |
| **Tipo** | Primario, Esencial |
| **Precondición** | Usuario con sesión iniciada. |
| **Descripción** | El usuario consulta un resumen del estado del inventario: productos agotados, pedidos pendientes, ocupación del almacén y alertas de productos bajo punto de reorden. |

| Acciones del usuario | Respuesta del sistema |
|----------------------|------------------------|
| Acceder al apartado Panel Principal. | Obtiene métricas (productos con stock cero, pedidos pendientes o parciales, total de unidades en almacén) y lista de productos bajo punto de reorden. |
| — | Muestra en pantalla las métricas y las alertas; no modifica datos. |

---

## 3. Diagrama: Productos

### CU05 – Gestionar productos

| **Caso de uso** | Gestionar productos |
| **Actores** | Usuario autenticado (I) |
| **Tipo** | Primario, Esencial |
| **Precondición** | Usuario con sesión iniciada; existe al menos una categoría para asignar a productos nuevos. |
| **Descripción** | El usuario da de alta, modifica, elimina o consulta productos del inventario (nombre, código, categoría, precio, stock, punto de reorden, pasillo, estante, nivel). Puede listar, buscar por nombre o código y filtrar por categoría. |

| Acciones del usuario | Respuesta del sistema |
|----------------------|------------------------|
| Acceder al apartado Productos. | Muestra la lista de productos (con opción de buscar y filtrar por categoría). |
| Opción A: Completar formulario y guardar (crear o editar). | Valida tipos de dato (números en precio/stock, alfanumérico en código, etc.), evita espacios al inicio; guarda o actualiza el producto. |
| Opción B: Seleccionar producto y eliminar; confirmar. | Elimina el producto si la operación está permitida. |
| Opción C: Buscar o filtrar. | Actualiza la lista según el criterio. |

---

## 4. Diagrama: Entradas / Salidas

### CU06 – Registrar movimiento de inventario

| **Caso de uso** | Registrar movimiento de inventario |
| **Actores** | Usuario autenticado (I) |
| **Tipo** | Primario, Esencial |
| **Precondición** | Usuario con sesión iniciada; existen productos; para una salida, el producto tiene stock suficiente. |
| **Descripción** | El usuario registra una entrada (compra o devolución) o una salida (venta o baja) indicando producto, tipo, cantidad y observaciones; el sistema actualiza el stock automáticamente. |

| Acciones del usuario | Respuesta del sistema |
|----------------------|------------------------|
| Acceder al apartado Entradas/Salidas y abrir el formulario de movimiento. | Muestra formulario (producto, tipo de movimiento, cantidad, observaciones). |
| Seleccionar producto, tipo (entrada compra/devolución, salida venta/baja), cantidad y opcionalmente observaciones; enviar. | Valida cantidad positiva y stock suficiente en salidas; guarda el movimiento asociado al usuario y actualiza el stock del producto. |
| — | Muestra mensaje de éxito y el movimiento queda en el historial. |

---

### CU07 – Consultar historial de movimientos

| **Caso de uso** | Consultar historial de movimientos |
| **Actores** | Usuario autenticado (I) |
| **Tipo** | Primario, Esencial |
| **Precondición** | Usuario con sesión iniciada. |
| **Descripción** | El usuario consulta la lista de movimientos de entrada y salida registrados (fecha, producto, tipo, cantidad, observaciones) para auditoría o seguimiento. |

| Acciones del usuario | Respuesta del sistema |
|----------------------|------------------------|
| Acceder al apartado Entradas/Salidas y consultar la tabla de movimientos. | Obtiene los movimientos y los muestra ordenados (por ejemplo por fecha) con producto, tipo, cantidad y observaciones. |
| — | No modifica datos; solo lectura. |

---

## 5. Diagrama: Pedidos

### CU08 – Crear pedido

| **Caso de uso** | Crear pedido |
| **Actores** | Usuario autenticado (I) |
| **Tipo** | Primario, Esencial |
| **Precondición** | Usuario con sesión iniciada; existen productos. |
| **Descripción** | El usuario registra una solicitud de producto indicando cantidad, prioridad y referencia de cliente; el pedido queda en estado "pendiente" para ser surtido luego mediante la asignación de stock. |

| Acciones del usuario | Respuesta del sistema |
|----------------------|------------------------|
| Acceder al apartado Pedidos y abrir el formulario de nuevo pedido. | Muestra formulario (producto, cantidad solicitada, prioridad, cliente/referencia). |
| Seleccionar producto, indicar cantidad, prioridad y referencia de cliente; enviar. | Valida los datos y crea el pedido con estado "pendiente" y cantidad asignada 0; lo agrega a la lista de pedidos. |

---

### CU09 – Listar pedidos

| **Caso de uso** | Listar pedidos |
| **Actores** | Usuario autenticado (I) |
| **Tipo** | Primario, Esencial |
| **Precondición** | Usuario con sesión iniciada. |
| **Descripción** | El usuario consulta la lista de pedidos con su estado (pendiente, parcial, surtido) para dar seguimiento y decidir cuándo ejecutar la asignación. |

| Acciones del usuario | Respuesta del sistema |
|----------------------|------------------------|
| Acceder al apartado Pedidos. | Obtiene la lista de pedidos y la muestra con producto, cantidades, estado y cliente/referencia. |
| — | No modifica datos; solo consulta. |

---

### CU10 – Ejecutar asignación de stock

| **Caso de uso** | Ejecutar asignación de stock |
| **Actores** | Usuario autenticado (I) |
| **Tipo** | Primario, Esencial |
| **Precondición** | Usuario con sesión; existe una regla de asignación activa; hay pedidos pendientes o parciales del producto y stock disponible. |
| **Descripción** | El usuario ejecuta la asignación de stock para un producto; el sistema ordena los pedidos según la regla activa (FIFO, mayor prioridad, etc.), reparte el stock en ese orden y actualiza cantidades asignadas, estados y stock del producto. |

| Acciones del usuario | Respuesta del sistema |
|----------------------|------------------------|
| En la lista de pedidos, seleccionar un producto y pulsar "Ejecutar asignación". | Obtiene stock disponible, pedidos pendientes/parciales del producto y la regla activa. |
| — | Ordena los pedidos según el criterio, asigna stock en ese orden, actualiza cantidad asignada y estado de cada pedido, descuenta el stock del producto y muestra el resultado. |

---

## 6. Diagrama: Reglas de asignación

### CU11 – Configurar regla de asignación

| **Caso de uso** | Configurar regla de asignación |
| **Actores** | Administrador (I) |
| **Tipo** | Primario, Esencial |
| **Precondición** | Usuario con sesión y rol administrador; existen reglas de asignación definidas. |
| **Descripción** | El administrador consulta las reglas disponibles y activa una (FIFO, mayor prioridad, menor cantidad, prioridad cliente); a partir de ese momento todas las ejecuciones de asignación usan ese criterio. |

| Acciones del usuario | Respuesta del sistema |
|----------------------|------------------------|
| Acceder al apartado Reglas de asignación. | Muestra la lista de reglas y cuál está activa. |
| Seleccionar en el desplegable la regla que desea activar. | Marca esa regla como activa y las demás como inactivas; las siguientes ejecuciones de asignación usarán el criterio elegido. |

---

## 7. Diagrama: Categorías y Sucursales

### CU12 – Gestionar categorías

| **Caso de uso** | Gestionar categorías |
| **Actores** | Usuario autenticado (I) |
| **Tipo** | Primario, Esencial |
| **Precondición** | Usuario con sesión iniciada; el nombre solo puede contener letras y espacios. |
| **Descripción** | El usuario crea, edita o elimina categorías (nombre) para clasificar productos; los cambios quedan disponibles en el catálogo de productos. |

| Acciones del usuario | Respuesta del sistema |
|----------------------|------------------------|
| Acceder al apartado Categorías. | Muestra la lista de categorías y el formulario (crear/editar). |
| Crear categoría (nombre) o editar/eliminar una existente; enviar. | Valida el nombre (solo letras y espacios); guarda, actualiza o elimina según corresponda; actualiza la lista. |

---

### CU13 – Gestionar sucursales

| **Caso de uso** | Gestionar sucursales |
| **Actores** | Usuario autenticado (I) |
| **Tipo** | Primario, Esencial |
| **Precondición** | Usuario con sesión; nombre, ciudad y estado solo letras y espacios; región del catálogo definido. |
| **Descripción** | El usuario crea, edita o elimina sucursales (nombre, ciudad, estado, región) para reportes y análisis de ventas. |

| Acciones del usuario | Respuesta del sistema |
|----------------------|------------------------|
| Acceder al apartado Sucursales. | Muestra la lista de sucursales y el formulario (crear/editar). |
| Crear sucursal (nombre, ciudad, estado, región) o editar/eliminar una existente; enviar. | Valida los datos; guarda, actualiza o elimina según reglas del sistema y actualiza la lista. |

---

## 8. Diagrama: Dashboard OLAP y Análisis

### CU14 – Consultar Dashboard OLAP

| **Caso de uso** | Consultar Dashboard OLAP |
| **Actores** | Usuario autenticado (I) |
| **Tipo** | Primario, Esencial |
| **Precondición** | Usuario con sesión; los datos de ventas han sido cargados o actualizados en el almacén de reportes. |
| **Descripción** | El usuario consulta una vista consolidada de ventas: totales, productos más vendidos, ranking de sucursales y tendencia mensual (gráficos y tablas); solo lectura. |

| Acciones del usuario | Respuesta del sistema |
|----------------------|------------------------|
| Acceder al apartado Dashboard OLAP. | Consulta los datos agregados de ventas (producto, tiempo, sucursal). |
| — | Muestra KPIs, gráficos de productos más vendidos, ranking de sucursales y tendencia mensual según los datos cargados. |

---

### CU15 – Consultar análisis temporal

| **Caso de uso** | Consultar análisis temporal |
| **Actores** | Usuario autenticado (I) |
| **Tipo** | Primario, Esencial |
| **Precondición** | Usuario con sesión; datos de ventas disponibles en el almacén de reportes. |
| **Descripción** | El usuario consulta el análisis de ventas por periodo (mes, trimestre, año) y opcionalmente por categoría o sucursal; solo lectura. |

| Acciones del usuario | Respuesta del sistema |
|----------------------|------------------------|
| Acceder al apartado Análisis temporal. | Obtiene ventas agregadas por periodo. |
| Filtrar o desglosar por categoría o sucursal (si aplica). | Muestra la información según los filtros; no modifica datos. |

---

## Resumen de identificadores

| Identificador | Caso de Uso |
|---------------|-------------|
| CU01 | Registrarse |
| CU02 | Iniciar sesión |
| CU03 | Cerrar sesión |
| CU04 | Consultar panel principal |
| CU05 | Gestionar productos |
| CU06 | Registrar movimiento de inventario |
| CU07 | Consultar historial de movimientos |
| CU08 | Crear pedido |
| CU09 | Listar pedidos |
| CU10 | Ejecutar asignación de stock |
| CU11 | Configurar regla de asignación |
| CU12 | Gestionar categorías |
| CU13 | Gestionar sucursales |
| CU14 | Consultar Dashboard OLAP |
| CU15 | Consultar análisis temporal |
