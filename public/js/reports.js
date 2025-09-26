function closeReport() {
    document.getElementById('reportArea').style.display = 'none';
    document.querySelector('.report-cards').style.display = 'grid';
}

function showReportArea() {
    document.querySelector('.report-cards').style.display = 'none';
    document.getElementById('reportArea').style.display = 'block';
}

async function showSalesReport() {
    showReportArea();
    
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    try {
        const response = await fetch(`/api/orders?startDate=${firstDay.toISOString()}&endDate=${today.toISOString()}`);
        const data = await response.json();
        
        if (data.success) {
            const orders = data.orders.filter(o => o.status !== 'cancelled');
            
            const salesByDay = {};
            orders.forEach(order => {
                const date = new Date(order.createdAt).toLocaleDateString('es-CL');
                if (!salesByDay[date]) {
                    salesByDay[date] = { count: 0, total: 0 };
                }
                salesByDay[date].count++;
                salesByDay[date].total += order.total;
            });
            
            const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
            const avgTicket = totalSales / orders.length || 0;
            
            let html = `
                <div class="report-header">
                    <h2>Reporte de Ventas - ${new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</h2>
                    <div class="report-summary">
                        <div class="summary-item">
                            <span class="summary-label">Total Ventas:</span>
                            <span class="summary-value">${formatCurrency(totalSales)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Órdenes:</span>
                            <span class="summary-value">${orders.length}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Ticket Promedio:</span>
                            <span class="summary-value">${formatCurrency(avgTicket)}</span>
                        </div>
                    </div>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Órdenes</th>
                            <th>Total</th>
                            <th>Promedio</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            Object.entries(salesByDay).sort().reverse().forEach(([date, data]) => {
                html += `
                    <tr>
                        <td>${date}</td>
                        <td>${data.count}</td>
                        <td>${formatCurrency(data.total)}</td>
                        <td>${formatCurrency(data.total / data.count)}</td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            `;
            
            document.getElementById('reportContent').innerHTML = html;
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al generar reporte', 'error');
    }
}

async function showTopProducts() {
    showReportArea();
    
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    try {
        const response = await fetch(`/api/orders?startDate=${firstDay.toISOString()}&endDate=${today.toISOString()}`);
        const data = await response.json();
        
        if (data.success) {
            const orders = data.orders.filter(o => o.status !== 'cancelled');
            
            const productStats = {};
            orders.forEach(order => {
                order.items.forEach(item => {
                    if (!productStats[item.productName]) {
                        productStats[item.productName] = {
                            name: item.productName,
                            quantity: 0,
                            total: 0
                        };
                    }
                    productStats[item.productName].quantity += item.quantity;
                    productStats[item.productName].total += item.subtotal;
                });
            });
            
            const topProducts = Object.values(productStats)
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 20);
            
            let html = `
                <div class="report-header">
                    <h2>Top 20 Productos Más Vendidos</h2>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Total Vendido</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            topProducts.forEach((product, index) => {
                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${product.name}</td>
                        <td>${product.quantity}</td>
                        <td>${formatCurrency(product.total)}</td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            `;
            
            document.getElementById('reportContent').innerHTML = html;
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al generar reporte', 'error');
    }
}

async function showProfitability() {
    showReportArea();
    
    try {
        const response = await fetch('/api/products');
        const data = await response.json();
        
        if (data.success) {
            const products = data.products.filter(p => p.active);
            
            const profitability = products.map(p => ({
                name: p.name,
                price: p.price,
                cost: p.cost,
                profit: p.price - p.cost,
                margin: ((p.price - p.cost) / p.price * 100).toFixed(2)
            })).sort((a, b) => b.margin - a.margin);
            
            let html = `
                <div class="report-header">
                    <h2>Análisis de Rentabilidad por Producto</h2>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Precio</th>
                            <th>Costo</th>
                            <th>Utilidad</th>
                            <th>Margen</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            profitability.forEach(item => {
                const marginClass = item.margin >= 50 ? 'text-success' : item.margin >= 30 ? 'text-warning' : 'text-danger';
                html += `
                    <tr>
                        <td>${item.name}</td>
                        <td>${formatCurrency(item.price)}</td>
                        <td>${formatCurrency(item.cost)}</td>
                        <td>${formatCurrency(item.profit)}</td>
                        <td class="${marginClass}">${item.margin}%</td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            `;
            
            document.getElementById('reportContent').innerHTML = html;
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al generar reporte', 'error');
    }
}

async function showLowStock() {
    showReportArea();
    
    try {
        const response = await fetch('/api/products/low-stock');
        const data = await response.json();
        
        if (data.success) {
            const products = data.products;
            
            let html = `
                <div class="report-header">
                    <h2>Productos con Stock Bajo</h2>
                    <div class="alert alert-warning">
                        ⚠️ ${products.length} producto(s) necesitan reabastecimiento
                    </div>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Producto</th>
                            <th>Stock Actual</th>
                            <th>Stock Mínimo</th>
                            <th>Categoría</th>
                            <th>Proveedor</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            if (products.length === 0) {
                html += '<tr><td colspan="6" class="text-center">No hay productos con stock bajo</td></tr>';
            } else {
                products.forEach(p => {
                    html += `
                        <tr>
                            <td>${p.code}</td>
                            <td>${p.name}</td>
                            <td class="text-danger"><strong>${p.stock}</strong></td>
                            <td>${p.minStock}</td>
                            <td>${getCategoryLabel(p.category)}</td>
                            <td>${p.supplier?.name || 'N/A'}</td>
                        </tr>
                    `;
                });
            }
            
            html += `
                    </tbody>
                </table>
            `;
            
            document.getElementById('reportContent').innerHTML = html;
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al generar reporte', 'error');
    }
}

// NUEVAS FUNCIONES PARA NOTAS DE CRÉDITO
async function showCreditNotes() {
    showReportArea();
    
    try {
        const response = await fetch('/api/orders?status=paid');
        const data = await response.json();
        
        if (data.success) {
            const orders = data.orders.filter(o => o.status === 'paid' || o.status === 'delivered');
            
            let html = `
                <div class="report-header">
                    <h2>🧾 Gestión de Notas de Crédito</h2>
                    <p>Seleccione una orden para generar nota de crédito (anulación)</p>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Número Orden</th>
                            <th>Fecha</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Cajero</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            if (orders.length === 0) {
                html += '<tr><td colspan="6" class="text-center">No hay órdenes disponibles para nota de crédito</td></tr>';
            } else {
                orders.forEach(order => {
                    html += `
                        <tr>
                            <td><strong>${order.orderNumber}</strong></td>
                            <td>${formatDate(order.createdAt)}</td>
                            <td>${formatCurrency(order.total)}</td>
                            <td><span class="badge badge-${order.status === 'paid' ? 'success' : 'info'}">${order.status}</span></td>
                            <td>${order.cashierName}</td>
                            <td>
                                <button class="btn btn-danger" onclick="createCreditNote('${order._id}', '${order.orderNumber}', ${order.total})">
                                    Nota de Crédito
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }
            
            html += `
                    </tbody>
                </table>
            `;
            
            document.getElementById('reportContent').innerHTML = html;
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al cargar órdenes', 'error');
    }
}

async function createCreditNote(orderId, orderNumber, total) {
    const reason = prompt(
        `NOTA DE CRÉDITO - Orden ${orderNumber}\n` +
        `Total: ${formatCurrency(total)}\n\n` +
        `Ingrese el motivo de la anulación:`
    );
    
    if (!reason || reason.trim() === '') {
        showNotification('Debe ingresar un motivo para la nota de crédito', 'warning');
        return;
    }
    
    const confirmed = confirm(
        `¿Confirma la emisión de NOTA DE CRÉDITO?\n\n` +
        `Orden: ${orderNumber}\n` +
        `Monto: ${formatCurrency(total)}\n` +
        `Motivo: ${reason}\n\n` +
        `Esta acción devolverá el stock y anulará la venta.`
    );
    
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/orders/${orderId}/cancel`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Nota de crédito generada exitosamente', 'success');
            showCreditNotes(); // Recargar lista
        } else {
            showNotification(data.message || 'Error al generar nota de crédito', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al generar nota de crédito', 'error');
    }
}

function getCategoryLabel(category) {
    const labels = {
        food: 'Comida',
        beverage: 'Bebida',
        combo: 'Combo',
        other: 'Otro'
    };
    return labels[category] || category;
}