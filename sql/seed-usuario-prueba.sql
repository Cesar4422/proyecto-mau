-- Usuario de prueba para DW Manager (Flask + MySQL)
-- No usamos hash aquí para evitar desfases con Python/bcrypt.
--
-- Después de ejecutar el esquema y datos, crea el usuario desde la terminal:
--   python scripts/crear_usuario_prueba.py
--
-- Eso crea: prueba@test.com / prueba123 (rol administrador).

USE dw_manager;

-- (La tabla usuarios ya existe; el usuario se crea con el script Python.)
