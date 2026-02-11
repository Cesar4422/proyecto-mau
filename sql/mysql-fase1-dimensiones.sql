-- ============================================
-- FASE 1: DIMENSIONES DEL DW (MySQL)
-- Equivalente al script PostgreSQL
-- ============================================
USE dw_manager;

-- 1.1 Datos de ejemplo para sucursales (INSERT IGNORE = ON CONFLICT DO NOTHING)
-- ============================================
INSERT IGNORE INTO dim_sucursal (id_sucursal, nombre_sucursal, ciudad, estado, region) VALUES
(1, 'Sucursal Centro', 'Ciudad de México', 'CDMX', 'Centro'),
(2, 'Sucursal Norte', 'Monterrey', 'Nuevo León', 'Norte'),
(3, 'Sucursal Occidente', 'Guadalajara', 'Jalisco', 'Occidente'),
(4, 'Sucursal Huixquilucan', 'Huixquilucan', 'Estado de México', 'Centro'),
(5, 'Sucursal Sur', 'Mérida', 'Yucatán', 'Sur');

-- 1.2 Añadir columnas a dim_tiempo si no existen (MySQL no tiene ADD COLUMN IF NOT EXISTS en todas las versiones)
-- ============================================
-- Ejecutar solo si la tabla se creó sin estas columnas (schema-mysql.sql ya las incluye)

-- 1.3 Procedimiento para poblar dim_tiempo (equivalente a dw.poblar_dim_tiempo en PostgreSQL)
-- ============================================
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
  DECLARE nombres_mes VARCHAR(200) DEFAULT 'Enero,Febrero,Marzo,Abril,Mayo,Junio,Julio,Agosto,Septiembre,Octubre,Noviembre,Diciembre';
  DECLARE nombres_dia VARCHAR(200) DEFAULT 'Domingo,Lunes,Martes,Miércoles,Jueves,Viernes,Sábado';

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

-- Poblar 2024-2025 (INSERT único rápido; si falla por sintaxis use: CALL poblar_dim_tiempo('2024-01-01', '2025-12-31');)
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

-- 1.4 Índices para optimización
-- ============================================
CREATE INDEX IF NOT EXISTS idx_fact_ventas_producto ON fact_ventas(sk_producto);
CREATE INDEX IF NOT EXISTS idx_fact_ventas_tiempo ON fact_ventas(sk_tiempo);
CREATE INDEX IF NOT EXISTS idx_fact_ventas_sucursal ON fact_ventas(sk_sucursal);
CREATE INDEX IF NOT EXISTS idx_dim_tiempo_fecha ON dim_tiempo(fecha);
CREATE INDEX IF NOT EXISTS idx_dim_tiempo_anio_mes ON dim_tiempo(anio, mes);

-- 1.5 Verificación
-- ============================================
SELECT 'Dimensión Sucursal' AS tabla, COUNT(*) AS registros FROM dim_sucursal
UNION ALL SELECT 'Dimensión Tiempo', COUNT(*) FROM dim_tiempo
UNION ALL SELECT 'Dimensión Producto', COUNT(*) FROM dim_producto;
