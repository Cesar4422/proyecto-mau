// ================================
// Estado Global
// ================================
let editMode = false;
let editId = null;

// Variables globales para gráficos
let ventasChart = null;
let topProductosChart = null;
let sucursalesChart = null;
let tendenciaChart = null;
let regionChart = null;
let analisisTemporalChart = null;

// Variables para CRUD de Sucursales
let editModeSucursal = false;
let editIdSucursal = null;

// Variables para CRUD de Categorías
let editModeCategoria = false;
let editIdCategoria = null;

// ================================
// Funciones de Navegación
// ================================
function showSection(section) {
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(s => s.style.display = 'none');
    
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    navItems.forEach(item => {
        if (item.getAttribute('data-section') === section) item.classList.add('active');
    });
    
    const el = document.getElementById(section + '-section');
    if (el) el.style.display = 'block';
    
    if (section === 'panel') {
        loadDashboardMetricas();
        loadPanelAlertas();
    } else if (section === 'crud') {
        renderTable();
    } else if (section === 'movimientos') {
        loadProductosParaMovimientos();
        loadMovimientos();
    } else if (section === 'pedidos') {
        loadProductosParaPedidos();
        loadPedidos();
    } else if (section === 'reglas') {
        loadReglasAsignacion();
    } else if (section === 'dashboard') {
        loadDashboardData();
        loadAlertasBajoStock();
        loadProductosEstrella();
    } else if (section === 'sucursales') {
        renderSucursalesTable();
    } else if (section === 'categorias') {
        renderCategoriasTable();
    } else if (section === 'analisis-temporal') {
        setTimeout(() => loadAnalisisTemporal('mes'), 100);
    }
}

// ================================
// Funciones CRUD (Backend Real)
// ================================

let busquedaProductos = { q: '', categoria_id: '' };

function aplicarBusquedaProductos() {
    const q = document.getElementById('buscar-producto');
    const cat = document.getElementById('filtro-categoria');
    busquedaProductos.q = (q && q.value) ? q.value.trim() : '';
    busquedaProductos.categoria_id = (cat && cat.value) ? cat.value : '';
    renderTable();
}

