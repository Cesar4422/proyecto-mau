-- ============================================
-- FASE 4: CONSULTAS OLAP MULTIDIMENSIONALES (MySQL)
-- Equivalente al script PostgreSQL Fase 4
-- Ejecutar después del ETL (fase 3)
-- ============================================
USE dw_manager;

-- 4.1 ROLL-UP: Agregación jerárquica
-- Por Año
SELECT t.anio, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades
FROM fact_ventas f
JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
GROUP BY t.anio ORDER BY t.anio;

-- Por Año y Trimestre
SELECT t.anio, t.trimestre, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades
FROM fact_ventas f
JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
GROUP BY t.anio, t.trimestre ORDER BY t.anio, t.trimestre;

-- Por Año, Trimestre y Mes
SELECT t.anio, t.trimestre, t.mes, t.nombre_mes, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades
FROM fact_ventas f
JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
GROUP BY t.anio, t.trimestre, t.mes, t.nombre_mes ORDER BY t.anio, t.trimestre, t.mes LIMIT 20;

-- 4.2 DRILL-DOWN: Por categoría y por producto
SELECT p.categoria, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades
FROM fact_ventas f
JOIN dim_producto p ON f.sk_producto = p.sk_producto
GROUP BY p.categoria ORDER BY total_ventas DESC;

SELECT p.categoria, p.nombre AS producto, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades
FROM fact_ventas f
JOIN dim_producto p ON f.sk_producto = p.sk_producto
GROUP BY p.categoria, p.nombre ORDER BY p.categoria, total_ventas DESC LIMIT 20;

-- 4.3 SLICE: Corte por dimensión
-- Solo Electrónica
SELECT t.anio, t.nombre_mes, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades
FROM fact_ventas f
JOIN dim_producto p ON f.sk_producto = p.sk_producto
JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
WHERE p.categoria = 'Electrónica'
GROUP BY t.anio, t.mes, t.nombre_mes ORDER BY t.anio, t.mes LIMIT 15;

-- Solo Hogar
SELECT t.anio, t.nombre_mes, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades
FROM fact_ventas f
JOIN dim_producto p ON f.sk_producto = p.sk_producto
JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
WHERE p.categoria = 'Hogar'
GROUP BY t.anio, t.mes, t.nombre_mes ORDER BY t.anio, t.mes LIMIT 15;

-- Solo ciudad Huixquilucan
SELECT p.categoria, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades
FROM fact_ventas f
JOIN dim_producto p ON f.sk_producto = p.sk_producto
JOIN dim_sucursal s ON f.sk_sucursal = s.sk_sucursal
WHERE s.ciudad = 'Huixquilucan'
GROUP BY p.categoria ORDER BY total_ventas DESC;

-- Solo Q4 2024
SELECT p.categoria, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades
FROM fact_ventas f
JOIN dim_producto p ON f.sk_producto = p.sk_producto
JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
WHERE t.anio = 2024 AND t.trimestre = 4
GROUP BY p.categoria ORDER BY total_ventas DESC;

-- 4.4 DICE: Filtrado multidimensional
-- Electrónica + Ene-Feb 2024
SELECT p.nombre AS producto, s.ciudad AS sucursal, t.nombre_mes,
  SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades
FROM fact_ventas f
JOIN dim_producto p ON f.sk_producto = p.sk_producto
JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
JOIN dim_sucursal s ON f.sk_sucursal = s.sk_sucursal
WHERE p.categoria = 'Electrónica' AND t.anio = 2024 AND t.mes BETWEEN 1 AND 2
GROUP BY p.nombre, s.ciudad, t.mes, t.nombre_mes ORDER BY total_ventas DESC LIMIT 15;

-- Hogar + Q3 2024 + Región Centro
SELECT p.nombre AS producto, s.ciudad, t.nombre_mes,
  SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades
FROM fact_ventas f
JOIN dim_producto p ON f.sk_producto = p.sk_producto
JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
JOIN dim_sucursal s ON f.sk_sucursal = s.sk_sucursal
WHERE p.categoria = 'Hogar' AND t.anio = 2024 AND t.trimestre = 3 AND s.region = 'Centro'
GROUP BY p.nombre, s.ciudad, t.mes, t.nombre_mes ORDER BY total_ventas DESC LIMIT 15;

