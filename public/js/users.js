let users = [];
let editingUser = null;

async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        const data = await response.json();
        
        if (data.success) {
            users = data.users;
            displayUsers();
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al cargar usuarios', 'error');
    }
}

function displayUsers() {
    const tbody = document.getElementById('usersBody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay usuarios registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(u => `
        <tr>
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td>${getRoleLabel(u.role)}</td>
            <td>
                <span class="badge badge-${u.active ? 'success' : 'danger'}">
                    ${u.active ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td>${u.lastLogin ? formatDate(u.lastLogin) : 'Nunca'}</td>
            <td>
                <button class="btn-icon" onclick="editUser('${u._id}')" title="Editar">✏️</button>
                <button class="btn-icon" onclick="changePassword('${u._id}')" title="Cambiar contraseña">🔑</button>
                <button class="btn-icon" onclick="deleteUser('${u._id}')" title="Eliminar">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function getRoleLabel(role) {
    const labels = {
        admin: 'Administrador',
        cashier: 'Cajero',
        accountant: 'Contador'
    };
    return labels[role] || role;
}

function openUserModal(userId = null) {
    editingUser = userId;
    document.getElementById('modalTitle').textContent = userId ? 'Editar Usuario' : 'Nuevo Usuario';
    
    if (userId) {
        const user = users.find(u => u._id === userId);
        if (user) {
            document.getElementById('userId').value = user._id;
            document.getElementById('name').value = user.name;
            document.getElementById('email').value = user.email;
            document.getElementById('role').value = user.role;
            document.getElementById('active').value = user.active.toString();
            document.getElementById('password').removeAttribute('required');
        }
    } else {
        document.getElementById('userForm').reset();
        document.getElementById('userId').value = '';
        document.getElementById('password').setAttribute('required', 'required');
    }
    
    document.getElementById('userModal').style.display = 'block';
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    editingUser = null;
}

async function saveUser(e) {
    e.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const userData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        role: document.getElementById('role').value,
        active: document.getElementById('active').value === 'true'
    };
    
    const password = document.getElementById('password').value;
    if (password) {
        userData.password = password;
    }
    
    try {
        const url = userId ? `/api/users/${userId}` : '/api/users';
        const method = userId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message, 'success');
            closeUserModal();
            loadUsers();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al guardar usuario', 'error');
    }
}

function editUser(userId) {
    openUserModal(userId);
}

async function changePassword(userId) {
    const password = prompt('Ingrese la nueva contraseña (mínimo 6 caracteres):');
    
    if (!password) return;
    
    if (password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
    }
    
    try {
        const response = await fetch(`/api/users/${userId}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Contraseña actualizada exitosamente', 'success');
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al cambiar contraseña', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('¿Está seguro de eliminar este usuario?')) return;
    
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Usuario eliminado', 'success');
            loadUsers();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al eliminar usuario', 'error');
    }
}

loadUsers();