// ============================================
// FUNCIONES DE EXPORTACIÓN DE REPORTES
// ============================================

// Variable global para almacenar los datos actuales del dashboard
let datosGlobalesDashboard = {
    estadisticas: {},
    ventasPorCategoria: [],
    topProductos: [],
    sucursales: [],
    tendenciaMensual: [],
    analisisDetallado: []
};

// Función para mostrar overlay de carga
function mostrarLoadingExport(mensaje = 'Generando reporte...') {
    const overlay = document.createElement('div');
    overlay.className = 'export-loading';
    overlay.id = 'export-loading';
    overlay.innerHTML = `
        <div class="export-loading-content">
            <div class="export-spinner"></div>
            <h3 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">${mensaje}</h3>
            <p style="margin: 0; color: var(--text-secondary);">Por favor espera...</p>
        </div>
    `;
    document.body.appendChild(overlay);
}

function ocultarLoadingExport() {
    const overlay = document.getElementById('export-loading');
    if (overlay) {
        overlay.remove();
    }
}

// ============================================
// EXPORTAR A PDF CON GRÁFICAS
// ============================================
async function exportarPDF() {
    try {
        mostrarLoadingExport('Generando PDF con gráficas...');
        
        await cargarDatosParaExport();
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
            putOnlyUsedFonts: true
        });
        
        let yPos = 20;
        const pageWidth = doc.internal.pageSize.width;
        const margin = 14;
        
        // ===== PÁGINA 1: PORTADA Y KPIs =====
        // Se eliminan símbolos especiales del título para evitar errores de encoding (Ø=ÜÊ)
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.text('Reporte Dashboard OLAP', margin, 25);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, margin, 33);
        
        yPos = 50;
        
        // KPIs Principales
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text('KPIs Principales', margin, yPos);
        
        yPos += 10;
        const stats = datosGlobalesDashboard.estadisticas;
        const kpis = [
            ['Total Ventas', `$${parseFloat(stats.total_ventas || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}`],
            ['Unidades Vendidas', (stats.total_unidades || 0).toLocaleString('es-MX')],
            ['Promedio Transaccion', `$${parseFloat(stats.promedio_transaccion || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}`],
            ['Numero Transacciones', (stats.num_transacciones || 0).toLocaleString('es-MX')],
            ['Productos Unicos', stats.productos_vendidos || 0],
            ['Sucursales Activas', stats.sucursales_activas || 0]
        ];
        
        doc.autoTable({
            startY: yPos,
            head: [['Metrica', 'Valor']],
            body: kpis,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
            styles: { font: 'helvetica' },
            margin: { left: margin, right: margin }
        });
        
        yPos = doc.lastAutoTable.finalY + 15;
        
        // Gráfica 1: Ventas por Categoría
        if (yPos > 200) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text('Ventas por Categoria', margin, yPos);
        yPos += 5;
        
        const ventasCanvas = document.getElementById('ventasChart');
        if (ventasCanvas) {
            const ventasImg = ventasCanvas.toDataURL('image/png');
            doc.addImage(ventasImg, 'PNG', margin, yPos, pageWidth - margin * 2, 80);
            yPos += 85;
        }
        
        // ===== PÁGINA 2: TOP PRODUCTOS Y SUCURSALES =====
        doc.addPage();
        yPos = 20;
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text('Top 5 Productos Mas Vendidos', margin, yPos);
        yPos += 5;
        
        const topProductosCanvas = document.getElementById('topProductosChart');
        if (topProductosCanvas) {
            const topProdImg = topProductosCanvas.toDataURL('image/png');
            doc.addImage(topProdImg, 'PNG', margin, yPos, 90, 60);
        }
        
        doc.text('Ranking de Sucursales', 115, 20);
        const sucursalesCanvas = document.getElementById('sucursalesChart');
        if (sucursalesCanvas) {
            const sucImg = sucursalesCanvas.toDataURL('image/png');
            doc.addImage(sucImg, 'PNG', 115, 25, 80, 60);
        }
        
        yPos = 95;
        
        // Tabla Top Productos
        const topProductosData = datosGlobalesDashboard.topProductos.slice(0, 5).map((item, idx) => [
            idx + 1,
            item.producto,
            item.categoria,
            `$${parseFloat(item.total_ventas).toLocaleString('es-MX', {minimumFractionDigits: 2})}`,
            item.total_unidades
        ]);
        
        doc.autoTable({
            startY: yPos,
            head: [['#', 'Producto', 'Categoria', 'Ventas', 'Unidades']],
            body: topProductosData,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] },
            styles: { font: 'helvetica', fontSize: 8 },
            margin: { left: margin, right: margin }
        });
        
        // ===== PÁGINA 3: TENDENCIA MENSUAL =====
        doc.addPage();
        yPos = 20;
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text('Tendencia de Ventas Mensual', margin, yPos);
        yPos += 5;
        
        const tendenciaCanvas = document.getElementById('tendenciaChart');
        if (tendenciaCanvas) {
            const tendImg = tendenciaCanvas.toDataURL('image/png');
            doc.addImage(tendImg, 'PNG', margin, yPos, pageWidth - margin * 2, 80);
            yPos += 85;
        }
        
        // ===== PÁGINA 4: ANÁLISIS POR REGIÓN =====
        if (yPos > 200) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text('Analisis por Region Geografica', margin, yPos);
        yPos += 5;
        
        const regionCanvas = document.getElementById('regionChart');
        if (regionCanvas) {
            const regImg = regionCanvas.toDataURL('image/png');
            doc.addImage(regImg, 'PNG', margin, yPos, pageWidth - margin * 2, 80);
        }
        
        // ===== PÁGINA 5: RANKING DE SUCURSALES =====
        doc.addPage();
        yPos = 20;
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text('Ranking Completo de Sucursales', margin, yPos);
        yPos += 5;
        
        const sucursalesData = datosGlobalesDashboard.sucursales.map((item, idx) => [
            idx + 1,
            item.nombre_sucursal,
            item.ciudad,
            item.region,
            `$${parseFloat(item.total_ventas).toLocaleString('es-MX', {minimumFractionDigits: 2})}`,
            item.num_transacciones
        ]);
        
        doc.autoTable({
            startY: yPos,
            head: [['#', 'Sucursal', 'Ciudad', 'Region', 'Ventas', 'Trans.']],
            body: sucursalesData,
            theme: 'grid',
            headStyles: { fillColor: [245, 158, 11] },
            styles: { font: 'helvetica', fontSize: 8 },
            margin: { left: margin, right: margin }
        });
        
        // Pie de página en todas las páginas
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(
                `Pagina ${i} de ${pageCount} | Sistema DW - Metodologia Kimball`,
                pageWidth / 2,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            );
        }
        
        doc.save(`Dashboard_OLAP_${new Date().toISOString().split('T')[0]}.pdf`);
        
        ocultarLoadingExport();
        mostrarNotificacion('✅ PDF con gráficas descargado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error al exportar PDF:', error);
        ocultarLoadingExport();
        mostrarNotificacion('❌ Error al generar PDF', 'danger');
    }
}

