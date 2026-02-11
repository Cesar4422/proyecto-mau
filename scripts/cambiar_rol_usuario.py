#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cambia el rol de un usuario (administrador, operador, usuario).
Solo usuarios con rol "administrador" ven el apartado "Reglas de asignación".

Uso:
  python scripts/cambiar_rol_usuario.py nacho@gmail.com administrador
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

import pymysql

ROLES_VALIDOS = ('administrador', 'operador', 'usuario')

def main():
    config = {
        'host': os.getenv('MYSQL_HOST', 'localhost'),
        'user': os.getenv('MYSQL_USER', 'root'),
        'password': os.getenv('MYSQL_PASSWORD', ''),
        'database': os.getenv('MYSQL_DATABASE', 'dw_manager'),
        'port': int(os.getenv('MYSQL_PORT', 3306)),
        'charset': 'utf8mb4',
    }
    if len(sys.argv) < 3:
        print('Uso: python scripts/cambiar_rol_usuario.py <email> <rol>')
        print('Roles válidos:', ', '.join(ROLES_VALIDOS))
        print('Ejemplo: python scripts/cambiar_rol_usuario.py nacho@gmail.com administrador')
        sys.exit(1)
    email = sys.argv[1].strip().lower()
    rol = sys.argv[2].strip().lower()
    if rol not in ROLES_VALIDOS:
        print(f'Rol no válido. Usa uno de: {", ".join(ROLES_VALIDOS)}', file=sys.stderr)
        sys.exit(1)
    try:
        conn = pymysql.connect(**config)
        cur = conn.cursor()
        cur.execute('SELECT id, nombre_completo FROM usuarios WHERE email = %s', (email,))
        row = cur.fetchone()
        if not row:
            print(f'No existe ningún usuario con email: {email}', file=sys.stderr)
            cur.close()
            conn.close()
            sys.exit(1)
        cur.execute('UPDATE usuarios SET rol = %s WHERE email = %s', (rol, email))
        conn.commit()
        cur.close()
        conn.close()
        print('Rol actualizado correctamente.')
        print(f'  Usuario: {row[1]}')
        print(f'  Email:  {email}')
        print(f'  Rol:    {rol}')
        if rol == 'administrador':
            print('  Este usuario ya verá el apartado "Reglas de asignación" al iniciar sesión.')
    except pymysql.err.OperationalError as e:
        print('Error de conexión a MySQL. Revisa .env.', file=sys.stderr)
        print(e, file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print('Error:', e, file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
