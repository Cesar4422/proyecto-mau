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
    
    if (section === 'crud') {
        document.getElementById('crud-section').style.display = 'block';
        navItems[0].classList.add('active');
        renderTable();
    } else if (section === 'dashboard') {
        document.getElementById('dashboard-section').style.display = 'block';
        navItems[1].classList.add('active');
        loadDashboardData();
        loadAlertasBajoStock();
        loadProductosEstrella();
    } else if (section === 'sucursales') {
        document.getElementById('sucursales-section').style.display = 'block';
        navItems[2].classList.add('active');
        renderSucursalesTable();
    } else if (section === 'categorias') {
        document.getElementById('categorias-section').style.display = 'block';
        navItems[3].classList.add('active');
        renderCategoriasTable();
    } else if (section === 'analisis-temporal') {
        document.getElementById('analisis-temporal-section').style.display = 'block';
        navItems[4].classList.add('active');
        // Cargar análisis temporal por defecto (mes)
        setTimeout(() => {
            loadAnalisisTemporal('mes');
        }, 100);
    }
}

// ================================
// Funciones CRUD (Backend Real)
// ================================

async function renderTable() {
    try {
        const response = await fetch('/api/productos', {
            credentials: 'include'
        });
        const productos = await response.json();
        
        const tbody = document.querySelector('#product-table tbody');
        tbody.innerHTML = '';
        
        if (productos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
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

        productos.forEach(p => {
            // Obtener nombre de la categoría
            const categoriaNombre = p.categoria_nombre || 'Sin categoría';
            
            // Asignar color según la categoría
            const categoriaColores = {
                'Electrónica': { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
                'Hogar': { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' },
                'Línea Blanca': { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
                'Muebles': { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' },
                'Deportes': { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },
                'Juguetería': { bg: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' },
                'Ferretería': { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' },
                'Videojuegos': { bg: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' },
                'Papelería': { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' },
                'Automotriz': { bg: 'rgba(20, 184, 166, 0.1)', color: '#14b8a6' },
                'Mascotas': { bg: 'rgba(251, 146, 60, 0.1)', color: '#fb923c' },
                'Zapatería': { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }
            };
            
            const catStyle = categoriaColores[categoriaNombre] || { bg: 'rgba(156, 163, 175, 0.1)', color: '#9ca3af' };
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>#${p.id}</strong></td>
                    <td>${p.nombre}</td>
                    <td>
                        <span style="
                            background: ${catStyle.bg};
                            color: ${catStyle.color};
                            padding: 0.375rem 0.75rem;
                            border-radius: 6px;
                            font-size: 0.875rem;
                            font-weight: 500;
                        ">${categoriaNombre}</span>
                    </td>
                    <td><strong>$${parseFloat(p.precio_unitario).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></td>
                    <td>
                        <span style="
                            background: ${(p.stock || 0) < 5 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'};
                            color: ${(p.stock || 0) < 5 ? '#ef4444' : '#10b981'};
                            padding: 0.375rem 0.75rem;
                            border-radius: 6px;
                            font-size: 0.875rem;
                            font-weight: 600;
                        ">${p.stock || 0}</span>
                    </td>
                    <td>
                        <button class="btn-edit" onclick="prepareEdit(${p.id}, '${p.nombre.replace(/'/g, "\\'")}', ${p.categoria_id}, ${p.precio_unitario}, ${p.stock || 0})">
                            <svg style="width: 14px; height: 14px; display: inline; vertical-align: middle; margin-right: 4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Editar
                        </button>
                        <button class="btn-delete" onclick="deleteProduct(${p.id})">
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
        console.error("Error al renderizar tabla:", err);
        mostrarNotificacion('Error al cargar los productos', 'danger');
    }
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
                'Norte': '#3b82f6',
                'Sur': '#ef4444',
                'Centro': '#10b981',
                'Occidente': '#f59e0b',
                'Oriente': '#8b5cf6'
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
        const response = await fetch('/api/categorias', {
            credentials: 'include'
        });
        const categorias = await response.json();
        
        const select = document.getElementById('categoria');
        if (select) {
            select.innerHTML = '<option value="">Selecciona una categoría</option>';
            categorias.forEach(c => {
                select.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
            });
        }
    } catch (err) {
        console.error("Error al cargar categorías:", err);
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
                border-left: 4px solid #ef4444;
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
                        background: #ef4444;
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
            const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
            
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
                            <div style="font-weight: 600; color: #10b981;">
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
                        <div style="font-size: 1.5rem; font-weight: 700; color: #10b981;">
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
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: 'rgba(59, 130, 246, 1)',
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
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)'
                    ],
                    borderColor: [
                        'rgba(59, 130, 246, 1)',
                        'rgba(139, 92, 246, 1)',
                        'rgba(16, 185, 129, 1)'
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
                    backgroundColor: 'rgba(139, 92, 246, 0.8)',
                    borderColor: 'rgba(139, 92, 246, 1)',
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
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(239, 68, 68, 0.8)'
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
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: 'rgba(59, 130, 246, 1)'
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
                        'rgba(59, 130, 246, 0.6)',
                        'rgba(139, 92, 246, 0.6)',
                        'rgba(16, 185, 129, 0.6)',
                        'rgba(245, 158, 11, 0.6)'
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
                            color: ${item.categoria === 'Electrónica' ? 'var(--primary)' : 'var(--purple)'};
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
            if (userNameElement) {
                userNameElement.textContent = user.nombre;
            }
            
            const userEmailElement = document.getElementById('user-email');
            if (userEmailElement) {
                userEmailElement.textContent = user.email;
            }
            
            const userInitialElement = document.getElementById('user-initial');
            if (userInitialElement) {
                userInitialElement.textContent = user.nombre.charAt(0).toUpperCase();
            }
        } else {
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Error actualizando info de usuario:', error);
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
    updateUserInfo();
    renderTable();
    loadCategoriasSelect();
    
    // FORMULARIO DE PRODUCTOS
    document.getElementById('product-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nombre = document.getElementById('nombre').value.trim();
        const categoria_id = document.getElementById('categoria').value;
        const precio = document.getElementById('precio').value;
        const stock = document.getElementById('stock').value || 0;

        if (nombre === "" || precio === "" || categoria_id === "") {
            mostrarNotificacion("Todos los campos son obligatorios", "danger");
            return;
        }

        if (parseFloat(precio) < 0) {
            mostrarNotificacion("El precio debe ser un valor positivo", "danger");
            return;
        }

        const data = { nombre, categoria_id, precio_unitario: precio, stock: parseInt(stock) };
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
});