// ============================================
// EXPORTAR A HTML CON GRÁFICAS
// ============================================
async function exportarHTML() {
    try {
        mostrarLoadingExport('Generando HTML con gráficas...');
        
        await cargarDatosParaExport();
        
        const stats = datosGlobalesDashboard.estadisticas;
        
        const ventasImg = document.getElementById('ventasChart')?.toDataURL('image/png') || '';
        const topProdImg = document.getElementById('topProductosChart')?.toDataURL('image/png') || '';
        const sucImg = document.getElementById('sucursalesChart')?.toDataURL('image/png') || '';
        const tendImg = document.getElementById('tendenciaChart')?.toDataURL('image/png') || '';
        const regImg = document.getElementById('regionChart')?.toDataURL('image/png') || '';
        
        let html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard OLAP - Reporte Completo</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; padding: 2rem; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 2rem; border-radius: 8px; margin-bottom: 2rem; }
        h1 { font-size: 2rem; margin-bottom: 0.5rem; }
        h2 { color: #111827; margin: 2rem 0 1rem 0; font-size: 1.5rem; padding-left: 0.5rem; border-left: 4px solid #3b82f6; }
        .subtitle { opacity: 0.9; }
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .kpi-card { background: #f3f4f6; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #3b82f6; }
        .kpi-label { font-size: 0.875rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
        .kpi-value { font-size: 1.875rem; font-weight: 700; color: #111827; margin-top: 0.5rem; }
        .chart-container { background: #f9fafb; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; }
        .chart-container img { width: 100%; height: auto; border-radius: 4px; }
        .chart-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
        th { background: #3b82f6; color: white; padding: 1rem; text-align: left; font-weight: 600; }
        td { padding: 0.75rem 1rem; border-bottom: 1px solid #e5e7eb; }
        tr:hover { background: #f9fafb; }
        .footer { text-align: center; color: #6b7280; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Dashboard OLAP - Reporte Completo</h1>
            <p class="subtitle">Generado: ${new Date().toLocaleString('es-MX')}</p>
            <p class="subtitle">Sistema ROLAP - Metodología Kimball</p>
        </div>
        
        <h2>📈 KPIs Principales</h2>
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-label">Total Ventas</div>
                <div class="kpi-value">$${parseFloat(stats.total_ventas || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Unidades Vendidas</div>
                <div class="kpi-value">${(stats.total_unidades || 0).toLocaleString('es-MX')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Promedio Transacción</div>
                <div class="kpi-value">$${parseFloat(stats.promedio_transaccion || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Transacciones</div>
                <div class="kpi-value">${(stats.num_transacciones || 0).toLocaleString('es-MX')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Productos Únicos</div>
                <div class="kpi-value">${stats.productos_vendidos || 0}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Sucursales Activas</div>
                <div class="kpi-value">${stats.sucursales_activas || 0}</div>
            </div>
        </div>
        
        <h2>📊 Ventas por Categoría</h2>
        <div class="chart-container">
            <img src="${ventasImg}" alt="Ventas por Categoría">
        </div>
        
        <h2>🏆 Análisis de Productos y Sucursales</h2>
        <div class="chart-grid">
            <div class="chart-container">
                <h3 style="margin-bottom: 1rem; color: #374151;">Top 5 Productos Más Vendidos</h3>
                <img src="${topProdImg}" alt="Top Productos">
            </div>
            <div class="chart-container">
                <h3 style="margin-bottom: 1rem; color: #374151;">Ranking de Sucursales</h3>
                <img src="${sucImg}" alt="Sucursales">
            </div>
        </div>
        
        <h2>📈 Tendencia de Ventas Mensual</h2>
        <div class="chart-container">
            <img src="${tendImg}" alt="Tendencia Mensual">
        </div>
        
        <h2>🌍 Análisis por Región Geográfica</h2>
        <div class="chart-container">
            <img src="${regImg}" alt="Análisis Regional">
        </div>
        
        <h2>📋 Top 10 Productos Detallado</h2>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Total Ventas</th>
                    <th>Unidades</th>
                </tr>
            </thead>
            <tbody>
                ${datosGlobalesDashboard.topProductos.slice(0, 10).map((item, idx) => `
                    <tr>
                        <td><strong>${idx + 1}</strong></td>
                        <td>${item.producto}</td>
                        <td>${item.categoria}</td>
                        <td>$${parseFloat(item.total_ventas).toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                        <td>${item.total_unidades}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <h2>🏪 Ranking Completo de Sucursales</h2>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Sucursal</th>
                    <th>Ciudad</th>
                    <th>Región</th>
                    <th>Total Ventas</th>
                </tr>
            </thead>
            <tbody>
                ${datosGlobalesDashboard.sucursales.map((item, idx) => `
                    <tr>
                        <td><strong>${idx + 1}</strong></td>
                        <td>${item.nombre_sucursal}</td>
                        <td>${item.ciudad}</td>
                        <td>${item.region}</td>
                        <td>$${parseFloat(item.total_ventas).toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="footer">
            <p><strong>Sistema de Data Warehouse - Metodología Kimball</strong></p>
            <p>Arquitectura ROLAP con PostgreSQL</p>
            <p style="margin-top: 0.5rem;">Incluye análisis multidimensional con operaciones OLAP</p>
        </div>
    </div>
</body>
</html>
        `;
        
        const blob = new Blob([html], { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Dashboard_OLAP_${new Date().toISOString().split('T')[0]}.html`;
        link.click();
        
        ocultarLoadingExport();
        mostrarNotificacion('✅ HTML con gráficas descargado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error al exportar HTML:', error);
        ocultarLoadingExport();
        mostrarNotificacion('❌ Error al generar HTML', 'danger');
    }
}

// ============================================
// EXPORTAR A EXCEL
// ============================================
async function exportarExcel() {
    try {
        mostrarLoadingExport('Generando Excel...');
        
        await cargarDatosParaExport();
        
        const wb = XLSX.utils.book_new();
        
        const stats = datosGlobalesDashboard.estadisticas;
        const kpisData = [
            ['DASHBOARD OLAP - REPORTE COMPLETO'],
            [`Fecha: ${new Date().toLocaleString('es-MX')}`],
            [],
            ['Métrica', 'Valor'],
            ['Total Ventas', parseFloat(stats.total_ventas || 0)],
            ['Unidades Vendidas', stats.total_unidades || 0],
            ['Promedio por Transacción', parseFloat(stats.promedio_transaccion || 0)],
            ['Número de Transacciones', stats.num_transacciones || 0],
            ['Productos Únicos', stats.productos_vendidos || 0],
            ['Sucursales Activas', stats.sucursales_activas || 0]
        ];
        const wsKPIs = XLSX.utils.aoa_to_sheet(kpisData);
        wsKPIs['!cols'] = [{ wch: 30 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsKPIs, 'KPIs');
        
        const ventasData = [
            ['Categoría', 'Total Ventas', 'Unidades'],
            ...datosGlobalesDashboard.ventasPorCategoria.map(item => [
                item.categoria,
                parseFloat(item.total),
                parseInt(item.unidades)
            ])
        ];
        const wsVentas = XLSX.utils.aoa_to_sheet(ventasData);
        XLSX.utils.book_append_sheet(wb, wsVentas, 'Ventas por Categoría');
        
        const topProductosData = [
            ['Ranking', 'Producto', 'Categoría', 'Total Ventas', 'Unidades', 'Transacciones'],
            ...datosGlobalesDashboard.topProductos.map((item, idx) => [
                idx + 1,
                item.producto,
                item.categoria,
                parseFloat(item.total_ventas),
                parseInt(item.total_unidades),
                parseInt(item.num_transacciones)
            ])
        ];
        const wsTopProductos = XLSX.utils.aoa_to_sheet(topProductosData);
        XLSX.utils.book_append_sheet(wb, wsTopProductos, 'Top Productos');
        
        const sucursalesData = [
            ['Ranking', 'Sucursal', 'Ciudad', 'Región', 'Total Ventas', 'Unidades', 'Transacciones'],
            ...datosGlobalesDashboard.sucursales.map((item, idx) => [
                idx + 1,
                item.nombre_sucursal,
                item.ciudad,
                item.region,
                parseFloat(item.total_ventas),
                parseInt(item.total_unidades),
                parseInt(item.num_transacciones)
            ])
        ];
        const wsSucursales = XLSX.utils.aoa_to_sheet(sucursalesData);
        XLSX.utils.book_append_sheet(wb, wsSucursales, 'Sucursales');
        
        const tendenciaData = [
            ['Mes', 'Total Ventas', 'Crecimiento %'],
            ...datosGlobalesDashboard.tendenciaMensual.map(item => [
                item.nombre_mes,
                parseFloat(item.total_ventas),
                item.crecimiento_porcentual || 'N/A'
            ])
        ];
        const wsTendencia = XLSX.utils.aoa_to_sheet(tendenciaData);
        XLSX.utils.book_append_sheet(wb, wsTendencia, 'Tendencia Mensual');
        
        XLSX.writeFile(wb, `Dashboard_OLAP_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        ocultarLoadingExport();
        mostrarNotificacion('✅ Excel descargado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error al exportar Excel:', error);
        ocultarLoadingExport();
        mostrarNotificacion('❌ Error al generar Excel', 'danger');
    }
}

// ============================================
// EXPORTAR A CSV
// ============================================
async function exportarCSV() {
    try {
        mostrarLoadingExport('Generando CSV...');
        
        await cargarDatosParaExport();
        
        let csv = 'DASHBOARD OLAP - REPORTE COMPLETO\n';
        csv += `Generado: ${new Date().toLocaleString('es-MX')}\n\n`;
        
        csv += 'KPIS PRINCIPALES\n';
        csv += 'Métrica,Valor\n';
        const stats = datosGlobalesDashboard.estadisticas;
        csv += `Total Ventas,$${parseFloat(stats.total_ventas || 0).toFixed(2)}\n`;
        csv += `Unidades Vendidas,${stats.total_unidades || 0}\n`;
        csv += `Promedio Transacción,$${parseFloat(stats.promedio_transaccion || 0).toFixed(2)}\n`;
        csv += `Número Transacciones,${stats.num_transacciones || 0}\n`;
        csv += `Productos Únicos,${stats.productos_vendidos || 0}\n`;
        csv += `Sucursales Activas,${stats.sucursales_activas || 0}\n\n`;
        
        csv += 'VENTAS POR CATEGORIA\n';
        csv += 'Categoría,Total Ventas,Unidades\n';
        datosGlobalesDashboard.ventasPorCategoria.forEach(item => {
            csv += `${item.categoria},$${parseFloat(item.total).toFixed(2)},${item.unidades}\n`;
        });
        csv += '\n';
        
        csv += 'TOP PRODUCTOS\n';
        csv += 'Ranking,Producto,Categoría,Total Ventas,Unidades,Transacciones\n';
        datosGlobalesDashboard.topProductos.forEach((item, idx) => {
            csv += `${idx + 1},"${item.producto}","${item.categoria}",$${parseFloat(item.total_ventas).toFixed(2)},${item.total_unidades},${item.num_transacciones}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `Dashboard_OLAP_${new Date().toISOString().split('T')[0]}.csv`);
        
        ocultarLoadingExport();
        mostrarNotificacion('✅ CSV descargado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error al exportar CSV:', error);
        ocultarLoadingExport();
        mostrarNotificacion('❌ Error al generar CSV', 'danger');
    }
}

// ============================================
// EXPORTAR A JSON
// ============================================
async function exportarJSON() {
    try {
        mostrarLoadingExport('Generando JSON...');
        
        await cargarDatosParaExport();
        
        const reporte = {
            metadata: {
                titulo: 'Dashboard OLAP - Reporte Completo',
                fecha_generacion: new Date().toISOString(),
                sistema: 'ROLAP - Metodología Kimball'
            },
            kpis: datosGlobalesDashboard.estadisticas,
            ventas_por_categoria: datosGlobalesDashboard.ventasPorCategoria,
            top_productos: datosGlobalesDashboard.topProductos,
            sucursales: datosGlobalesDashboard.sucursales,
            tendencia_mensual: datosGlobalesDashboard.tendenciaMensual
        };
        
        const blob = new Blob([JSON.stringify(reporte, null, 2)], { type: 'application/json' });
        saveAs(blob, `Dashboard_OLAP_${new Date().toISOString().split('T')[0]}.json`);
        
        ocultarLoadingExport();
        mostrarNotificacion('✅ JSON descargado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error al exportar JSON:', error);
        ocultarLoadingExport();
        mostrarNotificacion('❌ Error al generar JSON', 'danger');
    }
}

// ============================================
// FUNCIÓN AUXILIAR PARA CARGAR DATOS
// ============================================
async function cargarDatosParaExport() {
    try {
        const statsResponse = await fetch('/api/olap/kpi/estadisticas', { credentials: 'include' });
        datosGlobalesDashboard.estadisticas = await statsResponse.json();
        
        const ventasResponse = await fetch('/api/olap/ventas', { credentials: 'include' });
        datosGlobalesDashboard.ventasPorCategoria = await ventasResponse.json();
        
        const topProductosResponse = await fetch('/api/olap/kpi/top-productos?limit=10', { credentials: 'include' });
        datosGlobalesDashboard.topProductos = await topProductosResponse.json();
        
        const sucursalesResponse = await fetch('/api/olap/kpi/ranking-sucursales', { credentials: 'include' });
        datosGlobalesDashboard.sucursales = await sucursalesResponse.json();
        
        const tendenciaResponse = await fetch('/api/olap/kpi/tendencia-mensual?anio=2024', { credentials: 'include' });
        datosGlobalesDashboard.tendenciaMensual = await tendenciaResponse.json();
        
    } catch (error) {
        console.error('Error al cargar datos para export:', error);
        throw error;
    }
}

// ============================================
// EXPORTACIONES ANÁLISIS TEMPORAL
// ============================================

let nivelTemporalActual = 'mes';

function obtenerDatosTemporales() {
    if (typeof analisisTemporalChart === 'undefined' || !analisisTemporalChart || !analisisTemporalChart.data) {
        mostrarNotificacion('No hay datos para exportar', 'danger');
        return null;
    }
    
    const labels = analisisTemporalChart.data.labels;
    const valores = analisisTemporalChart.data.datasets[0].data;
    
    return labels.map((label, index) => ({
        periodo: label,
        ventas: valores[index]
    }));
}

async function exportarTemporalPDF() {
    mostrarLoadingExport('Generando PDF con gráfica...');
    
    try {
        const datos = obtenerDatosTemporales();
        if (!datos) {
            ocultarLoadingExport();
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(59, 130, 246);
        doc.text('Analisis Temporal Avanzado', 14, 20);
        
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "normal");
        doc.text(`Nivel: ${nivelTemporalActual.toUpperCase()}`, 14, 28);
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 14, 34);
        
        const canvas = document.getElementById('analisisTemporalChart');
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 14, 45, 180, 90);
        
        const tableData = datos.map(row => [
            row.periodo,
            `$${parseFloat(row.ventas).toLocaleString('es-MX', {minimumFractionDigits: 2})}`
        ]);
        
        doc.autoTable({
            startY: 145,
            head: [['Periodo', 'Ventas']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] },
            styles: { font: 'helvetica' }
        });
        
        const total = datos.reduce((sum, row) => sum + parseFloat(row.ventas), 0);
        doc.text(`Total: $${total.toLocaleString('es-MX', {minimumFractionDigits: 2})}`, 14, doc.lastAutoTable.finalY + 10);
        
        doc.save(`analisis_temporal_${nivelTemporalActual}_${Date.now()}.pdf`);
        ocultarLoadingExport();
        mostrarNotificacion('✅ PDF generado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        ocultarLoadingExport();
        mostrarNotificacion('❌ Error al generar PDF', 'danger');
    }
}

async function exportarTemporalExcel() {
    mostrarLoadingExport('Generando Excel...');
    
    try {
        const datos = obtenerDatosTemporales();
        if (!datos) {
            ocultarLoadingExport();
            return;
        }
        
        const ws_data = [
            ['ANÁLISIS TEMPORAL AVANZADO'],
            [`Nivel: ${nivelTemporalActual.toUpperCase()}`],
            [`Fecha: ${new Date().toLocaleDateString('es-MX')}`],
            [],
            ['Periodo', 'Ventas']
        ];
        
        datos.forEach(row => {
            ws_data.push([row.periodo, parseFloat(row.ventas)]);
        });
        
        const total = datos.reduce((sum, row) => sum + parseFloat(row.ventas), 0);
        ws_data.push([]);
        ws_data.push(['TOTAL', total]);
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        ws['!cols'] = [{ wch: 25 }, { wch: 20 }];
        
        XLSX.utils.book_append_sheet(wb, ws, 'Análisis Temporal');
        XLSX.writeFile(wb, `analisis_temporal_${nivelTemporalActual}_${Date.now()}.xlsx`);
        
        ocultarLoadingExport();
        mostrarNotificacion('✅ Excel generado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        ocultarLoadingExport();
        mostrarNotificacion('❌ Error al generar Excel', 'danger');
    }
}

function exportarTemporalCSV() {
    mostrarLoadingExport('Generando CSV...');
    
    try {
        const datos = obtenerDatosTemporales();
        if (!datos) {
            ocultarLoadingExport();
            return;
        }
        
        let csv = 'Periodo,Ventas\n';
        datos.forEach(row => {
            csv += `"${row.periodo}",${row.ventas}\n`;
        });
        
        const total = datos.reduce((sum, row) => sum + parseFloat(row.ventas), 0);
        csv += `\nTOTAL,${total}`;
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `analisis_temporal_${nivelTemporalActual}_${Date.now()}.csv`);
        
        ocultarLoadingExport();
        mostrarNotificacion('✅ CSV generado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        ocultarLoadingExport();
        mostrarNotificacion('❌ Error al generar CSV', 'danger');
    }
}

function exportarTemporalJSON() {
    mostrarLoadingExport('Generando JSON...');
    
    try {
        const datos = obtenerDatosTemporales();
        if (!datos) {
            ocultarLoadingExport();
            return;
        }
        
        const total = datos.reduce((sum, row) => sum + parseFloat(row.ventas), 0);
        
        const jsonData = {
            titulo: 'Análisis Temporal Avanzado',
            nivel: nivelTemporalActual,
            fecha_exportacion: new Date().toISOString(),
            datos: datos,
            resumen: {
                total_ventas: total,
                periodos: datos.length
            }
        };
        
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        saveAs(blob, `analisis_temporal_${nivelTemporalActual}_${Date.now()}.json`);
        
        ocultarLoadingExport();
        mostrarNotificacion('✅ JSON generado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        ocultarLoadingExport();
        mostrarNotificacion('❌ Error al generar JSON', 'danger');
    }
}

async function exportarTemporalHTML() {
    mostrarLoadingExport('Generando HTML...');
    
    try {
        const datos = obtenerDatosTemporales();
        if (!datos) {
            ocultarLoadingExport();
            return;
        }
        
        const canvas = document.getElementById('analisisTemporalChart');
        const imgData = canvas.toDataURL('image/png');
        const total = datos.reduce((sum, row) => sum + parseFloat(row.ventas), 0);
        
        let html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Análisis Temporal - ${nivelTemporalActual.toUpperCase()}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f9fafb; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
        .chart-container { background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .chart-container img { width: 100%; height: auto; }
        table { width: 100%; background: white; border-collapse: collapse; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        th { background: #3b82f6; color: white; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
        tr:hover { background: #f9fafb; }
        .total { background: #f0f9ff; padding: 20px; border-radius: 12px; margin-top: 20px; text-align: center; }
        .total-value { font-size: 32px; font-weight: bold; color: #3b82f6; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📈 Análisis Temporal Avanzado</h1>
        <p>Nivel: ${nivelTemporalActual.toUpperCase()} | Fecha: ${new Date().toLocaleDateString('es-MX')}</p>
    </div>
    <div class="chart-container">
        <h2>Evolución de Ventas</h2>
        <img src="${imgData}" alt="Gráfica">
    </div>
    <table>
        <thead><tr><th>Periodo</th><th>Ventas</th></tr></thead>
        <tbody>
${datos.map(row => `            <tr><td>${row.periodo}</td><td>$${parseFloat(row.ventas).toLocaleString('es-MX', {minimumFractionDigits: 2})}</td></tr>`).join('\n')}
        </tbody>
    </table>
    <div class="total">
        <div>TOTAL DE VENTAS</div>
        <div class="total-value">$${total.toLocaleString('es-MX', {minimumFractionDigits: 2})}</div>
    </div>
</body>
</html>`;
        
        const blob = new Blob([html], { type: 'text/html' });
        saveAs(blob, `analisis_temporal_${nivelTemporalActual}_${Date.now()}.html`);
        
        ocultarLoadingExport();
        mostrarNotificacion('✅ HTML generado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        ocultarLoadingExport();
        mostrarNotificacion('❌ Error al generar HTML', 'danger');
    }
}