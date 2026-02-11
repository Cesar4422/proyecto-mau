# -*- coding: utf-8 -*-
"""
Aplicación Flask - DW Manager con MySQL.
API compatible con el frontend existente.
"""
import os
import json
import subprocess
from functools import wraps

import bcrypt
import pymysql
from pymysql.cursors import DictCursor
from flask import Flask, request, jsonify, session, g
from datetime import date, datetime

from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__, static_folder='public', static_url_path='')
app.secret_key = os.getenv('SESSION_SECRET', 'cambia-esto-en-produccion')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# Serializar datetime en respuestas JSON
from flask.json.provider import DefaultJSONProvider
class CustomJSONProvider(DefaultJSONProvider):
    def default(self, o):
        if isinstance(o, (datetime, date)):
            return o.isoformat()
        return super().default(o)
app.json = CustomJSONProvider(app)

# MySQL
def get_db_config():
    return {
        'host': os.getenv('MYSQL_HOST', 'localhost'),
        'user': os.getenv('MYSQL_USER', 'root'),
        'password': os.getenv('MYSQL_PASSWORD', ''),
        'database': os.getenv('MYSQL_DATABASE', 'dw_manager'),
        'port': int(os.getenv('MYSQL_PORT', 3306)),
        'charset': 'utf8mb4',
        'cursorclass': DictCursor,
    }

def get_db():
    if 'db' not in g:
        g.db = pymysql.connect(**get_db_config())
    return g.db

def test_conexion_mysql():
    """Prueba la conexión al arranque y muestra un mensaje claro si falla."""
    cfg = get_db_config()
    try:
        conn = pymysql.connect(**cfg)
        conn.ping()
        conn.close()
        return True, None
    except pymysql.err.OperationalError as e:
        err = str(e)
        if '1045' in err or 'Access denied' in err:
            return False, (
                "MySQL rechazó el usuario o la contraseña.\n"
                "  - Revisa en .env: MYSQL_USER y MYSQL_PASSWORD.\n"
                "  - Ejemplo: MYSQL_USER=root  MYSQL_PASSWORD=tu_password"
            )
        if '2003' in err or 'Can\'t connect' in err or 'Connection refused' in err:
            return False, (
                "No se puede conectar al servidor MySQL.\n"
                "  - ¿Está MySQL en marcha? Prueba: sudo systemctl start mysql\n"
                "  - Revisa en .env: MYSQL_HOST (por defecto localhost) y MYSQL_PORT (3306)"
            )
        if '1049' in err or 'Unknown database' in err:
            return False, (
                "La base de datos no existe.\n"
                "  - Crea la BD y tablas: mysql -u root -p < sql/schema-mysql.sql\n"
                "  - O revisa MYSQL_DATABASE en .env (por defecto: dw_manager)"
            )
        return False, f"Error MySQL: {err}"
    except Exception as e:
        return False, str(e)

@app.teardown_appcontext
def close_db(e):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def db_execute(query, args=None, commit=False):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(query, args or ())
        if commit:
            conn.commit()
        if cur.description:
            return cur.fetchall()
        return None
    finally:
        cur.close()

def db_execute_one(query, args=None, commit=False):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(query, args or ())
        if commit:
            conn.commit()
        if cur.description:
            return cur.fetchone()
        return None
    finally:
        cur.close()

# --- Middleware ---
def require_auth(f):
    @wraps(f)
    def inner(*args, **kwargs):
        if not session.get('userId'):
            return jsonify({'error': 'No autorizado. Por favor inicia sesión.'}), 401
        return f(*args, **kwargs)
    return inner

def require_admin(f):
    @wraps(f)
    def inner(*args, **kwargs):
        if not session.get('userId') or session.get('userRole') != 'administrador':
            return jsonify({'error': 'Acceso denegado. Se requiere rol Administrador.'}), 403
        return f(*args, **kwargs)
    return inner

# --- CORS (para desarrollo) ---
@app.after_request
def after_request(resp):
    resp.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', 'http://localhost:3000')
    resp.headers['Access-Control-Allow-Credentials'] = 'true'
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return resp

