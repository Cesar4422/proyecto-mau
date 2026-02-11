-- ============================================
-- SCRIPT ÚNICO PARA MYSQL WORKBENCH
-- Inicializa la base dw_manager completa (esquema + datos + ETL). Sin usuarios (se crean con Python).
--
-- CÓMO USAR:
-- 1. Abre MySQL Workbench y conéctate a tu servidor (root o tu usuario).
-- 2. File → Open SQL Script → selecciona este archivo.
-- 3. Ejecuta todo: botón Rayo (Execute) o Ctrl+Shift+Enter.
-- 4. Luego en la terminal: python scripts/crear_usuario_prueba.py (crea prueba@test.com / prueba123).
--
-- Requiere: MySQL 8.0 recomendado.
-- ============================================

-- ========== PARTE 1: ESQUEMA (schema-mysql.sql) ==========
CREATE DATABASE IF NOT EXISTS dw_manager
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE dw_manager;

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

CREATE TABLE IF NOT EXISTS categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  UNIQUE KEY uk_categorias_nombre (nombre)
);

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

CREATE TABLE IF NOT EXISTS ventas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  monto_total DECIMAL(12,2) NOT NULL,
  fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT
);

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

CREATE TABLE IF NOT EXISTS reglas_asignacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  criterio VARCHAR(50) NOT NULL,
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO reglas_asignacion (id, nombre, criterio, activo) VALUES (1, 'Por defecto (FIFO)', 'prioridad_fifo', 1);

CREATE TABLE IF NOT EXISTS dim_sucursal (
  sk_sucursal INT AUTO_INCREMENT PRIMARY KEY,
  id_sucursal INT NOT NULL,
  nombre_sucursal VARCHAR(200) NOT NULL,
  ciudad VARCHAR(100) NOT NULL,
  estado VARCHAR(100) NOT NULL,
  region VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS dim_producto (
  sk_producto INT AUTO_INCREMENT PRIMARY KEY,
  id_fuente INT NOT NULL UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  categoria VARCHAR(100) NOT NULL
);

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

CREATE TABLE IF NOT EXISTS etl_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proceso VARCHAR(100) NOT NULL,
  registros_procesados INT DEFAULT 0,
  registros_exitosos INT DEFAULT 0,
  registros_fallidos INT DEFAULT 0,
  fecha_ejecucion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estado VARCHAR(50) NULL
);

