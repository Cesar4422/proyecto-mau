-- Rellena dim_tiempo en un solo INSERT (MySQL 8+: CTE recursivo)
USE dw_manager;

INSERT INTO dim_tiempo (fecha, dia, mes, nombre_mes, trimestre, anio, nombre_dia_semana, es_fin_de_semana, semana_del_anio)
WITH RECURSIVE fechas(d) AS (
  SELECT DATE('2024-01-01')
  UNION ALL
  SELECT d + INTERVAL 1 DAY FROM fechas WHERE d < DATE('2025-12-31')
)
SELECT
  d,
  DAYOFMONTH(d),
  MONTH(d),
  ELT(MONTH(d), 'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'),
  QUARTER(d),
  YEAR(d),
  ELT(DAYOFWEEK(d), 'Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'),
  IF(DAYOFWEEK(d) IN (1, 7), 1, 0),
  WEEKOFYEAR(d)
FROM fechas
ON DUPLICATE KEY UPDATE
  dia = VALUES(dia),
  mes = VALUES(mes),
  nombre_mes = VALUES(nombre_mes),
  trimestre = VALUES(trimestre),
  anio = VALUES(anio),
  nombre_dia_semana = VALUES(nombre_dia_semana),
  es_fin_de_semana = VALUES(es_fin_de_semana),
  semana_del_anio = VALUES(semana_del_anio);
