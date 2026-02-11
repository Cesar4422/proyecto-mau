-- ============================================
-- SCRIPT PARA GENERAR 10,000 DATOS MASIVOS (MySQL)
-- Proyecto Data Warehouse - Metodología Kimball
-- ============================================
USE dw_manager;

-- Paso 1: Limpiar datos existentes (OPCIONAL - descomentar si quieres empezar desde cero)
-- Atención: respeta el orden por claves foráneas
-- TRUNCATE TABLE fact_ventas;
-- TRUNCATE TABLE ventas;
-- TRUNCATE TABLE movimientos;
-- TRUNCATE TABLE pedidos;
-- TRUNCATE TABLE productos;
-- DELETE FROM dim_producto;
-- DELETE FROM categorias;
-- ALTER TABLE dim_producto AUTO_INCREMENT = 1;
-- ALTER TABLE categorias AUTO_INCREMENT = 1;

-- ============================================
-- PASO 2: Categorías adicionales (schema-mysql ya tiene UNIQUE(nombre) en categorias)
-- ============================================
INSERT IGNORE INTO categorias (nombre) VALUES
('Electrónica'),
('Hogar y Cocina'),
('Deportes y Fitness'),
('Ropa y Moda'),
('Juguetes y Bebés'),
('Libros y Papelería'),
('Salud y Belleza'),
('Automotriz'),
('Herramientas y Construcción'),
('Alimentos y Bebidas'),
('Mascotas'),
('Jardinería'),
('Oficina'),
('Música e Instrumentos'),
('Videojuegos');

-- ============================================
-- PASO 3: CREAR 500 PRODUCTOS (procedimiento)
-- Usa plantillas por categoría (12 primeras categorías por ID)
-- ============================================
DELIMITER $$

DROP PROCEDURE IF EXISTS generar_500_productos$$

