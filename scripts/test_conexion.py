#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prueba la conexión a MySQL y da indicaciones si falla."""
import os
import sys

# Raíz del proyecto
raiz = os.path.join(os.path.dirname(__file__), '..')
os.chdir(raiz)
sys.path.insert(0, raiz)

from dotenv import load_dotenv
load_dotenv()

import pymysql

def main():
    cfg = {
        'host': os.getenv('MYSQL_HOST', 'localhost'),
        'user': os.getenv('MYSQL_USER', 'root'),
        'password': os.getenv('MYSQL_PASSWORD', ''),
        'database': os.getenv('MYSQL_DATABASE', 'dw_manager'),
        'port': int(os.getenv('MYSQL_PORT', 3306)),
        'charset': 'utf8mb4',
    }
    print("Probando conexión con:")
    print(f"  Host: {cfg['host']}:{cfg['port']}")
    print(f"  Usuario: {cfg['user']}")
    print(f"  Base de datos: {cfg['database']}")
    print()

    try:
        conn = pymysql.connect(**cfg)
        conn.ping()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM usuarios")
        n = cur.fetchone()[0]
        cur.close()
        conn.close()
        print("OK. Conexión correcta.")
        print(f"  Usuarios en la tabla: {n}")
        return 0
    except pymysql.err.OperationalError as e:
        code = e.args[0] if e.args else 0
        print("ERROR: No se pudo conectar a MySQL.\n", file=sys.stderr)
        if code == 1045:
            print("  Acceso denegado (usuario o contraseña incorrectos).", file=sys.stderr)
            print("  - Edita el archivo .env en la raíz del proyecto.", file=sys.stderr)
            print("  - Pon tu usuario y contraseña de MySQL:", file=sys.stderr)
            print("    MYSQL_USER=root", file=sys.stderr)
            print("    MYSQL_PASSWORD=tu_contraseña", file=sys.stderr)
        elif code == 2003 or 'Connection refused' in str(e):
            print("  El servidor MySQL no responde.", file=sys.stderr)
            print("  - ¿Está MySQL instalado y en ejecución?", file=sys.stderr)
            print("    sudo systemctl start mysql   # o: mysql.server start", file=sys.stderr)
            print("  - Revisa MYSQL_HOST y MYSQL_PORT en .env", file=sys.stderr)
        elif code == 1049:
            print("  La base de datos no existe.", file=sys.stderr)
            print("  - Créala con: mysql -u root -p < sql/schema-mysql.sql", file=sys.stderr)
        else:
            print(f"  {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print("ERROR:", e, file=sys.stderr)
        return 1

if __name__ == '__main__':
    sys.exit(main())
