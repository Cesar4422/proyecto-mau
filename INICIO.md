# Cómo inicializar y ejecutar el sistema (DW Manager)

Sigue estos pasos en orden. El sistema usa **Flask (Python) + MySQL**; pnpm no es necesario para arrancar el servidor principal.

---

## 1. Tener MySQL en marcha

- Asegúrate de que el servicio MySQL esté iniciado (por ejemplo desde **Servicios** de Windows o desde XAMPP/WAMP si lo usas).
- Debes poder conectarte con el usuario y contraseña que usarás en el `.env` (por ejemplo `root` y tu contraseña).

---

## 2. Ejecutar el script en MySQL Workbench

1. Abre **MySQL Workbench** y conéctate a tu servidor (usuario `root` o el que tengas).
2. Menú **File → Open SQL Script**.
3. Navega a la carpeta del proyecto y entra en **`sql`**.
4. Selecciona el archivo **`INICIALIZAR_MYSQL_WORKBENCH.sql`**.
5. Pulsa el botón **Execute** (rayo) o **Ctrl+Shift+Enter** para ejecutar todo el script.

Esto crea la base `dw_manager`, tablas, dimensiones, datos de prueba, ETL y el usuario de prueba.

**Usuario de prueba:** `prueba@test.com`  
**Contraseña:** `prueba123`

---

## 3. Configurar el archivo `.env`

En la **raíz del proyecto** (donde está `app.py`) debe existir un archivo **`.env`**.

- Si no existe, copia **`.env.example`** y renómbralo a **`.env`**.
- Edita **`.env`** y ajusta al menos:

| Variable         | Descripción                          | Ejemplo    |
|------------------|--------------------------------------|------------|
| `MYSQL_HOST`     | Servidor MySQL                       | `localhost`|
| `MYSQL_USER`     | Usuario MySQL                        | `root`     |
| `MYSQL_PASSWORD` | Contraseña de ese usuario            | tu contraseña |
| `MYSQL_DATABASE` | Nombre de la base                    | `dw_manager` |
| `MYSQL_PORT`     | Puerto MySQL                         | `3306`     |
| `PORT`           | Puerto donde escucha la app          | `3000`     |
| `SESSION_SECRET`  | Secreto para sesiones (cualquier texto largo) | un texto aleatorio |

Guarda el archivo.

---

## 4. Iniciar la aplicación desde la terminal

Abre una terminal en la **carpeta del proyecto** (donde está `app.py`) y ejecuta:

### Primera vez (crear entorno e instalar dependencias)

**Windows (PowerShell o CMD):**

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**Linux / Mac:**

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Arrancar el servidor

Con el entorno virtual activado (deberías ver `(venv)` en el prompt):

```bash
python app.py
```

(Opcional) Para usar otro puerto: `set PORT=5000` (Windows) o `export PORT=5000` (Linux/Mac) antes de `python app.py`.

Cuando veas *"Conectado a MySQL. Servidor en http://0.0.0.0:3000"*, el servidor está listo.

---

## 5. Usar el sistema

1. Abre el navegador en: **http://localhost:3000** (o el `PORT` que hayas puesto en `.env`).
2. Inicia sesión con: **prueba@test.com** / **prueba123**.

Si algo falla (por ejemplo “No se puede conectar a MySQL”), revisa:

- Que MySQL esté corriendo.
- Que el usuario y contraseña en `.env` sean correctos.
- Que hayas ejecutado **`sql/INICIALIZAR_MYSQL_WORKBENCH.sql`** en MySQL Workbench.

---

## Resumen rápido

| Paso | Acción |
|------|--------|
| 1 | MySQL encendido |
| 2 | En MySQL Workbench: abrir y ejecutar `sql/INICIALIZAR_MYSQL_WORKBENCH.sql` |
| 3 | Tener `.env` en la raíz con `MYSQL_*` y `SESSION_SECRET` correctos |
| 4 | En la terminal: activar `venv`, luego `python app.py` |
| 5 | Entrar en http://localhost:3000 y usar prueba@test.com / prueba123 |