# ============ Auth ============
def _validar_dominio_email(email):
    """El correo debe contener @ y dominio gmail, hotmail o dw."""
    if '@' not in email:
        return False, 'El correo debe contener @'
    parte = email.split('@')[-1].lower()
    if 'gmail' in parte or 'hotmail' in parte or 'dw' in parte:
        return True, None
    return False, 'Solo se permiten correos con dominio gmail, hotmail o dw'

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    nombre_completo = (data.get('nombre_completo') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password')
    if isinstance(password, str):
        password = password.strip()
    if not nombre_completo or not email or not password:
        return jsonify({'error': 'Todos los campos son obligatorios'}), 400
    if not all(c.isalpha() or c.isspace() for c in nombre_completo):
        return jsonify({'error': 'El nombre solo puede contener letras y espacios (sin números ni caracteres especiales)'}), 400
    ok_dom, msg_dom = _validar_dominio_email(email)
    if not ok_dom:
        return jsonify({'error': msg_dom}), 400
    if len(password) < 8:
        return jsonify({'error': 'La contraseña debe tener al menos 8 caracteres'}), 400
    existing = db_execute_one('SELECT id FROM usuarios WHERE email = %s', (email,))
    if existing:
        return jsonify({'error': 'El email ya está registrado'}), 400
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8')
    db_execute(
        'INSERT INTO usuarios (nombre_completo, email, password_hash, rol) VALUES (%s, %s, %s, %s)',
        (nombre_completo, email, password_hash, 'usuario'),
        commit=True
    )
    user = db_execute_one('SELECT id, nombre_completo, email, rol FROM usuarios WHERE email = %s', (email,))
    if user:
        session['userId'] = user['id']
        session['userEmail'] = user['email']
        session['userName'] = user['nombre_completo']
        session['userRole'] = user.get('rol') or 'usuario'
        return jsonify({
            'message': 'Usuario registrado exitosamente.',
            'user': {'id': user['id'], 'nombre': user['nombre_completo'], 'email': user['email'], 'rol': user.get('rol')}
        }), 201
    return jsonify({'message': 'Usuario registrado exitosamente. Por favor, inicie sesión.'}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password')
    if isinstance(password, str):
        password = password.strip()
    if not email or not password:
        return jsonify({'error': 'Email y contraseña son obligatorios'}), 400
    user = db_execute_one('SELECT id, nombre_completo, email, password_hash, rol, activo FROM usuarios WHERE email = %s', (email,))
    if not user:
        return jsonify({'error': 'Credenciales incorrectas'}), 401
    if not user.get('activo', 1):
        return jsonify({'error': 'Usuario desactivado. Contacta al administrador.'}), 401
    raw_hash = user.get('password_hash') or ''
    if isinstance(raw_hash, str):
        raw_hash = raw_hash.strip()
    hash_bytes = raw_hash.encode('utf-8') if isinstance(raw_hash, str) else (raw_hash if isinstance(raw_hash, bytes) else b'')
    try:
        if not hash_bytes or not bcrypt.checkpw(password.encode('utf-8'), hash_bytes):
            return jsonify({'error': 'Credenciales incorrectas'}), 401
    except Exception:
        return jsonify({'error': 'Credenciales incorrectas'}), 401
    db_execute('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = %s', (user['id'],), commit=True)
    session['userId'] = user['id']
    session['userEmail'] = user['email']
    session['userName'] = user['nombre_completo']
    session['userRole'] = user.get('rol') or 'usuario'
    return jsonify({
        'message': 'Login exitoso',
        'user': {'id': user['id'], 'nombre': user['nombre_completo'], 'email': user['email'], 'rol': user.get('rol')}
    })

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Sesión cerrada exitosamente'})

@app.route('/api/auth/check')
def auth_check():
    if session.get('userId'):
        return jsonify({
            'authenticated': True,
            'user': {
                'id': session['userId'],
                'nombre': session.get('userName'),
                'email': session.get('userEmail'),
                'rol': session.get('userRole')
            }
        })
    return jsonify({'authenticated': False})

# ============ Productos ============
@app.route('/api/productos')
@require_auth
def list_productos():
    q = request.args.get('q', '').strip()
    categoria_id = request.args.get('categoria_id')
    codigo = request.args.get('codigo', '').strip()
    sql = """
        SELECT p.id, p.nombre, p.codigo, p.categoria_id, c.nombre AS categoria_nombre,
               p.precio_unitario, p.stock, p.punto_reorden, p.pasillo, p.estante, p.nivel
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE 1=1
    """
    params = []
    if q:
        sql += " AND (p.nombre LIKE %s OR p.codigo LIKE %s)"
        params.extend([f'%{q}%', f'%{q}%'])
    if categoria_id:
        sql += " AND p.categoria_id = %s"
        params.append(categoria_id)
    if codigo:
        sql += " AND p.codigo LIKE %s"
        params.append(f'%{codigo}%')
    sql += " ORDER BY p.id DESC"
    rows = db_execute(sql, tuple(params) if params else None)
    return jsonify(rows or [])

def _campo_obligatorio(val, nombre_campo='Campo'):
    """Valida que un valor (string o número) no esté vacío."""
    if val is None:
        return f'{nombre_campo} es obligatorio'
    if isinstance(val, str) and not val.strip():
        return f'{nombre_campo} no puede estar vacío'
    return None

def _solo_letras_espacios(val, nombre_campo='Campo'):
    """Valida que el valor contenga solo letras y espacios."""
    if not val or not isinstance(val, str):
        return None
    if not all(c.isalpha() or c.isspace() for c in val):
        return f'{nombre_campo} solo puede contener letras y espacios'
    return None

def _solo_alfanumerico_guion(val, nombre_campo='Campo'):
    """Valida que el valor contenga solo letras, números y guión."""
    if not val or not isinstance(val, str):
        return None
    if not all(c.isalnum() or c == '-' for c in val):
        return f'{nombre_campo} solo puede contener letras, números y guión'
    return None

def _solo_alfanumerico(val, nombre_campo='Campo'):
    """Valida que el valor contenga solo letras y números."""
    if not val or not isinstance(val, str):
        return None
    if not val.isalnum():
        return f'{nombre_campo} solo puede contener letras y números'
    return None

@app.route('/api/productos', methods=['POST'])
@require_auth
def create_producto():
    data = request.get_json() or {}
    nombre = (data.get('nombre') or '').strip()
    codigo = (data.get('codigo') or '').strip()
    categoria_id = data.get('categoria_id')
    precio = data.get('precio_unitario')
    stock = data.get('stock')
    punto_reorden = data.get('punto_reorden')
    pasillo = (data.get('pasillo') or '').strip()
    estante = (data.get('estante') or '').strip()
    nivel = (data.get('nivel') or '').strip()
    err = _campo_obligatorio(nombre, 'Nombre') or _campo_obligatorio(codigo, 'Código') or _campo_obligatorio(categoria_id, 'Categoría')
    if err:
        return jsonify({'error': err}), 400
    err = _solo_alfanumerico_guion(codigo, 'Código') or _solo_alfanumerico(pasillo, 'Pasillo') or _solo_alfanumerico(estante, 'Estante') or _solo_alfanumerico(nivel, 'Nivel')
    if err:
        return jsonify({'error': err}), 400
    if precio is None or precio == '':
        return jsonify({'error': 'Precio unitario es obligatorio'}), 400
    if float(precio) < 0:
        return jsonify({'error': 'El precio no puede ser negativo'}), 400
    if stock is None or stock == '':
        return jsonify({'error': 'Stock es obligatorio'}), 400
    if punto_reorden is None or punto_reorden == '':
        return jsonify({'error': 'Punto de reorden es obligatorio'}), 400
    if not pasillo:
        return jsonify({'error': 'Pasillo es obligatorio'}), 400
    if not estante:
        return jsonify({'error': 'Estante es obligatorio'}), 400
    if not nivel:
        return jsonify({'error': 'Nivel es obligatorio'}), 400
    stock = int(stock)
    punto = int(punto_reorden)
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO productos (nombre, codigo, categoria_id, precio_unitario, stock, punto_reorden, pasillo, estante, nivel)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (nombre, codigo, int(categoria_id), float(precio), stock, punto, pasillo, estante, nivel)
    )
    conn.commit()
    row = db_execute_one('SELECT * FROM productos WHERE id = %s', (cur.lastrowid,))
    cur.close()
    return jsonify(row), 201

@app.route('/api/productos/<int:id>', methods=['PUT'])
@require_auth
def update_producto(id):
    data = request.get_json() or {}
    nombre = (data.get('nombre') or '').strip()
    codigo = (data.get('codigo') or '').strip()
    categoria_id = data.get('categoria_id')
    precio = data.get('precio_unitario')
    stock = data.get('stock')
    punto_reorden = data.get('punto_reorden')
    pasillo = (data.get('pasillo') or '').strip()
    estante = (data.get('estante') or '').strip()
    nivel = (data.get('nivel') or '').strip()
    err = _campo_obligatorio(nombre, 'Nombre') or _campo_obligatorio(codigo, 'Código') or _campo_obligatorio(categoria_id, 'Categoría')
    if err:
        return jsonify({'error': err}), 400
    err = _solo_alfanumerico_guion(codigo, 'Código') or _solo_alfanumerico(pasillo, 'Pasillo') or _solo_alfanumerico(estante, 'Estante') or _solo_alfanumerico(nivel, 'Nivel')
    if err:
        return jsonify({'error': err}), 400
    if precio is None or precio == '':
        return jsonify({'error': 'Precio unitario es obligatorio'}), 400
    if float(precio) < 0:
        return jsonify({'error': 'El precio no puede ser negativo'}), 400
    if stock is None or stock == '':
        return jsonify({'error': 'Stock es obligatorio'}), 400
    if punto_reorden is None or punto_reorden == '':
        return jsonify({'error': 'Punto de reorden es obligatorio'}), 400
    if not pasillo:
        return jsonify({'error': 'Pasillo es obligatorio'}), 400
    if not estante:
        return jsonify({'error': 'Estante es obligatorio'}), 400
    if not nivel:
        return jsonify({'error': 'Nivel es obligatorio'}), 400
    db_execute(
        """UPDATE productos SET nombre=%s, codigo=%s, categoria_id=%s, precio_unitario=%s, stock=%s, punto_reorden=%s,
           pasillo=%s, estante=%s, nivel=%s WHERE id=%s""",
        (nombre, codigo, int(categoria_id), float(precio), int(stock), int(punto_reorden), pasillo, estante, nivel, id),
        commit=True
    )
    row = db_execute_one('SELECT * FROM productos WHERE id = %s', (id,))
    if not row:
        return jsonify({'error': 'Producto no encontrado'}), 404
    return jsonify(row)

@app.route('/api/productos/<int:id>', methods=['DELETE'])
@require_auth
def delete_producto(id):
    db_execute('DELETE FROM productos WHERE id = %s', (id,), commit=True)
    return jsonify({'message': 'Producto eliminado'})

# ============ Categorías ============
@app.route('/api/categorias')
@require_auth
def list_categorias():
    rows = db_execute('SELECT * FROM categorias ORDER BY nombre ASC')
    return jsonify(rows or [])

@app.route('/api/categorias', methods=['POST'])
@require_auth
def create_categoria():
    data = request.get_json() or {}
    nombre = (data.get('nombre') or '').strip()
    if not nombre:
        return jsonify({'error': 'El nombre es obligatorio'}), 400
    err = _solo_letras_espacios(nombre, 'Nombre de categoría')
    if err:
        return jsonify({'error': err}), 400
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute('INSERT INTO categorias (nombre) VALUES (%s)', (nombre,))
        conn.commit()
    except pymysql.IntegrityError:
        conn.rollback()
        return jsonify({'error': 'La categoría ya existe'}), 400
    row = db_execute_one('SELECT * FROM categorias WHERE id = %s', (cur.lastrowid,))
    cur.close()
    return jsonify(row), 201

@app.route('/api/categorias/<int:id>', methods=['PUT'])
@require_auth
def update_categoria(id):
    data = request.get_json() or {}
    nombre = (data.get('nombre') or '').strip()
    if not nombre:
        return jsonify({'error': 'El nombre es obligatorio'}), 400
    err = _solo_letras_espacios(nombre, 'Nombre de categoría')
    if err:
        return jsonify({'error': err}), 400
    db_execute('UPDATE categorias SET nombre = %s WHERE id = %s', (nombre, id), commit=True)
    row = db_execute_one('SELECT * FROM categorias WHERE id = %s', (id,))
    return jsonify(row)

@app.route('/api/categorias/<int:id>', methods=['DELETE'])
@require_auth
def delete_categoria(id):
    cnt = db_execute_one('SELECT COUNT(*) AS c FROM productos WHERE categoria_id = %s', (id,))
    if cnt and cnt['c'] > 0:
        return jsonify({'error': 'No se puede eliminar. Hay productos con esta categoría.'}), 400
    db_execute('DELETE FROM categorias WHERE id = %s', (id,), commit=True)
    return jsonify({'message': 'Categoría eliminada'})

# ============ Sucursales (DW) ============
@app.route('/api/sucursales')
@require_auth
def list_sucursales():
    rows = db_execute('SELECT sk_sucursal, id_sucursal, nombre_sucursal, ciudad, estado, region FROM dim_sucursal ORDER BY sk_sucursal DESC')
    return jsonify(rows or [])

@app.route('/api/sucursales', methods=['POST'])
@require_auth
def create_sucursal():
    data = request.get_json() or {}
    nombre_sucursal = (data.get('nombre_sucursal') or '').strip()
    ciudad = (data.get('ciudad') or '').strip()
    estado = (data.get('estado') or '').strip()
    region = (data.get('region') or '').strip()
    if not all([nombre_sucursal, ciudad, estado, region]):
        return jsonify({'error': 'Todos los campos (nombre, ciudad, estado, región) son obligatorios'}), 400
    err = _solo_letras_espacios(nombre_sucursal, 'Nombre de sucursal') or _solo_letras_espacios(ciudad, 'Ciudad') or _solo_letras_espacios(estado, 'Estado')
    if err:
        return jsonify({'error': err}), 400
    r = db_execute_one('SELECT COALESCE(MAX(id_sucursal), 0) + 1 AS next_id FROM dim_sucursal')
    next_id = r['next_id']
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        'INSERT INTO dim_sucursal (id_sucursal, nombre_sucursal, ciudad, estado, region) VALUES (%s, %s, %s, %s, %s)',
        (next_id, nombre_sucursal, ciudad, estado, region)
    )
    conn.commit()
    row = db_execute_one('SELECT * FROM dim_sucursal WHERE sk_sucursal = %s', (cur.lastrowid,))
    cur.close()
    return jsonify(row), 201