SET @exist = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'productos' AND CONSTRAINT_NAME = 'chk_precio_positivo');
SET @sql = IF(@exist = 0, 'ALTER TABLE productos ADD CONSTRAINT chk_precio_positivo CHECK (precio_unitario >= 0)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ========== PARTE 2: FASE 1 - DIMENSIONES ==========
USE dw_manager;

INSERT IGNORE INTO dim_sucursal (id_sucursal, nombre_sucursal, ciudad, estado, region) VALUES
(1, 'Sucursal Centro', 'Ciudad de México', 'CDMX', 'Centro'),
(2, 'Sucursal Norte', 'Monterrey', 'Nuevo León', 'Norte'),
(3, 'Sucursal Occidente', 'Guadalajara', 'Jalisco', 'Occidente'),
(4, 'Sucursal Huixquilucan', 'Huixquilucan', 'Estado de México', 'Centro'),
(5, 'Sucursal Sur', 'Mérida', 'Yucatán', 'Sur');

DELIMITER $$

DROP PROCEDURE IF EXISTS poblar_dim_tiempo$$

CREATE PROCEDURE poblar_dim_tiempo(IN fecha_inicio DATE, IN fecha_fin DATE)
BEGIN
  DECLARE fecha_actual DATE DEFAULT fecha_inicio;
  DECLARE v_dia INT;
  DECLARE v_mes INT;
  DECLARE v_trimestre INT;
  DECLARE v_anio INT;
  DECLARE v_nombre_mes VARCHAR(20);
  DECLARE v_nombre_dia VARCHAR(20);
  DECLARE v_es_fin TINYINT;
  DECLARE v_semana INT;

  WHILE fecha_actual <= fecha_fin DO
    SET v_dia = DAYOFMONTH(fecha_actual);
    SET v_mes = MONTH(fecha_actual);
    SET v_trimestre = QUARTER(fecha_actual);
    SET v_anio = YEAR(fecha_actual);
    SET v_nombre_mes = ELT(v_mes, 'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre');
    SET v_nombre_dia = ELT(DAYOFWEEK(fecha_actual), 'Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado');
    SET v_es_fin = IF(DAYOFWEEK(fecha_actual) IN (1, 7), 1, 0);
    SET v_semana = WEEKOFYEAR(fecha_actual);

    INSERT INTO dim_tiempo (fecha, dia, mes, nombre_mes, trimestre, anio, nombre_dia_semana, es_fin_de_semana, semana_del_anio)
    VALUES (fecha_actual, v_dia, v_mes, v_nombre_mes, v_trimestre, v_anio, v_nombre_dia, v_es_fin, v_semana)
    ON DUPLICATE KEY UPDATE
      dia = v_dia, mes = v_mes, nombre_mes = v_nombre_mes, trimestre = v_trimestre, anio = v_anio,
      nombre_dia_semana = v_nombre_dia, es_fin_de_semana = v_es_fin, semana_del_anio = v_semana;

    SET fecha_actual = DATE_ADD(fecha_actual, INTERVAL 1 DAY);
  END WHILE;
END$$

DELIMITER ;

INSERT INTO dim_tiempo (fecha, dia, mes, nombre_mes, trimestre, anio, nombre_dia_semana, es_fin_de_semana, semana_del_anio)
WITH RECURSIVE fechas(d) AS (
  SELECT DATE('2024-01-01') UNION ALL
  SELECT d + INTERVAL 1 DAY FROM fechas WHERE d < DATE('2025-12-31')
)
SELECT d, DAYOFMONTH(d), MONTH(d),
  ELT(MONTH(d), 'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'),
  QUARTER(d), YEAR(d),
  ELT(DAYOFWEEK(d), 'Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'),
  IF(DAYOFWEEK(d) IN (1, 7), 1, 0), WEEKOFYEAR(d)
FROM fechas
ON DUPLICATE KEY UPDATE dia=VALUES(dia), mes=VALUES(mes), nombre_mes=VALUES(nombre_mes), trimestre=VALUES(trimestre), anio=VALUES(anio), nombre_dia_semana=VALUES(nombre_dia_semana), es_fin_de_semana=VALUES(es_fin_de_semana), semana_del_anio=VALUES(semana_del_anio);

-- Índices (compatible con MySQL 5.7: crear solo si no existen)
DELIMITER $$
DROP PROCEDURE IF EXISTS crear_indices_dw$$
CREATE PROCEDURE crear_indices_dw()
BEGIN
  DECLARE n INT DEFAULT 0;

  SELECT COUNT(*) INTO n FROM information_schema.STATISTICS
  WHERE table_schema = DATABASE() AND table_name = 'fact_ventas' AND index_name = 'idx_fact_ventas_producto';
  IF n = 0 THEN
    CREATE INDEX idx_fact_ventas_producto ON fact_ventas(sk_producto);
  END IF;

  SELECT COUNT(*) INTO n FROM information_schema.STATISTICS
  WHERE table_schema = DATABASE() AND table_name = 'fact_ventas' AND index_name = 'idx_fact_ventas_tiempo';
  IF n = 0 THEN
    CREATE INDEX idx_fact_ventas_tiempo ON fact_ventas(sk_tiempo);
  END IF;

  SELECT COUNT(*) INTO n FROM information_schema.STATISTICS
  WHERE table_schema = DATABASE() AND table_name = 'fact_ventas' AND index_name = 'idx_fact_ventas_sucursal';
  IF n = 0 THEN
    CREATE INDEX idx_fact_ventas_sucursal ON fact_ventas(sk_sucursal);
  END IF;

  SELECT COUNT(*) INTO n FROM information_schema.STATISTICS
  WHERE table_schema = DATABASE() AND table_name = 'dim_tiempo' AND index_name = 'idx_dim_tiempo_fecha';
  IF n = 0 THEN
    CREATE INDEX idx_dim_tiempo_fecha ON dim_tiempo(fecha);
  END IF;

  SELECT COUNT(*) INTO n FROM information_schema.STATISTICS
  WHERE table_schema = DATABASE() AND table_name = 'dim_tiempo' AND index_name = 'idx_dim_tiempo_anio_mes';
  IF n = 0 THEN
    CREATE INDEX idx_dim_tiempo_anio_mes ON dim_tiempo(anio, mes);
  END IF;
END$$
DELIMITER ;

CALL crear_indices_dw();
DROP PROCEDURE IF EXISTS crear_indices_dw;

-- ========== PARTE 3: FASE 2 - DATOS DE PRUEBA ==========
USE dw_manager;

INSERT INTO categorias (id, nombre) VALUES
(1, 'Electrónica'),
(2, 'Hogar')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

INSERT INTO categorias (id, nombre) VALUES
(3, 'Línea Blanca'),
(4, 'Muebles'),
(5, 'Deportes'),
(6, 'Juguetería'),
(7, 'Ferretería'),
(8, 'Videojuegos'),
(9, 'Papelería'),
(10, 'Automotriz'),
(11, 'Mascotas'),
(12, 'Zapatería')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

INSERT INTO productos (nombre, categoria_id, precio_unitario, stock) VALUES
('Laptop Dell XPS 15', 1, 25999.00, 15),
('iPhone 14 Pro', 1, 28999.00, 25),
('Smart TV Samsung 55"', 1, 12999.00, 10),
('PlayStation 5', 1, 13999.00, 8),
('Refrigerador LG', 2, 15499.00, 5),
('Lavadora Whirlpool', 2, 8999.00, 12),
('Microondas Samsung', 2, 2499.00, 20),
('Licuadora Oster', 2, 899.00, 30),
('Aspiradora Dyson', 2, 7999.00, 7),
('Cafetera Nespresso', 2, 3499.00, 18);

DELIMITER $$

DROP PROCEDURE IF EXISTS generar_ventas_prueba$$

CREATE PROCEDURE generar_ventas_prueba(IN num_ventas INT, IN fecha_ini DATE, IN fecha_fin DATE)
BEGIN
  DECLARE i INT DEFAULT 0;
  DECLARE pid INT;
  DECLARE prec DECIMAL(12,2);
  DECLARE cant INT;
  DECLARE monto DECIMAL(12,2);
  DECLARE f_venta DATETIME;
  DECLARE dias INT;
  DECLARE segundos INT;

  WHILE i < num_ventas DO
    SELECT id, precio_unitario INTO pid, prec
    FROM productos
    ORDER BY RAND()
    LIMIT 1;

    SET cant = FLOOR(1 + RAND() * 5);
    SET monto = prec * cant;

    SET dias = DATEDIFF(fecha_fin, fecha_ini);
    SET segundos = FLOOR(RAND() * 86400);
    SET f_venta = DATE_ADD(DATE_ADD(fecha_ini, INTERVAL FLOOR(RAND() * (dias + 1)) DAY), INTERVAL segundos SECOND);

    INSERT INTO ventas (producto_id, cantidad, monto_total, fecha_venta)
    VALUES (pid, cant, monto, f_venta);

    SET i = i + 1;
  END WHILE;
END$$

DELIMITER ;

CALL generar_ventas_prueba(200, '2024-01-01', '2024-12-31');
CALL generar_ventas_prueba(50, '2025-01-01', '2025-01-31');

-- ========== PARTE 4: FASE 3 - ETL ==========
USE dw_manager;

INSERT INTO dim_producto (id_fuente, nombre, categoria)
SELECT
  p.id,
  TRIM(p.nombre),
  TRIM(COALESCE(c.nombre, 'Sin categoría'))
FROM productos p
LEFT JOIN categorias c ON p.categoria_id = c.id
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), categoria = VALUES(categoria);

