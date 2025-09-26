let currentPeriod = 'month';

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`${tabName}-tab`).classList.add('active');
    event.target.classList.add('active');
    
    // Cargar datos según la pestaña
    if (tabName === 'entries') {
        loadEntries();
    } else if (tabName === 'income') {
        loadIncomeStatement();
    } else if (tabName === 'balance') {
        loadBalanceSheet();
    } else if (tabName === 'cashflow') {
        loadCashFlow();
    }
}

async function loadEntries() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    let url = '/api/accounting/entries?';
    if (startDate) url += `startDate=${startDate}&`;
    if (endDate) url += `endDate=${endDate}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            displayEntries(data.entries);
        } else {
            showNotification('Error al cargar asientos', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al cargar asientos contables', 'error');
    }
}

function displayEntries(entries) {
    const tbody = document.getElementById('entriesBody');
    
    if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay asientos contables en este período</td></tr>';
        return;
    }
    
    tbody.innerHTML = entries.map(entry => `
        <tr>
            <td><strong>${entry.entryNumber}</strong></td>
            <td>${formatDate(entry.date)}</td>
            <td>${entry.description}</td>
            <td><span class="badge badge-${getTypeColor(entry.type)}">${getTypeLabel(entry.type)}</span></td>
            <td class="text-success">${formatCurrency(entry.totalDebit)}</td>
            <td class="text-danger">${formatCurrency(entry.totalCredit)}</td>
            <td>
                <button class="btn-icon" onclick="viewEntryDetail('${entry._id}')" title="Ver Detalle">👁️</button>
            </td>
        </tr>
    `).join('');
}

function getTypeLabel(type) {
    const labels = {
        sale: 'Venta',
        purchase: 'Compra',
        expense: 'Gasto',
        adjustment: 'Ajuste',
        opening: 'Apertura',
        closing: 'Cierre',
        manual: 'Manual'
    };
    return labels[type] || type;
}

function getTypeColor(type) {
    const colors = {
        sale: 'success',
        purchase: 'info',
        expense: 'danger',
        adjustment: 'warning',
        opening: 'primary',
        closing: 'secondary',
        manual: 'info'
    };
    return colors[type] || 'secondary';
}

async function viewEntryDetail(entryId) {
    try {
        const response = await fetch(`/api/accounting/entries/${entryId}`);
        const data = await response.json();
        
        if (data.success) {
            const entry = data.entry;
            
            let detailHtml = `
                <strong>Asiento: ${entry.entryNumber}</strong><br>
                <strong>Fecha:</strong> ${formatDate(entry.date)}<br>
                <strong>Descripción:</strong> ${entry.description}<br>
                <strong>Tipo:</strong> ${getTypeLabel(entry.type)}<br><br>
                <strong>Detalle de Líneas:</strong><br>
                <table style="width:100%; margin-top:10px; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f5f5f5;">
                            <th style="padding:8px; text-align:left;">Cuenta</th>
                            <th style="padding:8px; text-align:right;">Débito</th>
                            <th style="padding:8px; text-align:right;">Crédito</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${entry.lines.map(line => `
                            <tr>
                                <td style="padding:8px;">${line.accountCode} - ${line.accountName}</td>
                                <td style="padding:8px; text-align:right;">${line.debit > 0 ? formatCurrency(line.debit) : '-'}</td>
                                <td style="padding:8px; text-align:right;">${line.credit > 0 ? formatCurrency(line.credit) : '-'}</td>
                            </tr>
                        `).join('')}
                        <tr style="border-top: 2px solid #333; font-weight:bold;">
                            <td style="padding:8px;">TOTALES</td>
                            <td style="padding:8px; text-align:right;">${formatCurrency(entry.totalDebit)}</td>
                            <td style="padding:8px; text-align:right;">${formatCurrency(entry.totalCredit)}</td>
                        </tr>
                    </tbody>
                </table>
            `;
            
            alert(detailHtml.replace(/<[^>]*>/g, '\n').replace(/&nbsp;/g, ' '));
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al cargar detalle', 'error');
    }
}

async function loadIncomeStatement() {
    const startDate = document.getElementById('incomeStartDate').value;
    const endDate = document.getElementById('incomeEndDate').value;
    
    let url = '/api/accounting/income-statement?';
    if (startDate) url += `startDate=${startDate}&`;
    if (endDate) url += `endDate=${endDate}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            displayIncomeStatement(data.incomeStatement);
        } else {
            showNotification('Error al generar estado de resultados', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al generar estado de resultados', 'error');
    }
}