@app.route('/api/sucursales/<int:id>', methods=['PUT'])
@require_auth
def update_sucursal(id):
    data = request.get_json() or {}
    nombre_sucursal = (data.get('nombre_sucursal') or '').strip()
    ciudad = (data.get('ciudad') or '').strip()
    estado = (data.get('estado') or '').strip()
    region = (data.get('region') or '').strip()
    if not all([nombre_sucursal, ciudad, estado, region]):
        return jsonify({'error': 'Todos los campos (nombre, ciudad, estado, región) son obligatorios'}), 400
    err = _solo_letras_espacios(nombre_sucursal, 'Nombre de sucursal') or _solo_letras_espacios(ciudad, 'Ciudad') or _solo_letras_espacios(estado, 'Estado')
    if err:
        return jsonify({'error': err}), 400
    db_execute(
        'UPDATE dim_sucursal SET nombre_sucursal=%s, ciudad=%s, estado=%s, region=%s WHERE sk_sucursal=%s',
        (nombre_sucursal, ciudad, estado, region, id),
        commit=True
    )
    row = db_execute_one('SELECT * FROM dim_sucursal WHERE sk_sucursal = %s', (id,))
    return jsonify(row)

@app.route('/api/sucursales/<int:id>', methods=['DELETE'])
@require_auth
def delete_sucursal(id):
    r = db_execute_one('SELECT COUNT(*) AS c FROM fact_ventas WHERE sk_sucursal = %s', (id,))
    if r and r['c'] > 0:
        return jsonify({'error': 'No se puede eliminar. La sucursal tiene ventas registradas.'}), 400
    db_execute('DELETE FROM dim_sucursal WHERE sk_sucursal = %s', (id,), commit=True)
    return jsonify({'message': 'Sucursal eliminada'})

