-- ============================================
-- ESQUEMA COMPLETO PARA FLASK + MYSQL
-- Base de datos: dw_manager
--
-- ORDEN DE EJECUCIÓN RECOMENDADO:
--   1. Este archivo (schema-mysql.sql)
--   2. mysql-fase1-dimensiones.sql  (sucursales, procedimiento dim_tiempo, índices)
--   3. mysql-fase2-datos-prueba.sql (categorías, productos, ventas de prueba)
--   4. mysql-fase3-etl.sql          (carga DW y vistas)
--   5. seed-usuario-prueba.sql      (usuario de acceso)
-- ============================================

CREATE DATABASE IF NOT EXISTS dw_manager
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE dw_manager;

-- Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_completo VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(50) DEFAULT 'usuario',
  activo TINYINT(1) DEFAULT 1,
  ultimo_acceso DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categorías (nombre único para INSERT IGNORE / ON DUPLICATE KEY por nombre)
CREATE TABLE IF NOT EXISTS categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  UNIQUE KEY uk_categorias_nombre (nombre)
);

-- Productos
CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  codigo VARCHAR(50) NULL UNIQUE,
  categoria_id INT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock INT DEFAULT 0,
  punto_reorden INT DEFAULT 5,
  pasillo VARCHAR(50) NULL,
  estante VARCHAR(50) NULL,
  nivel VARCHAR(50) NULL,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
);

-- Ventas transaccionales
CREATE TABLE IF NOT EXISTS ventas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  monto_total DECIMAL(12,2) NOT NULL,
  fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT
);

-- Movimientos (entradas/salidas)
CREATE TABLE IF NOT EXISTS movimientos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  tipo VARCHAR(30) NOT NULL,
  cantidad INT NOT NULL,
  usuario_id INT NULL,
  observaciones TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  CHECK (tipo IN ('entrada_compra', 'entrada_devolucion', 'salida_venta', 'salida_baja')),
  CHECK (cantidad > 0)
);

-- Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  cantidad_solicitada INT NOT NULL,
  cantidad_asignada INT DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'pendiente',
  prioridad INT DEFAULT 0,
  cliente_ref VARCHAR(100) NULL,
  fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usuario_id INT NULL,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  CHECK (estado IN ('pendiente', 'parcial', 'surtido', 'cancelado'))
);

-- Reglas de asignación
CREATE TABLE IF NOT EXISTS reglas_asignacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  criterio VARCHAR(50) NOT NULL,
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO reglas_asignacion (id, nombre, criterio, activo) VALUES (1, 'Por defecto (FIFO)', 'prioridad_fifo', 1);

-- Data Warehouse: dimensión sucursal
CREATE TABLE IF NOT EXISTS dim_sucursal (
  sk_sucursal INT AUTO_INCREMENT PRIMARY KEY,
  id_sucursal INT NOT NULL,
  nombre_sucursal VARCHAR(200) NOT NULL,
  ciudad VARCHAR(100) NOT NULL,
  estado VARCHAR(100) NOT NULL,
  region VARCHAR(50) NOT NULL
);

-- Dimensión producto (DW)
CREATE TABLE IF NOT EXISTS dim_producto (
  sk_producto INT AUTO_INCREMENT PRIMARY KEY,
  id_fuente INT NOT NULL UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  categoria VARCHAR(100) NOT NULL
);

-- Dimensión tiempo (equivalente a PostgreSQL dw.dim_tiempo)
CREATE TABLE IF NOT EXISTS dim_tiempo (
  sk_tiempo INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATE NOT NULL UNIQUE,
  dia INT NULL,
  mes INT NOT NULL,
  nombre_mes VARCHAR(20) NOT NULL,
  trimestre INT NOT NULL,
  anio INT NOT NULL,
  nombre_dia_semana VARCHAR(20) NULL,
  es_fin_de_semana TINYINT(1) NULL DEFAULT 0,
  semana_del_anio INT NULL
);

-- Hechos de ventas (DW) - id_hecho para ETL incremental
CREATE TABLE IF NOT EXISTS fact_ventas (
  id_hecho INT AUTO_INCREMENT PRIMARY KEY,
  sk_producto INT NOT NULL,
  sk_tiempo INT NOT NULL,
  sk_sucursal INT NOT NULL,
  cantidad INT NOT NULL,
  monto_total DECIMAL(12,2) NOT NULL,
  UNIQUE KEY uk_fact (sk_producto, sk_tiempo, sk_sucursal, monto_total),
  FOREIGN KEY (sk_producto) REFERENCES dim_producto(sk_producto),
  FOREIGN KEY (sk_tiempo) REFERENCES dim_tiempo(sk_tiempo),
  FOREIGN KEY (sk_sucursal) REFERENCES dim_sucursal(sk_sucursal)
);

-- Log del ETL (equivalente a dw.etl_log en PostgreSQL)
CREATE TABLE IF NOT EXISTS etl_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proceso VARCHAR(100) NOT NULL,
  registros_procesados INT DEFAULT 0,
  registros_exitosos INT DEFAULT 0,
  registros_fallidos INT DEFAULT 0,
  fecha_ejecucion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estado VARCHAR(50) NULL
);

-- Restricción precio positivo (ejecutar solo si no existe; en re-ejecución puede fallar)
SET @exist = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'productos' AND CONSTRAINT_NAME = 'chk_precio_positivo');
SET @sql = IF(@exist = 0, 'ALTER TABLE productos ADD CONSTRAINT chk_precio_positivo CHECK (precio_unitario >= 0)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
