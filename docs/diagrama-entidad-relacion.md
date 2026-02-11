# Diagrama Entidad-Relación - Base de datos DW Manager

Base de datos: **dw_manager**. Incluye tablas transaccionales (inventario, usuarios, pedidos) y tablas del Data Warehouse (dimensiones y hechos de ventas).

---

## Código Mermaid (diagrama ER)

Copia el bloque en editores que soporten Mermaid (GitHub, GitLab, VS Code con extensión, [Mermaid Live](https://mermaid.live)) para generar el diagrama.

```mermaid
erDiagram
    USUARIOS {
        int id PK
        string nombre_completo
        string email UK
        string password_hash
        string rol
        int activo
        datetime ultimo_acceso
        timestamp created_at
    }
    CATEGORIAS {
        int id PK
        string nombre UK
    }
    PRODUCTOS {
        int id PK
        string nombre
        string codigo UK
        int categoria_id FK
        decimal precio_unitario
        int stock
        int punto_reorden
        string pasillo
        string estante
        string nivel
    }
    VENTAS {
        int id PK
        int producto_id FK
        int cantidad
        decimal monto_total
        timestamp fecha_venta
    }
    MOVIMIENTOS {
        int id PK
        int producto_id FK
        string tipo
        int cantidad
        int usuario_id FK
        string observaciones
        timestamp created_at
    }
    PEDIDOS {
        int id PK
        int producto_id FK
        int cantidad_solicitada
        int cantidad_asignada
        string estado
        int prioridad
        string cliente_ref
        timestamp fecha_solicitud
        int usuario_id FK
    }
    REGLAS_ASIGNACION {
        int id PK
        string nombre
        string criterio
        int activo
        timestamp created_at
    }
    DIM_SUCURSAL {
        int sk_sucursal PK
        int id_sucursal
        string nombre_sucursal
        string ciudad
        string estado
        string region
    }
    DIM_PRODUCTO {
        int sk_producto PK
        int id_fuente UK
        string nombre
        string categoria
    }
    DIM_TIEMPO {
        int sk_tiempo PK
        date fecha UK
        int dia
        int mes
        string nombre_mes
        int trimestre
        int anio
        string nombre_dia_semana
        int es_fin_de_semana
        int semana_del_anio
    }
    FACT_VENTAS {
        int id_hecho PK
        int sk_producto FK
        int sk_tiempo FK
        int sk_sucursal FK
        int cantidad
        decimal monto_total
    }
    ETL_LOG {
        int id PK
        string proceso
        int registros_procesados
        int registros_exitosos
        int registros_fallidos
        timestamp fecha_ejecucion
        string estado
    }
    CATEGORIAS ||--o{ PRODUCTOS : categoriza
    PRODUCTOS ||--o{ VENTAS : venta
    PRODUCTOS ||--o{ MOVIMIENTOS : afecta
    PRODUCTOS ||--o{ PEDIDOS : solicitado_en
    USUARIOS ||--o{ MOVIMIENTOS : registra
    USUARIOS ||--o{ PEDIDOS : crea
    DIM_PRODUCTO ||--o{ FACT_VENTAS : producto
    DIM_TIEMPO ||--o{ FACT_VENTAS : tiempo
    DIM_SUCURSAL ||--o{ FACT_VENTAS : sucursal
```

### Versión Mermaid simplificada (solo relaciones) (solo relaciones)

```mermaid
erDiagram
    USUARIOS ||--o{ MOVIMIENTOS : registra
    USUARIOS ||--o{ PEDIDOS : crea
    CATEGORIAS ||--o{ PRODUCTOS : categoriza
    PRODUCTOS ||--o{ VENTAS : venta
    PRODUCTOS ||--o{ MOVIMIENTOS : movimiento
    PRODUCTOS ||--o{ PEDIDOS : pedido
    DIM_PRODUCTO ||--o{ FACT_VENTAS : producto
    DIM_TIEMPO ||--o{ FACT_VENTAS : tiempo
    DIM_SUCURSAL ||--o{ FACT_VENTAS : sucursal
```

---

## Código PlantUML (diagrama ER) (diagrama ER)

Copia el bloque en [PlantUML Web](https://www.plantuml.com/plantuml/uml) para generar la imagen.

```plantuml
@startuml
' Diagrama Entidad-Relación - DW Manager
skinparam linetype ortho
skinparam backgroundColor #FEFEFE

title Diagrama Entidad-Relación\nBase de datos dw_manager

' ========== TABLAS TRANSACCIONALES ==========

entity "usuarios" as usuarios {
  * id : INT <<PK>>
  --
  nombre_completo : VARCHAR(200)
  email : VARCHAR(255) <<UK>>
  password_hash : VARCHAR(255)
  rol : VARCHAR(50)
  activo : TINYINT(1)
  ultimo_acceso : DATETIME
  created_at : TIMESTAMP
}

entity "categorias" as categorias {
  * id : INT <<PK>>
  --
  nombre : VARCHAR(100) <<UK>>
}

entity "productos" as productos {
  * id : INT <<PK>>
  --
  nombre : VARCHAR(255)
  codigo : VARCHAR(50) <<UK>>
  categoria_id : INT <<FK>>
  precio_unitario : DECIMAL(12,2)
  stock : INT
  punto_reorden : INT
  pasillo : VARCHAR(50)
  estante : VARCHAR(50)
  nivel : VARCHAR(50)
}

entity "ventas" as ventas {
  * id : INT <<PK>>
  --
  producto_id : INT <<FK>>
  cantidad : INT
  monto_total : DECIMAL(12,2)
  fecha_venta : TIMESTAMP
}

entity "movimientos" as movimientos {
  * id : INT <<PK>>
  --
  producto_id : INT <<FK>>
  tipo : VARCHAR(30)
  cantidad : INT
  usuario_id : INT <<FK>>
  observaciones : TEXT
  created_at : TIMESTAMP
}

entity "pedidos" as pedidos {
  * id : INT <<PK>>
  --
  producto_id : INT <<FK>>
  cantidad_solicitada : INT
  cantidad_asignada : INT
  estado : VARCHAR(20)
  prioridad : INT
  cliente_ref : VARCHAR(100)
  fecha_solicitud : TIMESTAMP
  usuario_id : INT <<FK>>
}

entity "reglas_asignacion" as reglas {
  * id : INT <<PK>>
  --
  nombre : VARCHAR(100)
  criterio : VARCHAR(50)
  activo : TINYINT(1)
  created_at : TIMESTAMP
}

' ========== DATA WAREHOUSE ==========

entity "dim_sucursal" as dim_sucursal {
  * sk_sucursal : INT <<PK>>
  --
  id_sucursal : INT
  nombre_sucursal : VARCHAR(200)
  ciudad : VARCHAR(100)
  estado : VARCHAR(100)
  region : VARCHAR(50)
}

entity "dim_producto" as dim_producto {
  * sk_producto : INT <<PK>>
  --
  id_fuente : INT <<UK>>
  nombre : VARCHAR(255)
  categoria : VARCHAR(100)
}

entity "dim_tiempo" as dim_tiempo {
  * sk_tiempo : INT <<PK>>
  --
  fecha : DATE <<UK>>
  dia : INT
  mes : INT
  nombre_mes : VARCHAR(20)
  trimestre : INT
  anio : INT
  nombre_dia_semana : VARCHAR(20)
  es_fin_de_semana : TINYINT(1)
  semana_del_anio : INT
}

entity "fact_ventas" as fact_ventas {
  * id_hecho : INT <<PK>>
  --
  sk_producto : INT <<FK>>
  sk_tiempo : INT <<FK>>
  sk_sucursal : INT <<FK>>
  cantidad : INT
  monto_total : DECIMAL(12,2)
}

entity "etl_log" as etl_log {
  * id : INT <<PK>>
  --
  proceso : VARCHAR(100)
  registros_procesados : INT
  registros_exitosos : INT
  registros_fallidos : INT
  fecha_ejecucion : TIMESTAMP
  estado : VARCHAR(50)
}

' ========== RELACIONES (transaccional) ==========
categorias ||--o{ productos : "categoriza"
productos ||--o{ ventas : "venta"
productos ||--o{ movimientos : "afecta"
productos ||--o{ pedidos : "solicitado en"
usuarios ||--o{ movimientos : "registra"
usuarios ||--o{ pedidos : "crea"

' ========== RELACIONES (Data Warehouse) ==========
dim_producto ||--o{ fact_ventas : ""
dim_tiempo ||--o{ fact_ventas : ""
dim_sucursal ||--o{ fact_ventas : ""

@enduml
```

---

## Versión simplificada (solo entidades y relaciones, sin atributos)

Útil para presentaciones o vista general.

```plantuml
@startuml
title Diagrama ER - DW Manager (simplificado)

' Transaccional
entity "usuarios" as usuarios
entity "categorias" as categorias
entity "productos" as productos
entity "ventas" as ventas
entity "movimientos" as movimientos
entity "pedidos" as pedidos
entity "reglas_asignacion" as reglas

' Data Warehouse
entity "dim_sucursal" as dim_sucursal
entity "dim_producto" as dim_producto
entity "dim_tiempo" as dim_tiempo
entity "fact_ventas" as fact_ventas
entity "etl_log" as etl_log

categorias ||--o{ productos : 1:N
productos ||--o{ ventas : 1:N
productos ||--o{ movimientos : 1:N
productos ||--o{ pedidos : 1:N
usuarios ||--o{ movimientos : 1:N
usuarios ||--o{ pedidos : 1:N

dim_producto ||--o{ fact_ventas : 1:N
dim_tiempo ||--o{ fact_ventas : 1:N
dim_sucursal ||--o{ fact_ventas : 1:N

@enduml
```

---

## Resumen de entidades y relaciones

### Tablas transaccionales

| Entidad | Descripción | Relaciones |
|---------|-------------|------------|
| **usuarios** | Usuarios del sistema (login, rol) | Referenciado por movimientos, pedidos |
| **categorias** | Catálogo de categorías de productos | Una categoría tiene muchos productos |
| **productos** | Productos del inventario (nombre, código, precio, stock, ubicación) | Pertenece a una categoría; referenciado por ventas, movimientos, pedidos |
| **ventas** | Registro transaccional de ventas (producto, cantidad, monto) | N:1 con productos |
| **movimientos** | Entradas y salidas de inventario (compra, devolución, venta, baja) | N:1 con productos, N:1 con usuarios |
| **pedidos** | Pedidos con cantidad solicitada, asignada, prioridad y estado | N:1 con productos, N:1 con usuarios |
| **reglas_asignacion** | Reglas para asignar stock (FIFO, prioridad, etc.); solo una activa | Sin FK; uso lógico desde la aplicación |

### Data Warehouse

| Entidad | Descripción | Relaciones |
|---------|-------------|------------|
| **dim_sucursal** | Dimensión sucursal (nombre, ciudad, estado, región) | 1:N con fact_ventas |
| **dim_producto** | Dimensión producto (id_fuente → productos.id, nombre, categoría) | 1:N con fact_ventas |
| **dim_tiempo** | Dimensión tiempo (fecha, mes, trimestre, año, etc.) | 1:N con fact_ventas |
| **fact_ventas** | Hechos de ventas (producto, tiempo, sucursal, cantidad, monto) | N:1 con dim_producto, dim_tiempo, dim_sucursal |
| **etl_log** | Registro de ejecución del ETL | Sin FK |

### Cardinalidades

- **categorias – productos:** 1:N (una categoría, muchos productos).
- **productos – ventas / movimientos / pedidos:** 1:N.
- **usuarios – movimientos / pedidos:** 1:N.
- **dim_producto, dim_tiempo, dim_sucursal – fact_ventas:** 1:N cada una.

---

## Uso en PlantUML

1. Ir a https://www.plantuml.com/plantuml/uml
2. Pegar el código del **primer bloque** (diagrama completo con atributos) o del **segundo** (simplificado).
3. Generar y descargar PNG o SVG si se desea.
