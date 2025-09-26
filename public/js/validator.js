let recentValidations = [];
let qrStream = null;
let qrAnimationFrame = null;
let qrVideoElement = null;
let qrCanvas = null;

// Validar orden
async function validateOrder() {
    const orderNumber = document.getElementById('orderNumber').value.trim();
    
    if (!orderNumber) {
        showNotification('Ingrese un número de orden', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/orders/validate/${orderNumber}`);
        const data = await response.json();
        
        if (response.ok) {
            displayValidationResult(data);
            
            if (data.valid) {
                await markAsDelivered(orderNumber);
            }
            
            addToRecentValidations(data);
            
            document.getElementById('orderNumber').value = '';
            document.getElementById('orderNumber').focus();
        } else {
            showNotification('Error al validar orden', 'error');
        }
    } catch (error) {
        console.error('Error validando orden:', error);
        showNotification('Error al conectar con el servidor', 'error');
    }
}

// Mostrar resultado de validación
function displayValidationResult(data) {
    const resultDiv = document.getElementById('validationResult');
    
    let statusIcon = '';
    let statusText = '';
    let orderDetails = '';
    
    switch(data.status) {
        case 'valid':
            statusIcon = '✅';
            statusText = 'ORDEN VÁLIDA - PUEDE ENTREGAR';
            break;
        case 'delivered':
            statusIcon = '❌';
            statusText = 'YA ENTREGADA';
            break;
        case 'cancelled':
            statusIcon = '❌';
            statusText = 'ORDEN CANCELADA';
            break;
        case 'not_found':
            statusIcon = '⚠️';
            statusText = 'ORDEN NO EXISTE';
            break;
        default:
            statusIcon = '⚠️';
            statusText = 'ESTADO DESCONOCIDO';
    }
    
    if (data.order) {
        orderDetails = `
            <div class="order-details">
                <p><strong>Orden:</strong> ${data.order.orderNumber}</p>
                <p><strong>Total:</strong> ${formatCurrency(data.order.total)}</p>
                <p><strong>Método:</strong> ${getPaymentMethodLabel(data.order.paymentMethod)}</p>
                <p><strong>Fecha:</strong> ${formatDate(data.order.createdAt)}</p>
                <div class="order-items">
                    <strong>Productos:</strong>
                    <ul>
                        ${data.order.items.map(item => `
                            <li>${item.quantity}x ${item.productName} - ${formatCurrency(item.subtotal)}</li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `;
    }
    
    resultDiv.innerHTML = `
        <div class="validation-card validation-${data.color}">
            <div class="validation-icon">${statusIcon}</div>
            <h2>${statusText}</h2>
            ${orderDetails}
        </div>
    `;
    
    resultDiv.style.opacity = '0';
    setTimeout(() => {
        resultDiv.style.opacity = '1';
    }, 100);
}

// Marcar como entregada
async function markAsDelivered(orderNumber) {
    try {
        const response = await fetch(`/api/orders/${orderNumber}/deliver`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('Orden marcada como entregada', 'success');
        }
    } catch (error) {
        console.error('Error marcando orden como entregada:', error);
    }
}

// Agregar a validaciones recientes
function addToRecentValidations(data) {
    const validation = {
        orderNumber: data.order ? data.order.orderNumber : 'N/A',
        status: data.status,
        color: data.color,
        timestamp: new Date(),
        total: data.order ? data.order.total : 0
    };
    
    recentValidations.unshift(validation);
    
    if (recentValidations.length > 10) {
        recentValidations = recentValidations.slice(0, 10);
    }
    
    displayRecentValidations();
}

// Mostrar validaciones recientes
function displayRecentValidations() {
    const recentDiv = document.getElementById('recentList');
    
    if (recentValidations.length === 0) {
        recentDiv.innerHTML = '<p class="text-muted">No hay validaciones recientes</p>';
        return;
    }
    
    recentDiv.innerHTML = recentValidations.map(v => `
        <div class="recent-item recent-${v.color}">
            <span class="recent-number">${v.orderNumber}</span>
            <span class="recent-status">${getStatusLabel(v.status)}</span>
            <span class="recent-total">${formatCurrency(v.total)}</span>
            <span class="recent-time">${formatTime(v.timestamp)}</span>
        </div>
    `).join('');
}

// ========== FUNCIONES DE ESCANEO QR ==========

function startQRScanner() {
    document.getElementById('qr-scanner-container').style.display = 'block';
    qrVideoElement = document.getElementById('qr-video');
    qrCanvas = document.createElement('canvas');
    
    // Solicitar acceso a la cámara
    navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Usar cámara trasera en móviles
    })
    .then(stream => {
        qrStream = stream;
        qrVideoElement.srcObject = stream;
        qrVideoElement.setAttribute('playsinline', true);
        qrVideoElement.play();
        
        // Iniciar escaneo
        requestAnimationFrame(scanQRCode);
    })
    .catch(err => {
        console.error('Error accediendo a la cámara:', err);
        showNotification('No se pudo acceder a la cámara', 'error');
        stopQRScanner();
    });
}

function scanQRCode() {
    if (!qrVideoElement || qrVideoElement.readyState !== qrVideoElement.HAVE_ENOUGH_DATA) {
        qrAnimationFrame = requestAnimationFrame(scanQRCode);
        return;
    }
    
    const canvas = qrCanvas;
    const video = qrVideoElement;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
    });
    
    if (code) {
        // QR detectado!
        document.getElementById('orderNumber').value = code.data;
        stopQRScanner();
        validateOrder();
        showNotification('¡QR escaneado exitosamente!', 'success');
    } else {
        // Continuar escaneando
        qrAnimationFrame = requestAnimationFrame(scanQRCode);
    }
}

function stopQRScanner() {
    // Detener stream de video
    if (qrStream) {
        qrStream.getTracks().forEach(track => track.stop());
        qrStream = null;
    }
    
    // Detener animación
    if (qrAnimationFrame) {
        cancelAnimationFrame(qrAnimationFrame);
        qrAnimationFrame = null;
    }
    
    // Limpiar video
    if (qrVideoElement) {
        qrVideoElement.srcObject = null;
    }
    
    // Ocultar contenedor
    document.getElementById('qr-scanner-container').style.display = 'none';
}

// Funciones auxiliares
function getStatusLabel(status) {
    const labels = {
        valid: '✅ Válida',
        delivered: '❌ Entregada',
        cancelled: '❌ Cancelada',
        not_found: '⚠️ No existe'
    };
    return labels[status] || status;
}

function getPaymentMethodLabel(method) {
    const labels = {
        cash: 'Efectivo',
        card: 'Tarjeta',
        transfer: 'Transferencia'
    };
    return labels[method] || method;
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Event listeners
document.getElementById('orderNumber').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        validateOrder();
    }
});

// Inicializar
displayRecentValidations();