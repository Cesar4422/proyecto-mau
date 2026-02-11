#!/bin/bash
# Arrancar la aplicación Flask usando el entorno virtual del proyecto
cd "$(dirname "$0")"
if [ ! -d "venv" ]; then
    echo "Creando entorno virtual..."
    python3 -m venv venv
    . venv/bin/activate
    pip install -r requirements.txt
else
    . venv/bin/activate
fi
echo "Iniciando servidor en http://localhost:${PORT:-3000}"
exec python3 app.py
