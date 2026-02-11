#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Crea el usuario de prueba en MySQL usando la config de .env"""
import os
import sys

# Cargar .env desde la raíz del proyecto
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

import bcrypt
import pymysql

def main():
    config = {
        'host': os.getenv('MYSQL_HOST', 'localhost'),
        'user': os.getenv('MYSQL_USER', 'root'),
        'password': os.getenv('MYSQL_PASSWORD', ''),
        'database': os.getenv('MYSQL_DATABASE', 'dw_manager'),
        'port': int(os.getenv('MYSQL_PORT', 3306)),
        'charset': 'utf8mb4',
    }
    email = 'prueba@test.com'
    password = 'prueba123'
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8')

    import time
    max_intentos = 3
    try:
        for intento in range(1, max_intentos + 1):
            try:
                conn = pymysql.connect(**config)
                cur = conn.cursor()
                cur.execute("SET SESSION innodb_lock_wait_timeout = 5")
                cur.execute("""
                    INSERT INTO usuarios (nombre_completo, email, password_hash, rol, activo)
                    VALUES (%s, %s, %s, %s, 1)
                    ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), rol = VALUES(rol), activo = 1
                """, ('Usuario Prueba', email, password_hash, 'administrador'))
                conn.commit()
                cur.close()
                conn.close()
                print('Usuario de prueba creado correctamente.')
                print('  Email:      prueba@test.com')
                print('  Contraseña: prueba123')
                print('  Rol:        administrador')
                return
            except pymysql.err.OperationalError as e:
                code = e.args[0] if e.args else 0
                if code == 1205 and intento < max_intentos:
                    print(f'Bloqueo detectado. Reintento {intento}/{max_intentos} en 3 segundos...', file=sys.stderr)
                    time.sleep(3)
                    continue
                raise
    except pymysql.err.OperationalError as e:
        code = e.args[0] if e.args else 0
        if code == 1205:
            print('Lock wait timeout (1205): la tabla está bloqueada por otra conexión.', file=sys.stderr)
            print('', file=sys.stderr)
            print('Haz esto y vuelve a ejecutar el script:', file=sys.stderr)
            print('  1. En MySQL Workbench: ejecuta COMMIT; o ROLLBACK; y cierra pestañas de consultas.', file=sys.stderr)
            print('  2. Si la app Flask está corriendo, deténla (Ctrl+C).', file=sys.stderr)
            print('  3. Reinicia el servicio MySQL (Servicios de Windows o XAMPP) y espera 10 segundos.', file=sys.stderr)
        elif code in (1045, 2003, 1049):
            print('No se pudo conectar a MySQL. Revisa en .env:', file=sys.stderr)
            print('  MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE', file=sys.stderr)
        else:
            print('Error MySQL:', e, file=sys.stderr)
        print('Error:', e, file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print('Error:', e, file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