async function renderTable() {
    try {
        const params = new URLSearchParams();
        if (busquedaProductos.q) params.set('q', busquedaProductos.q);
        if (busquedaProductos.categoria_id) params.set('categoria_id', busquedaProductos.categoria_id);
        const url = '/api/productos' + (params.toString() ? '?' + params.toString() : '');
        const response = await fetch(url, { credentials: 'include' });
        const productos = await response.json();
        
        const tbody = document.querySelector('#product-table tbody');
        tbody.innerHTML = '';
        
        if (productos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                        <svg style="width: 64px; height: 64px; margin: 0 auto 1rem; opacity: 0.3;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <br>No hay productos registrados
                    </td>
                </tr>
            `;
            return;
        }

        const categoriaColores = {
            'Electrónica': { bg: 'rgba(5, 102, 141, 0.12)', color: '#05668D' },
            'Hogar': { bg: 'rgba(66, 122, 161, 0.12)', color: '#427AA1' },
            'Línea Blanca': { bg: 'rgba(32, 139, 58, 0.12)', color: '#208B3A' },
            'Muebles': { bg: 'rgba(150, 224, 114, 0.25)', color: '#208B3A' },
            'Deportes': { bg: 'rgba(5, 102, 141, 0.18)', color: '#044a6b' },
            'Juguetería': { bg: 'rgba(150, 224, 114, 0.2)', color: '#208B3A' },
            'Ferretería': { bg: 'rgba(194, 192, 186, 0.4)', color: '#5a5a5a' },
            'Videojuegos': { bg: 'rgba(66, 122, 161, 0.18)', color: '#427AA1' },
            'Papelería': { bg: 'rgba(32, 139, 58, 0.15)', color: '#208B3A' },
            'Automotriz': { bg: 'rgba(5, 102, 141, 0.15)', color: '#05668D' },
            'Mascotas': { bg: 'rgba(150, 224, 114, 0.22)', color: '#208B3A' },
            'Zapatería': { bg: 'rgba(66, 122, 161, 0.15)', color: '#427AA1' }
        };

        productos.forEach(p => {
            const categoriaNombre = p.categoria_nombre || 'Sin categoría';
            const catStyle = categoriaColores[categoriaNombre] || { bg: 'rgba(194, 192, 186, 0.3)', color: '#5a5a5a' };
            const ubicacion = [p.pasillo, p.estante, p.nivel].filter(Boolean).join(' / ') || '—';
            const puntoReorden = p.punto_reorden ?? 5;
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>#${p.id}</strong></td>
                    <td>${(p.codigo || '—')}</td>
                    <td>${p.nombre}</td>
                    <td>
                        <span style="background: ${catStyle.bg}; color: ${catStyle.color}; padding: 0.375rem 0.75rem; border-radius: 6px; font-size: 0.875rem; font-weight: 500;">${categoriaNombre}</span>
                    </td>
                    <td style="font-size: 0.875rem;">${ubicacion}</td>
                    <td><strong>$${parseFloat(p.precio_unitario).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></td>
                    <td>
                        <span style="
                            background: ${(p.stock || 0) < puntoReorden ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'};
                            color: ${(p.stock || 0) < puntoReorden ? '#b91c1c' : '#208B3A'};
                            padding: 0.375rem 0.75rem;
                            border-radius: 6px;
                            font-size: 0.875rem;
                            font-weight: 600;
                        ">${p.stock || 0}</span>
                    </td>
                    <td>
                        <button class="btn-edit" onclick="prepareEdit(${p.id}, '${(p.nombre || '').replace(/'/g, "\\'")}', ${p.categoria_id}, ${p.precio_unitario}, ${p.stock ?? 0}, '${(p.codigo || '').replace(/'/g, "\\'")}', ${puntoReorden}, '${(p.pasillo || '').replace(/'/g, "\\'")}', '${(p.estante || '').replace(/'/g, "\\'")}', '${(p.nivel || '').replace(/'/g, "\\'")}')">Editar</button>
                        <button class="btn-delete" onclick="deleteProduct(${p.id})">Eliminar</button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Error al renderizar tabla:", err);
        mostrarNotificacion('Error al cargar los productos', 'danger');
    }
}

function prepareEdit(id, nombre, categoria_id, precio_unitario, stock, codigo, punto_reorden, pasillo, estante, nivel) {
    editMode = true;
    editId = id;
    document.getElementById('nombre').value = nombre || '';
    document.getElementById('categoria').value = categoria_id || '';
    document.getElementById('precio').value = precio_unitario != null ? precio_unitario : '';
    document.getElementById('stock').value = stock != null ? stock : 0;
    document.getElementById('codigo').value = codigo || '';
    document.getElementById('punto_reorden').value = punto_reorden != null ? punto_reorden : 5;
    document.getElementById('pasillo').value = pasillo || '';
    document.getElementById('estante').value = estante || '';
    document.getElementById('nivel').value = nivel || '';
    const btn = document.querySelector('#product-form button[type="submit"]');
    if (btn) btn.textContent = 'Actualizar Producto';
    document.getElementById('product-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetForm() {
    editMode = false;
    editId = null;
    document.getElementById('product-form').reset();
    document.getElementById('stock').value = 0;
    document.getElementById('punto_reorden').value = 5;
    const btn = document.querySelector('#product-form button[type="submit"]');
    if (btn) btn.textContent = 'Guardar Producto';
}

// ================================
// CRUD: GESTIÓN DE SUCURSALES
// ================================

async function renderSucursalesTable() {
    try {
        const response = await fetch('/api/sucursales', {
            credentials: 'include'
        });
        const sucursales = await response.json();
        
        const tbody = document.querySelector('#sucursal-table tbody');
        tbody.innerHTML = '';
        
        if (sucursales.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                        No hay sucursales registradas
                    </td>
                </tr>
            `;
            return;
        }

        sucursales.forEach(s => {
            const regionColor = {
                'Norte': 'rgba(59, 130, 246, 0.1)',
                'Sur': 'rgba(239, 68, 68, 0.1)',
                'Centro': 'rgba(16, 185, 129, 0.1)',
                'Occidente': 'rgba(245, 158, 11, 0.1)',
                'Oriente': 'rgba(139, 92, 246, 0.1)'
            };
            
            const regionTextColor = {
                'Norte': '#05668D',
                'Sur': '#208B3A',
                'Centro': '#96E072',
                'Occidente': '#427AA1',
                'Oriente': '#044a6b'
            };
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>#${s.sk_sucursal}</strong></td>
                    <td>${s.nombre_sucursal}</td>
                    <td>${s.ciudad}</td>
                    <td>${s.estado}</td>
                    <td>
                        <span style="
                            background: ${regionColor[s.region] || 'var(--gray-100)'};
                            color: ${regionTextColor[s.region] || 'var(--text-primary)'};
                            padding: 0.375rem 0.75rem;
                            border-radius: 6px;
                            font-size: 0.875rem;
                            font-weight: 500;
                        ">${s.region}</span>
                    </td>
                    <td>
                        <button class="btn-edit" onclick="prepareEditSucursal(${s.sk_sucursal}, '${s.nombre_sucursal.replace(/'/g, "\\'")}', '${s.ciudad.replace(/'/g, "\\'")}', '${s.estado.replace(/'/g, "\\'")}', '${s.region}')">
                            <svg style="width: 14px; height: 14px; display: inline; vertical-align: middle; margin-right: 4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Editar
                        </button>
                        <button class="btn-delete" onclick="deleteSucursal(${s.sk_sucursal})">
                            <svg style="width: 14px; height: 14px; display: inline; vertical-align: middle; margin-right: 4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                            Eliminar
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Error al renderizar tabla de sucursales:", err);
        mostrarNotificacion('Error al cargar las sucursales', 'danger');
    }
}

function prepareEditSucursal(id, nombre, ciudad, estado, region) {
    document.getElementById('nombre-sucursal').value = nombre;
    document.getElementById('ciudad-sucursal').value = ciudad;
    document.getElementById('estado-sucursal').value = estado;
    document.getElementById('region-sucursal').value = region;
    
    editModeSucursal = true;
    editIdSucursal = id;
    
    const btnSubmit = document.querySelector('#sucursal-form button[type="submit"]');
    btnSubmit.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        Actualizar Sucursal
    `;
    
    document.getElementById('sucursal-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetSucursalForm() {
    document.getElementById('sucursal-form').reset();
    editModeSucursal = false;
    editIdSucursal = null;
    
    const btnSubmit = document.querySelector('#sucursal-form button[type="submit"]');
    btnSubmit.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
        </svg>
        Guardar Sucursal
    `;
}

async function deleteSucursal(id) {
    if (confirm('¿Está seguro de eliminar esta sucursal? Esta acción no se puede deshacer.')) {
        try {
            const response = await fetch(`/api/sucursales/${id}`, { 
                method: 'DELETE',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                renderSucursalesTable();
                mostrarNotificacion('Sucursal eliminada exitosamente', 'success');
            } else {
                mostrarNotificacion(data.error || 'Error al eliminar la sucursal', 'danger');
            }
        } catch (err) {
            console.error("Error al eliminar:", err);
            mostrarNotificacion('Error al eliminar la sucursal', 'danger');
        }
    }
}

// ================================
// CRUD: GESTIÓN DE CATEGORÍAS
// ================================

async function renderCategoriasTable() {
    try {
        const response = await fetch('/api/categorias', {
            credentials: 'include'
        });
        const categorias = await response.json();
        
        const tbody = document.querySelector('#categoria-table tbody');
        tbody.innerHTML = '';
        
        if (categorias.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                        No hay categorías registradas
                    </td>
                </tr>
            `;
            return;
        }

        categorias.forEach(c => {
            tbody.innerHTML += `
                <tr>
                    <td><strong>#${c.id}</strong></td>
                    <td>${c.nombre}</td>
                    <td>
                        <button class="btn-edit" onclick="prepareEditCategoria(${c.id}, '${c.nombre.replace(/'/g, "\\'")}')">
                            <svg style="width: 14px; height: 14px; display: inline; vertical-align: middle; margin-right: 4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Editar
                        </button>
                        <button class="btn-delete" onclick="deleteCategoria(${c.id})">
                            <svg style="width: 14px; height: 14px; display: inline; vertical-align: middle; margin-right: 4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                            Eliminar
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Error al renderizar tabla de categorías:", err);
        mostrarNotificacion('Error al cargar las categorías', 'danger');
    }
}

function prepareEditCategoria(id, nombre) {
    document.getElementById('nombre-categoria').value = nombre;
    
    editModeCategoria = true;
    editIdCategoria = id;
    
    const btnSubmit = document.querySelector('#categoria-form button[type="submit"]');
    btnSubmit.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        Actualizar Categoría
    `;
    
    document.getElementById('categoria-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetCategoriaForm() {
    document.getElementById('categoria-form').reset();
    editModeCategoria = false;
    editIdCategoria = null;
    
    const btnSubmit = document.querySelector('#categoria-form button[type="submit"]');
    btnSubmit.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
        </svg>
        Guardar Categoría
    `;
}

async function deleteCategoria(id) {
    if (confirm('¿Está seguro de eliminar esta categoría?')) {
        try {
            const response = await fetch(`/api/categorias/${id}`, { 
                method: 'DELETE',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                renderCategoriasTable();
                loadCategoriasSelect();
                mostrarNotificacion('Categoría eliminada exitosamente', 'success');
            } else {
                mostrarNotificacion(data.error || 'Error al eliminar la categoría', 'danger');
            }
        } catch (err) {
            console.error("Error al eliminar:", err);
            mostrarNotificacion('Error al eliminar la categoría', 'danger');
        }
    }
}

async function loadCategoriasSelect() {
    try {
        const response = await fetch('/api/categorias', { credentials: 'include' });
        const categorias = await response.json();
        const opts = '<option value="">Selecciona una categoría</option>' + categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        const select = document.getElementById('categoria');
        const filtro = document.getElementById('filtro-categoria');
        if (select) { select.innerHTML = opts; }
        if (filtro) { filtro.innerHTML = '<option value="">Todas</option>' + categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join(''); }
    } catch (err) {
        console.error("Error al cargar categorías:", err);
    }
}

// ================================
// PANEL PRINCIPAL: MÉTRICAS Y ALERTAS
// ================================

async function loadDashboardMetricas() {
    const agotadosEl = document.getElementById('metricas-agotados');
    const pendientesEl = document.getElementById('metricas-pendientes');
    const ocupacionEl = document.getElementById('metricas-ocupacion');
    const unidadesEl = document.getElementById('metricas-unidades');
    const setMetricas = (data) => {
        if (agotadosEl) agotadosEl.textContent = data.productos_agotados ?? 0;
        if (pendientesEl) pendientesEl.textContent = data.ordenes_pendientes_surtir ?? 0;
        if (ocupacionEl) ocupacionEl.textContent = data.ocupacion_almacen || '—';
        if (unidadesEl) unidadesEl.textContent = (data.total_unidades ?? 0) + ' unidades';
    };
    try {
        const response = await fetch('/api/dashboard/metricas', { credentials: 'include' });
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
            setMetricas(data);
        } else {
            setMetricas({
                productos_agotados: 0,
                ordenes_pendientes_surtir: 0,
                ocupacion_almacen: data.error || 'Inicia sesión',
                total_unidades: 0
            });
        }
    } catch (err) {
        console.error('Error al cargar métricas:', err);
        setMetricas({
            productos_agotados: 0,
            ordenes_pendientes_surtir: 0,
            ocupacion_almacen: 'Error de conexión',
            total_unidades: 0
        });
    }
}

async function loadPanelAlertas() {
    try {
        const response = await fetch('/api/alertas/bajo-stock', { credentials: 'include' });
        const alertas = await response.json();
        const container = document.getElementById('panel-alertas-bajo-stock');
        const banner = document.getElementById('alertas-banner');
        if (!container) return;
        if (alertas.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary);">✅ Ningún producto bajo punto de reorden.</p>';
            if (banner) banner.classList.add('hidden');
            return;
        }
        if (banner) {
            banner.classList.remove('hidden');
            const text = document.getElementById('alertas-banner-text');
            if (text) text.textContent = alertas.length + ' producto(s) bajo punto de reorden';
        }
        container.innerHTML = alertas.map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-bottom: 1px solid rgba(0,0,0,0.06);">
                <div>
                    <strong>${p.nombre}</strong> ${p.codigo ? '(' + p.codigo + ')' : ''}
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">${p.categoria || 'Sin categoría'} · Punto reorden: ${p.punto_reorden ?? 5}</div>
                </div>
                <span style="background: #b91c1c; color: white; padding: 0.35rem 0.75rem; border-radius: 6px; font-weight: 700;">${p.stock}</span>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error al cargar alertas panel:', err);
    }
}

// ================================
// MOVIMIENTOS (ENTRADAS / SALIDAS)
// ================================

async function loadProductosParaMovimientos() {
    try {
        const res = await fetch('/api/productos', { credentials: 'include' });
        const productos = await res.json();
        const sel = document.getElementById('mov-producto');
        if (!sel) return;
        sel.innerHTML = '<option value="">Seleccionar producto</option>' + productos.map(p => `<option value="${p.id}">${p.nombre} ${p.codigo ? '(' + p.codigo + ')' : ''} - Stock: ${p.stock ?? 0}</option>`).join('');
    } catch (err) {
        console.error('Error cargar productos movimientos:', err);
    }
}

async function loadMovimientos() {
    try {
        const res = await fetch('/api/movimientos?limit=50', { credentials: 'include' });
        const rows = await res.json();
        const tbody = document.getElementById('movimientos-tbody');
        if (!tbody) return;
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay movimientos</td></tr>';
            return;
        }
        const tipoLabel = { entrada_compra: 'Entrada (Compra)', entrada_devolucion: 'Entrada (Devolución)', salida_venta: 'Salida (Venta)', salida_baja: 'Salida (Baja)' };
        tbody.innerHTML = rows.map(m => `
            <tr>
                <td>${new Date(m.created_at).toLocaleString('es-MX')}</td>
                <td>${m.producto_nombre} ${m.producto_codigo ? '(' + m.producto_codigo + ')' : ''}</td>
                <td>${tipoLabel[m.tipo] || m.tipo}</td>
                <td><strong>${m.cantidad}</strong></td>
                <td>${m.observaciones || '—'}</td>
            </tr>
        `).join('');
    } catch (err) {
        document.getElementById('movimientos-tbody').innerHTML = '<tr><td colspan="5" style="text-align: center;">Error al cargar</td></tr>';
    }
}

// ================================
// PEDIDOS Y ASIGNACIÓN
// ================================

async function loadProductosParaPedidos() {
    try {
        const res = await fetch('/api/productos', { credentials: 'include' });
        const productos = await res.json();
        const sel = document.getElementById('pedido-producto');
        if (!sel) return;
        sel.innerHTML = '<option value="">Seleccionar producto</option>' + productos.map(p => `<option value="${p.id}">${p.nombre} - Stock: ${p.stock ?? 0}</option>`).join('');
    } catch (err) {
        console.error('Error cargar productos pedidos:', err);
    }
}

async function loadPedidos() {
    try {
        const res = await fetch('/api/pedidos', { credentials: 'include' });
        const rows = await res.json();
        const tbody = document.getElementById('pedidos-tbody');
        if (!tbody) return;
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay pedidos</td></tr>';
            return;
        }
        tbody.innerHTML = rows.map(p => `
            <tr>
                <td>#${p.id}</td>
                <td>${p.producto_nombre} ${p.codigo ? '(' + p.codigo + ')' : ''}</td>
                <td>${p.cantidad_solicitada}</td>
                <td>${p.cantidad_asignada ?? 0}</td>
                <td><span class="badge badge-${p.estado === 'surtido' ? 'success' : 'warning'}">${p.estado}</span></td>
                <td>${p.estado === 'pendiente' || p.estado === 'parcial' ? `<button class="btn-edit" onclick="ejecutarAsignacion(${p.producto_id})">Ejecutar asignación</button>` : '—'}</td>
            </tr>
        `).join('');
    } catch (err) {
        const tbody = document.getElementById('pedidos-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Error al cargar (¿ejecutó el SQL de inventario?)</td></tr>';
    }
}

async function ejecutarAsignacion(producto_id) {
    try {
        const res = await fetch('/api/asignacion/ejecutar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ producto_id }),
            credentials: 'include'
        });
        const data = await res.json();
        if (res.ok) {
            mostrarNotificacion(data.message || 'Asignación ejecutada', 'success');
            loadPedidos();
            loadDashboardMetricas();
        } else {
            mostrarNotificacion(data.error || 'Error en asignación', 'danger');
        }
    } catch (err) {
        mostrarNotificacion('Error de conexión o motor Python no disponible', 'danger');
    }
}

