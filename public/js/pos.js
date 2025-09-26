let products = [];
let cart = [];
let selectedPaymentMethod = null;
let currentOrder = null;

// Cargar productos
async function loadProducts() {
    try {
        const response = await fetch('/api/products?active=true');
        const data = await response.json();
        
        if (data.success) {
            products = data.products;
            displayProducts(products);
        }
    } catch (error) {
        console.error('Error cargando productos:', error);
        showNotification('Error al cargar productos', 'error');
    }
}

// Calcular stock disponible del combo
function getComboStock(product) {
    if (!product.isCombo || !product.comboItems || product.comboItems.length === 0) {
        return product.stock;
    }
    
    let minStock = Infinity;
    
    product.comboItems.forEach(item => {
        const comboProduct = products.find(p => 
            p._id === (item.product._id || item.product)
        );
        
        if (comboProduct) {
            const availableForThisItem = Math.floor(comboProduct.stock / item.quantity);
            minStock = Math.min(minStock, availableForThisItem);
        }
    });
    
    return minStock === Infinity ? 0 : minStock;
}

// Mostrar productos
function displayProducts(productsToShow) {
    const grid = document.getElementById('productGrid');
    
    if (productsToShow.length === 0) {
        grid.innerHTML = '<p class="text-muted">No hay productos disponibles</p>';
        return;
    }
    
    grid.innerHTML = productsToShow.map(product => {
        const displayStock = product.isCombo ? getComboStock(product) : product.stock;
        const isLowStock = displayStock <= (product.minStock || 5);
        
        return `
            <div class="product-card ${displayStock <= 0 ? 'product-disabled' : ''}" onclick="addToCart('${product._id}')">
                <div class="product-info">
                    <h4>${product.name} ${product.isCombo ? '🍔' : ''}</h4>
                    <p class="product-category">${getCategoryLabel(product.category)}</p>
                    <p class="product-price">${formatCurrency(product.price)}</p>
                    <p class="product-stock ${isLowStock ? 'low-stock' : ''}">
                        Stock: ${displayStock}
                    </p>
                </div>
            </div>
        `;
    }).join('');
}

// Agregar al carrito
function addToCart(productId) {
    const product = products.find(p => p._id === productId);
    
    if (!product) return;
    
    const availableStock = product.isCombo ? getComboStock(product) : product.stock;
    
    if (availableStock <= 0) {
        showNotification('Producto sin stock disponible', 'error');
        return;
    }
    
    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
        if (existingItem.quantity >= availableStock) {
            showNotification(`Stock insuficiente. Disponible: ${availableStock}`, 'error');
            return;
        }
        existingItem.quantity++;
    } else {
        cart.push({
            productId: product._id,
            name: product.name,
            price: product.price,
            quantity: 1,
            isCombo: product.isCombo || false,
            availableStock: availableStock
        });
    }
    
    updateCart();
    displayProducts(products); // Actualizar vista de productos
}

// Actualizar carrito
function updateCart() {
    const cartDiv = document.getElementById('cartItems');
    
    if (cart.length === 0) {
        cartDiv.innerHTML = '<p class="text-muted">No hay productos en la orden</p>';
        document.getElementById('subtotal').textContent = formatCurrency(0);
        document.getElementById('total').textContent = formatCurrency(0);
        return;
    }
    
    cartDiv.innerHTML = cart.map((item, index) => {
        const product = products.find(p => p._id === item.productId);
        const currentStock = product ? (product.isCombo ? getComboStock(product) : product.stock) : 0;
        
        return `
            <div class="cart-item">
                <div class="item-info">
                    <strong>${item.name} ${item.isCombo ? '🍔' : ''}</strong>
                    <span>${formatCurrency(item.price)}</span>
                </div>
                <div class="item-controls">
                    <button class="btn-quantity" onclick="updateQuantity(${index}, -1)">-</button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="btn-quantity" onclick="updateQuantity(${index}, 1)">+</button>
                    <button class="btn-remove" onclick="removeItem(${index})">✕</button>
                </div>
                <div class="item-total">${formatCurrency(item.price * item.quantity)}</div>
                ${item.isCombo ? `<small class="text-muted">Stock disponible: ${currentStock}</small>` : ''}
            </div>
        `;
    }).join('');
    
    calculateTotals();
}

// Actualizar cantidad
function updateQuantity(index, change) {
    const item = cart[index];
    const product = products.find(p => p._id === item.productId);
    
    if (!product) {
        removeItem(index);
        return;
    }
    
    const availableStock = product.isCombo ? getComboStock(product) : product.stock;
    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
        removeItem(index);
        return;
    }
    
    if (newQuantity > availableStock) {
        showNotification(`Stock insuficiente. Disponible: ${availableStock}`, 'error');
        return;
    }
    
    cart[index].quantity = newQuantity;
    cart[index].availableStock = availableStock;
    updateCart();
    displayProducts(products);
}

// Eliminar item
function removeItem(index) {
    cart.splice(index, 1);
    updateCart();
    displayProducts(products);
}

