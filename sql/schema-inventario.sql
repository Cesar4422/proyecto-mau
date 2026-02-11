-- ============================================
-- ESQUEMA PARA INVENTARIO, MOVIMIENTOS, UBICACIONES Y ASIGNACIÓN
-- Ejecutar sobre la base de datos existente (transaccional y public)
-- ============================================

-- 1) Extender tabla productos: código, punto de reorden, ubicación física
ALTER TABLE transaccional.productos
  ADD COLUMN IF NOT EXISTS codigo VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS punto_reorden INT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS pasillo VARCHAR(50),
  ADD COLUMN IF NOT EXISTS estante VARCHAR(50),
  ADD COLUMN IF NOT EXISTS nivel VARCHAR(50);

-- Asegurar que stock exista (por si acaso)
ALTER TABLE transaccional.productos ADD COLUMN IF NOT EXISTS stock INT DEFAULT 0;

-- 2) Tabla de movimientos (entradas y salidas)
CREATE TABLE IF NOT EXISTS transaccional.movimientos (
  id SERIAL PRIMARY KEY,
  producto_id INT NOT NULL REFERENCES transaccional.productos(id) ON DELETE RESTRICT,
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('entrada_compra', 'entrada_devolucion', 'salida_venta', 'salida_baja')),
  cantidad INT NOT NULL CHECK (cantidad > 0),
  usuario_id INT REFERENCES public.usuarios(id),
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON transaccional.movimientos(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_created ON transaccional.movimientos(created_at);

-- 3) Pedidos (solicitudes que pueden competir por stock)
CREATE TABLE IF NOT EXISTS transaccional.pedidos (
  id SERIAL PRIMARY KEY,
  producto_id INT NOT NULL REFERENCES transaccional.productos(id) ON DELETE RESTRICT,
  cantidad_solicitada INT NOT NULL CHECK (cantidad_solicitada > 0),
  cantidad_asignada INT DEFAULT 0 CHECK (cantidad_asignada >= 0),
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'parcial', 'surtido', 'cancelado')),
  prioridad INT DEFAULT 0,
  cliente_ref VARCHAR(100),
  fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usuario_id INT REFERENCES public.usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_pedidos_producto_estado ON transaccional.pedidos(producto_id, estado);

-- 4) Reglas de negocio para asignación automática
CREATE TABLE IF NOT EXISTS transaccional.reglas_asignacion (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  criterio VARCHAR(50) NOT NULL CHECK (criterio IN ('prioridad_fifo', 'prioridad_mayor', 'prioridad_cliente', 'prioridad_cantidad')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Regla por defecto
INSERT INTO transaccional.reglas_asignacion (nombre, criterio, activo)
SELECT 'Por defecto (FIFO)', 'prioridad_fifo', true
WHERE NOT EXISTS (SELECT 1 FROM transaccional.reglas_asignacion LIMIT 1);

-- 5) Ajustar roles en usuarios si no existen (valores: administrador, operador, usuario)
-- No modificar datos existentes; solo asegurar que el CHECK permita estos valores
-- Si la columna rol tiene CHECK, puede ser necesario: ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS ...
COMMENT ON COLUMN public.usuarios.rol IS 'administrador: reglas y ajustes; operador: movimientos y consultas';
