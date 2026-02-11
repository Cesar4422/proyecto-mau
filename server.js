const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

// Configuración de PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: String(process.env.DB_PASSWORD),
    port: process.env.DB_PORT,
});

// Configuración de sesiones
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'sesiones',
        schemaName: 'public'
    }),
    secret: process.env.SESSION_SECRET || 'tu-secreto-super-seguro-cambialo',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
        httpOnly: true,
        secure: false // Cambiar a true en producción con HTTPS
    }
}));

// Middleware para verificar autenticación
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    return res.status(401).json({ error: 'No autorizado. Por favor inicia sesión.' });
}

// Solo Administrador (configuración de reglas, ajustes de inventario)
function requireAdmin(req, res, next) {
    if (req.session && req.session.userId && req.session.userRole === 'administrador') {
        return next();
    }
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol Administrador.' });
}

// Operador o Administrador (registro de movimientos, consulta de ubicaciones)
function requireOperator(req, res, next) {
    const role = req.session && req.session.userRole;
    if (req.session && req.session.userId && (role === 'operador' || role === 'administrador')) {
        return next();
    }
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol Operador o Administrador.' });
}

// Servir archivos estáticos
app.use(express.static('public'));

// ============================================
// RUTAS DE AUTENTICACIÓN
// ============================================

// Registro de usuario
// MODIFICACIÓN: Ruta de registro en server.js
// Busca esta ruta en tu server.js y déjala así:
app.post('/api/auth/register', async (req, res) => {
    const { nombre_completo, email, password } = req.body;
    try {
        if (!nombre_completo || !email || !password) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }
        const existingUser = await pool.query('SELECT id FROM public.usuarios WHERE email = $1', [email.toLowerCase()]);
        if (existingUser.rows.length > 0) return res.status(400).json({ error: 'El email ya está registrado' });

        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        await pool.query(
            'INSERT INTO public.usuarios (nombre_completo, email, password_hash, rol) VALUES ($1, $2, $3, $4)',
            [nombre_completo, email.toLowerCase(), password_hash, 'usuario']
        );

        // IMPORTANTE: Se eliminaron las líneas de req.session.userId para evitar el auto-login
        res.status(201).json({ message: 'Usuario registrado exitosamente. Por favor, inicie sesión.' });
    } catch (err) {
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
});
// Login de usuario
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        // Validaciones
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
        }
        
        // Buscar usuario
        const result = await pool.query(
            'SELECT id, nombre_completo, email, password_hash, rol, activo FROM public.usuarios WHERE email = $1',
            [email.toLowerCase()]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }
        
        const user = result.rows[0];
        
        // Verificar si está activo
        if (!user.activo) {
            return res.status(401).json({ error: 'Usuario desactivado. Contacta al administrador.' });
        }
        
        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }
        
        // Actualizar último acceso
        await pool.query(
            'UPDATE public.usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );
        
        // Crear sesión
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        req.session.userName = user.nombre_completo;
        req.session.userRole = user.rol;
        
        res.json({
            message: 'Login exitoso',
            user: {
                id: user.id,
                nombre: user.nombre_completo,
                email: user.email,
                rol: user.rol
            }
        });
        
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Error al cerrar sesión' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Sesión cerrada exitosamente' });
    });
});

// Verificar sesión
app.get('/api/auth/check', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({
            authenticated: true,
            user: {
                id: req.session.userId,
                nombre: req.session.userName,
                email: req.session.userEmail,
                rol: req.session.userRole
            }
        });
    } else {
        res.json({ authenticated: false });
    }
});

// ============================================
// CRUD: ESQUEMA TRANSACCIONAL (Protegido)
// ============================================