// Calcular totales
function calculateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = parseFloat(document.getElementById('discount').value) || 0;
    const total = subtotal - discount;
    
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('total').textContent = formatCurrency(total);
}

// Limpiar carrito
function clearCart() {
    if (cart.length === 0) return;
    
    if (confirm('¿Está seguro de limpiar la orden?')) {
        cart = [];
        document.getElementById('discount').value = 0;
        selectedPaymentMethod = null;
        document.querySelectorAll('.btn-payment').forEach(btn => btn.classList.remove('active'));
        updateCart();
        displayProducts(products);
    }
}

// Procesar orden CON CONFIRMACIÓN Y VERIFICACIÓN DE STOCK
async function processOrder() {
    if (cart.length === 0) {
        showNotification('Agregue productos a la orden', 'error');
        return;
    }
    
    if (!selectedPaymentMethod) {
        showNotification('Seleccione un método de pago', 'error');
        return;
    }
    
    // VERIFICAR STOCK ANTES DE CONFIRMAR
    for (const item of cart) {
        const product = products.find(p => p._id === item.productId);
        if (!product) {
            showNotification(`Producto ${item.name} no encontrado`, 'error');
            return;
        }
        
        const availableStock = product.isCombo ? getComboStock(product) : product.stock;
        
        if (item.quantity > availableStock) {
            showNotification(
                `Stock insuficiente de ${item.name}.\n` +
                `Solicitado: ${item.quantity}, Disponible: ${availableStock}`,
                'error'
            );
            return;
        }
    }
    
    const discount = parseFloat(document.getElementById('discount').value) || 0;
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal - discount;
    
    // MOSTRAR CONFIRMACIÓN
    const confirmed = confirm(
        `¿Está seguro que desea emitir esta orden?\n\n` +
        `Total: ${formatCurrency(total)}\n` +
        `Método de pago: ${getPaymentMethodLabel(selectedPaymentMethod)}\n` +
        `Productos: ${cart.length}\n\n` +
        `Presione Aceptar para confirmar o Cancelar para revisar.`
    );
    
    if (!confirmed) {
        showNotification('Orden no emitida. Puede revisar y editar.', 'warning');
        return;
    }
    
    // CREAR ORDEN
    const orderData = {
        items: cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity
        })),
        paymentMethod: selectedPaymentMethod,
        discount: discount
    };
    
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentOrder = data.order;
            showQRModal(data.order);
            clearCartAfterOrder();
            await loadProducts(); // Recargar para actualizar stock
            showNotification('Orden creada exitosamente', 'success');
        } else {
            showNotification(data.message || 'Error al crear orden', 'error');
        }
    } catch (error) {
        console.error('Error procesando orden:', error);
        showNotification('Error al procesar orden', 'error');
    }
}

// Limpiar carrito después de crear orden (sin confirmación)
function clearCartAfterOrder() {
    cart = [];
    document.getElementById('discount').value = 0;
    selectedPaymentMethod = null;
    document.querySelectorAll('.btn-payment').forEach(btn => btn.classList.remove('active'));
    updateCart();
}

// Mostrar modal de QR
function showQRModal(order) {
    const modal = document.getElementById('qrModal');
    const content = document.getElementById('qrContent');
    
    content.innerHTML = `
        <div class="qr-display">
            <p><strong>Orden #${order.orderNumber}</strong></p>
            <img src="${order.qrCode}" alt="QR Code" class="qr-code">
            <p><strong>Total: ${formatCurrency(order.total)}</strong></p>
            <p>Método: ${getPaymentMethodLabel(order.paymentMethod)}</p>
        </div>
    `;
    
    modal.style.display = 'block';
}

// Cerrar modal QR
function closeQRModal() {
    document.getElementById('qrModal').style.display = 'none';
    currentOrder = null;
}

// Imprimir orden
function printOrder() {
    if (currentOrder) {
        window.print();
    }
}

// Funciones auxiliares
function getCategoryLabel(category) {
    const labels = {
        food: 'Comida',
        beverage: 'Bebida',
        combo: 'Combo',
        other: 'Otro'
    };
    return labels[category] || category;
}

function getPaymentMethodLabel(method) {
    const labels = {
        cash: 'Efectivo',
        card: 'Tarjeta',
        transfer: 'Transferencia'
    };
    return labels[method] || method;
}

// Event Listeners
document.getElementById('searchProduct').addEventListener('input', (e) => {
    const search = e.target.value.toLowerCase();
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(search) || 
        p.code.toLowerCase().includes(search)
    );
    displayProducts(filtered);
});

document.getElementById('discount').addEventListener('input', calculateTotals);

document.querySelectorAll('.btn-category').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.btn-category').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        const category = this.dataset.category;
        const filtered = category === 'all' ? products : products.filter(p => p.category === category);
        displayProducts(filtered);
    });
});

document.querySelectorAll('.btn-payment').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.btn-payment').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedPaymentMethod = this.dataset.method;
    });
});

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    const modal = document.getElementById('qrModal');
    if (event.target === modal) {
        closeQRModal();
    }
};

// Inicializar
loadProducts();