-- 4.5 KPIs: Top 10 productos, ranking sucursales, día semana, tendencia mensual
SELECT ROW_NUMBER() OVER (ORDER BY SUM(f.monto_total) DESC) AS ranking,
  p.nombre AS producto, p.categoria, SUM(f.monto_total) AS total_ventas,
  SUM(f.cantidad) AS total_unidades, COUNT(*) AS num_transacciones
FROM fact_ventas f
JOIN dim_producto p ON f.sk_producto = p.sk_producto
GROUP BY p.nombre, p.categoria ORDER BY total_ventas DESC LIMIT 10;

SELECT ROW_NUMBER() OVER (ORDER BY SUM(f.monto_total) DESC) AS ranking,
  s.nombre_sucursal, s.ciudad, s.region, SUM(f.monto_total) AS total_ventas,
  SUM(f.cantidad) AS total_unidades, COUNT(*) AS num_transacciones, AVG(f.monto_total) AS promedio_transaccion
FROM fact_ventas f
JOIN dim_sucursal s ON f.sk_sucursal = s.sk_sucursal
GROUP BY s.nombre_sucursal, s.ciudad, s.region ORDER BY total_ventas DESC;

SELECT t.nombre_dia_semana, COUNT(*) AS num_transacciones, SUM(f.monto_total) AS total_ventas, AVG(f.monto_total) AS promedio_venta
FROM fact_ventas f
JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
GROUP BY t.nombre_dia_semana ORDER BY total_ventas DESC;

-- Tendencia mensual 2024 con crecimiento %
WITH ventas_mensuales AS (
  SELECT t.anio, t.mes, t.nombre_mes, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades
  FROM fact_ventas f
  JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
  WHERE t.anio = 2024
  GROUP BY t.anio, t.mes, t.nombre_mes
)
SELECT anio, mes, nombre_mes, total_ventas, total_unidades,
  LAG(total_ventas) OVER (ORDER BY mes) AS ventas_mes_anterior,
  CASE WHEN LAG(total_ventas) OVER (ORDER BY mes) IS NOT NULL AND LAG(total_ventas) OVER (ORDER BY mes) > 0
    THEN ROUND((total_ventas - LAG(total_ventas) OVER (ORDER BY mes)) / LAG(total_ventas) OVER (ORDER BY mes) * 100, 2)
    ELSE NULL END AS crecimiento_porcentual
FROM ventas_mensuales ORDER BY mes;

-- Ventas por región
SELECT s.region, COUNT(DISTINCT s.sk_sucursal) AS num_sucursales,
  SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades, AVG(f.monto_total) AS promedio_venta
FROM fact_ventas f
JOIN dim_sucursal s ON f.sk_sucursal = s.sk_sucursal
GROUP BY s.region ORDER BY total_ventas DESC;

-- Análisis trimestral
SELECT t.anio, t.trimestre, COUNT(*) AS num_transacciones, SUM(f.monto_total) AS total_ventas,
  AVG(f.monto_total) AS promedio_venta, COUNT(DISTINCT f.sk_producto) AS productos_vendidos,
  COUNT(DISTINCT f.sk_sucursal) AS sucursales_activas
FROM fact_ventas f
JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
GROUP BY t.anio, t.trimestre ORDER BY t.anio, t.trimestre;

-- Resumen ejecutivo
SELECT 'Total de Ventas' AS kpi, CONCAT('$', FORMAT(SUM(monto_total), 2)) AS valor FROM fact_ventas
UNION ALL SELECT 'Total Unidades', FORMAT(SUM(cantidad), 0) FROM fact_ventas
UNION ALL SELECT 'Número Transacciones', CAST(COUNT(*) AS CHAR) FROM fact_ventas
UNION ALL SELECT 'Promedio por Transacción', CONCAT('$', FORMAT(AVG(monto_total), 2)) FROM fact_ventas
UNION ALL SELECT 'Productos Únicos', CAST(COUNT(DISTINCT sk_producto) AS CHAR) FROM fact_ventas
UNION ALL SELECT 'Sucursales Activas', CAST(COUNT(DISTINCT sk_sucursal) AS CHAR) FROM fact_ventas
UNION ALL
SELECT 'Período de Análisis', CONCAT(DATE_FORMAT(MIN(dt.fecha), '%Y-%m-%d'), ' a ', DATE_FORMAT(MAX(dt.fecha), '%Y-%m-%d'))
FROM fact_ventas f JOIN dim_tiempo dt ON f.sk_tiempo = dt.sk_tiempo;
