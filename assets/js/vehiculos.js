let vehiculosData = [];
let editandoId = null;

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    renderNavUser();
    cargarVehiculos();

    document.getElementById('btn-nuevo')?.addEventListener('click', abrirModalNuevo);
    document.getElementById('form-vehiculo')?.addEventListener('submit', guardarVehiculo);
    document.getElementById('btn-cancelar')?.addEventListener('click', cerrarModal);

    document.getElementById('buscar')?.addEventListener('input',
        debounce(e => filtrarVehiculos(e.target.value), 350)
    );

    document.getElementById('filtro-estado')?.addEventListener('change', e => {
        const val = e.target.value;
        const filtrados = val ? vehiculosData.filter(v => v.estado === val) : vehiculosData;
        renderTabla(filtrados);
    });

    document.getElementById('filtro-tipo')?.addEventListener('change', e => {
        const val = e.target.value;
        const filtrados = val ? vehiculosData.filter(v => v.tipo === val) : vehiculosData;
        renderTabla(filtrados);
    });
});

async function cargarVehiculos() {
    showLoader('loader', true);
    const res = await Http.get(`${API.vehiculos}/vehiculos`);
    showLoader('loader', false);

    if (res.success) {
        vehiculosData = res.data || [];
        renderTabla(vehiculosData);
    } else {
        showAlert(res.message, 'error');
    }
}

function renderTabla(datos) {
    const tbody = document.getElementById('tabla-vehiculos');
    if (!tbody) return;

    if (!datos.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay vehículos registrados.</td></tr>';
        return;
    }
    
    tbody.innerHTML = datos.map(v => `
        <tr>
            <td>${v.id}</td>
            <td><strong>${v.placa}</strong></td>
            <td>${v.tipo_vehiculo}</td>
            <td>${v.marca} ${v.modelo}</td>
            <td>${v.capacidad_carga} ton</td>
            <td>${estadoBadge(v.estado)}</td>
            <td class="actions">
                <button class="btn btn-sm btn-primary" onclick="editarVehiculo(${v.id})">Editar</button>
                <button class="btn btn-sm btn-secondary" onclick="cambiarEstado(${v.id}, '${v.estado}')">Estado</button>
                <button class="btn btn-sm btn-danger" onclick="eliminarVehiculo(${v.id})">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

function filtrarVehiculos(texto) {
    const t = texto.toLowerCase();
    const filtrados = vehiculosData.filter(v =>
        v.placa.toLowerCase().includes(t) ||
        v.marca.toLowerCase().includes(t) ||
        v.modelo.toLowerCase().includes(t) ||
        v.tipo_vehiculo.toLowerCase().includes(t)
    );
    renderTabla(filtrados);
}

function abrirModalNuevo() {
    editandoId = null;
    document.getElementById('modal-titulo').textContent = 'Nuevo Vehículo';
    document.getElementById('form-vehiculo').reset();
    abrirModal();
}

async function editarVehiculo(id) {
    const res = await Http.get(`${API.vehiculos}/vehiculos/${id}`);
    if (!res.success) { showAlert(res.message, 'error'); return; }

    const v = res.data;
    editandoId = id;
    document.getElementById('modal-titulo').textContent = 'Editar Vehículo';

    document.getElementById('f-placa').value    = v.placa    || '';
    document.getElementById('f-tipo').value     = v.tipo_vehiculo     || '';
    document.getElementById('f-capacidad').value= v.capacidad_carga || '';
    document.getElementById('f-marca').value    = v.marca    || '';
    document.getElementById('f-modelo').value   = v.modelo   || '';
    document.getElementById('f-estado').value   = v.estado   || 'disponible';

    abrirModal();
}

async function guardarVehiculo(e) {
    e.preventDefault();

    const capacidad = parseFloat(document.getElementById('f-capacidad').value);
    if (isNaN(capacidad) || capacidad <= 0) {
        showAlert('La capacidad debe ser un número mayor a cero.', 'error');
        return;
    }

    const body = {
        placa:          document.getElementById('f-placa').value.trim().toUpperCase(),
        tipo:           document.getElementById('f-tipo').value,
        capacidad_carga: capacidad,
        marca:          document.getElementById('f-marca').value.trim(),
        modelo:         document.getElementById('f-modelo').value.trim(),
        estado:         document.getElementById('f-estado').value,
    };

    const btn = document.getElementById('btn-guardar');
    btn.disabled = true;

    const res = editandoId
        ? await Http.put(`${API.vehiculos}/vehiculos/${editandoId}`, body)
        : await Http.post(`${API.vehiculos}/vehiculos`, body);

    btn.disabled = false;

    if (res.success) {
        showAlert(res.message, 'success');
        cerrarModal();
        cargarVehiculos();
    } else {
        showAlert(res.message, 'error');
    }
}

async function cambiarEstado(id, estadoActual) {
    const estados = ['disponible', 'en_ruta', 'mantenimiento', 'inactivo'];
    const opciones = estados.filter(e => e !== estadoActual);
    const nuevo = prompt(`Estado actual: ${estadoActual}\nNuevo estado (${opciones.join(' / ')}):`);

    if (!nuevo || !estados.includes(nuevo.trim())) {
        if (nuevo !== null) showAlert('Estado no válido.', 'error');
        return;
    }

    const res = await Http.patch(`${API.vehiculos}/vehiculos/${id}/estado`, { estado: nuevo.trim() });
    if (res.success) {
        showAlert(res.message, 'success');
        cargarVehiculos();
    } else {
        showAlert(res.message, 'error');
    }
}

async function eliminarVehiculo(id) {
    if (!confirmar('¿Eliminar este vehículo?')) return;

    const res = await Http.delete(`${API.vehiculos}/vehiculos/${id}`);
    if (res.success) {
        showAlert(res.message, 'success');
        cargarVehiculos();
    } else {
        showAlert(res.message, 'error');
    }
}

function abrirModal() { document.getElementById('modal-vehiculo').classList.add('active'); }
function cerrarModal() { document.getElementById('modal-vehiculo').classList.remove('active'); editandoId = null; }
function renderNavUser() {
    const user = UserSession.get();
    const el = document.getElementById('nav-user');
    if (el && user) el.textContent = user.nombre || user.email;
}