# ============ Alertas ============
@app.route('/api/alertas/bajo-stock')
@require_auth
def alertas_bajo_stock():
    rows = db_execute("""
        SELECT p.id, p.nombre, p.codigo, c.nombre AS categoria, p.stock, p.punto_reorden, p.precio_unitario
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE p.stock < COALESCE(NULLIF(p.punto_reorden, 0), 5)
        ORDER BY p.stock ASC
    """)
    return jsonify(rows or [])

# ============ Ventas ============
@app.route('/api/ventas/registrar', methods=['POST'])
@require_auth
def registrar_venta():
    data = request.get_json() or {}
    producto_id = data.get('producto_id')
    cantidad = data.get('cantidad')
    if not producto_id or not cantidad or int(cantidad) <= 0:
        return jsonify({'error': 'Datos inválidos'}), 400
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute('SELECT nombre, precio_unitario, stock FROM productos WHERE id = %s', (producto_id,))
        prod = cur.fetchone()
        if not prod:
            return jsonify({'error': 'Producto no encontrado'}), 404
        stock_actual = prod['stock'] or 0
        if stock_actual < int(cantidad):
            return jsonify({'error': f'Stock insuficiente. Disponible: {stock_actual}'}), 400
        monto = float(prod['precio_unitario']) * int(cantidad)
        cur.execute('INSERT INTO ventas (producto_id, cantidad, monto_total, fecha_venta) VALUES (%s, %s, %s, NOW())', (producto_id, cantidad, monto))
        cur.execute('UPDATE productos SET stock = stock - %s WHERE id = %s', (cantidad, producto_id))
        conn.commit()
        return jsonify({
            'message': 'Venta registrada exitosamente',
            'producto': prod['nombre'],
            'cantidad': cantidad,
            'monto_total': monto,
            'stock_restante': stock_actual - int(cantidad)
        })
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

# ============ Movimientos ============
@app.route('/api/movimientos')
@require_auth
def list_movimientos():
    producto_id = request.args.get('producto_id')
    tipo = request.args.get('tipo')
    limit = min(int(request.args.get('limit') or 100), 500)
    sql = """
        SELECT m.id, m.producto_id, p.nombre AS producto_nombre, p.codigo AS producto_codigo,
               m.tipo, m.cantidad, m.usuario_id, m.observaciones, m.created_at
        FROM movimientos m
        JOIN productos p ON p.id = m.producto_id
        WHERE 1=1
    """
    params = []
    if producto_id:
        sql += " AND m.producto_id = %s"
        params.append(producto_id)
    if tipo:
        sql += " AND m.tipo = %s"
        params.append(tipo)
    sql += " ORDER BY m.created_at DESC LIMIT %s"
    params.append(limit)
    rows = db_execute(sql, tuple(params))
    return jsonify(rows or [])