function displayIncomeStatement(income) {
    const div = document.getElementById('incomeStatement');
    
    const isProfit = parseFloat(income.netIncome) >= 0;
    
    div.innerHTML = `
        <div class="financial-report">
            <h2>Estado de Resultados</h2>
            <p class="text-muted">Período: ${document.getElementById('incomeStartDate').value || 'Inicio'} al ${document.getElementById('incomeEndDate').value || 'Hoy'}</p>
            
            <table class="report-table">
                <tr>
                    <td><strong>INGRESOS</strong></td>
                    <td></td>
                </tr>
                <tr>
                    <td>&nbsp;&nbsp;Ventas</td>
                    <td class="text-right"><strong>${formatCurrency(income.sales)}</strong></td>
                </tr>
                <tr style="border-bottom: 1px solid #ddd;">
                    <td></td>
                    <td></td>
                </tr>
                <tr>
                    <td><strong>COSTOS</strong></td>
                    <td></td>
                </tr>
                <tr>
                    <td>&nbsp;&nbsp;(-) Costo de Ventas</td>
                    <td class="text-right">${formatCurrency(income.costOfSales)}</td>
                </tr>
                <tr class="total-row" style="background: #e8f5e9;">
                    <td><strong>UTILIDAD BRUTA</strong></td>
                    <td class="text-right"><strong>${formatCurrency(income.grossProfit)}</strong></td>
                </tr>
                <tr>
                    <td>&nbsp;&nbsp;Margen Bruto</td>
                    <td class="text-right"><em>${income.grossMargin}</em></td>
                </tr>
                <tr style="border-bottom: 1px solid #ddd;">
                    <td></td>
                    <td></td>
                </tr>
                <tr>
                    <td><strong>GASTOS OPERACIONALES</strong></td>
                    <td></td>
                </tr>
                <tr>
                    <td>&nbsp;&nbsp;(-) Gastos Operacionales</td>
                    <td class="text-right">${formatCurrency(income.operatingExpenses)}</td>
                </tr>
                <tr class="total-row highlight" style="background: ${isProfit ? '#c8e6c9' : '#ffcdd2'};">
                    <td><strong>UTILIDAD NETA</strong></td>
                    <td class="text-right"><strong style="color: ${isProfit ? '#2e7d32' : '#c62828'}">${formatCurrency(income.netIncome)}</strong></td>
                </tr>
                <tr>
                    <td>&nbsp;&nbsp;Margen Neto</td>
                    <td class="text-right"><em>${income.netMargin}</em></td>
                </tr>
            </table>
            
            <div style="margin-top: 2rem; text-align: center;">
                <button class="btn btn-primary" onclick="printReport('income')">🖨️ Imprimir Reporte</button>
            </div>
        </div>
    `;
}

