-- ============================================
-- FASE 2: DATOS DE PRUEBA (MySQL)
-- Equivalente al script PostgreSQL Fase 3
-- ============================================
USE dw_manager;

-- 2.1 Categorías (insertar con ID explícito; ignorar si ya existe)
-- ============================================
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

-- 2.2 Productos de ejemplo (ejecutar una vez; si repites, se añaden más filas)
-- ============================================
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

-- 2.3 Procedimiento: generar N ventas aleatorias en un rango de fechas
-- ============================================
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
    -- Producto aleatorio
    SELECT id, precio_unitario INTO pid, prec
    FROM productos
    ORDER BY RAND()
    LIMIT 1;

    SET cant = FLOOR(1 + RAND() * 5);
    SET monto = prec * cant;

    -- Fecha aleatoria entre fecha_ini y fecha_fin
    SET dias = DATEDIFF(fecha_fin, fecha_ini);
    SET segundos = FLOOR(RAND() * 86400);
    SET f_venta = DATE_ADD(DATE_ADD(fecha_ini, INTERVAL FLOOR(RAND() * (dias + 1)) DAY), INTERVAL segundos SECOND);

    INSERT INTO ventas (producto_id, cantidad, monto_total, fecha_venta)
    VALUES (pid, cant, monto, f_venta);

    SET i = i + 1;
  END WHILE;
END$$

DELIMITER ;

-- Generar 200 ventas en 2024
CALL generar_ventas_prueba(200, '2024-01-01', '2024-12-31');

-- Generar 50 ventas en enero 2025
CALL generar_ventas_prueba(50, '2025-01-01', '2025-01-31');

-- 2.4 Verificación
-- ============================================
SELECT 'Total de Productos' AS metrica, COUNT(*) AS valor FROM productos
UNION ALL SELECT 'Total de Ventas', COUNT(*) FROM ventas
UNION ALL
SELECT 'Rango de Fechas', CONCAT(MIN(DATE(fecha_venta)), ' a ', MAX(DATE(fecha_venta))) FROM ventas
UNION ALL
SELECT 'Total en Ventas', CONCAT('$', FORMAT(SUM(monto_total), 2)) FROM ventas;
