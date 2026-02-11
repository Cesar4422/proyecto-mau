# Solución: Error de conexión a MySQL

## 1. Configura el archivo `.env`

En la raíz del proyecto (donde está `app.py`) edita el archivo **`.env`** y deja algo así, con **tu** usuario y contraseña de MySQL:

```env
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=tu_contraseña_real_aqui
MYSQL_DATABASE=dw_manager
MYSQL_PORT=3306
PORT=3000
SESSION_SECRET=un-texto-secreto-cualquiera
```

- **MYSQL_USER**: el usuario con el que entras a MySQL (suele ser `root`).
- **MYSQL_PASSWORD**: la contraseña de ese usuario (si no tiene, déjalo vacío: `MYSQL_PASSWORD=`).
- **MYSQL_DATABASE**: debe existir la base `dw_manager` (creada con el script del paso 2).

## 2. Crea la base de datos y las tablas

Si aún no lo has hecho:

```bash
mysql -u root -p < sql/schema-mysql.sql
```

(Te pedirá la contraseña de MySQL; es la misma que pondrás en `MYSQL_PASSWORD`.)

## 3. Comprueba la conexión

```bash
source venv/bin/activate
python3 scripts/test_conexion.py
```

Si todo va bien verás: `OK. Conexión correcta.`

## 4. Arranca la aplicación

```bash
./run.sh
```

---

### Si sigue fallando

| Mensaje / situación | Qué hacer |
|---------------------|-----------|
| **Access denied** / Acceso denegado | Revisa `MYSQL_USER` y `MYSQL_PASSWORD` en `.env`. Prueba a entrar con: `mysql -u root -p` |
| **Can't connect** / Connection refused | MySQL no está en marcha. Prueba: `sudo systemctl start mysql` (o `sudo service mysql start`) |
| **Unknown database** | La base no existe. Ejecuta: `mysql -u root -p < sql/schema-mysql.sql` |