CREATE PROCEDURE generar_500_productos()
BEGIN
  DECLARE v_contador INT DEFAULT 1;
  DECLARE v_cat_count INT DEFAULT 12;
  DECLARE v_categoria_id INT;
  DECLARE v_cat_nombre VARCHAR(100);
  DECLARE v_nombre_base VARCHAR(200);
  DECLARE v_precio DECIMAL(10,2);
  DECLARE v_stock INT;
  DECLARE v_off INT;
  DECLARE v_seq INT;

  DROP TEMPORARY TABLE IF EXISTS _plantilla_productos;
  CREATE TEMPORARY TABLE _plantilla_productos (
    cat_off INT,
    seq INT,
    nombre_base VARCHAR(200),
    PRIMARY KEY (cat_off, seq)
  );

  -- Plantillas por categoría (offset 0..11, 15 nombres cada una)
  INSERT INTO _plantilla_productos (cat_off, seq, nombre_base) VALUES
  (0,1,'Laptop HP'),(0,2,'iPhone 15'),(0,3,'Samsung Galaxy'),(0,4,'iPad Pro'),(0,5,'AirPods'),(0,6,'Monitor LG 27'),(0,7,'Teclado Mecánico RGB'),(0,8,'Mouse Gamer'),(0,9,'Webcam 4K'),(0,10,'Auriculares Sony'),(0,11,'Smart TV 55'),(0,12,'Tablet Samsung'),(0,13,'Apple Watch'),(0,14,'PowerBank 20000mAh'),(0,15,'Cable HDMI'),
  (1,1,'Licuadora Oster'),(1,2,'Microondas Samsung'),(1,3,'Cafetera Nespresso'),(1,4,'Batidora KitchenAid'),(1,5,'Freidora Aire'),(1,6,'Aspiradora Dyson'),(1,7,'Plancha Vapor'),(1,8,'Ventilador Torre'),(1,9,'Purificador Aire'),(1,10,'Juego Sartenes'),(1,11,'Set Cuchillos'),(1,12,'Tostadora'),(1,13,'Olla Presión'),(1,14,'Hervidor Eléctrico'),(1,15,'Báscula Digital'),
  (2,1,'Refrigerador Samsung 18p'),(2,2,'Lavadora LG 19kg'),(2,3,'Secadora 15kg'),(2,4,'Estufa 6 Quemadores'),(2,5,'Horno Empotrable'),(2,6,'Lavavajillas'),(2,7,'Campana Extractora'),(2,8,'Congelador Vertical'),(2,9,'Minibar Compacto'),(2,10,'Calentador Agua'),(2,11,'Línea Blanca A'),(2,12,'Línea Blanca B'),(2,13,'Línea Blanca C'),(2,14,'Línea Blanca D'),(2,15,'Línea Blanca E'),
  (3,1,'Sofá 3 plazas'),(3,2,'Mesa Comedor 6 sillas'),(3,3,'Silla Oficina Ergonómica'),(3,4,'Cama Queen Size'),(3,5,'Ropero 4 puertas'),(3,6,'Librero Moderno'),(3,7,'Mesa Centro Vidrio'),(3,8,'Escritorio Ejecutivo'),(3,9,'Sillón Reclinable'),(3,10,'Tocador con Espejo'),(3,11,'Mueble A'),(3,12,'Mueble B'),(3,13,'Mueble C'),(3,14,'Mueble D'),(3,15,'Mueble E'),
  (4,1,'Caminadora Eléctrica'),(4,2,'Bicicleta Estática'),(4,3,'Mancuernas 15kg Par'),(4,4,'Banda Elástica'),(4,5,'Yoga Mat Premium'),(4,6,'Pelota Yoga 65cm'),(4,7,'Cuerda Saltar Pro'),(4,8,'Guantes Box 12oz'),(4,9,'Balón Fútbol Nike'),(4,10,'Raqueta Tenis Wilson'),(4,11,'Deporte A'),(4,12,'Deporte B'),(4,13,'Deporte C'),(4,14,'Deporte D'),(4,15,'Deporte E'),
  (5,1,'Muñeca Barbie Fashionista'),(5,2,'Carro Control Remoto 4x4'),(5,3,'Peluche Oso 80cm'),(5,4,'Rompecabezas 1000 piezas'),(5,5,'Bloques Construcción 500pz'),(5,6,'Casa Muñecas 3 pisos'),(5,7,'Triciclo Infantil'),(5,8,'Bicicleta Infantil R16'),(5,9,'Juego Mesa Monopoly'),(5,10,'Pelota Sensorial'),(5,11,'Juguete A'),(5,12,'Juguete B'),(5,13,'Juguete C'),(5,14,'Juguete D'),(5,15,'Juguete E'),
  (6,1,'Taladro Inalámbrico 20V'),(6,2,'Sierra Circular 7.25'),(6,3,'Martillo Acero 16oz'),(6,4,'Set Destornilladores 24pz'),(6,5,'Llave Inglesa 12'),(6,6,'Nivel Láser'),(6,7,'Cinta Métrica 8m'),(6,8,'Escalera Aluminio 6 pasos'),(6,9,'Pistola Calor 2000W'),(6,10,'Lijadora Orbital'),(6,11,'Ferretería A'),(6,12,'Ferretería B'),(6,13,'Ferretería C'),(6,14,'Ferretería D'),(6,15,'Ferretería E'),
  (7,1,'PlayStation 5 Digital'),(7,2,'Xbox Series X 1TB'),(7,3,'Nintendo Switch OLED'),(7,4,'Control DualSense'),(7,5,'Auriculares Gaming 7.1'),(7,6,'Silla Gamer RGB'),(7,7,'Teclado Mecánico Gaming'),(7,8,'Mouse Gaming 16000 DPI'),(7,9,'Monitor Gaming 144Hz'),(7,10,'Juego FIFA 24'),(7,11,'Videojuegos A'),(7,12,'Videojuegos B'),(7,13,'Videojuegos C'),(7,14,'Videojuegos D'),(7,15,'Videojuegos E'),
  (8,1,'Cuaderno 100 hojas'),(8,2,'Plumas Gel Pack 12'),(8,3,'Lápices Colores 24pz'),(8,4,'Marcadores Permanentes'),(8,5,'Post-it Variados'),(8,6,'Folder Tamaño Carta'),(8,7,'Calculadora Científica'),(8,8,'Engrapadora Metálica'),(8,9,'Tijeras Escolares'),(8,10,'Pegamento 250ml'),(8,11,'Papelería A'),(8,12,'Papelería B'),(8,13,'Papelería C'),(8,14,'Papelería D'),(8,15,'Papelería E'),
  (9,1,'Aceite Motor 5W-30 4L'),(9,2,'Filtro Aire Motor'),(9,3,'Batería 12V 45AH'),(9,4,'Llantas Michelin R15'),(9,5,'Limpiador Vidrios'),(9,6,'Cera Auto Líquida'),(9,7,'Aspiradora Auto 12V'),(9,8,'Alfombras Universales'),(9,9,'Cargador USB Doble'),(9,10,'Cámara Reversa HD'),(9,11,'Automotriz A'),(9,12,'Automotriz B'),(9,13,'Automotriz C'),(9,14,'Automotriz D'),(9,15,'Automotriz E'),
  (10,1,'Alimento Perro Premium 15kg'),(10,2,'Alimento Gato Adulto 10kg'),(10,3,'Arena Gato Aglutinante'),(10,4,'Casa Perro Grande'),(10,5,'Correa Retráctil 5m'),(10,6,'Collar Ajustable LED'),(10,7,'Juguete Masticable'),(10,8,'Cepillo Pelo Largo'),(10,9,'Shampoo Antipulgas'),(10,10,'Bebedero Automático'),(10,11,'Mascotas A'),(10,12,'Mascotas B'),(10,13,'Mascotas C'),(10,14,'Mascotas D'),(10,15,'Mascotas E'),
  (11,1,'Tenis Nike Air Max'),(11,2,'Zapatos Formales Cuero'),(11,3,'Botas Trabajo Dieléctricas'),(11,4,'Sandalias Playa Crocs'),(11,5,'Tenis Adidas Ultraboost'),(11,6,'Zapatos Deportivos Puma'),(11,7,'Pantuflas Memory Foam'),(11,8,'Tenis Running Mujer'),(11,9,'Botas Montaña Impermeables'),(11,10,'Chanclas Deportivas'),(11,11,'Zapatería A'),(11,12,'Zapatería B'),(11,13,'Zapatería C'),(11,14,'Zapatería D'),(11,15,'Zapatería E');

  SET v_cat_count = 12;

  WHILE v_contador <= 500 DO
    SET v_off = (v_contador - 1) % v_cat_count;
    SET v_seq = ((v_contador - 1) DIV v_cat_count) % 15 + 1;

    SELECT id INTO v_categoria_id FROM categorias ORDER BY id LIMIT 1 OFFSET v_off;
    SELECT nombre INTO v_cat_nombre FROM categorias WHERE id = v_categoria_id;
    SELECT nombre_base INTO v_nombre_base FROM _plantilla_productos WHERE cat_off = v_off AND seq = v_seq;

    SET v_precio = CASE v_cat_nombre
      WHEN 'Electrónica' THEN 3000 + RAND() * 45000
      WHEN 'Hogar' THEN 800 + RAND() * 7000
      WHEN 'Línea Blanca' THEN 5000 + RAND() * 20000
      WHEN 'Muebles' THEN 2000 + RAND() * 12000
      WHEN 'Deportes' THEN 1500 + RAND() * 10000
      WHEN 'Juguetería' THEN 200 + RAND() * 2500
      WHEN 'Ferretería' THEN 500 + RAND() * 7000
      WHEN 'Videojuegos' THEN 3000 + RAND() * 16000
      WHEN 'Papelería' THEN 50 + RAND() * 350
      WHEN 'Automotriz' THEN 800 + RAND() * 10000
      WHEN 'Mascotas' THEN 150 + RAND() * 1800
      WHEN 'Zapatería' THEN 500 + RAND() * 3500
      ELSE 500 + RAND() * 5000
    END;

    SET v_stock = FLOOR(5 + RAND() * 96);

    INSERT INTO productos (nombre, categoria_id, precio_unitario, stock)
    VALUES (
      CONCAT(v_nombre_base, ' #', LPAD(v_contador, 3, '0')),
      v_categoria_id,
      ROUND(v_precio, 2),
      v_stock
    );

    SET v_contador = v_contador + 1;
  END WHILE;

  DROP TEMPORARY TABLE _plantilla_productos;
