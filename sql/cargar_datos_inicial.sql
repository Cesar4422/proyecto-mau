-- Carga inicial rápida: categorías, productos, ventas (sin procedimiento lento)
USE dw_manager;

-- Categorías
INSERT INTO categorias (id, nombre) VALUES
(1, 'Electrónica'),
(2, 'Hogar'),
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

-- Productos
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

-- Ventas: 250 filas (10 productos x 5 x 5 = 250)
INSERT INTO ventas (producto_id, cantidad, monto_total, fecha_venta)
SELECT p.id,
  1 + FLOOR(RAND() * 5),
  ROUND(p.precio_unitario * (1 + FLOOR(RAND() * 5)), 2),
  DATE_ADD('2024-01-01', INTERVAL FLOOR(RAND() * 400) DAY)
FROM productos p
CROSS JOIN (SELECT 1 x UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) t1
CROSS JOIN (SELECT 1 x UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) t2
LIMIT 250;