async function loadBalanceSheet() {
    const date = document.getElementById('balanceDate').value || new Date().toISOString().split('T')[0];
    
    try {
        const response = await fetch(`/api/accounting/balance-sheet?date=${date}`);
        const data = await response.json();
        
        if (data.success) {
            displayBalanceSheet(data.balanceSheet);
        } else {
            showNotification('Error al generar balance', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al generar balance general', 'error');
    }
}

function displayBalanceSheet(balance) {
    const div = document.getElementById('balanceSheet');
    
    div.innerHTML = `
        <div class="financial-report">
            <h2>Balance General</h2>
            <p class="text-muted">Al: ${document.getElementById('balanceDate').value || new Date().toLocaleDateString('es-CL')}</p>
            
            <table class="report-table">
                <tr class="section-header">
                    <td colspan="2"><strong>ACTIVOS</strong></td>
                </tr>
                <tr>
                    <td>&nbsp;&nbsp;Caja y Bancos</td>
                    <td class="text-right">${formatCurrency(balance.cashAndBanks || 0)}</td>
                </tr>
                <tr>
                    <td>&nbsp;&nbsp;Inventarios</td>
                    <td class="text-right">${formatCurrency(balance.inventory || 0)}</td>
                </tr>
                <tr class="total-row">
                    <td><strong>Total Activos</strong></td>
                    <td class="text-right"><strong>${formatCurrency(balance.assets)}</strong></td>
                </tr>
                
                <tr style="height: 20px;"></tr>
                
                <tr class="section-header">
                    <td colspan="2"><strong>PASIVOS</strong></td>
                </tr>
                <tr>
                    <td>&nbsp;&nbsp;Cuentas por Pagar</td>
                    <td class="text-right">${formatCurrency(balance.accountsPayable || 0)}</td>
                </tr>
                <tr class="total-row">
                    <td><strong>Total Pasivos</strong></td>
                    <td class="text-right"><strong>${formatCurrency(balance.liabilities)}</strong></td>
                </tr>
                
                <tr style="height: 20px;"></tr>
                
                <tr class="section-header">
                    <td colspan="2"><strong>PATRIMONIO</strong></td>
                </tr>
                <tr>
                    <td>&nbsp;&nbsp;Capital y Utilidades</td>
                    <td class="text-right">${formatCurrency(balance.equity)}</td>
                </tr>
                <tr class="total-row">
                    <td><strong>Total Patrimonio</strong></td>
                    <td class="text-right"><strong>${formatCurrency(balance.equity)}</strong></td>
                </tr>
                
                <tr style="height: 20px;"></tr>
                
                <tr class="total-row highlight" style="background: #e3f2fd;">
                    <td><strong>Total Pasivo + Patrimonio</strong></td>
                    <td class="text-right"><strong>${formatCurrency(balance.total)}</strong></td>
                </tr>
                <tr>
                    <td colspan="2" class="text-center" style="padding-top: 1rem;">
                        ${balance.balanced ? 
                            '<span class="badge badge-success" style="font-size: 1rem;">✓ Balance Cuadrado</span>' : 
                            '<span class="badge badge-danger" style="font-size: 1rem;">✗ Balance Descuadrado</span>'}
                    </td>
                </tr>
            </table>
            
            <div style="margin-top: 2rem; text-align: center;">
                <button class="btn btn-primary" onclick="printReport('balance')">🖨️ Imprimir Reporte</button>
            </div>
        </div>
    `;
}

async function loadCashFlow() {
    const startDate = document.getElementById('cashflowStartDate').value;
    const endDate = document.getElementById('cashflowEndDate').value;
    
    let url = '/api/accounting/cash-flow?';
    if (startDate) url += `startDate=${startDate}&`;
    if (endDate) url += `endDate=${endDate}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            displayCashFlow(data.cashFlow);
        } else {
            showNotification('Error al generar flujo de efectivo', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al generar flujo de efectivo', 'error');
    }
}

function displayCashFlow(cashFlow) {
    const div = document.getElementById('cashFlow');
    
    const netFlow = parseFloat(cashFlow.netCashFlow);
    const isPositive = netFlow >= 0;
    
    div.innerHTML = `
        <div class="financial-report">
            <h2>Flujo de Efectivo</h2>
            <p class="text-muted">Período: ${document.getElementById('cashflowStartDate').value || 'Inicio'} al ${document.getElementById('cashflowEndDate').value || 'Hoy'}</p>
            
            <table class="report-table">
                <tr>
                    <td><strong>ENTRADAS DE EFECTIVO</strong></td>
                    <td></td>
                </tr>
                <tr>
                    <td>&nbsp;&nbsp;Ingresos por Ventas</td>
                    <td class="text-right text-success"><strong>+ ${formatCurrency(cashFlow.cashInflows)}</strong></td>
                </tr>
                
                <tr style="height: 20px;"></tr>
                
                <tr>
                    <td><strong>SALIDAS DE EFECTIVO</strong></td>
                    <td></td>
                </tr>
                <tr>
                    <td>&nbsp;&nbsp;Pagos y Egresos</td>
                    <td class="text-right text-danger"><strong>- ${formatCurrency(cashFlow.cashOutflows)}</strong></td>
                </tr>
                
                <tr style="height: 20px;"></tr>
                
                <tr class="total-row highlight" style="background: ${isPositive ? '#c8e6c9' : '#ffcdd2'};">
                    <td><strong>FLUJO NETO DE EFECTIVO</strong></td>
                    <td class="text-right"><strong style="color: ${isPositive ? '#2e7d32' : '#c62828'}; font-size: 1.3rem;">${formatCurrency(netFlow)}</strong></td>
                </tr>
            </table>
            
            <div style="margin-top: 2rem;">
                <div class="alert ${isPositive ? 'alert-success' : 'alert-warning'}">
                    ${isPositive ? 
                        '✅ Flujo de efectivo positivo. La empresa genera más efectivo del que gasta.' : 
                        '⚠️ Flujo de efectivo negativo. Se está gastando más efectivo del que ingresa.'}
                </div>
            </div>
            
            <div style="margin-top: 2rem; text-align: center;">
                <button class="btn btn-primary" onclick="printReport('cashflow')">🖨️ Imprimir Reporte</button>
            </div>
        </div>
    `;
}

function printReport(reportType) {
    window.print();
}

// Inicializar fechas
const today = new Date().toISOString().split('T')[0];
const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

document.getElementById('startDate').value = firstDay;
document.getElementById('endDate').value = today;
document.getElementById('incomeStartDate').value = firstDay;
document.getElementById('incomeEndDate').value = today;
document.getElementById('cashflowStartDate').value = firstDay;
document.getElementById('cashflowEndDate').value = today;
document.getElementById('balanceDate').value = today;

// Cargar asientos al inicio
loadEntries();