END$$

DELIMITER ;

CALL generar_500_productos();

-- ============================================
-- PASO 4: GENERAR 10,000 VENTAS (procedimiento)
-- ============================================
DELIMITER $$

DROP PROCEDURE IF EXISTS generar_10000_ventas$$

CREATE PROCEDURE generar_10000_ventas()
BEGIN
  DECLARE v_contador INT DEFAULT 1;
  DECLARE v_producto_id INT;
  DECLARE v_cantidad INT;
  DECLARE v_precio DECIMAL(10,2);
  DECLARE v_monto_total DECIMAL(10,2);
  DECLARE v_fecha_venta DATETIME;
  DECLARE v_rng BIGINT;

  SET v_rng = UNIX_TIMESTAMP('2024-12-31 23:59:59') - UNIX_TIMESTAMP('2023-01-01 00:00:00');

  WHILE v_contador <= 10000 DO
    SELECT id, precio_unitario INTO v_producto_id, v_precio
    FROM productos ORDER BY RAND() LIMIT 1;
    SET v_cantidad = FLOOR(1 + RAND() * 10);
    SET v_monto_total = ROUND(v_precio * v_cantidad, 2);
    SET v_fecha_venta = DATE_ADD('2023-01-01 00:00:00', INTERVAL FLOOR(RAND() * v_rng) SECOND);
    INSERT INTO ventas (producto_id, cantidad, monto_total, fecha_venta)
    VALUES (v_producto_id, v_cantidad, v_monto_total, v_fecha_venta);
    SET v_contador = v_contador + 1;
  END WHILE;
