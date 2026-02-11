#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Crea o actualiza un usuario en MySQL con contraseña hasheada correctamente (bcrypt).
Así el login con esas credenciales funcionará seguro.

Uso (desde la raíz del proyecto, con venv activado):
  python scripts/crear_o_actualizar_usuario.py <email> <contraseña>
  python scripts/crear_o_actualizar_usuario.py cesar@gmail.com cesar123

Opcional: nombre y rol
  python scripts/crear_o_actualizar_usuario.py cesar@gmail.com cesar123 "César" administrador
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

import bcrypt
import pymysql


def main():
    if len(sys.argv) < 3:
        print('Uso: python scripts/crear_o_actualizar_usuario.py <email> <contraseña> [nombre] [rol]', file=sys.stderr)
        print('Ejemplo: python scripts/crear_o_actualizar_usuario.py cesar@gmail.com cesar123', file=sys.stderr)
        sys.exit(1)

    email = (sys.argv[1] or '').strip().lower()
    password = sys.argv[2]
    nombre = (sys.argv[3] if len(sys.argv) > 3 else email.split('@')[0]).strip() or 'Usuario'
    rol = (sys.argv[4] if len(sys.argv) > 4 else 'usuario').strip().lower()

    if not email or not password:
        print('Email y contraseña son obligatorios.', file=sys.stderr)
        sys.exit(1)

    config = {
        'host': os.getenv('MYSQL_HOST', 'localhost'),
        'user': os.getenv('MYSQL_USER', 'root'),
        'password': os.getenv('MYSQL_PASSWORD', ''),
        'database': os.getenv('MYSQL_DATABASE', 'dw_manager'),
        'port': int(os.getenv('MYSQL_PORT', 3306)),
        'charset': 'utf8mb4',
    }

    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8')

    try:
        conn = pymysql.connect(**config)
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO usuarios (nombre_completo, email, password_hash, rol, activo)
            VALUES (%s, %s, %s, %s, 1)
            ON DUPLICATE KEY UPDATE
                password_hash = VALUES(password_hash),
                nombre_completo = VALUES(nombre_completo),
                rol = VALUES(rol),
                activo = 1
        """, (nombre, email, password_hash, rol))
        conn.commit()
        cur.close()
        conn.close()
        print('Usuario creado/actualizado correctamente.')
        print(f'  Email:      {email}')
        print(f'  Contraseña: (la que escribiste)')
        print(f'  Nombre:     {nombre}')
        print(f'  Rol:        {rol}')
        print('Ya puedes iniciar sesión en la app con ese email y contraseña.')
    except pymysql.err.OperationalError as e:
        code = e.args[0] if e.args else 0
        if code == 1205:
            print('Lock wait timeout (1205): la tabla está bloqueada.', file=sys.stderr)
            print('Cierra transacciones en MySQL Workbench, detén Flask, reinicia MySQL y vuelve a intentar.', file=sys.stderr)
        elif code in (1045, 2003, 1049):
            print('No se pudo conectar a MySQL. Revisa .env (MYSQL_HOST, USER, PASSWORD, DATABASE).', file=sys.stderr)
        print('Error:', e, file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print('Error:', e, file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
