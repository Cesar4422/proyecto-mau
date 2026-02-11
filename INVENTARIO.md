# Módulo de Inventario y Almacén

## Stack: Flask + MySQL

- **Backend**: Python 3 con Flask (`app.py`).
- **Base de datos**: MySQL. Script de esquema: `sql/schema-mysql.sql`.
- **Motor de asignación**: script Python `scripts/asignacion_engine.py`.

## Requisitos

1. **MySQL**: Crear la base de datos y tablas:
   ```bash
   mysql -u root -p < sql/schema-mysql.sql
   ```
   O desde el cliente MySQL: `source sql/schema-mysql.sql;`

2. **Variables de entorno**: Copiar `.env.example` a `.env` y configurar `MYSQL_*` y `SESSION_SECRET`.

3. **Python 3** y entorno virtual (recomendado en Linux para evitar "externally-managed-environment"):
   ```bash
   python3 -m venv venv
   source venv/bin/activate   # En Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Roles de usuario**: En la tabla `public.usuarios` el campo `rol` puede ser:
   - `administrador`: acceso a reglas de asignación, ajustes de inventario y todo lo demás.
   - `operador`: registro de movimientos, consulta de ubicaciones, pedidos.
   - `usuario`: rol por defecto al registrarse.

   Para dar rol administrador a un usuario existente:
   ```sql
   UPDATE usuarios SET rol = 'administrador' WHERE email = 'tu@email.com';
   ```

   **Usuario de prueba** (crear con `mysql -u root -p dw_manager < sql/seed-usuario-prueba.sql`):
   - **Email:** `prueba@test.com`
   - **Contraseña:** `prueba123`
   - **Rol:** administrador

4. **Arrancar la aplicación**:
   - Opción A (recomendada): `./run.sh` — usa el venv del proyecto.
   - Opción B (con venv activado): `source venv/bin/activate` y luego `python3 app.py`.
   Por defecto escucha en http://localhost:3000 (abre `index.html` y sirve la API en `/api/...`).

## Funcionalidades añadidas

- **Control de entradas y salidas**: Registro de movimientos (compras, devoluciones, ventas, bajas) con actualización de stock en tiempo real.
- **Motor de asignación**: Con pedidos pendientes del mismo producto y stock insuficiente, el sistema ejecuta el algoritmo en Python según la regla activa (FIFO, mayor prioridad, menor cantidad, etc.).
- **Ubicaciones**: Campos pasillo, estante y nivel en cada producto para facilitar el picking.
- **Alertas de stock mínimo**: Notificaciones cuando el stock cae por debajo del punto de reorden configurado por producto.
- **Roles**: Administrador (configuración de reglas, ajustes) y Operador (movimientos, consultas).
- **Panel de métricas**: Productos agotados, órdenes pendientes de surtir, ocupación del almacén.
- **Búsqueda y filtrado**: Productos por nombre, código o categoría.