// ================================
// REGLAS DE ASIGNACIÓN (Admin)
// ================================

async function loadReglasAsignacion() {
    try {
        const res = await fetch('/api/reglas-asignacion', { credentials: 'include' });
        const reglas = await res.json();
        const container = document.getElementById('reglas-container');
        if (!container) return;
        if (reglas.length === 0) {
            container.innerHTML = '<p>No hay reglas configuradas.</p>';
            return;
        }
        const criterios = { prioridad_fifo: 'FIFO (primero en llegar)', prioridad_mayor: 'Mayor prioridad', prioridad_cantidad: 'Menor cantidad primero', prioridad_cliente: 'Prioridad cliente' };
        container.innerHTML = reglas.map(r => `
            <div class="card" style="margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <strong>${r.nombre}</strong>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">${criterios[r.criterio] || r.criterio}</div>
                    </div>
                    <div>
                        <select class="form-input" style="width: auto;" onchange="actualizarRegla(${r.id}, this.value)">
                            <option value="prioridad_fifo" ${r.criterio === 'prioridad_fifo' ? 'selected' : ''}>FIFO</option>
                            <option value="prioridad_mayor" ${r.criterio === 'prioridad_mayor' ? 'selected' : ''}>Mayor prioridad</option>
                            <option value="prioridad_cantidad" ${r.criterio === 'prioridad_cantidad' ? 'selected' : ''}>Menor cantidad</option>
                            <option value="prioridad_cliente" ${r.criterio === 'prioridad_cliente' ? 'selected' : ''}>Prioridad cliente</option>
                        </select>
                        <span style="margin-left: 0.5rem;">${r.activo ? '✅ Activa' : 'Inactiva'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        document.getElementById('reglas-container').innerHTML = '<p>Error al cargar (¿ejecutó el SQL de inventario?)</p>';
    }
}

async function actualizarRegla(id, criterio) {
    try {
        const res = await fetch(`/api/reglas-asignacion/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ criterio }),
            credentials: 'include'
        });
        if (res.ok) mostrarNotificacion('Regla actualizada', 'success');
        else {
            const d = await res.json();
            mostrarNotificacion(d.error || 'Error', 'danger');
        }
    } catch (err) {
        mostrarNotificacion('Error al actualizar regla', 'danger');
    }
}

