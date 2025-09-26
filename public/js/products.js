let products = [];
let editingProduct = null;
let comboItems = [];
let availableProducts = [];

async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const data = await response.json();
        
        if (data.success) {
            products = data.products;
            availableProducts = data.products.filter(p => p.category !== 'combo' && p.active);
            displayProducts();
            updateComboProductSelect();
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al cargar productos', 'error');
    }
}

function displayProducts() {
    const tbody = document.getElementById('productsBody');
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay productos registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = products.map(p => `
        <tr>
            <td>${p.code}</td>
            <td>${p.name} ${p.isCombo ? '🍔' : ''}</td>
            <td>${getCategoryLabel(p.category)}</td>
            <td>${formatCurrency(p.price)}</td>
            <td>${formatCurrency(p.cost)}</td>
            <td class="${p.stock <= p.minStock ? 'low-stock' : ''}">${p.isCombo ? 'N/A' : p.stock}</td>
            <td>
                <span class="badge badge-${p.active ? 'success' : 'danger'}">
                    ${p.active ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td>
                <button class="btn-icon" onclick="editProduct('${p._id}')" title="Editar">✏️</button>
                <button class="btn-icon" onclick="deleteProduct('${p._id}')" title="Eliminar">🗑️</button>
                ${p.isCombo ? `<button class="btn-icon" onclick="viewCombo('${p._id}')" title="Ver Combo">👁️</button>` : ''}
            </td>
        </tr>
    `).join('');
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

function toggleComboSection() {
    const category = document.getElementById('category').value;
    const comboSection = document.getElementById('comboSection');
    const stockGroup = document.getElementById('stockGroup');
    const minStockGroup = document.getElementById('minStockGroup');
    
    if (category === 'combo') {
        comboSection.style.display = 'block';
        stockGroup.style.display = 'none';
        minStockGroup.style.display = 'none';
        document.getElementById('stock').value = 0;
        document.getElementById('stock').removeAttribute('required');
    } else {
        comboSection.style.display = 'none';
        stockGroup.style.display = 'block';
        minStockGroup.style.display = 'block';
        document.getElementById('stock').setAttribute('required', 'required');
    }
}

function updateComboProductSelect() {
    const select = document.getElementById('comboProductSelect');
    select.innerHTML = '<option value="">Seleccione producto...</option>' +
        availableProducts.map(p => `
            <option value="${p._id}">${p.name} (Stock: ${p.stock})</option>
        `).join('');
}

function addComboItem() {
    const productId = document.getElementById('comboProductSelect').value;
    const quantity = parseInt(document.getElementById('comboQuantity').value);
    
    if (!productId) {
        showNotification('Seleccione un producto', 'error');
        return;
    }
    
    if (quantity <= 0) {
        showNotification('La cantidad debe ser mayor a 0', 'error');
        return;
    }
    
    const product = availableProducts.find(p => p._id === productId);
    if (!product) return;
    
    // Verificar si ya existe
    const existing = comboItems.find(item => item.productId === productId);
    if (existing) {
        showNotification('Este producto ya está en el combo', 'warning');
        return;
    }
    
    comboItems.push({
        productId: product._id,
        productName: product.name,
        quantity: quantity
    });
    
    displayComboItems();
    document.getElementById('comboProductSelect').value = '';
    document.getElementById('comboQuantity').value = 1;
}

function displayComboItems() {
    const container = document.getElementById('comboItemsList');
    
    if (comboItems.length === 0) {
        container.innerHTML = '<p class="text-muted">No hay productos agregados al combo</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="combo-items">
            <h4>Productos del Combo:</h4>
            ${comboItems.map((item, index) => `
                <div class="combo-item">
                    <span><strong>${item.quantity}x</strong> ${item.productName}</span>
                    <button type="button" class="btn-remove" onclick="removeComboItem(${index})">✕</button>
                </div>
            `).join('')}
        </div>
    `;
}

function removeComboItem(index) {
    comboItems.splice(index, 1);
    displayComboItems();
}

function openProductModal(productId = null) {
    editingProduct = productId;
    comboItems = [];
    
    document.getElementById('modalTitle').textContent = productId ? 'Editar Producto' : 'Nuevo Producto';
    
    if (productId) {
        const product = products.find(p => p._id === productId);
        if (product) {
            document.getElementById('productId').value = product._id;
            document.getElementById('code').value = product.code;
            document.getElementById('name').value = product.name;
            document.getElementById('category').value = product.category;
            document.getElementById('price').value = product.price;
            document.getElementById('cost').value = product.cost;
            document.getElementById('stock').value = product.stock;
            document.getElementById('minStock').value = product.minStock;
            document.getElementById('description').value = product.description || '';
            document.getElementById('active').value = product.active.toString();
            
            if (product.isCombo && product.comboItems) {
                comboItems = product.comboItems.map(item => ({
                    productId: item.product,
                    productName: item.productName,
                    quantity: item.quantity
                }));
            }
            
            toggleComboSection();
            displayComboItems();
        }
    } else {
        document.getElementById('productForm').reset();
        document.getElementById('productId').value = '';
        toggleComboSection();
    }
    
    document.getElementById('productModal').style.display = 'block';
}

function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
    editingProduct = null;
    comboItems = [];
}

async function saveProduct(e) {
    e.preventDefault();
    
    const productId = document.getElementById('productId').value;
    const category = document.getElementById('category').value;
    
    const productData = {
        code: document.getElementById('code').value,
        name: document.getElementById('name').value,
        category: category,
        price: parseFloat(document.getElementById('price').value),
        cost: parseFloat(document.getElementById('cost').value),
        stock: category === 'combo' ? 0 : parseInt(document.getElementById('stock').value),
        minStock: parseInt(document.getElementById('minStock').value),
        description: document.getElementById('description').value,
        active: document.getElementById('active').value === 'true',
        isCombo: category === 'combo',
        comboItems: category === 'combo' ? comboItems.map(item => ({
            product: item.productId,
            productName: item.productName,
            quantity: item.quantity
        })) : []
    };
    
    if (category === 'combo' && comboItems.length === 0) {
        showNotification('Debe agregar al menos un producto al combo', 'error');
        return;
    }
    
    try {
        const url = productId ? `/api/products/${productId}` : '/api/products';
        const method = productId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message, 'success');
            closeProductModal();
            loadProducts();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al guardar producto', 'error');
    }
}

function editProduct(productId) {
    openProductModal(productId);
}

function viewCombo(productId) {
    const product = products.find(p => p._id === productId);
    if (!product || !product.isCombo) return;
    
    const items = product.comboItems.map(item => 
        `• ${item.quantity}x ${item.productName}`
    ).join('\n');
    
    alert(`Combo: ${product.name}\n\nProductos:\n${items}\n\nPrecio: ${formatCurrency(product.price)}`);
}

async function deleteProduct(productId) {
    if (!confirm('¿Está seguro de eliminar este producto?')) return;
    
    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Producto eliminado', 'success');
            loadProducts();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al eliminar producto', 'error');
    }
}

// Filtros
document.getElementById('searchProduct').addEventListener('input', function() {
    const search = this.value.toLowerCase();
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.code.toLowerCase().includes(search)
    );
    displayFilteredProducts(filtered);
});

document.getElementById('categoryFilter').addEventListener('change', function() {
    const category = this.value;
    const filtered = category ? products.filter(p => p.category === category) : products;
    displayFilteredProducts(filtered);
});

function displayFilteredProducts(filtered) {
    const originalProducts = products;
    products = filtered;
    displayProducts();
    products = originalProducts;
}

loadProducts();