END$$

DELIMITER ;

CALL generar_10000_ventas();

-- ============================================
-- PASO 5: POBLAR DIMENSIÓN TIEMPO (2023-2024)
-- ============================================
CALL poblar_dim_tiempo('2023-01-01', '2024-12-31');

-- ============================================
-- PASO 6: ETL AL DATA WAREHOUSE
-- ============================================
INSERT INTO dim_producto (id_fuente, nombre, categoria)
SELECT
  p.id,
  TRIM(p.nombre),
  TRIM(COALESCE(c.nombre, 'Sin categoría'))
FROM productos p
LEFT JOIN categorias c ON p.categoria_id = c.id
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), categoria = VALUES(categoria);

INSERT INTO etl_log (proceso, registros_procesados, registros_exitosos, registros_fallidos, estado)
VALUES ('Carga Masiva Productos', ROW_COUNT(), ROW_COUNT(), 0, 'EXITOSO');

INSERT IGNORE INTO fact_ventas (sk_producto, sk_tiempo, sk_sucursal, cantidad, monto_total)
SELECT
  dp.sk_producto,
  dt.sk_tiempo,
  (CASE (dp.sk_producto % 5)
    WHEN 0 THEN 1 WHEN 1 THEN 2 WHEN 2 THEN 3 WHEN 3 THEN 4 ELSE 5 END),
  v.cantidad,
  v.monto_total
FROM ventas v
JOIN dim_producto dp ON v.producto_id = dp.id_fuente
JOIN dim_tiempo dt ON DATE(v.fecha_venta) = dt.fecha;

INSERT INTO etl_log (proceso, registros_procesados, registros_exitosos, registros_fallidos, estado)
VALUES ('Carga Masiva Ventas', ROW_COUNT(), ROW_COUNT(), 0, 'EXITOSO');

-- ============================================
-- PASO 7: VERIFICACIÓN
-- ============================================
SELECT 'Categorías' AS tabla, COUNT(*) AS registros FROM categorias
UNION ALL SELECT 'Productos', COUNT(*) FROM productos
UNION ALL SELECT 'Ventas Transaccional', COUNT(*) FROM ventas
UNION ALL SELECT 'DW Dim Producto', COUNT(*) FROM dim_producto
UNION ALL SELECT 'DW Dim Tiempo', COUNT(*) FROM dim_tiempo
UNION ALL SELECT 'DW Fact Ventas', COUNT(*) FROM fact_ventas;

SELECT
  c.nombre AS categoria,
  COUNT(DISTINCT p.id) AS num_productos,
  COUNT(v.id) AS num_ventas,
  COALESCE(SUM(v.monto_total), 0) AS total_ventas
FROM categorias c
LEFT JOIN productos p ON c.id = p.categoria_id
LEFT JOIN ventas v ON p.id = v.producto_id
GROUP BY c.id, c.nombre
ORDER BY total_ventas DESC;

-- ============================================
-- PROCEDIMIENTOS ADICIONALES (opcionales)
-- ============================================

