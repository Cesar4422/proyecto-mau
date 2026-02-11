# Pedidos: Prioridad y Reglas de Asignación

## 1. El campo **Prioridad (mayor = primero)**

### ¿Qué es?

En el apartado **Pedidos**, al crear un nuevo pedido aparece el campo **Prioridad** con la leyenda *"Prioridad (mayor = primero)"*. Es un **número** (entero) que indica la urgencia o importancia del pedido respecto a otros pedidos del **mismo producto**.

### ¿Cómo se usa?

- **Valor por defecto:** 0.
- **Mayor número = mayor prioridad:** Un pedido con prioridad **10** se atiende antes que uno con prioridad **5**, y este antes que uno con **0**.
- **Mismo producto:** La prioridad solo tiene efecto cuando hay **varios pedidos pendientes para el mismo producto**. En ese caso, la **regla de asignación activa** decide el orden; una de las reglas usa explícitamente “mayor prioridad primero”.

### Ejemplo rápido

Hay 3 pedidos pendientes del producto "Laptop X":

| Pedido | Cantidad | Prioridad | Fecha     |
|--------|----------|-----------|-----------|
| A      | 2        | 0         | 10:00     |
| B      | 1        | 5         | 10:05     |
| C      | 2        | 3         | 10:10     |

Si la regla activa es **"Mayor prioridad"** y hay 4 unidades en stock:

1. Se atiende primero **B** (prioridad 5) → 1 unidad.
2. Luego **C** (prioridad 3) → 2 unidades.
3. Por último **A** (prioridad 0) → 1 unidad (solo queda 1 en stock).

---

## 2. Reglas de Asignación

Las **reglas de asignación** definen **en qué orden** se reparte el **stock disponible** entre los pedidos pendientes de un mismo producto cuando alguien pulsa **"Ejecutar asignación"**.

Solo hay **una regla activa** a la vez (la que tiene `activo = 1` en la base de datos). El administrador la elige en **Reglas de Asignación**.

### Criterios disponibles

| Criterio (valor interno)     | Nombre en pantalla           | Comportamiento |
|------------------------------|------------------------------|----------------|
| **prioridad_fifo**           | FIFO (primero en llegar)     | Orden por **fecha de solicitud**: el pedido más antiguo se atiende primero. La prioridad numérica **no** se usa. |
| **prioridad_mayor**          | Mayor prioridad              | Orden por **prioridad** (mayor número primero). Si dos pedidos tienen la misma prioridad, se desempata por fecha (FIFO). **Aquí es donde “mayor = primero” tiene efecto.** |
| **prioridad_cantidad**       | Menor cantidad primero       | Orden por **cantidad solicitada** (menor primero): se atienden antes los pedidos más pequeños. |
| **prioridad_cliente**        | Prioridad cliente            | En este sistema se comporta igual que **Mayor prioridad**: orden por prioridad numérica, luego por fecha. |

### Resumen del flujo

1. El usuario crea **pedidos** (producto, cantidad, prioridad, cliente/referencia).
2. En **Pedidos y Asignación** se listan los pedidos pendientes/parciales.
3. Para un producto concreto, el usuario pulsa **"Ejecutar asignación"**.
4. El backend:
   - Obtiene el **stock disponible** del producto.
   - Obtiene los **pedidos pendientes/parciales** de ese producto.
   - Lee la **regla activa** (criterio) de la tabla `reglas_asignacion`.
   - Llama al **motor de asignación** (`scripts/asignacion_engine.py`) con: producto_id, stock, criterio y lista de pedidos.
5. El motor **ordena** los pedidos según el criterio y **reparte el stock** en ese orden (asignación secuencial).
6. Se actualizan en base de datos: `cantidad_asignada` y `estado` de cada pedido (`surtido` o `parcial`), y se descuenta el stock del producto.

### Dónde está el código

- **Backend (API y orden de pedidos):** `app.py` → ruta `/api/asignacion/ejecutar`.
- **Motor que ordena y reparte:** `scripts/asignacion_engine.py` (lee JSON por stdin, escribe asignaciones por stdout).
- **Pantalla de reglas:** Sección "Reglas de Asignación" (solo administrador); el desplegable cambia el **criterio** de la regla activa.

---

## 3. Respuesta directa a tu duda

- **"Prioridad (mayor = primero)"** en el formulario de pedidos significa: **a mayor número, ese pedido se atiende antes** cuando la regla activa es **"Mayor prioridad"** (o "Prioridad cliente", que usa la misma lógica).
- **Las reglas de asignación** son las que deciden **cómo se ordenan** los pedidos antes de repartir stock: por fecha (FIFO), por prioridad (mayor primero), por cantidad (menor primero), etc. Solo una regla está activa y esa se usa en cada ejecución de asignación.