// Obtener productos con búsqueda y filtrado (nombre, código, categoría)
app.get('/api/productos', requireAuth, async (req, res) => {
    const { q, categoria_id, codigo } = req.query;
    try {
        let query = `
            SELECT 
                p.id,
                p.nombre,
                p.codigo,
                p.categoria_id,
                c.nombre as categoria_nombre,
                p.precio_unitario,
                p.stock,
                p.punto_reorden,
                p.pasillo,
                p.estante,
                p.nivel
            FROM transaccional.productos p
            LEFT JOIN transaccional.categorias c ON p.categoria_id = c.id
            WHERE 1=1
        `;
        const params = [];
        let idx = 1;
        if (q && String(q).trim()) {
            query += ` AND (p.nombre ILIKE $${idx} OR p.codigo ILIKE $${idx})`;
            params.push('%' + String(q).trim() + '%');
            idx++;
        }
        if (categoria_id) {
            query += ` AND p.categoria_id = $${idx}`;
            params.push(categoria_id);
            idx++;
        }
        if (codigo && String(codigo).trim()) {
            query += ` AND p.codigo ILIKE $${idx}`;
            params.push('%' + String(codigo).trim() + '%');
            idx++;
        }
        query += ` ORDER BY p.id DESC`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

app.post('/api/productos', requireAuth, async (req, res) => {
    const { nombre, codigo, categoria_id, precio_unitario, stock, punto_reorden, pasillo, estante, nivel } = req.body;
    
    if (!nombre || nombre.trim() === "" || precio_unitario === undefined) {
        return res.status(400).json({ error: "Datos incompletos" });
    }

    if (parseFloat(precio_unitario) < 0) {
        return res.status(400).json({ error: "El precio no puede ser negativo" });
    }

    const stockVal = stock != null ? parseInt(stock, 10) : 0;
    const puntoVal = punto_reorden != null ? parseInt(punto_reorden, 10) : 5;

    try {
        const result = await pool.query(
            `INSERT INTO transaccional.productos (nombre, codigo, categoria_id, precio_unitario, stock, punto_reorden, pasillo, estante, nivel)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [nombre, codigo || null, categoria_id || null, precio_unitario, stockVal, puntoVal, pasillo || null, estante || null, nivel || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/productos/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { nombre, codigo, categoria_id, precio_unitario, stock, punto_reorden, pasillo, estante, nivel } = req.body;

    if (precio_unitario != null && parseFloat(precio_unitario) < 0) {
        return res.status(400).json({ error: "El precio no puede ser negativo" });
    }

    try {
        const result = await pool.query(
            `UPDATE transaccional.productos SET 
             nombre = COALESCE($1, nombre),
             codigo = $2,
             categoria_id = COALESCE($3, categoria_id),
             precio_unitario = COALESCE($4, precio_unitario),
             stock = COALESCE($5, stock),
             punto_reorden = COALESCE($6, punto_reorden),
             pasillo = $7, estante = $8, nivel = $9
             WHERE id = $10 RETURNING *`,
            [nombre, codigo ?? null, categoria_id, precio_unitario, stock != null ? parseInt(stock, 10) : null, punto_reorden != null ? parseInt(punto_reorden, 10) : null, pasillo ?? null, estante ?? null, nivel ?? null, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/productos/:id', requireAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM transaccional.productos WHERE id = $1', [req.params.id]);
        res.json({ message: "Producto eliminado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/categorias', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM transaccional.categorias ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// CRUD: GESTIÓN DE SUCURSALES
// ============================================

app.get('/api/sucursales', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                sk_sucursal, 
                id_sucursal, 
                nombre_sucursal, 
                ciudad, 
                estado, 
                region 
            FROM dw.dim_sucursal 
            ORDER BY sk_sucursal DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sucursales', requireAuth, async (req, res) => {
    const { nombre_sucursal, ciudad, estado, region } = req.body;
    
    if (!nombre_sucursal || !ciudad || !estado || !region) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    try {
        // Obtener el siguiente id_sucursal
        const maxId = await pool.query('SELECT COALESCE(MAX(id_sucursal), 0) + 1 as next_id FROM dw.dim_sucursal');
        const nextId = maxId.rows[0].next_id;
        
        const result = await pool.query(
            'INSERT INTO dw.dim_sucursal (id_sucursal, nombre_sucursal, ciudad, estado, region) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [nextId, nombre_sucursal, ciudad, estado, region]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/sucursales/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { nombre_sucursal, ciudad, estado, region } = req.body;

    try {
        const result = await pool.query(
            'UPDATE dw.dim_sucursal SET nombre_sucursal = $1, ciudad = $2, estado = $3, region = $4 WHERE sk_sucursal = $5 RETURNING *',
            [nombre_sucursal, ciudad, estado, region, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/sucursales/:id', requireAuth, async (req, res) => {
    try {
        // Verificar si hay ventas asociadas
        const ventas = await pool.query('SELECT COUNT(*) as count FROM dw.fact_ventas WHERE sk_sucursal = $1', [req.params.id]);
        
        if (parseInt(ventas.rows[0].count) > 0) {
            return res.status(400).json({ error: "No se puede eliminar. La sucursal tiene ventas registradas." });
        }
        
        await pool.query('DELETE FROM dw.dim_sucursal WHERE sk_sucursal = $1', [req.params.id]);
        res.json({ message: "Sucursal eliminada" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// CRUD: GESTIÓN DE CATEGORÍAS
// ============================================

app.post('/api/categorias', requireAuth, async (req, res) => {
    const { nombre } = req.body;
    
    if (!nombre || nombre.trim() === "") {
        return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    try {
        const result = await pool.query(
            'INSERT INTO transaccional.categorias (nombre) VALUES ($1) RETURNING *',
            [nombre.trim()]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { // Código de error para duplicados
            return res.status(400).json({ error: "La categoría ya existe" });
        }
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/categorias/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { nombre } = req.body;

    try {
        const result = await pool.query(
            'UPDATE transaccional.categorias SET nombre = $1 WHERE id = $2 RETURNING *',
            [nombre, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/categorias/:id', requireAuth, async (req, res) => {
    try {
        // Verificar si hay productos con esta categoría
        const productos = await pool.query('SELECT COUNT(*) as count FROM transaccional.productos WHERE categoria_id = $1', [req.params.id]);
        
        if (parseInt(productos.rows[0].count) > 0) {
            return res.status(400).json({ error: "No se puede eliminar. Hay productos con esta categoría." });
        }
        
        await pool.query('DELETE FROM transaccional.categorias WHERE id = $1', [req.params.id]);
        res.json({ message: "Categoría eliminada" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// CONTROL DE STOCK Y ALERTAS (punto de reorden por producto)
// ============================================

app.get('/api/alertas/bajo-stock', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.id,
                p.nombre,
                p.codigo,
                c.nombre as categoria,
                p.stock,
                p.punto_reorden,
                p.precio_unitario
            FROM transaccional.productos p
            LEFT JOIN transaccional.categorias c ON p.categoria_id = c.id
            WHERE p.stock < COALESCE(NULLIF(p.punto_reorden, 0), 5)
            ORDER BY p.stock ASC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ventas/registrar', requireAuth, async (req, res) => {
    const { producto_id, cantidad } = req.body;
    
    if (!producto_id || !cantidad || cantidad <= 0) {
        return res.status(400).json({ error: "Datos inválidos" });
    }

    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Verificar stock disponible
        const producto = await client.query(
            'SELECT nombre, precio_unitario, stock FROM transaccional.productos WHERE id = $1',
            [producto_id]
        );
        
        if (producto.rows.length === 0) {
            throw new Error('Producto no encontrado');
        }
        
        const stockActual = producto.rows[0].stock || 0;
        
        if (stockActual < cantidad) {
            throw new Error(`Stock insuficiente. Disponible: ${stockActual}`);
        }
        
        // Registrar venta
        const monto_total = producto.rows[0].precio_unitario * cantidad;
        await client.query(
            'INSERT INTO transaccional.ventas (producto_id, cantidad, monto_total, fecha_venta) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
            [producto_id, cantidad, monto_total]
        );
        
        // Reducir stock
        await client.query(
            'UPDATE transaccional.productos SET stock = stock - $1 WHERE id = $2',
            [cantidad, producto_id]
        );
        
        await client.query('COMMIT');
        
        res.json({ 
            message: "Venta registrada exitosamente",
            producto: producto.rows[0].nombre,
            cantidad: cantidad,
            monto_total: monto_total,
            stock_restante: stockActual - cantidad
        });
        
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ============================================
// CONTROL DE ENTRADAS Y SALIDAS (movimientos)
// ============================================

app.get('/api/movimientos', requireAuth, async (req, res) => {
    const { producto_id, tipo, limit } = req.query;
    try {
        let query = `
            SELECT m.id, m.producto_id, p.nombre as producto_nombre, p.codigo as producto_codigo,
                   m.tipo, m.cantidad, m.usuario_id, m.observaciones, m.created_at
            FROM transaccional.movimientos m
            JOIN transaccional.productos p ON p.id = m.producto_id
            WHERE 1=1
        `;
        const params = [];
        let idx = 1;
        if (producto_id) { query += ` AND m.producto_id = $${idx}`; params.push(producto_id); idx++; }
        if (tipo) { query += ` AND m.tipo = $${idx}`; params.push(tipo); idx++; }
        query += ` ORDER BY m.created_at DESC LIMIT $${idx}`;
        params.push(parseInt(limit, 10) || 100);
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/movimientos', requireAuth, async (req, res) => {
    const { producto_id, tipo, cantidad, observaciones } = req.body;
    const userId = req.session.userId;
    if (!producto_id || !tipo || !cantidad || cantidad <= 0) {
        return res.status(400).json({ error: 'producto_id, tipo y cantidad (positiva) son obligatorios' });
    }
    const validTypes = ['entrada_compra', 'entrada_devolucion', 'salida_venta', 'salida_baja'];
    if (!validTypes.includes(tipo)) {
        return res.status(400).json({ error: 'tipo debe ser: entrada_compra, entrada_devolucion, salida_venta, salida_baja' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const prod = await client.query('SELECT id, nombre, stock FROM transaccional.productos WHERE id = $1', [producto_id]);
        if (prod.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        const stockActual = prod.rows[0].stock || 0;
        const isEntrada = tipo.startsWith('entrada_');
        const delta = isEntrada ? cantidad : -cantidad;
        const nuevoStock = stockActual + delta;
        if (nuevoStock < 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Stock insuficiente. Disponible: ${stockActual}` });
        }
        await client.query(
            'INSERT INTO transaccional.movimientos (producto_id, tipo, cantidad, usuario_id, observaciones) VALUES ($1, $2, $3, $4, $5)',
            [producto_id, tipo, cantidad, userId, observaciones || null]
        );
        await client.query('UPDATE transaccional.productos SET stock = $1 WHERE id = $2', [nuevoStock, producto_id]);
        await client.query('COMMIT');
        res.status(201).json({
            message: 'Movimiento registrado',
            producto: prod.rows[0].nombre,
            tipo,
            cantidad,
            stock_anterior: stockActual,
            stock_actual: nuevoStock
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ============================================
// PANEL DE MÉTRICAS (Dashboard)
// ============================================

app.get('/api/dashboard/metricas', requireAuth, async (req, res) => {
    try {
        const [agotados, pendientes, ocupacion] = await Promise.all([
            pool.query(`
                SELECT COUNT(*)::INT as total FROM transaccional.productos WHERE COALESCE(stock, 0) = 0
            `),
            pool.query(`
                SELECT COUNT(*)::INT as total FROM transaccional.pedidos WHERE estado IN ('pendiente', 'parcial')
            `),
            pool.query(`
                SELECT 
                    COUNT(*)::INT as total_productos,
                    COALESCE(SUM(stock), 0)::BIGINT as total_unidades
                FROM transaccional.productos
            `)
        ]);
        const totalProductos = ocupacion.rows[0].total_productos || 0;
        const totalUnidades = Number(ocupacion.rows[0].total_unidades) || 0;
        res.json({
            productos_agotados: agotados.rows[0].total,
            ordenes_pendientes_surtir: pendientes.rows[0].total,
            total_productos: totalProductos,
            total_unidades: totalUnidades,
            ocupacion_almacen: totalProductos ? `${totalProductos} productos, ${totalUnidades} unidades` : 'Sin datos'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// PEDIDOS Y REGLAS DE ASIGNACIÓN
// ============================================

app.get('/api/pedidos', requireAuth, async (req, res) => {
    const { estado, producto_id } = req.query;
    try {
        let query = `
            SELECT pd.id, pd.producto_id, p.nombre as producto_nombre, p.codigo, p.stock,
                   pd.cantidad_solicitada, pd.cantidad_asignada, pd.estado, pd.prioridad, pd.cliente_ref, pd.fecha_solicitud
            FROM transaccional.pedidos pd
            JOIN transaccional.productos p ON p.id = pd.producto_id
            WHERE 1=1
        `;
        const params = [];
        let idx = 1;
        if (estado) { query += ` AND pd.estado = $${idx}`; params.push(estado); idx++; }
        if (producto_id) { query += ` AND pd.producto_id = $${idx}`; params.push(producto_id); idx++; }
        query += ' ORDER BY pd.fecha_solicitud DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/pedidos', requireAuth, async (req, res) => {
    const { producto_id, cantidad_solicitada, prioridad, cliente_ref } = req.body;
    if (!producto_id || !cantidad_solicitada || cantidad_solicitada <= 0) {
        return res.status(400).json({ error: 'producto_id y cantidad_solicitada son obligatorios' });
    }
    try {
        const result = await pool.query(
            `INSERT INTO transaccional.pedidos (producto_id, cantidad_solicitada, prioridad, cliente_ref, usuario_id)
             VALUES ($1, $2, COALESCE($3, 0), $4, $5) RETURNING *`,
            [producto_id, cantidad_solicitada, prioridad || 0, cliente_ref || null, req.session.userId]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reglas-asignacion', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM transaccional.reglas_asignacion ORDER BY activo DESC, id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/reglas-asignacion/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { nombre, criterio, activo } = req.body;
    try {
        const result = await pool.query(
            `UPDATE transaccional.reglas_asignacion SET nombre = COALESCE($1, nombre), criterio = COALESCE($2, criterio), activo = COALESCE($3, activo) WHERE id = $4 RETURNING *`,
            [nombre, criterio, activo, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Regla no encontrada' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// MOTOR DE ASIGNACIÓN AUTOMÁTICA (Python)
// ============================================

const { spawn } = require('child_process');
const path = require('path');

app.post('/api/asignacion/ejecutar', requireAuth, async (req, res) => {
    const { producto_id } = req.body;
    if (!producto_id) {
        return res.status(400).json({ error: 'producto_id es obligatorio' });
    }
    try {
        const [producto, pedidosPendientes, regla] = await Promise.all([
            pool.query('SELECT id, nombre, stock FROM transaccional.productos WHERE id = $1', [producto_id]),
            pool.query(`SELECT id, cantidad_solicitada, cantidad_asignada, prioridad, fecha_solicitud FROM transaccional.pedidos WHERE producto_id = $1 AND estado IN ('pendiente', 'parcial') ORDER BY id`, [producto_id]),
            pool.query("SELECT criterio FROM transaccional.reglas_asignacion WHERE activo = true LIMIT 1")
        ]);
        if (producto.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        const stockDisponible = producto.rows[0].stock || 0;
        const pedidos = pedidosPendientes.rows.map(r => ({
            id: r.id,
            cantidad_solicitada: r.cantidad_solicitada,
            cantidad_asignada: r.cantidad_asignada || 0,
            prioridad: r.prioridad || 0,
            fecha_solicitud: r.fecha_solicitud
        }));
        if (pedidos.length === 0) {
            return res.json({ message: 'No hay pedidos pendientes para este producto', asignaciones: [] });
        }
        const criterio = (regla.rows[0] && regla.rows[0].criterio) || 'prioridad_fifo';
        const scriptPath = path.join(__dirname, 'scripts', 'asignacion_engine.py');
        const input = JSON.stringify({ producto_id, stock_disponible: stockDisponible, criterio, pedidos });
        const py = spawn('python3', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        py.stdout.on('data', (d) => { stdout += d.toString(); });
        py.stderr.on('data', (d) => { stderr += d.toString(); });
        py.stdin.write(input);
        py.stdin.end();
        py.on('close', async (code) => {
            if (code !== 0) {
                return res.status(500).json({ error: 'Error en motor de asignación: ' + (stderr || stdout || 'código ' + code) });
            }
            let asignaciones;
            try {
                asignaciones = JSON.parse(stdout);
            } catch (e) {
                return res.status(500).json({ error: 'Respuesta inválida del motor de asignación' });
            }
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                let stockRestante = stockDisponible;
                for (const a of asignaciones) {
                    const cant = Math.min(a.cantidad_asignada, stockRestante);
                    if (cant <= 0) continue;
                    await client.query(
                        'UPDATE transaccional.pedidos SET cantidad_asignada = cantidad_asignada + $1, estado = CASE WHEN cantidad_asignada + $1 >= cantidad_solicitada THEN \'surtido\' ELSE \'parcial\' END WHERE id = $2',
                        [cant, a.pedido_id]
                    );
                    stockRestante -= cant;
                }
                await client.query('UPDATE transaccional.productos SET stock = stock - $1 WHERE id = $2', [stockDisponible - stockRestante, producto_id]);
                await client.query('COMMIT');
            } catch (e) {
                await client.query('ROLLBACK');
                return res.status(500).json({ error: e.message });
            } finally {
                client.release();
            }
            res.json({ message: 'Asignación ejecutada', asignaciones });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// AUTOMATIZACIÓN - REFRESCAR CUBO
// ============================================

app.post('/api/olap/refrescar-cubo', requireAuth, async (req, res) => {
    try {
        // Ejecutar ETL completo
        await pool.query(`
            -- Cargar dimensión producto
            INSERT INTO dw.dim_producto (id_fuente, nombre, categoria)
            SELECT 
                p.id,
                TRIM(p.nombre),
                TRIM(c.nombre) as categoria
            FROM transaccional.productos p
            JOIN transaccional.categorias c ON p.categoria_id = c.id
            ON CONFLICT (id_fuente) DO UPDATE 
            SET nombre = EXCLUDED.nombre, 
                categoria = EXCLUDED.categoria;
        `);
        
        await pool.query(`
            -- Cargar hechos nuevos
            INSERT INTO dw.fact_ventas (sk_producto, sk_tiempo, sk_sucursal, cantidad, monto_total)
            SELECT 
                dp.sk_producto,
                dt.sk_tiempo,
                (FLOOR(RANDOM() * 5) + 1)::INT as sk_sucursal,
                v.cantidad,
                v.monto_total
            FROM transaccional.ventas v
            JOIN dw.dim_producto dp ON v.producto_id = dp.id_fuente
            JOIN dw.dim_tiempo dt ON DATE(v.fecha_venta) = dt.fecha
            WHERE NOT EXISTS (
                SELECT 1 FROM dw.fact_ventas fv 
                WHERE fv.sk_producto = dp.sk_producto 
                AND fv.sk_tiempo = dt.sk_tiempo
                AND fv.monto_total = v.monto_total
            );
        `);
        
        // Refrescar vistas materializadas
        await pool.query('SELECT dw.refrescar_vistas_materializadas()');
        
        res.json({ 
            message: "Cubo OLAP actualizado exitosamente",
            timestamp: new Date().toISOString()
        });
        
    } catch (err) {
        console.error('Error al refrescar cubo:', err);
        res.status(500).json({ error: 'Error al refrescar el cubo OLAP' });
    }
});

// ============================================
// ANÁLISIS TEMPORAL AVANZADO
// ============================================

app.get('/api/olap/analisis-temporal', requireAuth, async (req, res) => {
    const { nivel } = req.query; // 'dia', 'mes', 'trimestre', 'anio'
    
    try {
        let query = '';
        
        switch(nivel) {
            case 'dia':
                query = `
                    SELECT 
                        t.fecha,
                        t.nombre_dia_semana,
                        SUM(f.monto_total)::DECIMAL(12,2) as total_ventas,
                        SUM(f.cantidad)::INT as total_unidades
                    FROM dw.fact_ventas f
                    JOIN dw.dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
                    GROUP BY t.fecha, t.nombre_dia_semana
                    ORDER BY t.fecha DESC
                    LIMIT 30
                `;
                break;
            case 'mes':
                query = `
                    SELECT 
                        t.anio,
                        t.mes,
                        t.nombre_mes,
                        SUM(f.monto_total)::DECIMAL(12,2) as total_ventas,
                        SUM(f.cantidad)::INT as total_unidades
                    FROM dw.fact_ventas f
                    JOIN dw.dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
                    GROUP BY t.anio, t.mes, t.nombre_mes
                    ORDER BY t.anio DESC, t.mes DESC
                `;
                break;
            case 'trimestre':
                query = `
                    SELECT 
                        t.anio,
                        t.trimestre,
                        SUM(f.monto_total)::DECIMAL(12,2) as total_ventas,
                        SUM(f.cantidad)::INT as total_unidades
                    FROM dw.fact_ventas f
                    JOIN dw.dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
                    GROUP BY t.anio, t.trimestre
                    ORDER BY t.anio DESC, t.trimestre DESC
                `;
                break;
            case 'anio':
                query = `
                    SELECT 
                        t.anio,
                        SUM(f.monto_total)::DECIMAL(12,2) as total_ventas,
                        SUM(f.cantidad)::INT as total_unidades
                    FROM dw.fact_ventas f
                    JOIN dw.dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
                    GROUP BY t.anio
                    ORDER BY t.anio DESC
                `;
                break;
            default:
                return res.status(400).json({ error: 'Nivel inválido. Use: dia, mes, trimestre o anio' });
        }
        
        const result = await pool.query(query);
        res.json(result.rows);
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// PRODUCTOS ESTRELLA (CRECIMIENTO)
// ============================================

app.get('/api/olap/productos-estrella', requireAuth, async (req, res) => {
    try {
        const query = `
            WITH ventas_por_mes AS (
                SELECT 
                    p.nombre as producto,
                    t.anio,
                    t.mes,
                    SUM(f.monto_total) as total_ventas
                FROM dw.fact_ventas f
                JOIN dw.dim_producto p ON f.sk_producto = p.sk_producto
                JOIN dw.dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
                GROUP BY p.nombre, t.anio, t.mes
            ),
            crecimiento AS (
                SELECT 
                    producto,
                    anio,
                    mes,
                    total_ventas,
                    LAG(total_ventas) OVER (PARTITION BY producto ORDER BY anio, mes) as ventas_mes_anterior,
                    CASE 
                        WHEN LAG(total_ventas) OVER (PARTITION BY producto ORDER BY anio, mes) IS NOT NULL 
                        AND LAG(total_ventas) OVER (PARTITION BY producto ORDER BY anio, mes) > 0 THEN
                            ROUND(
                                ((total_ventas - LAG(total_ventas) OVER (PARTITION BY producto ORDER BY anio, mes)) / 
                                LAG(total_ventas) OVER (PARTITION BY producto ORDER BY anio, mes) * 100)::NUMERIC, 2
                            )
                        ELSE NULL
                    END as crecimiento_porcentual
                FROM ventas_por_mes
            )
            SELECT 
                producto,
                total_ventas::DECIMAL(12,2),
                ventas_mes_anterior::DECIMAL(12,2),
                crecimiento_porcentual
            FROM crecimiento
            WHERE crecimiento_porcentual IS NOT NULL
            ORDER BY crecimiento_porcentual DESC
            LIMIT 3
        `;
        
        const result = await pool.query(query);
        res.json(result.rows);
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// OLAP: ESQUEMA DW (Protegido) - Resto de endpoints...
// ============================================

app.get('/api/olap/ventas', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                p.categoria, 
                SUM(f.monto_total)::DECIMAL(12,2) as total, 
                SUM(f.cantidad)::INT as unidades
            FROM dw.fact_ventas f
            JOIN dw.dim_producto p ON f.sk_producto = p.sk_producto
            GROUP BY p.categoria
            ORDER BY total DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/olap/rollup/anio', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                t.anio,
                SUM(f.monto_total)::DECIMAL(12,2) as total_ventas,
                SUM(f.cantidad)::INT as total_unidades,
                COUNT(*)::INT as num_transacciones
            FROM dw.fact_ventas f
            JOIN dw.dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
            GROUP BY t.anio
            ORDER BY t.anio
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/olap/rollup/trimestre', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                t.anio,
                t.trimestre,
                SUM(f.monto_total)::DECIMAL(12,2) as total_ventas,
                SUM(f.cantidad)::INT as total_unidades
            FROM dw.fact_ventas f
            JOIN dw.dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
            GROUP BY t.anio, t.trimestre
            ORDER BY t.anio, t.trimestre
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/olap/rollup/mes', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                t.anio,
                t.trimestre,
                t.mes,
                t.nombre_mes,
                SUM(f.monto_total)::DECIMAL(12,2) as total_ventas,
                SUM(f.cantidad)::INT as total_unidades
            FROM dw.fact_ventas f
            JOIN dw.dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
            GROUP BY t.anio, t.trimestre, t.mes, t.nombre_mes
            ORDER BY t.anio, t.trimestre, t.mes
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/olap/drilldown/categorias', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                p.categoria,
                SUM(f.monto_total)::DECIMAL(12,2) as total_ventas,
                SUM(f.cantidad)::INT as total_unidades,
                COUNT(DISTINCT p.sk_producto)::INT as num_productos
            FROM dw.fact_ventas f
            JOIN dw.dim_producto p ON f.sk_producto = p.sk_producto
            GROUP BY p.categoria
            ORDER BY total_ventas DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/olap/drilldown/productos', requireAuth, async (req, res) => {
    const { categoria } = req.query;
    
    try {
        let query = `
            SELECT 
                p.categoria,
                p.nombre as producto,
                SUM(f.monto_total)::DECIMAL(12,2) as total_ventas,
                SUM(f.cantidad)::INT as total_unidades
            FROM dw.fact_ventas f
            JOIN dw.dim_producto p ON f.sk_producto = p.sk_producto
        `;
        
        const params = [];
        if (categoria) {
            query += ` WHERE p.categoria = $1`;
            params.push(categoria);
        }
        
        query += `
            GROUP BY p.categoria, p.nombre
            ORDER BY p.categoria, total_ventas DESC
        `;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/olap/slice/categoria/:categoria', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                t.anio,
                t.mes,
                t.nombre_mes,
                SUM(f.monto_total)::DECIMAL(12,2) as total_ventas,
                SUM(f.cantidad)::INT as total_unidades
            FROM dw.fact_ventas f
            JOIN dw.dim_producto p ON f.sk_producto = p.sk_producto
            JOIN dw.dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
            WHERE p.categoria = $1
            GROUP BY t.anio, t.mes, t.nombre_mes
            ORDER BY t.anio, t.mes
        `;
        const result = await pool.query(query, [req.params.categoria]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/olap/slice/sucursal/:ciudad', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                p.categoria,
                SUM(f.monto_total)::DECIMAL(12,2) as total_ventas,
                SUM(f.cantidad)::INT as total_unidades
            FROM dw.fact_ventas f
            JOIN dw.dim_producto p ON f.sk_producto = p.sk_producto
            JOIN dw.dim_sucursal s ON f.sk_sucursal = s.sk_sucursal
            WHERE s.ciudad = $1
            GROUP BY p.categoria
            ORDER BY total_ventas DESC
        `;
        const result = await pool.query(query, [req.params.ciudad]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/olap/slice/periodo/:anio', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                p.categoria,
                t.trimestre,
                SUM(f.monto_total)::DECIMAL(12,2) as total_ventas,
                SUM(f.cantidad)::INT as total_unidades
            FROM dw.fact_ventas f
            JOIN dw.dim_producto p ON f.sk_producto = p.sk_producto
            JOIN dw.dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
            WHERE t.anio = $1
            GROUP BY p.categoria, t.trimestre
            ORDER BY t.trimestre, total_ventas DESC
        `;
        const result = await pool.query(query, [req.params.anio]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/olap/dice', requireAuth, async (req, res) => {
    const { categoria, mes_inicio, mes_fin, anio, ciudad } = req.query;
    
    try {
        let conditions = [];
        let params = [];
        let paramIndex = 1;
        
        let query = `
            SELECT 
                p.categoria,
                p.nombre as producto,
                t.anio,
                t.mes,
                t.nombre_mes,
                s.ciudad,
                SUM(f.monto_total)::DECIMAL(12,2) as total_ventas,
                SUM(f.cantidad)::INT as total_unidades
            FROM dw.fact_ventas f
            JOIN dw.dim_producto p ON f.sk_producto = p.sk_producto
            JOIN dw.dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
            JOIN dw.dim_sucursal s ON f.sk_sucursal = s.sk_sucursal
        `;
        
        if (categoria) {
            conditions.push(`p.categoria = $${paramIndex++}`);
            params.push(categoria);
        }
        
        if (anio) {
            conditions.push(`t.anio = $${paramIndex++}`);
            params.push(anio);
        }
        
        if (mes_inicio && mes_fin) {
            conditions.push(`t.mes BETWEEN $${paramIndex++} AND $${paramIndex++}`);
            params.push(mes_inicio, mes_fin);
        }
        
        if (ciudad) {
            conditions.push(`s.ciudad = $${paramIndex++}`);
            params.push(ciudad);
        }
        
        if (conditions.length > 0) {
            query += ` WHERE ` + conditions.join(' AND ');
        }
        
        query += `
            GROUP BY p.categoria, p.nombre, t.anio, t.mes, t.nombre_mes, s.ciudad
            ORDER BY total_ventas DESC
            LIMIT 50
        `;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/olap/kpi/top-productos', requireAuth, async (req, res) => {
    const limit = req.query.limit || 10;
    
    try {
        const query = `
            SELECT 
                p.nombre as producto,
                p.categoria,
                SUM(f.monto_total)::DECIMAL(12,2) as total_ventas,
                SUM(f.cantidad)::INT as total_unidades,
                COUNT(*)::INT as num_transacciones
            FROM dw.fact_ventas f
            JOIN dw.dim_producto p ON f.sk_producto = p.sk_producto
            GROUP BY p.nombre, p.categoria
            ORDER BY total_ventas DESC
            LIMIT $1
        `;
        const result = await pool.query(query, [limit]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/olap/kpi/ranking-sucursales', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                s.nombre_sucursal,
                s.ciudad,
                s.region,
                SUM(f.monto_total)::DECIMAL(12,2) as total_ventas,
                SUM(f.cantidad)::INT as total_unidades,
                COUNT(*)::INT as num_transacciones,
                AVG(f.monto_total)::DECIMAL(12,2) as promedio_venta
            FROM dw.fact_ventas f
            JOIN dw.dim_sucursal s ON f.sk_sucursal = s.sk_sucursal
            GROUP BY s.nombre_sucursal, s.ciudad, s.region
            ORDER BY total_ventas DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/olap/kpi/tendencia-mensual', requireAuth, async (req, res) => {
    const anio = req.query.anio || 2024;
    
    try {
        const query = `
            WITH ventas_mensuales AS (
                SELECT 
                    t.mes,
                    t.nombre_mes,
                    SUM(f.monto_total)::DECIMAL(12,2) as total_ventas
                FROM dw.fact_ventas f
                JOIN dw.dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
                WHERE t.anio = $1
                GROUP BY t.mes, t.nombre_mes
            )
            SELECT 
                mes,
                nombre_mes,
                total_ventas,
                LAG(total_ventas) OVER (ORDER BY mes) as ventas_mes_anterior,
                CASE 
                    WHEN LAG(total_ventas) OVER (ORDER BY mes) IS NOT NULL THEN
                        ROUND(
                            ((total_ventas - LAG(total_ventas) OVER (ORDER BY mes)) / 
                            LAG(total_ventas) OVER (ORDER BY mes) * 100)::NUMERIC, 2
                        )
                    ELSE NULL
                END as crecimiento_porcentual
            FROM ventas_mensuales
            ORDER BY mes
        `;
        const result = await pool.query(query, [anio]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/olap/kpi/estadisticas', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                SUM(f.monto_total)::DECIMAL(12,2) as total_ventas,
                SUM(f.cantidad)::INT as total_unidades,
                COUNT(*)::INT as num_transacciones,
                AVG(f.monto_total)::DECIMAL(12,2) as promedio_transaccion,
                COUNT(DISTINCT f.sk_producto)::INT as productos_vendidos,
                COUNT(DISTINCT f.sk_sucursal)::INT as sucursales_activas
            FROM dw.fact_ventas f
        `;
        const result = await pool.query(query);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// SERVIDOR
// ============================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor activo en puerto ${PORT}`));