# Diagramas de Casos de Uso - PlantUML (DW Manager)

Desarrollados conforme al sistema: Panel Principal, Productos, Entradas/Salidas, Pedidos, Reglas de Asignación, Dashboard OLAP, Sucursales, Categorías y Análisis Temporal.

Copia cada bloque en [PlantUML Web](https://www.plantuml.com/plantuml/uml).

---

## 1. Iniciar sesión (diagrama por separado)

El usuario se identifica con correo y contraseña. El flujo principal incluye ingresar correo, ingresar contraseña y validar credenciales. Las alternativas de error extienden la validación: campos vacíos, correo inválido, contraseña incorrecta, usuario no existe.

```plantuml
@startuml
left to right direction
title Casos de uso - INICIO DE SESIÓN

actor "Usuario" as U

rectangle "Sistema" {
  usecase "Iniciar sesión" as UC_LOGIN
  usecase "Ingresar Correo\nElectrónico" as UC_EMAIL
  usecase "Ingresar Contraseña" as UC_PASS
  usecase "Validar Credenciales" as UC_VALID
  usecase "Campos Vacíos" as EXT_VACIOS
  usecase "Correo Electrónico\nInválido" as EXT_EMAIL
  usecase "Contraseña\nIncorrecta" as EXT_PASS
  usecase "El Usuario\nNo Existe" as EXT_NOEXISTE
}

U --> UC_LOGIN
UC_LOGIN ..> UC_EMAIL : <<include>>
UC_LOGIN ..> UC_PASS : <<include>>
UC_LOGIN ..> UC_VALID : <<include>>

UC_VALID <.. EXT_VACIOS : <<extends>>
UC_VALID <.. EXT_EMAIL : <<extends>>
UC_VALID <.. EXT_PASS : <<extends>>
UC_VALID <.. EXT_NOEXISTE : <<extends>>
@enduml
```

**Relaciones:**
- **<<include>>:** Iniciar sesión incluye de forma obligatoria: Ingresar Correo Electrónico, Ingresar Contraseña y Validar Credenciales.
- **<<extends>>:** Si la validación falla, se ejecuta una de las extensiones: Campos Vacíos, Correo Electrónico Inválido, Contraseña Incorrecta o El Usuario No Existe.

---

## 2. Registro de usuario (diagrama por separado)

El usuario crea una cuenta con nombre completo, correo (dominio gmail, hotmail o dw) y contraseña (mín. 8 caracteres). El flujo principal incluye ingresar datos y validar registro; las alternativas de error extienden la validación.

```plantuml
@startuml
left to right direction
title Casos de uso - REGISTRO DE USUARIO

actor "Usuario no\nautenticado" as U

rectangle "Sistema" {
  usecase "Registrarse" as UC_REG
  usecase "Ingresar Nombre\nCompleto" as UC_NOMBRE
  usecase "Ingresar Correo\nElectrónico" as UC_EMAIL
  usecase "Ingresar Contraseña\ny Confirmar" as UC_PASS
  usecase "Validar Datos\nde Registro" as UC_VALID
  usecase "Campos Vacíos" as EXT_VACIOS
  usecase "Dominio de Correo\nNo Permitido" as EXT_DOMINIO
  usecase "Contraseñas\nNo Coinciden" as EXT_NOCONF
  usecase "Correo Ya\nRegistrado" as EXT_YAEXISTE
}

U --> UC_REG
UC_REG ..> UC_NOMBRE : <<include>>
UC_REG ..> UC_EMAIL : <<include>>
UC_REG ..> UC_PASS : <<include>>
UC_REG ..> UC_VALID : <<include>>

UC_VALID <.. EXT_VACIOS : <<extends>>
UC_VALID <.. EXT_DOMINIO : <<extends>>
UC_VALID <.. EXT_NOCONF : <<extends>>
UC_VALID <.. EXT_YAEXISTE : <<extends>>
@enduml
```

**Relaciones:**
- **<<include>>:** Registrarse incluye de forma obligatoria: Ingresar Nombre Completo, Ingresar Correo Electrónico, Ingresar Contraseña y Confirmar, y Validar Datos de Registro.
- **<<extends>>:** Si la validación falla, se ejecuta una de las extensiones: Campos Vacíos, Dominio de Correo No Permitido (solo gmail, hotmail, dw), Contraseñas No Coinciden o Correo Ya Registrado.

---

## 3. Cerrar sesión (diagrama por separado)

El usuario autenticado cierra su sesión de forma segura. Opcionalmente el sistema solicita confirmación; al confirmar, invalida la sesión en el servidor, elimina la identificación en el navegador y redirige al login.

```plantuml
@startuml
left to right direction
title Casos de uso - CERRAR SESIÓN

actor "Usuario\nautenticado" as U

rectangle "Sistema" {
  usecase "Cerrar sesión" as UC_LOGOUT
  usecase "Solicitar confirmación\n(opcional)" as UC_CONF
  usecase "Invalidar sesión\nen el servidor" as UC_INV
  usecase "Redirigir a pantalla\nde login" as UC_REDIR
}

U --> UC_LOGOUT
UC_LOGOUT ..> UC_INV : <<include>>
UC_LOGOUT ..> UC_REDIR : <<include>>
UC_LOGOUT <.. UC_CONF : <<extends>>
@enduml
```

**Relaciones:**
- **<<include>>:** Cerrar sesión incluye: Invalidar sesión en el servidor y Redirigir a pantalla de login.
- **<<extends>>:** Si está configurado, se ejecuta Solicitar confirmación antes de cerrar.

---

## 4. Panel Principal

Métricas en tiempo real: productos agotados, pedidos pendientes de surtir, ocupación del almacén; alertas de productos bajo punto de reorden.

```plantuml
@startuml
left to right direction
title Casos de uso - Panel Principal

actor "Usuario\nautenticado" as U

rectangle "Sistema DW Manager" {
  usecase "Consultar panel principal" as CP
  usecase "Consultar métricas\nde inventario" as CM
  usecase "Consultar alertas\nde bajo stock" as CA
}

U --> CP
CP ..> CM : <<include>>
CP ..> CA : <<include>>
@enduml
```

---

## 5. Productos (CRUD y búsqueda)

Gestión completa de productos: listar, buscar por nombre o código, filtrar por categoría, crear, editar y eliminar. Incluye datos: nombre, código, categoría, precio, stock, punto de reorden, pasillo, estante, nivel.

```plantuml
@startuml
left to right direction
title Casos de uso - Productos

actor "Usuario\nautenticado" as U

rectangle "Sistema DW Manager" {
  usecase "Listar productos" as LP
  usecase "Buscar productos\npor nombre o código" as BP
  usecase "Filtrar productos\npor categoría" as FP
  usecase "Crear producto" as CREAR
  usecase "Editar producto" as EDIT
  usecase "Eliminar producto" as DEL
}

U --> LP
U --> CREAR
U --> EDIT
U --> DEL
LP ..> BP : <<include>>
LP ..> FP : <<include>>
@enduml
```

---

## 6. Entradas / Salidas (Movimientos de inventario)

Registro de movimientos: entradas (compra, devolución) y salidas (venta, baja). Actualización automática de stock e historial con observaciones.

```plantuml

@startuml
left to right direction
title Casos de uso - Entradas y Salidas

actor "Usuario\nautenticado" as U

rectangle "Sistema DW Manager" {
  usecase "Registrar movimiento\nde inventario" as RM
  usecase "Registrar entrada\n(compra o devolución)" as RE
  usecase "Registrar salida\n(venta o baja)" as RS
  usecase "Consultar historial\nde movimientos" as CH
  usecase "Actualizar stock\ndel producto" as AS
}

U --> RM
U --> CH
RM ..> AS : <<include>>
RM <.. RE : <<extend>>
RM <.. RS : <<extend>>
@enduml
```

---

## 7. Pedidos y asignación de stock

Crear pedidos (producto, cantidad, prioridad, cliente/referencia), listar pedidos pendientes/parciales/surtidos, y ejecutar asignación de stock según la regla activa (FIFO, mayor prioridad, menor cantidad, etc.).

```plantuml
@startuml
left to right direction
title Casos de uso - Pedidos

actor "Usuario\nautenticado" as U

rectangle "Sistema DW Manager" {
  usecase "Crear pedido" as CP
  usecase "Listar pedidos\n(pendientes, parciales, surtidos)" as LP
  usecase "Ejecutar asignación\nde stock" as EA
  usecase "Definir prioridad\ndel pedido" as DP
  usecase "Obtener regla activa\ny ordenar pedidos" as OR
  usecase "Actualizar cantidades\nasignadas y stock" as AC
}

U --> CP
U --> LP
U --> EA
CP ..> DP : <<include>>
EA ..> OR : <<include>>
EA ..> AC : <<include>>
@enduml
```

---

## 8. Reglas de asignación (solo Administrador)

Solo el rol administrador ve este módulo. Consultar reglas y activar un criterio: FIFO (primero en llegar), mayor prioridad, menor cantidad primero, o prioridad cliente.

```plantuml
@startuml
left to right direction
title Casos de uso - Reglas de Asignación

actor "Administrador" as A

rectangle "Sistema DW Manager" {
  usecase "Consultar reglas\nde asignación" as CR
  usecase "Configurar regla\nde asignación" as CF
  usecase "Activar criterio:\nFIFO / Mayor prioridad /\nMenor cantidad / Cliente" as AC
}

A --> CR
A --> CF
CF ..> AC : <<include>>
@enduml
```

---

## 9. Catálogos: Categorías y Sucursales

CRUD de categorías (nombre) y de sucursales (nombre, ciudad, estado, región). Usados en productos y en el Data Warehouse.

```plantuml
@startuml
left to right direction
title Casos de uso - Categorías y Sucursales

actor "Usuario\nautenticado" as U

rectangle "Sistema DW Manager" {
  usecase "Gestionar categorías" as GCAT
  usecase "Crear categoría" as CC
  usecase "Editar categoría" as EC
  usecase "Eliminar categoría" as DC
  usecase "Gestionar sucursales" as GSUC
  usecase "Crear sucursal" as CS
  usecase "Editar sucursal" as ES
  usecase "Eliminar sucursal" as DS
}

U --> GCAT
U --> GSUC
GCAT ..> CC : <<include>>
GCAT ..> EC : <<include>>
GCAT ..> DC : <<include>>
GSUC ..> CS : <<include>>
GSUC ..> ES : <<include>>
GSUC ..> DS : <<include>>
@enduml
```

---

## 10. Dashboard OLAP y Análisis Temporal

Consultas sobre el cubo de ventas: KPIs (estadísticas, top productos, ranking sucursales, tendencia mensual), análisis temporal y operaciones OLAP (rollup, drill-down, slice, dice).

```plantuml
@startuml
left to right direction
title Casos de uso - Dashboard OLAP y Análisis

actor "Usuario\nautenticado" as U

rectangle "Sistema DW Manager" {
  usecase "Consultar Dashboard OLAP" as DASH
  usecase "Consultar KPIs\nde ventas" as KPI
  usecase "Consultar top productos\ny ranking sucursales" as TOP
  usecase "Consultar tendencia\nmensual" as TEND
  usecase "Consultar análisis\ntemporal" as AT
  usecase "Refrescar cubo\nde ventas" as REF
}

U --> DASH
U --> AT
DASH ..> KPI : <<include>>
DASH ..> TOP : <<include>>
DASH ..> TEND : <<include>>
DASH ..> REF : <<extend>>
@enduml
```

---

## 11. Diagrama completo (todos los casos de uso del sistema)

Agrupa todos los módulos: autenticación, panel principal, productos, entradas/salidas, pedidos, reglas (administrador), categorías, sucursales y dashboard/análisis.

```plantuml
@startuml
left to right direction
title Casos de uso - DW Manager (completo)

actor "Usuario no\nautenticado" as U0
actor "Usuario\nautenticado" as U
actor "Administrador" as A

U --|> A

rectangle "Sistema DW Manager" {
  ' Autenticación
  usecase "Registrarse" as UC1
  usecase "Iniciar sesión" as UC2
  usecase "Cerrar sesión" as UC3
  
  ' Panel
  usecase "Consultar panel principal" as UC4
  
  ' Productos
  usecase "Listar y buscar productos" as UC5
  usecase "Crear producto" as UC6
  usecase "Editar producto" as UC7
  usecase "Eliminar producto" as UC8
  
  ' Movimientos
  usecase "Registrar movimiento" as UC9
  usecase "Consultar historial movimientos" as UC10
  
  ' Pedidos
  usecase "Crear pedido" as UC11
  usecase "Listar pedidos" as UC12
  usecase "Ejecutar asignación" as UC13
  
  ' Reglas (solo admin)
  usecase "Configurar regla de asignación" as UC14
  
  ' Catálogos
  usecase "Gestionar categorías" as UC15
  usecase "Gestionar sucursales" as UC16
  
  ' OLAP
  usecase "Consultar Dashboard OLAP" as UC17
  usecase "Consultar análisis temporal" as UC18
}

U0 --> UC1
U0 --> UC2
U --> UC2
U --> UC3
U --> UC4
U --> UC5
U --> UC6
U --> UC7
U --> UC8
U --> UC9
U --> UC10
U --> UC11
U --> UC12
U --> UC13
U --> UC15
U --> UC16
U --> UC17
U --> UC18
A --> UC14
@enduml
```

---

## 12. Actores del sistema

Relación entre actores: Administrador es un tipo de Usuario autenticado con permisos adicionales (acceso a Reglas de asignación).

```plantuml
@startuml
title Actores - DW Manager

actor "Usuario no\nautenticado" as U0
actor "Usuario\nautenticado" as U
actor "Administrador" as A

U --|> A : herencia

note right of A
  Ve el menú "Reglas de Asignación"
  y puede configurar el criterio
  activo (FIFO, prioridad, etc.)
end note
@enduml
```

---

## Resumen de módulos vs. casos de uso

| Módulo en el sistema     | Casos de uso principales |
|--------------------------|---------------------------|
| Login / Registro         | Registrarse, Iniciar sesión, Cerrar sesión |
| Panel Principal          | Consultar panel principal (métricas y alertas) |
| Productos                | Listar/buscar/filtrar, Crear, Editar, Eliminar producto |
| Entradas / Salidas       | Registrar movimiento, Consultar historial |
| Pedidos                  | Crear pedido, Listar pedidos, Ejecutar asignación |
| Reglas de Asignación     | Configurar regla (solo Administrador) |
| Categorías               | Gestionar categorías (CRUD) |
| Sucursales               | Gestionar sucursales (CRUD) |
| Dashboard OLAP           | Consultar Dashboard OLAP, KPIs, tendencias |
| Análisis Temporal        | Consultar análisis temporal |

---

## Cómo usar en PlantUML Web

1. Ir a **https://www.plantuml.com/plantuml/uml**
2. Borrar el contenido por defecto.
3. Copiar un bloque completo (desde `@startuml` hasta `@enduml`).
4. Pegar y generar; descargar PNG o SVG si se desea.
