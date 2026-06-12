let conductoresData = [];
let editandoId = null;

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    renderNavUser();
    cargarConductores();

    document.getElementById('btn-nuevo')?.addEventListener('click', abrirModalNuevo);
    document.getElementById('form-conductor')?.addEventListener('submit', guardarConductor);
    document.getElementById('btn-cancelar')?.addEventListener('click', cerrarModal);

    document.getElementById('buscar')?.addEventListener('input',
        debounce(e => filtrarConductores(e.target.value), 350)
    );

    document.getElementById('filtro-estado')?.addEventListener('change', e => {
        const val = e.target.value;
        const filtrados = val
            ? conductoresData.filter(c => c.estado === val)
            : conductoresData;
        renderTabla(filtrados);
    });
});

async function cargarConductores() {
    showLoader('loader', true);
    const res = await Http.get(`${API.conductores}/conductores`);
    showLoader('loader', false);

    if (res.success) {
        conductoresData = res.data || [];
        renderTabla(conductoresData);
    } else {
        showAlert(res.message, 'error');
    }
}

function renderTabla(datos) {
    const tbody = document.getElementById('tabla-conductores');
    if (!tbody) return;

    if (!datos.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay conductores registrados.</td></tr>';
        return;
    }

    tbody.innerHTML = datos.map(c => `
        <tr>
            <td>${c.id}</td>
            <td><strong>${c.nombres} ${c.apellidos}</strong></td>
            <td>${c.documento}</td>
            <td>${c.telefono || '—'}</td>
            <td>${c.numero_licencia}</td>
            <td>${c.categoria_licencia || '—'}</td>
            <td>${estadoBadge(c.estado)}</td>
            <td class="actions">
                <button class="btn btn-sm btn-primary" onclick="editarConductor(${c.id})">Editar</button>
                <button class="btn btn-sm btn-secondary" onclick="cambiarEstado(${c.id}, '${c.estado}')">Estado</button>
                <button class="btn btn-sm btn-danger" onclick="eliminarConductor(${c.id})">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

function filtrarConductores(texto) {
    const t = texto.toLowerCase();
    const filtrados = conductoresData.filter(c =>
        c.nombres.toLowerCase().includes(t) ||
        c.apellidos.toLowerCase().includes(t) ||
        c.documento.toLowerCase().includes(t) ||
        (c.email || '').toLowerCase().includes(t) ||
        c.numero_licencia.toLowerCase().includes(t)
    );
    renderTabla(filtrados);
}

function abrirModalNuevo() {
    editandoId = null;
    document.getElementById('modal-titulo').textContent = 'Nuevo Conductor';
    document.getElementById('form-conductor').reset();
    abrirModal();
}

async function editarConductor(id) {
    const res = await Http.get(`${API.conductores}/conductores/${id}`);
    if (!res.success) { showAlert(res.message, 'error'); return; }

    const c = res.data;
    editandoId = id;
    document.getElementById('modal-titulo').textContent = 'Editar Conductor';

    document.getElementById('f-nombres').value     = c.nombres     || '';
    document.getElementById('f-apellidos').value   = c.apellidos   || '';
    document.getElementById('f-documento').value   = c.documento   || '';
    document.getElementById('f-telefono').value    = c.telefono    || '';
    document.getElementById('f-email').value       = c.email       || '';
    document.getElementById('f-licencia').value    = c.numero_licencia || '';
    document.getElementById('f-categoria').value   = c.categoria_licencia || '';
    document.getElementById('f-vencimiento').value = c.fecha_vencimiento_licencia
        ? c.fecha_vencimiento_licencia.split('T')[0] : '';
    document.getElementById('f-estado').value      = c.estado      || 'disponible';

    abrirModal();
}

async function guardarConductor(e) {
    e.preventDefault();

    const body = {
        nombres:                    document.getElementById('f-nombres').value.trim(),
        apellidos:                  document.getElementById('f-apellidos').value.trim(),
        documento:                  document.getElementById('f-documento').value.trim(),
        telefono:                   document.getElementById('f-telefono').value.trim(),
        email:                      document.getElementById('f-email').value.trim(),
        numero_licencia:            document.getElementById('f-licencia').value.trim(),
        categoria_licencia:         document.getElementById('f-categoria').value.trim(),
        fecha_vencimiento_licencia: document.getElementById('f-vencimiento').value || null,
        estado:                     document.getElementById('f-estado').value,
    };

    const btn = document.getElementById('btn-guardar');
    btn.disabled = true;

    let res;
    if (editandoId) {
        res = await Http.put(`${API.conductores}/conductores/${editandoId}`, body);
    } else {
        res = await Http.post(`${API.conductores}/conductores`, body);
    }

    btn.disabled = false;

    if (res.success) {
        showAlert(res.message, 'success');
        cerrarModal();
        cargarConductores();
    } else {
        showAlert(res.message, 'error');
    }
}

async function cambiarEstado(id, estadoActual) {
    const estados = ['disponible', 'en_ruta', 'inactivo'];
    const opciones = estados.filter(e => e !== estadoActual);
    const nuevo = prompt(
        `Estado actual: ${estadoActual}\nNuevo estado (${opciones.join(' / ')}):`
    );

    if (!nuevo || !estados.includes(nuevo.trim())) {
        if (nuevo !== null) showAlert('Estado no válido.', 'error');
        return;
    }

    const res = await Http.patch(`${API.conductores}/conductores/${id}/estado`, { estado: nuevo.trim() });
    if (res.success) {
        showAlert(res.message, 'success');
        cargarConductores();
    } else {
        showAlert(res.message, 'error');
    }
}

async function eliminarConductor(id) {
    if (!confirmar('¿Eliminar este conductor? Esta acción no se puede deshacer.')) return;

    const res = await Http.delete(`${API.conductores}/conductores/${id}`);
    if (res.success) {
        showAlert(res.message, 'success');
        cargarConductores();
    } else {
        showAlert(res.message, 'error');
    }
}

function abrirModal() {
    document.getElementById('modal-conductor').classList.add('active');
}

function cerrarModal() {
    document.getElementById('modal-conductor').classList.remove('active');
    editandoId = null;
}

function renderNavUser() {
    const user = UserSession.get();
    const el = document.getElementById('nav-user');
    if (el && user) el.textContent = user.nombre || user.email;
}