INSERT INTO etl_log (proceso, registros_procesados, registros_exitosos, registros_fallidos, estado)
VALUES ('Carga Dim Producto', ROW_COUNT(), ROW_COUNT(), 0, 'EXITOSO');

INSERT IGNORE INTO fact_ventas (sk_producto, sk_tiempo, sk_sucursal, cantidad, monto_total)
SELECT
  dp.sk_producto,
  dt.sk_tiempo,
  (FLOOR(1 + RAND() * 5)) AS sk_sucursal,
  v.cantidad,
  v.monto_total
FROM ventas v
JOIN dim_producto dp ON v.producto_id = dp.id_fuente
JOIN dim_tiempo dt ON DATE(v.fecha_venta) = dt.fecha;

INSERT INTO etl_log (proceso, registros_procesados, registros_exitosos, registros_fallidos, estado)
VALUES ('Carga Fact Ventas', ROW_COUNT(), ROW_COUNT(), 0, 'EXITOSO');

DROP VIEW IF EXISTS v_ventas_categoria;
CREATE VIEW v_ventas_categoria AS
SELECT
  p.categoria,
  SUM(f.monto_total) AS total_ventas,
  SUM(f.cantidad) AS total_unidades,
  COUNT(DISTINCT f.sk_tiempo) AS dias_con_ventas,
  AVG(f.monto_total) AS promedio_venta