@app.route('/api/movimientos', methods=['POST'])
@require_auth
def create_movimiento():
    data = request.get_json() or {}
    producto_id = data.get('producto_id')
    tipo = data.get('tipo')
    cantidad = data.get('cantidad')
    observaciones = (data.get('observaciones') or '').strip()
    if not producto_id or not tipo or not cantidad or int(cantidad) <= 0:
        return jsonify({'error': 'Producto, tipo y cantidad (positiva) son obligatorios'}), 400
    if not observaciones:
        return jsonify({'error': 'Observaciones es obligatorio'}), 400
    valid_types = ('entrada_compra', 'entrada_devolucion', 'salida_venta', 'salida_baja')
    if tipo not in valid_types:
        return jsonify({'error': 'tipo debe ser: entrada_compra, entrada_devolucion, salida_venta, salida_baja'}), 400
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute('SELECT id, nombre, stock FROM productos WHERE id = %s', (producto_id,))
        prod = cur.fetchone()
        if not prod:
            return jsonify({'error': 'Producto no encontrado'}), 404
        stock_actual = prod['stock'] or 0
        delta = int(cantidad) if tipo.startswith('entrada_') else -int(cantidad)
        nuevo_stock = stock_actual + delta
        if nuevo_stock < 0:
            return jsonify({'error': f'Stock insuficiente. Disponible: {stock_actual}'}), 400
        cur.execute(
            'INSERT INTO movimientos (producto_id, tipo, cantidad, usuario_id, observaciones) VALUES (%s, %s, %s, %s, %s)',
            (producto_id, tipo, cantidad, session.get('userId'), observaciones)
        )
        cur.execute('UPDATE productos SET stock = %s WHERE id = %s', (nuevo_stock, producto_id))
        conn.commit()
        return jsonify({
            'message': 'Movimiento registrado',
            'producto': prod['nombre'],
            'tipo': tipo,
            'cantidad': cantidad,
            'stock_anterior': stock_actual,
            'stock_actual': nuevo_stock
        }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

# ============ Dashboard métricas ============
@app.route('/api/dashboard/metricas')
@require_auth
def dashboard_metricas():
    try:
        agotados = db_execute_one('SELECT COUNT(*) AS total FROM productos WHERE COALESCE(stock, 0) = 0') or {}
        pendientes = db_execute_one("SELECT COUNT(*) AS total FROM pedidos WHERE estado IN ('pendiente', 'parcial')") or {}
        ocupacion = db_execute_one('SELECT COUNT(*) AS total_productos, COALESCE(SUM(stock), 0) AS total_unidades FROM productos') or {}
        total_p = int(ocupacion.get('total_productos') or 0)
        total_u = int(ocupacion.get('total_unidades') or 0)
        return jsonify({
            'productos_agotados': int(agotados.get('total') or 0),
            'ordenes_pendientes_surtir': int(pendientes.get('total') or 0),
            'total_productos': total_p,
            'total_unidades': total_u,
            'ocupacion_almacen': f'{total_p} productos, {total_u} unidades' if total_p else 'Sin datos'
        })
    except Exception as e:
        app.logger.exception('Error en dashboard metricas')
        return jsonify({
            'productos_agotados': 0,
            'ordenes_pendientes_surtir': 0,
            'total_productos': 0,
            'total_unidades': 0,
            'ocupacion_almacen': 'Error al cargar'
        }), 200

# ============ Pedidos ============
@app.route('/api/pedidos')
@require_auth
def list_pedidos():
    estado = request.args.get('estado')
    producto_id = request.args.get('producto_id')
    sql = """
        SELECT pd.id, pd.producto_id, p.nombre AS producto_nombre, p.codigo, p.stock,
               pd.cantidad_solicitada, pd.cantidad_asignada, pd.estado, pd.prioridad, pd.cliente_ref, pd.fecha_solicitud
        FROM pedidos pd
        JOIN productos p ON p.id = pd.producto_id
        WHERE 1=1
    """
    params = []
    if estado:
        sql += " AND pd.estado = %s"
        params.append(estado)
    if producto_id:
        sql += " AND pd.producto_id = %s"
        params.append(producto_id)
    sql += " ORDER BY pd.fecha_solicitud DESC"
    rows = db_execute(sql, tuple(params) if params else None)
    return jsonify(rows or [])

@app.route('/api/pedidos', methods=['POST'])
@require_auth
def create_pedido():
    data = request.get_json() or {}
    producto_id = data.get('producto_id')
    cantidad_solicitada = data.get('cantidad_solicitada')
    prioridad = data.get('prioridad')
    cliente_ref = (data.get('cliente_ref') or '').strip()
    if not producto_id or not cantidad_solicitada or int(cantidad_solicitada or 0) <= 0:
        return jsonify({'error': 'Producto y cantidad solicitada son obligatorios'}), 400
    if prioridad is None or prioridad == '':
        return jsonify({'error': 'Prioridad es obligatoria'}), 400
    if not cliente_ref:
        return jsonify({'error': 'Cliente / Referencia es obligatorio'}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        'INSERT INTO pedidos (producto_id, cantidad_solicitada, prioridad, cliente_ref, usuario_id) VALUES (%s, %s, %s, %s, %s)',
        (producto_id, cantidad_solicitada, int(prioridad), cliente_ref, session.get('userId'))
    )
    conn.commit()
    row = db_execute_one('SELECT * FROM pedidos WHERE id = %s', (cur.lastrowid,))
    cur.close()
    return jsonify(row), 201

# ============ Reglas asignación ============
@app.route('/api/reglas-asignacion')
@require_auth
def list_reglas():
    rows = db_execute('SELECT * FROM reglas_asignacion ORDER BY activo DESC, id')
    return jsonify(rows or [])

@app.route('/api/reglas-asignacion/<int:id>', methods=['PUT'])
@require_auth
@require_admin
def update_regla(id):
    data = request.get_json() or {}
    nombre = (data.get('nombre') or '').strip() if data.get('nombre') is not None else None
    criterio = (data.get('criterio') or '').strip() if data.get('criterio') is not None else None
    activo = data.get('activo')
    if nombre is not None and not nombre:
        return jsonify({'error': 'Nombre no puede estar vacío'}), 400
    if criterio is not None and not criterio:
        return jsonify({'error': 'Criterio no puede estar vacío'}), 400
    db_execute(
        'UPDATE reglas_asignacion SET nombre=COALESCE(%s,nombre), criterio=COALESCE(%s,criterio), activo=COALESCE(%s,activo) WHERE id=%s',
        (nombre, criterio, activo, id),
        commit=True
    )
    row = db_execute_one('SELECT * FROM reglas_asignacion WHERE id = %s', (id,))
    if not row:
        return jsonify({'error': 'Regla no encontrada'}), 404
    return jsonify(row)

# ============ Motor asignación (Python) ============
@app.route('/api/asignacion/ejecutar', methods=['POST'])
@require_auth
def ejecutar_asignacion():
    data = request.get_json() or {}
    producto_id = data.get('producto_id')
    if not producto_id:
        return jsonify({'error': 'producto_id es obligatorio'}), 400
    prod = db_execute_one('SELECT id, nombre, stock FROM productos WHERE id = %s', (producto_id,))
    if not prod:
        return jsonify({'error': 'Producto no encontrado'}), 404
    pedidos = db_execute(
        "SELECT id, cantidad_solicitada, cantidad_asignada, prioridad, fecha_solicitud FROM pedidos WHERE producto_id = %s AND estado IN ('pendiente', 'parcial') ORDER BY id",
        (producto_id,)
    )
    regla = db_execute_one('SELECT criterio FROM reglas_asignacion WHERE activo = 1 LIMIT 1')
    criterio = (regla and regla.get('criterio')) or 'prioridad_fifo'
    stock_disp = prod['stock'] or 0
    pedidos_list = [{'id': r['id'], 'cantidad_solicitada': r['cantidad_solicitada'], 'cantidad_asignada': r['cantidad_asignada'] or 0, 'prioridad': r['prioridad'] or 0, 'fecha_solicitud': r['fecha_solicitud'].isoformat() if hasattr(r['fecha_solicitud'], 'isoformat') else str(r['fecha_solicitud'])} for r in (pedidos or [])]
    if not pedidos_list:
        return jsonify({'message': 'No hay pedidos pendientes para este producto', 'asignaciones': []})
    script_dir = os.path.join(os.path.dirname(__file__), 'scripts', 'asignacion_engine.py')
    inp = json.dumps({'producto_id': producto_id, 'stock_disponible': stock_disp, 'criterio': criterio, 'pedidos': pedidos_list})
    try:
        proc = subprocess.run(
            ['python3', script_dir],
            input=inp,
            capture_output=True,
            text=True,
            timeout=10
        )
    except Exception as e:
        return jsonify({'error': 'Error en motor de asignación: ' + str(e)}), 500
    if proc.returncode != 0:
        return jsonify({'error': 'Error en motor de asignación: ' + (proc.stderr or proc.stdout or str(proc.returncode))}), 500
    try:
        asignaciones = json.loads(proc.stdout)
    except json.JSONDecodeError:
        return jsonify({'error': 'Respuesta inválida del motor de asignación'}), 500
    conn = get_db()
    cur = conn.cursor()
    try:
        stock_restante = stock_disp
        total_asignado = 0
        for a in asignaciones:
            cant = min(a.get('cantidad_asignada', 0), stock_restante)
            if cant <= 0:
                continue
            cur.execute(
                'UPDATE pedidos SET cantidad_asignada = cantidad_asignada + %s, estado = IF(cantidad_asignada + %s >= cantidad_solicitada, "surtido", "parcial") WHERE id = %s',
                (cant, cant, a['pedido_id'])
            )
            stock_restante -= cant
            total_asignado += cant
        cur.execute('UPDATE productos SET stock = stock - %s WHERE id = %s', (total_asignado, producto_id))
        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
    return jsonify({'message': 'Asignación ejecutada', 'asignaciones': asignaciones})

# ============ OLAP (simplificado: requiere dim_tiempo poblado) ============
def _ensure_dim_tiempo(fecha):
    """Asegura que la fecha exista en dim_tiempo."""
    d = fecha.date() if hasattr(fecha, 'date') else fecha
    exists = db_execute_one('SELECT sk_tiempo FROM dim_tiempo WHERE fecha = %s', (d,))
    if exists:
        return exists['sk_tiempo']
    dt = d if isinstance(d, date) else date.fromisoformat(str(d)[:10])
    nombres_mes = ('', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre')
    dias = ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo')
    dia_semana = dias[dt.weekday()]
    db_execute(
        'INSERT INTO dim_tiempo (fecha, anio, mes, trimestre, nombre_mes, nombre_dia_semana) VALUES (%s, %s, %s, %s, %s, %s)',
        (d, dt.year, dt.month, (dt.month - 1) // 3 + 1, nombres_mes[dt.month], dia_semana),
        commit=True
    )
    r = db_execute_one('SELECT sk_tiempo FROM dim_tiempo WHERE fecha = %s', (d,))
    return r['sk_tiempo']

@app.route('/api/olap/refrescar-cubo', methods=['POST'])
@require_auth
def olap_refrescar():
    try:
        # Sincronizar dim_producto
        db_execute("""
            INSERT INTO dim_producto (id_fuente, nombre, categoria)
            SELECT p.id, TRIM(p.nombre), TRIM(COALESCE(c.nombre, 'Sin categoría'))
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), categoria = VALUES(categoria)
        """, commit=True)
        # Para cada venta no cargada, obtener sk_producto, sk_tiempo, insertar en fact_ventas
        ventas = db_execute("""
            SELECT v.id, v.producto_id, v.cantidad, v.monto_total, v.fecha_venta
            FROM ventas v
        """)
        for v in (ventas or []):
            sk_p = db_execute_one('SELECT sk_producto FROM dim_producto WHERE id_fuente = %s', (v['producto_id'],))
            if not sk_p:
                continue
            sk_t = _ensure_dim_tiempo(v['fecha_venta'])
            sk_s = db_execute_one('SELECT sk_sucursal FROM dim_sucursal ORDER BY RAND() LIMIT 1')
            if not sk_s:
                continue
            sk_s = sk_s['sk_sucursal']
            try:
                db_execute(
                    'INSERT IGNORE INTO fact_ventas (sk_producto, sk_tiempo, sk_sucursal, cantidad, monto_total) VALUES (%s, %s, %s, %s, %s)',
                    (sk_p['sk_producto'], sk_t, sk_s, v['cantidad'], v['monto_total']),
                    commit=True
                )
            except Exception:
                pass
        return jsonify({'message': 'Cubo OLAP actualizado exitosamente', 'timestamp': datetime.utcnow().isoformat() + 'Z'})
    except Exception as e:
        return jsonify({'error': 'Error al refrescar el cubo OLAP: ' + str(e)}), 500

@app.route('/api/olap/ventas')
@require_auth
def olap_ventas():
    rows = db_execute('SELECT p.categoria, SUM(f.monto_total) AS total, SUM(f.cantidad) AS unidades FROM fact_ventas f JOIN dim_producto p ON f.sk_producto = p.sk_producto GROUP BY p.categoria ORDER BY total DESC')
    return jsonify(rows or [])

@app.route('/api/olap/kpi/estadisticas')
@require_auth
def olap_kpi_estadisticas():
    row = db_execute_one('SELECT SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades, COUNT(*) AS num_transacciones, AVG(f.monto_total) AS promedio_transaccion, COUNT(DISTINCT f.sk_producto) AS productos_vendidos, COUNT(DISTINCT f.sk_sucursal) AS sucursales_activas FROM fact_ventas f')
    return jsonify(row or {})

@app.route('/api/olap/kpi/top-productos')
@require_auth
def olap_kpi_top_productos():
    limit = min(int(request.args.get('limit') or 10), 100)
    rows = db_execute('''
        SELECT p.nombre AS producto, p.categoria, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades, COUNT(*) AS num_transacciones
        FROM fact_ventas f
        JOIN dim_producto p ON f.sk_producto = p.sk_producto
        GROUP BY p.nombre, p.categoria
        ORDER BY total_ventas DESC
        LIMIT %s
    ''', (limit,))
    return jsonify(rows or [])

@app.route('/api/olap/kpi/ranking-sucursales')
@require_auth
def olap_kpi_ranking_sucursales():
    rows = db_execute('''
        SELECT s.nombre_sucursal, s.ciudad, s.region, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades, COUNT(*) AS num_transacciones, AVG(f.monto_total) AS promedio_venta
        FROM fact_ventas f
        JOIN dim_sucursal s ON f.sk_sucursal = s.sk_sucursal
        GROUP BY s.nombre_sucursal, s.ciudad, s.region
        ORDER BY total_ventas DESC
    ''')
    return jsonify(rows or [])

@app.route('/api/olap/kpi/tendencia-mensual')
@require_auth
def olap_kpi_tendencia():
    anio = request.args.get('anio', '2024')
    rows = db_execute('''
        SELECT t.mes, t.nombre_mes, SUM(f.monto_total) AS total_ventas
        FROM fact_ventas f
        JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
        WHERE t.anio = %s
        GROUP BY t.mes, t.nombre_mes
        ORDER BY t.mes
    ''', (anio,))
    if not rows:
        return jsonify([])
    # Agregar LAG manualmente
    prev = None
    out = []
    for r in rows:
        r = dict(r)
        r['ventas_mes_anterior'] = prev
        if prev and prev > 0:
            r['crecimiento_porcentual'] = round((float(r['total_ventas']) - prev) / prev * 100, 2)
        else:
            r['crecimiento_porcentual'] = None
        prev = float(r['total_ventas'])
        out.append(r)
    return jsonify(out)

@app.route('/api/olap/productos-estrella')
@require_auth
def olap_productos_estrella():
    rows = db_execute('''
        SELECT p.nombre AS producto, SUM(f.monto_total) AS total_ventas
        FROM fact_ventas f
        JOIN dim_producto p ON f.sk_producto = p.sk_producto
        JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
        GROUP BY p.nombre, t.anio, t.mes
        ORDER BY t.anio DESC, t.mes DESC
        LIMIT 100
    ''')
    # Simplificado: top 3 por crecimiento (requeriría LAG por producto/mes)
    if not rows:
        return jsonify([])
    by_prod = {}
    for r in rows:
        name = r['producto']
        if name not in by_prod:
            by_prod[name] = []
        by_prod[name].append(float(r['total_ventas']))
    growth = []
    for name, vals in by_prod.items():
        if len(vals) >= 2:
            g = round((vals[0] - vals[1]) / vals[1] * 100, 2)
            growth.append({'producto': name, 'total_ventas': vals[0], 'ventas_mes_anterior': vals[1], 'crecimiento_porcentual': g})
    growth.sort(key=lambda x: -x['crecimiento_porcentual'])
    return jsonify(growth[:3])

@app.route('/api/olap/analisis-temporal')
@require_auth
def olap_analisis_temporal():
    nivel = request.args.get('nivel', 'mes')
    if nivel == 'mes':
        rows = db_execute('''
            SELECT t.anio, t.mes, t.nombre_mes, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades
            FROM fact_ventas f
            JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
            GROUP BY t.anio, t.mes, t.nombre_mes
            ORDER BY t.anio DESC, t.mes DESC
        ''')
    elif nivel == 'anio':
        rows = db_execute('''
            SELECT t.anio, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades
            FROM fact_ventas f
            JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
            GROUP BY t.anio
            ORDER BY t.anio DESC
        ''')
    elif nivel == 'trimestre':
        rows = db_execute('''
            SELECT t.anio, t.trimestre, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades
            FROM fact_ventas f
            JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
            GROUP BY t.anio, t.trimestre
            ORDER BY t.anio DESC, t.trimestre DESC
        ''')
    else:
        rows = db_execute('''
            SELECT t.fecha, t.nombre_dia_semana, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades
            FROM fact_ventas f
            JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
            GROUP BY t.fecha, t.nombre_dia_semana
            ORDER BY t.fecha DESC
            LIMIT 30
        ''')
    return jsonify(rows or [])

# Rutas OLAP adicionales (drilldown, slice, dice) - respuestas básicas para no romper el front
@app.route('/api/olap/rollup/anio')
@require_auth
def olap_rollup_anio():
    rows = db_execute('SELECT t.anio, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades, COUNT(*) AS num_transacciones FROM fact_ventas f JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo GROUP BY t.anio ORDER BY t.anio')
    return jsonify(rows or [])

@app.route('/api/olap/rollup/trimestre')
@require_auth
def olap_rollup_trimestre():
    rows = db_execute('SELECT t.anio, t.trimestre, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades FROM fact_ventas f JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo GROUP BY t.anio, t.trimestre ORDER BY t.anio, t.trimestre')
    return jsonify(rows or [])

@app.route('/api/olap/rollup/mes')
@require_auth
def olap_rollup_mes():
    rows = db_execute('SELECT t.anio, t.trimestre, t.mes, t.nombre_mes, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades FROM fact_ventas f JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo GROUP BY t.anio, t.trimestre, t.mes, t.nombre_mes ORDER BY t.anio, t.trimestre, t.mes')
    return jsonify(rows or [])

@app.route('/api/olap/drilldown/categorias')
@require_auth
def olap_drilldown_categorias():
    rows = db_execute('SELECT p.categoria, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades, COUNT(DISTINCT p.sk_producto) AS num_productos FROM fact_ventas f JOIN dim_producto p ON f.sk_producto = p.sk_producto GROUP BY p.categoria ORDER BY total_ventas DESC')
    return jsonify(rows or [])

@app.route('/api/olap/drilldown/productos')
@require_auth
def olap_drilldown_productos():
    cat = request.args.get('categoria')
    sql = 'SELECT p.categoria, p.nombre AS producto, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades FROM fact_ventas f JOIN dim_producto p ON f.sk_producto = p.sk_producto'
    params = []
    if cat:
        sql += ' WHERE p.categoria = %s'
        params.append(cat)
    sql += ' GROUP BY p.categoria, p.nombre ORDER BY p.categoria, total_ventas DESC'
    rows = db_execute(sql, tuple(params) if params else None)
    return jsonify(rows or [])

@app.route('/api/olap/slice/categoria/<categoria>')
@require_auth
def olap_slice_categoria(categoria):
    rows = db_execute('SELECT t.anio, t.mes, t.nombre_mes, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades FROM fact_ventas f JOIN dim_producto p ON f.sk_producto = p.sk_producto JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo WHERE p.categoria = %s GROUP BY t.anio, t.mes, t.nombre_mes ORDER BY t.anio, t.mes', (categoria,))
    return jsonify(rows or [])

@app.route('/api/olap/slice/sucursal/<ciudad>')
@require_auth
def olap_slice_sucursal(ciudad):
    rows = db_execute('SELECT p.categoria, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades FROM fact_ventas f JOIN dim_producto p ON f.sk_producto = p.sk_producto JOIN dim_sucursal s ON f.sk_sucursal = s.sk_sucursal WHERE s.ciudad = %s GROUP BY p.categoria ORDER BY total_ventas DESC', (ciudad,))
    return jsonify(rows or [])

@app.route('/api/olap/slice/periodo/<anio>')
@require_auth
def olap_slice_periodo(anio):
    rows = db_execute('SELECT p.categoria, t.trimestre, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades FROM fact_ventas f JOIN dim_producto p ON f.sk_producto = p.sk_producto JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo WHERE t.anio = %s GROUP BY p.categoria, t.trimestre ORDER BY t.trimestre, total_ventas DESC', (anio,))
    return jsonify(rows or [])

@app.route('/api/olap/dice')
@require_auth
def olap_dice():
    params = []
    sql = 'SELECT p.categoria, p.nombre AS producto, t.anio, t.mes, t.nombre_mes, s.ciudad, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades FROM fact_ventas f JOIN dim_producto p ON f.sk_producto = p.sk_producto JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo JOIN dim_sucursal s ON f.sk_sucursal = s.sk_sucursal WHERE 1=1'
    if request.args.get('categoria'):
        sql += ' AND p.categoria = %s'
        params.append(request.args.get('categoria'))
    if request.args.get('anio'):
        sql += ' AND t.anio = %s'
        params.append(request.args.get('anio'))
    if request.args.get('mes_inicio') and request.args.get('mes_fin'):
        sql += ' AND t.mes BETWEEN %s AND %s'
        params.extend([request.args.get('mes_inicio'), request.args.get('mes_fin')])
    if request.args.get('ciudad'):
        sql += ' AND s.ciudad = %s'
        params.append(request.args.get('ciudad'))
    sql += ' GROUP BY p.categoria, p.nombre, t.anio, t.mes, t.nombre_mes, s.ciudad ORDER BY total_ventas DESC LIMIT 50'
    rows = db_execute(sql, tuple(params) if params else None)
    return jsonify(rows or [])

# Servir frontend
@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/login.html')
def login_page():
    return app.send_static_file('login.html')

if __name__ == '__main__':
    import sys
    ok, msg = test_conexion_mysql()
    if not ok:
        print("Error de conexión a MySQL\n", msg, file=sys.stderr)
        print("\nConfiguración actual (.env):", file=sys.stderr)
        for k in ('MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE', 'MYSQL_PORT'):
            v = '***' if k == 'MYSQL_PASSWORD' else (os.getenv(k) or '(vacío)')
            print(f"  {k}={v}", file=sys.stderr)
        sys.exit(1)
    port = int(os.getenv('PORT', 3000))
    print(f"Conectado a MySQL. Servidor en http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_DEBUG', '0') == '1')
