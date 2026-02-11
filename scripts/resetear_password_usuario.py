#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Restablece la contraseña de un usuario existente en la base de datos.
Útil si un usuario no puede iniciar sesión (hash corrupto o contraseña olvidada).

Uso:
  python scripts/resetear_password_usuario.py
  (te pedirá email y nueva contraseña)

  O con argumentos:
  python scripts/resetear_password_usuario.py usuario@gmail.com MiNuevaClave123
"""
import os
import sys

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

    if len(sys.argv) >= 3:
        email = sys.argv[1].strip().lower()
        nueva_password = sys.argv[2]
    else:
        print('Restablecer contraseña de un usuario existente\n')
        email = input('Email del usuario: ').strip().lower()
        if not email:
            print('Debes indicar el email.', file=sys.stderr)
            sys.exit(1)
        import getpass
        nueva_password = getpass.getpass('Nueva contraseña (mín. 8 caracteres): ')
        if len(nueva_password) < 8:
            print('La contraseña debe tener al menos 8 caracteres.', file=sys.stderr)
            sys.exit(1)
        confirmar = getpass.getpass('Repite la contraseña: ')
        if nueva_password != confirmar:
            print('Las contraseñas no coinciden.', file=sys.stderr)
            sys.exit(1)

    password_hash = bcrypt.hashpw(nueva_password.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8')

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
        cur.execute('UPDATE usuarios SET password_hash = %s WHERE email = %s', (password_hash, email))
        conn.commit()
        cur.close()
        conn.close()
        print('Contraseña actualizada correctamente.')
        print(f'  Usuario: {row[1]}')
        print(f'  Email:  {email}')
        print('  Ya puede iniciar sesión con la nueva contraseña.')
    except pymysql.err.OperationalError as e:
        print('Error de conexión a MySQL. Revisa .env (MYSQL_HOST, USER, PASSWORD, DATABASE).', file=sys.stderr)
        print(e, file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print('Error:', e, file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