FROM fact_ventas f
JOIN dim_producto p ON f.sk_producto = p.sk_producto
GROUP BY p.categoria;

DROP VIEW IF EXISTS v_ventas_sucursal;
CREATE VIEW v_ventas_sucursal AS
SELECT
  s.nombre_sucursal,
  s.ciudad,
  s.region,
  SUM(f.monto_total) AS total_ventas,
  SUM(f.cantidad) AS total_unidades,
  COUNT(*) AS num_transacciones
FROM fact_ventas f
JOIN dim_sucursal s ON f.sk_sucursal = s.sk_sucursal
GROUP BY s.nombre_sucursal, s.ciudad, s.region;

DROP VIEW IF EXISTS v_ventas_periodo;
CREATE VIEW v_ventas_periodo AS
SELECT
  t.anio,
  t.trimestre,
  t.mes,
  t.nombre_mes,
  SUM(f.monto_total) AS total_ventas,
  SUM(f.cantidad) AS total_unidades,
  COUNT(DISTINCT f.sk_producto) AS productos_vendidos
FROM fact_ventas f
JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
GROUP BY t.anio, t.trimestre, t.mes, t.nombre_mes;

DELIMITER $$

DROP PROCEDURE IF EXISTS refrescar_vistas_materializadas$$

CREATE PROCEDURE refrescar_vistas_materializadas()
BEGIN
  INSERT INTO etl_log (proceso, registros_procesados, registros_exitosos, registros_fallidos, estado)
  VALUES ('Refresco vistas', 0, 0, 0, 'OK (vistas siempre actualizadas)');
END$$

DELIMITER ;

-- ========== PARTE 5: USUARIO DE PRUEBA ==========
-- No insertamos usuario aquí para evitar problemas con el hash (bcrypt).
-- Después de ejecutar este script, en la terminal del proyecto ejecuta:
--   python scripts/crear_usuario_prueba.py
-- Eso crea prueba@test.com / prueba123 con hash correcto.

-- ========== FIN ==========
SELECT 'Inicialización completada.' AS mensaje;
SELECT 'Crea el usuario de prueba con: python scripts/crear_usuario_prueba.py' AS siguiente_paso;