// ================================
// ALERTAS DE BAJO STOCK
// ================================

async function loadAlertasBajoStock() {
    try {
        const response = await fetch('/api/alertas/bajo-stock', {
            credentials: 'include'
        });
        const alertas = await response.json();
        
        const container = document.getElementById('alertas-bajo-stock');
        if (!container) return;
        
        if (alertas.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <svg style="width: 48px; height: 48px; margin: 0 auto 1rem; opacity: 0.3;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <p style="font-weight: 500;">✅ Todo el inventario está bien abastecido</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = alertas.map(producto => `
            <div style="
                background: rgba(239, 68, 68, 0.05);
                border-left: 4px solid var(--danger);
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 0.75rem;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">
                            ${producto.nombre}
                        </div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">
                            ${producto.categoria} • $${parseFloat(producto.precio_unitario).toLocaleString('es-MX', {minimumFractionDigits: 2})}
                        </div>
                    </div>
                    <div style="
                        background: var(--danger);
                        color: white;
                        padding: 0.5rem 1rem;
                        border-radius: 6px;
                        font-weight: 700;
                        font-size: 1.25rem;
                    ">
                        ${producto.stock}
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (err) {
        console.error("Error al cargar alertas:", err);
    }
}

// ================================
// REFRESCAR CUBO OLAP
// ================================

async function refrescarCuboOLAP() {
    if (!confirm('¿Deseas actualizar el Cubo OLAP con los datos más recientes del sistema transaccional?')) {
        return;
    }
    
    mostrarLoadingExport('Actualizando Cubo OLAP...');
    
    try {
        const response = await fetch('/api/olap/refrescar-cubo', {
            method: 'POST',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            ocultarLoadingExport();
            mostrarNotificacion('✅ Cubo OLAP actualizado exitosamente', 'success');
            
            const dashboardSection = document.getElementById('dashboard-section');
            if (dashboardSection && dashboardSection.style.display !== 'none') {
                loadDashboardData();
            }
        } else {
            ocultarLoadingExport();
            mostrarNotificacion('❌ Error al actualizar el cubo', 'danger');
        }
    } catch (err) {
        console.error('Error al refrescar cubo:', err);
        ocultarLoadingExport();
        mostrarNotificacion('❌ Error de conexión', 'danger');
    }
}

// ================================
// PRODUCTOS ESTRELLA
// ================================

async function loadProductosEstrella() {
    try {
        const response = await fetch('/api/olap/productos-estrella', {
            credentials: 'include'
        });
        const productos = await response.json();
        
        const container = document.getElementById('productos-estrella-container');
        if (!container) return;
        
        if (productos.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <p>No hay datos suficientes para calcular el crecimiento</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = productos.map((p, index) => {
            const medals = ['🥇', '🥈', '🥉'];
            const colors = ['#96E072', '#C2C0BA', '#427AA1'];
            
            return `
                <div style="
                    background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
                    border: 2px solid ${colors[index]};
                    border-radius: 12px;
                    padding: 1.5rem;
                ">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <div style="font-size: 2rem;">${medals[index]}</div>
                        <div style="flex: 1;">
                            <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-primary);">
                                ${p.producto}
                            </div>
                            <div style="font-size: 0.875rem; color: var(--text-secondary);">
                                Top ${index + 1} en crecimiento
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
                                Mes Anterior
                            </div>
                            <div style="font-weight: 600; color: var(--text-primary);">
                                $${parseFloat(p.ventas_mes_anterior || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
                                Mes Actual
                            </div>
                            <div style="font-weight: 600; color: #208B3A;">
                                $${parseFloat(p.total_ventas).toLocaleString('es-MX', {minimumFractionDigits: 2})}
                            </div>
                        </div>
                    </div>
                    
                    <div style="
                        margin-top: 1rem;
                        padding: 0.75rem;
                        background: rgba(16, 185, 129, 0.1);
                        border-radius: 8px;
                        text-align: center;
                    ">
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
                            Crecimiento
                        </div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: #208B3A;">
                            +${p.crecimiento_porcentual}%
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (err) {
        console.error("Error al cargar productos estrella:", err);
    }
}

// ================================
// ANÁLISIS TEMPORAL AVANZADO
// ================================

async function loadAnalisisTemporal(nivel) {
    try {
        // Actualizar botones activos
        document.querySelectorAll('.btn-nivel').forEach(btn => {
            btn.classList.remove('active');
            // Activar el botón correspondiente al nivel
            const btnText = btn.textContent.toLowerCase();
            if (
                (nivel === 'dia' && btnText.includes('día')) ||
                (nivel === 'mes' && btnText.includes('mes')) ||
                (nivel === 'trimestre' && btnText.includes('trimestre')) ||
                (nivel === 'anio' && btnText.includes('año'))
            ) {
                btn.classList.add('active');
            }
        });
        
        const response = await fetch(`/api/olap/analisis-temporal?nivel=${nivel}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Error al obtener datos del servidor');
        }
        
        const data = await response.json();
        
        if (!data || data.length === 0) {
            mostrarNotificacion('No hay datos disponibles para este nivel de análisis', 'danger');
            return;
        }
        
        let labels = [];
        let values = [];
        
        switch(nivel) {
            case 'dia':
                labels = data.map(item => new Date(item.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }));
                values = data.map(item => parseFloat(item.total_ventas));
                break;
            case 'mes':
                labels = data.map(item => `${item.nombre_mes} ${item.anio}`);
                values = data.map(item => parseFloat(item.total_ventas));
                break;
            case 'trimestre':
                labels = data.map(item => `Q${item.trimestre} ${item.anio}`);
                values = data.map(item => parseFloat(item.total_ventas));
                break;
            case 'anio':
                labels = data.map(item => item.anio.toString());
                values = data.map(item => parseFloat(item.total_ventas));
                break;
        }
        
        const ctx = document.getElementById('analisisTemporalChart');
        if (!ctx) {
            console.error('Canvas no encontrado');
            return;
        }
        
        if (analisisTemporalChart) {
            analisisTemporalChart.destroy();
        }
        
        analisisTemporalChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ventas',
                    data: values,
                    borderColor: 'rgba(5, 102, 141, 1)',
                    backgroundColor: 'rgba(5, 102, 141, 0.12)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: 'rgba(5, 102, 141, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return 'Ventas: $' + context.parsed.y.toLocaleString('es-MX', { minimumFractionDigits: 2 });
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + (value/1000).toFixed(0) + 'K';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        
    } catch (err) {
        console.error("Error al cargar análisis temporal:", err);
        mostrarNotificacion('Error al cargar el análisis temporal: ' + err.message, 'danger');
    }
}

// ================================
// Funciones Dashboard - MEJORADAS
// ================================

async function loadDashboardData() {
    try {
        await loadEstadisticasGenerales();
        await loadVentasPorCategoria();
        await loadTopProductos();
        await loadRankingSucursales();
        await loadTendenciaMensual();
        await loadAnalisisPorRegion();
        await loadAnalisisDetallado();
    } catch (err) {
        console.error("Error al cargar el dashboard:", err);
        mostrarNotificacion('Error al cargar los datos del dashboard', 'danger');
    }
}

async function loadEstadisticasGenerales() {
    try {
        const response = await fetch('/api/olap/kpi/estadisticas', {
            credentials: 'include'
        });
        const stats = await response.json();
        
        document.getElementById('total-monto').textContent = 
            `$${parseFloat(stats.total_ventas || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
        document.getElementById('total-qty').textContent = stats.total_unidades || 0;
        document.getElementById('promedio-transaccion').textContent = 
            `$${parseFloat(stats.promedio_transaccion || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
        document.getElementById('num-transacciones').textContent = 
            `${stats.num_transacciones || 0} transacciones`;
        document.getElementById('productos-unicos').textContent = stats.productos_vendidos || 0;
        document.getElementById('sucursales-activas').textContent = 
            `${stats.sucursales_activas || 0} sucursales activas`;
    } catch (err) {
        console.error("Error al cargar estadísticas:", err);
    }
}

async function loadVentasPorCategoria() {
    try {
        const response = await fetch('/api/olap/ventas', {
            credentials: 'include'
        });
        const data = await response.json();

        const labels = data.map(item => item.categoria);
        const values = data.map(item => parseFloat(item.total));

        const ctx = document.getElementById('ventasChart');
        if (!ctx) return;
        
        if (ventasChart) {
            ventasChart.destroy();
        }
        
        ventasChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.length > 0 ? labels : ['Sin datos'],
                datasets: [{
                    label: 'Ventas ($)',
                    data: values.length > 0 ? values : [0],
                    backgroundColor: [
                        'rgba(5, 102, 141, 0.8)',
                        'rgba(66, 122, 161, 0.8)',
                        'rgba(32, 139, 58, 0.8)',
                        'rgba(150, 224, 114, 0.8)',
                        'rgba(194, 192, 186, 0.6)'
                    ],
                    borderColor: [
                        'rgba(5, 102, 141, 1)',
                        'rgba(66, 122, 161, 1)',
                        'rgba(32, 139, 58, 1)',
                        'rgba(150, 224, 114, 1)',
                        'rgba(194, 192, 186, 1)'
                    ],
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return 'Ventas: $' + context.parsed.y.toLocaleString('es-MX', { minimumFractionDigits: 2 });
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString('es-MX');
                            }
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error("Error al cargar ventas por categoría:", err);
    }
}

async function loadTopProductos() {
    try {
        const response = await fetch('/api/olap/kpi/top-productos?limit=5', {
            credentials: 'include'
        });
        const data = await response.json();

        const labels = data.map(item => item.producto);
        const values = data.map(item => parseFloat(item.total_ventas));

        const ctx = document.getElementById('topProductosChart');
        if (!ctx) return;
        
        if (topProductosChart) {
            topProductosChart.destroy();
        }
        
        topProductosChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ventas ($)',
                    data: values,
                    backgroundColor: 'rgba(66, 122, 161, 0.8)',
                    borderColor: 'rgba(66, 122, 161, 1)',
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return '$' + context.parsed.x.toLocaleString('es-MX', { minimumFractionDigits: 2 });
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + (value/1000).toFixed(0) + 'K';
                            }
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error("Error al cargar top productos:", err);
    }
}

async function loadRankingSucursales() {
    try {
        const response = await fetch('/api/olap/kpi/ranking-sucursales', {
            credentials: 'include'
        });
        const data = await response.json();

        const labels = data.map(item => item.ciudad);
        const values = data.map(item => parseFloat(item.total_ventas));

        const ctx = document.getElementById('sucursalesChart');
        if (!ctx) return;
        
        if (sucursalesChart) {
            sucursalesChart.destroy();
        }
        
        sucursalesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        'rgba(5, 102, 141, 0.8)',
                        'rgba(66, 122, 161, 0.8)',
                        'rgba(32, 139, 58, 0.8)',
                        'rgba(150, 224, 114, 0.8)',
                        'rgba(194, 192, 186, 0.7)'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': $' + context.parsed.toLocaleString('es-MX', { minimumFractionDigits: 2 });
                            }
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error("Error al cargar ranking sucursales:", err);
    }
}

async function loadTendenciaMensual() {
    try {
        const response = await fetch('/api/olap/kpi/tendencia-mensual?anio=2024', {
            credentials: 'include'
        });
        const data = await response.json();

        const labels = data.map(item => item.nombre_mes);
        const values = data.map(item => parseFloat(item.total_ventas));

        const ctx = document.getElementById('tendenciaChart');
        if (!ctx) return;
        
        if (tendenciaChart) {
            tendenciaChart.destroy();
        }
        
        tendenciaChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ventas Mensuales',
                    data: values,
                    borderColor: 'rgba(5, 102, 141, 1)',
                    backgroundColor: 'rgba(5, 102, 141, 0.12)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: 'rgba(5, 102, 141, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Ventas: $' + context.parsed.y.toLocaleString('es-MX', { minimumFractionDigits: 2 });
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + (value/1000).toFixed(0) + 'K';
                            }
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error("Error al cargar tendencia mensual:", err);
    }
}

async function loadAnalisisPorRegion() {
    try {
        const response = await fetch('/api/olap/kpi/ranking-sucursales', {
            credentials: 'include'
        });
        const data = await response.json();

        const regionData = {};
        data.forEach(item => {
            if (!regionData[item.region]) {
                regionData[item.region] = 0;
            }
            regionData[item.region] += parseFloat(item.total_ventas);
        });

        const labels = Object.keys(regionData);
        const values = Object.values(regionData);

        const ctx = document.getElementById('regionChart');
        if (!ctx) return;
        
        if (regionChart) {
            regionChart.destroy();
        }
        
        regionChart = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        'rgba(5, 102, 141, 0.6)',
                        'rgba(66, 122, 161, 0.6)',
                        'rgba(32, 139, 58, 0.6)',
                        'rgba(150, 224, 114, 0.6)',
                        'rgba(194, 192, 186, 0.5)'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': $' + context.parsed.r.toLocaleString('es-MX', { minimumFractionDigits: 2 });
                            }
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error("Error al cargar análisis por región:", err);
    }
}

async function loadAnalisisDetallado() {
    try {
        const response = await fetch('/api/olap/kpi/top-productos?limit=10', {
            credentials: 'include'
        });
        const data = await response.json();

        const tbody = document.getElementById('analisis-tbody');
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No hay datos disponibles</td></tr>';
            return;
        }

        data.forEach((item, index) => {
            tbody.innerHTML += `
                <tr>
                    <td><strong>${index + 1}</strong></td>
                    <td>${item.producto}</td>
                    <td>
                        <span style="
                            background: ${item.categoria === 'Electrónica' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)'};
                            color: ${item.categoria === 'Electrónica' ? 'var(--primary)' : 'var(--cerulean)'};
                            padding: 0.375rem 0.75rem;
                            border-radius: 6px;
                            font-size: 0.875rem;
                            font-weight: 500;
                        ">${item.categoria}</span>
                    </td>
                    <td><strong>$${parseFloat(item.total_ventas).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></td>
                    <td>${item.total_unidades}</td>
                    <td>${item.num_transacciones}</td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Error al cargar análisis detallado:", err);
    }
}

// ================================
// Funciones Auxiliares
// ================================
function mostrarNotificacion(mensaje, tipo = 'success') {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: ${tipo === 'success' ? 'var(--success)' : 'var(--danger)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        font-weight: 500;
    `;
    notif.textContent = mensaje;
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ================================
// Funciones de Autenticación
// ================================

async function updateUserInfo() {
    try {
        const response = await fetch('/api/auth/check', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.authenticated) {
            const user = data.user;
            
            const userNameElement = document.getElementById('user-name');
            if (userNameElement) userNameElement.textContent = user.nombre;
            const userEmailElement = document.getElementById('user-email');
            if (userEmailElement) userEmailElement.textContent = user.email;
            const userInitialElement = document.getElementById('user-initial');
            if (userInitialElement) userInitialElement.textContent = (user.nombre || 'U').charAt(0).toUpperCase();
            
            document.body.classList.remove('role-administrador', 'role-operador');
            if (user.rol === 'administrador') document.body.classList.add('role-administrador');
            else if (user.rol === 'operador') document.body.classList.add('role-operador');
            return true;
        } else {
            window.location.href = '/login.html';
            return false;
        }
    } catch (error) {
        console.error('Error actualizando info de usuario:', error);
        return false;
    }
}

async function handleLogout() {
    if (!confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            mostrarNotificacion('Sesión cerrada exitosamente', 'success');
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 500);
        } else {
            mostrarNotificacion('Error al cerrar sesión', 'danger');
        }
    } catch (error) {
        console.error('Error en logout:', error);
        mostrarNotificacion('Error al cerrar sesión', 'danger');
    }
}

// ================================
// Event Listeners
// ================================
document.addEventListener('DOMContentLoaded', () => {
    // Evitar espacios al inicio/final en todos los campos CRUD
    function trimInputBlur(e) {
        const el = e.target;
        if (el.value && typeof el.value === 'string') {
            const t = el.value.trim();
            if (el.value !== t) el.value = t;
        }
    }
    function noLeadingSpaceKeydown(e) {
        if (e.key === ' ' && e.target.selectionStart === 0) e.preventDefault();
    }
    const crudSelectors = '#product-form input, #product-form select, #sucursal-form input, #sucursal-form select, #categoria-form input, #movimiento-form input, #movimiento-form select, #pedido-form input, #pedido-form select, #buscar-producto';
    document.querySelectorAll(crudSelectors).forEach(function(el) {
        el.addEventListener('blur', trimInputBlur);
        el.addEventListener('keydown', noLeadingSpaceKeydown);
    });

    // Restringir cada campo CRUD al tipo de dato que requiere (solo valores permitidos)
    function aplicarFiltroTexto(el, regexEliminar) {
        const v = el.value;
        if (!v) return;
        const filtrado = v.replace(regexEliminar, '');
        if (v !== filtrado) {
            const start = el.selectionStart;
            const antes = v.substring(0, start);
            const eliminadosAntes = antes.length - antes.replace(regexEliminar, '').length;
            el.value = filtrado;
            el.setSelectionRange(Math.max(0, start - eliminadosAntes), Math.max(0, start - eliminadosAntes));
        }
    }
    function soloEnteros(e) {
        const el = e.target;
        const v = el.value.replace(/\D/g, '');
        if (el.value !== v) {
            const start = el.selectionStart;
            const digitosAntes = (el.value.substring(0, start).match(/\d/g) || []).length;
            el.value = v;
            el.setSelectionRange(digitosAntes, digitosAntes);
        }
    }
    function soloDecimal(e) {
        const el = e.target;
        let v = el.value.replace(/[^\d.]/g, '');
        const partes = v.split('.');
        if (partes.length > 2) v = partes[0] + '.' + partes.slice(1).join('');
        else if (partes.length === 2 && partes[1].length > 2) v = partes[0] + '.' + partes[1].substring(0, 2);
        if (el.value !== v) {
            el.value = v;
        }
    }
    const filtrosTexto = {
        'nombre': /[^\p{L}\p{N}\s]/gu,
        'codigo': /[^a-zA-Z0-9\-]/g,
        'pasillo': /[^a-zA-Z0-9]/g,
        'estante': /[^a-zA-Z0-9]/g,
        'nivel': /[^a-zA-Z0-9]/g,
        'mov-observaciones': /[^\p{L}\p{N}\s.,\-]/gu,
        'pedido-cliente': /[^\p{L}\p{N}\s]/gu,
        'nombre-sucursal': /[^\p{L}\s]/gu,
        'ciudad-sucursal': /[^\p{L}\s]/gu,
        'estado-sucursal': /[^\p{L}\s]/gu,
        'nombre-categoria': /[^\p{L}\s]/gu,
        'buscar-producto': /[^\p{L}\p{N}\s]/gu
    };
    Object.keys(filtrosTexto).forEach(function(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', function(e) { aplicarFiltroTexto(e.target, filtrosTexto[id]); });
        el.addEventListener('paste', function() {
            setTimeout(function() { aplicarFiltroTexto(el, filtrosTexto[id]); }, 0);
        });
    });
    const idsEnteros = ['stock', 'punto_reorden', 'mov-cantidad', 'pedido-cantidad', 'pedido-prioridad'];
    idsEnteros.forEach(function(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', soloEnteros);
        el.addEventListener('paste', function() { setTimeout(function() { soloEnteros({ target: el }); }, 0); });
    });
    const precioEl = document.getElementById('precio');
    if (precioEl) {
        precioEl.addEventListener('input', soloDecimal);
        precioEl.addEventListener('paste', function() { setTimeout(function() { soloDecimal({ target: precioEl }); }, 0); });
    }

    // Cargar métricas y panel solo tras confirmar sesión (evita 401 en panel)
    updateUserInfo().then((ok) => {
        if (ok) {
            loadDashboardMetricas();
            loadPanelAlertas();
        }
    });
    loadCategoriasSelect();
    renderTable();
    
    // FORMULARIO DE PRODUCTOS
    document.getElementById('product-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nombre = document.getElementById('nombre').value.trim();
        const categoria_id = document.getElementById('categoria').value;
        const precio = document.getElementById('precio').value;
        const stock = document.getElementById('stock').value;
        const codigo = document.getElementById('codigo')?.value?.trim() ?? '';
        const punto_reorden = document.getElementById('punto_reorden')?.value ?? '';
        const pasillo = document.getElementById('pasillo')?.value?.trim() ?? '';
        const estante = document.getElementById('estante')?.value?.trim() ?? '';
        const nivel = document.getElementById('nivel')?.value?.trim() ?? '';

        if (!nombre) {
            mostrarNotificacion("El nombre del producto es obligatorio", "danger");
            return;
        }
        if (!codigo) {
            mostrarNotificacion("El código es obligatorio", "danger");
            return;
        }
        if (!categoria_id) {
            mostrarNotificacion("Debe seleccionar una categoría", "danger");
            return;
        }
        if (precio === "" || precio === null || precio === undefined) {
            mostrarNotificacion("El precio unitario es obligatorio", "danger");
            return;
        }
        if (parseFloat(precio) < 0) {
            mostrarNotificacion("El precio debe ser un valor positivo", "danger");
            return;
        }
        if (stock === "" || stock === null || stock === undefined) {
            mostrarNotificacion("El stock es obligatorio", "danger");
            return;
        }
        if (!punto_reorden && punto_reorden !== 0) {
            mostrarNotificacion("El punto de reorden es obligatorio", "danger");
            return;
        }
        if (!pasillo) {
            mostrarNotificacion("El pasillo es obligatorio", "danger");
            return;
        }
        if (!estante) {
            mostrarNotificacion("El estante es obligatorio", "danger");
            return;
        }
        if (!nivel) {
            mostrarNotificacion("El nivel es obligatorio", "danger");
            return;
        }

        const data = { nombre, categoria_id, precio_unitario: precio, stock: parseInt(stock, 10), codigo, punto_reorden: parseInt(punto_reorden, 10), pasillo, estante, nivel };
        const method = editMode ? 'PUT' : 'POST';
        const url = editMode ? `/api/productos/${editId}` : '/api/productos';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                credentials: 'include'
            });

            if (res.ok) {
                resetForm();
                renderTable();
                mostrarNotificacion(
                    editMode ? 'Producto actualizado exitosamente' : 'Producto guardado exitosamente',
                    'success'
                );
            } else {
                const error = await res.json();
                mostrarNotificacion(error.error || 'Error al guardar el producto', 'danger');
            }
        } catch (err) {
            console.error("Error al guardar:", err);
            mostrarNotificacion('Error al guardar el producto', 'danger');
        }
    });

    // FORMULARIO DE SUCURSALES
    const sucursalForm = document.getElementById('sucursal-form');
    if (sucursalForm) {
        sucursalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nombre_sucursal = document.getElementById('nombre-sucursal').value.trim();
            const ciudad = document.getElementById('ciudad-sucursal').value.trim();
            const estado = document.getElementById('estado-sucursal').value.trim();
            const region = document.getElementById('region-sucursal').value;

            if (!nombre_sucursal || !ciudad || !estado || !region) {
                mostrarNotificacion("Todos los campos son obligatorios", "danger");
                return;
            }

            const data = { nombre_sucursal, ciudad, estado, region };
            const method = editModeSucursal ? 'PUT' : 'POST';
            const url = editModeSucursal ? `/api/sucursales/${editIdSucursal}` : '/api/sucursales';

            try {
                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                    credentials: 'include'
                });

                if (res.ok) {
                    resetSucursalForm();
                    renderSucursalesTable();
                    mostrarNotificacion(
                        editModeSucursal ? 'Sucursal actualizada exitosamente' : 'Sucursal creada exitosamente',
                        'success'
                    );
                } else {
                    const error = await res.json();
                    mostrarNotificacion(error.error || 'Error al guardar la sucursal', 'danger');
                }
            } catch (err) {
                console.error("Error al guardar sucursal:", err);
                mostrarNotificacion('Error al guardar la sucursal', 'danger');
            }
        });
    }

    // FORMULARIO DE CATEGORÍAS
    const categoriaForm = document.getElementById('categoria-form');
    if (categoriaForm) {
        categoriaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nombre = document.getElementById('nombre-categoria').value.trim();

            if (!nombre) {
                mostrarNotificacion("El nombre es obligatorio", "danger");
                return;
            }

            const data = { nombre };
            const method = editModeCategoria ? 'PUT' : 'POST';
            const url = editModeCategoria ? `/api/categorias/${editIdCategoria}` : '/api/categorias';

            try {
                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                    credentials: 'include'
                });

                if (res.ok) {
                    resetCategoriaForm();
                    renderCategoriasTable();
                    loadCategoriasSelect();
                    mostrarNotificacion(
                        editModeCategoria ? 'Categoría actualizada exitosamente' : 'Categoría creada exitosamente',
                        'success'
                    );
                } else {
                    const error = await res.json();
                    mostrarNotificacion(error.error || 'Error al guardar la categoría', 'danger');
                }
            } catch (err) {
                console.error("Error al guardar categoría:", err);
                mostrarNotificacion('Error al guardar la categoría', 'danger');
            }
        });
    }

    // FORMULARIO MOVIMIENTOS
    const movimientoForm = document.getElementById('movimiento-form');
    if (movimientoForm) {
        movimientoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const producto_id = document.getElementById('mov-producto').value;
            const tipo = document.getElementById('mov-tipo').value;
            const cantidad = parseInt(document.getElementById('mov-cantidad').value, 10);
            const observaciones = document.getElementById('mov-observaciones').value.trim();
            if (!producto_id) {
                mostrarNotificacion('Debe seleccionar un producto', 'danger');
                return;
            }
            if (!tipo) {
                mostrarNotificacion('Debe seleccionar el tipo de movimiento', 'danger');
                return;
            }
            if (!cantidad || cantidad < 1) {
                mostrarNotificacion('La cantidad es obligatoria y debe ser mayor a 0', 'danger');
                return;
            }
            if (!observaciones) {
                mostrarNotificacion('Las observaciones son obligatorias', 'danger');
                return;
            }
            try {
                const res = await fetch('/api/movimientos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ producto_id: parseInt(producto_id, 10), tipo, cantidad, observaciones }),
                    credentials: 'include'
                });
                const data = await res.json();
                if (res.ok) {
                    mostrarNotificacion(data.message || 'Movimiento registrado', 'success');
                    movimientoForm.reset();
                    loadMovimientos();
                    loadDashboardMetricas();
                } else {
                    mostrarNotificacion(data.error || 'Error', 'danger');
                }
            } catch (err) {
                mostrarNotificacion('Error al registrar movimiento', 'danger');
            }
        });
    }

    // FORMULARIO PEDIDOS
    const pedidoForm = document.getElementById('pedido-form');
    if (pedidoForm) {
        pedidoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const producto_id = document.getElementById('pedido-producto').value;
            const cantidad_solicitada = parseInt(document.getElementById('pedido-cantidad').value, 10);
            const prioridad = document.getElementById('pedido-prioridad').value;
            const cliente_ref = document.getElementById('pedido-cliente').value.trim();
            if (!producto_id) {
                mostrarNotificacion('Debe seleccionar un producto', 'danger');
                return;
            }
            if (!cantidad_solicitada || cantidad_solicitada < 1) {
                mostrarNotificacion('La cantidad solicitada es obligatoria y debe ser mayor a 0', 'danger');
                return;
            }
            if (prioridad === '' || prioridad === null || prioridad === undefined) {
                mostrarNotificacion('La prioridad es obligatoria', 'danger');
                return;
            }
            if (!cliente_ref) {
                mostrarNotificacion('Cliente / Referencia es obligatorio', 'danger');
                return;
            }
            try {
                const res = await fetch('/api/pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ producto_id: parseInt(producto_id, 10), cantidad_solicitada, prioridad: parseInt(prioridad, 10), cliente_ref }),
                    credentials: 'include'
                });
                const data = await res.json();
                if (res.ok) {
                    mostrarNotificacion('Pedido creado', 'success');
                    pedidoForm.reset();
                    loadPedidos();
                    loadDashboardMetricas();
                } else {
                    mostrarNotificacion(data.error || 'Error', 'danger');
                }
            } catch (err) {
                mostrarNotificacion('Error al crear pedido', 'danger');
            }
        });
    }
});