-- Tabla log_etl: en este proyecto se usa etl_log (ya creada en schema). Si necesitas log_etl:
-- CREATE TABLE IF NOT EXISTS log_etl (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   proceso VARCHAR(100),
--   registros_insertados INT,
--   fecha_ejecucion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Agregar más productos hasta 40 por categoría (opcional)
DELIMITER $$

DROP PROCEDURE IF EXISTS agregar_productos_por_categoria$$

CREATE PROCEDURE agregar_productos_por_categoria()
BEGIN
  DECLARE v_done INT DEFAULT 0;
  DECLARE v_cat_id INT;
  DECLARE v_cat_nombre VARCHAR(100);
  DECLARE v_count INT;
  DECLARE v_agregar INT;
  DECLARE v_i INT;
  DECLARE v_precio DECIMAL(10,2);
  DECLARE v_stock INT;
  DECLARE v_base VARCHAR(200);
  DECLARE cur CURSOR FOR SELECT id, nombre FROM categorias ORDER BY id;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_cat_id, v_cat_nombre;
    IF v_done THEN LEAVE read_loop; END IF;
    SELECT COUNT(*) INTO v_count FROM productos WHERE categoria_id = v_cat_id;
    IF v_count < 40 THEN
      SET v_agregar = 40 - v_count;
      SET v_i = 1;
      WHILE v_i <= v_agregar DO
        SET v_base = CONCAT('Producto ', v_cat_nombre, ' Modelo ', v_count + v_i);
        SET v_precio = 500 + RAND() * 5000;
        SET v_stock = FLOOR(5 + RAND() * 96);
        INSERT INTO productos (nombre, categoria_id, precio_unitario, stock)
        VALUES (v_base, v_cat_id, ROUND(v_precio, 2), v_stock);
        SET v_i = v_i + 1;
      END WHILE;
    END IF;
  END LOOP;
  CLOSE cur;
END$$

DELIMITER ;

-- Generar 5,000 ventas adicionales (opcional)
DELIMITER $$

DROP PROCEDURE IF EXISTS generar_5000_ventas_extra$$

CREATE PROCEDURE generar_5000_ventas_extra()
BEGIN
  DECLARE v_contador INT DEFAULT 1;
  DECLARE v_producto_id INT;
  DECLARE v_cantidad INT;
  DECLARE v_precio DECIMAL(10,2);
  DECLARE v_monto_total DECIMAL(10,2);
  DECLARE v_fecha_venta DATETIME;
  DECLARE v_rng BIGINT;

  SET v_rng = UNIX_TIMESTAMP('2024-12-31 23:59:59') - UNIX_TIMESTAMP('2023-01-01 00:00:00');
  WHILE v_contador <= 5000 DO
    SELECT id, precio_unitario INTO v_producto_id, v_precio
    FROM productos ORDER BY RAND() LIMIT 1;
    SET v_cantidad = FLOOR(1 + RAND() * 10);
    SET v_monto_total = ROUND(v_precio * v_cantidad, 2);
    SET v_fecha_venta = DATE_ADD('2023-01-01 00:00:00', INTERVAL FLOOR(RAND() * v_rng) SECOND);
    INSERT INTO ventas (producto_id, cantidad, monto_total, fecha_venta)
    VALUES (v_producto_id, v_cantidad, v_monto_total, v_fecha_venta);
    SET v_contador = v_contador + 1;
  END WHILE;
END$$

DELIMITER ;

-- Actualizar DW después de más ventas/productos (opcional)
-- INSERT INTO dim_producto ... ON DUPLICATE KEY UPDATE ...;
-- INSERT IGNORE INTO fact_ventas ... (mismo SELECT que en PASO 6);
-- INSERT INTO etl_log ...;

-- Resumen final con total en pesos
SELECT
  'Total Categorías' AS metrica,
  CAST(COUNT(*) AS CHAR) AS valor
FROM categorias
UNION ALL
SELECT 'Total Productos', CAST(COUNT(*) AS CHAR) FROM productos
UNION ALL
SELECT 'Total Ventas', CAST(COUNT(*) AS CHAR) FROM ventas
UNION ALL
SELECT 'Total Ventas $', CONCAT('$', FORMAT(COALESCE(SUM(monto_total), 0), 2)) FROM ventas;
