let rutasData       = [];
let programacionData= [];
let conductoresOpts = [];
let vehiculosOpts   = [];
let editandoRutaId  = null;
let editandoProgId  = null;
let vistaActual     = 'rutas'; 

document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();
    renderNavUser();

    await Promise.all([cargarConductoresOpts(), cargarVehiculosOpts()]);
    cargarRutas();
    cargarProgramacion();

    document.getElementById('tab-rutas')?.addEventListener('click', () => mostrarVista('rutas'));
    document.getElementById('tab-prog')?.addEventListener('click',  () => mostrarVista('programacion'));

    document.getElementById('btn-nueva-ruta')?.addEventListener('click', abrirModalNuevaRuta);
    document.getElementById('form-ruta')?.addEventListener('submit', guardarRuta);
    document.getElementById('btn-cancelar-ruta')?.addEventListener('click', () => cerrarModal('modal-ruta'));

    document.getElementById('btn-nueva-prog')?.addEventListener('click', abrirModalNuevaProg);
    document.getElementById('form-prog')?.addEventListener('submit', guardarProgramacion);
    document.getElementById('btn-cancelar-prog')?.addEventListener('click', () => cerrarModal('modal-prog'));

    document.getElementById('buscar-ruta')?.addEventListener('input',
        debounce(e => filtrarRutas(e.target.value), 350)
    );
    document.getElementById('filtro-estado-prog')?.addEventListener('change', e => {
        const val = e.target.value;
        const filtrados = val ? programacionData.filter(p => p.estado === val) : programacionData;
        renderTablaProg(filtrados);
    });
});

function mostrarVista(vista) {
    vistaActual = vista;
    document.getElementById('seccion-rutas').style.display    = vista === 'rutas' ? 'block' : 'none';
    document.getElementById('seccion-prog').style.display     = vista === 'programacion' ? 'block' : 'none';
    document.getElementById('tab-rutas').classList.toggle('active', vista === 'rutas');
    document.getElementById('tab-prog').classList.toggle('active',  vista === 'programacion');
}

async function cargarConductoresOpts() {
    const res = await Http.get(`${API.conductores}/conductores?estado=disponible`);
    conductoresOpts = res.success ? (res.data || []) : [];
}

async function cargarVehiculosOpts() {
    const res = await Http.get(`${API.vehiculos}/vehiculos?estado=disponible`);
    vehiculosOpts = res.success ? (res.data || []) : [];
}

function llenarSelectConductores(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Seleccionar conductor --</option>' +
        conductoresOpts.map(c =>
            `<option value="${c.id}">${c.nombres} ${c.apellidos} (Doc: ${c.documento})</option>`
        ).join('');
}

function llenarSelectVehiculos(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Seleccionar vehículo --</option>' +
        vehiculosOpts.map(v =>
            `<option value="${v.id}">${v.placa} — ${v.marca} ${v.modelo}</option>`
        ).join('');
}

function llenarSelectRutas(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Seleccionar ruta --</option>' +
        rutasData.map(r =>
            `<option value="${r.id}">${r.ciudad_origen} → ${r.ciudad_destino} (${r.distancia_km} km)</option>`
        ).join('');
}

async function cargarRutas() {
    showLoader('loader-rutas', true);
    const res = await Http.get(`${API.rutas}/rutas`);
    showLoader('loader-rutas', false);

    if (res.success) {
        rutasData = res.data || [];
        renderTablaRutas(rutasData);
    } else {
        showAlert(res.message, 'error');
    }
}

function renderTablaRutas(datos) {
    const tbody = document.getElementById('tabla-rutas');
    if (!tbody) return;

    if (!datos.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay rutas registradas.</td></tr>';
        return;
    }

    tbody.innerHTML = datos.map(r => `
        <tr>
            <td>${r.id}</td>
            <td><strong>${r.ciudad_origen}</strong></td>
            <td><strong>${r.ciudad_destino}</strong></td>
            <td>${r.distancia_km} km</td>
            <td>${r.tiempo_estimado_horas ? r.tiempo_estimado_horas + ' h' : '—'}</td>
            <td class="actions">
                <button class="btn btn-sm btn-primary" onclick="editarRuta(${r.id})">Editar</button>
                <button class="btn btn-sm btn-danger" onclick="eliminarRuta(${r.id})">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

function filtrarRutas(texto) {
    const t = texto.toLowerCase();
    const filtrados = rutasData.filter(r =>
        r.ciudad_origen.toLowerCase().includes(t) ||
        r.ciudad_destino.toLowerCase().includes(t)
    );
    renderTablaRutas(filtrados);
}

function abrirModalNuevaRuta() {
    editandoRutaId = null;
    document.getElementById('titulo-modal-ruta').textContent = 'Nueva Ruta';
    document.getElementById('form-ruta').reset();
    abrirModal('modal-ruta');
}

async function editarRuta(id) {
    const res = await Http.get(`${API.rutas}/rutas/${id}`);
    if (!res.success) { showAlert(res.message, 'error'); return; }

    const r = res.data;
    editandoRutaId = id;
    document.getElementById('titulo-modal-ruta').textContent = 'Editar Ruta';

    document.getElementById('f-origen').value    = r.ciudad_origen  || '';
    document.getElementById('f-destino').value   = r.ciudad_destino || '';
    document.getElementById('f-distancia').value = r.distancia_km   || '';
    document.getElementById('f-tiempo').value    = r.tiempo_estimado_horas || '';
    document.getElementById('f-obs-ruta').value  = r.observaciones  || '';

    abrirModal('modal-ruta');
}

async function guardarRuta(e) {
    e.preventDefault();

    const distancia = parseFloat(document.getElementById('f-distancia').value);
    if (isNaN(distancia) || distancia <= 0) {
        showAlert('La distancia debe ser mayor a cero.', 'error');
        return;
    }

    const body = {
        ciudad_origen:         document.getElementById('f-origen').value.trim(),
        ciudad_destino:        document.getElementById('f-destino').value.trim(),
        distancia_km:          distancia,
        tiempo_estimado_horas: parseFloat(document.getElementById('f-tiempo').value) || 0,
        observaciones:         document.getElementById('f-obs-ruta').value.trim(),
    };

    const btn = document.getElementById('btn-guardar-ruta');
    btn.disabled = true;

    const res = editandoRutaId
        ? await Http.put(`${API.rutas}/rutas/${editandoRutaId}`, body)
        : await Http.post(`${API.rutas}/rutas`, body);

    btn.disabled = false;

    if (res.success) {
        showAlert(res.message, 'success');
        cerrarModal('modal-ruta');
        cargarRutas();
    } else {
        showAlert(res.message, 'error');
    }
}

async function eliminarRuta(id) {
    if (!confirmar('¿Eliminar esta ruta?')) return;

    const res = await Http.delete(`${API.rutas}/rutas/${id}`);
    if (res.success) {
        showAlert(res.message, 'success');
        cargarRutas();
    } else {
        showAlert(res.message, 'error');
    }
}

async function cargarProgramacion() {
    showLoader('loader-prog', true);
    const res = await Http.get(`${API.rutas}/programacion`);
    showLoader('loader-prog', false);

    if (res.success) {
        programacionData = res.data || [];
        renderTablaProg(programacionData);
    } else {
        showAlert(res.message, 'error');
    }
}

function renderTablaProg(datos) {
    const tbody = document.getElementById('tabla-prog');
    if (!tbody) return;

    if (!datos.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay viajes programados.</td></tr>';
        return;
    }

    tbody.innerHTML = datos.map(p => `
        <tr>
            <td>${p.id}</td>
            <td>${p.ruta ? `${p.ruta.ciudad_origen} → ${p.ruta.ciudad_destino}` : p.ruta_id}</td>
            <td>${p.conductor_id}</td>
            <td>${p.vehiculo_id}</td>
            <td>${formatDate(p.fecha_salida)} ${p.hora_salida || ''}</td>
            <td>${formatDate(p.fecha_estimada_llegada)}</td>
            <td>${estadoBadge(p.estado)}</td>
            <td class="actions">
                ${p.estado === 'programado' ? `
                    <button class="btn btn-sm btn-primary" onclick="reprogramar(${p.id})">Reprogramar</button>
                    <button class="btn btn-sm btn-danger" onclick="cancelarProg(${p.id})">Cancelar</button>
                ` : '—'}
            </td>
        </tr>
    `).join('');
}

async function abrirModalNuevaProg() {
    editandoProgId = null;
    document.getElementById('titulo-modal-prog').textContent = 'Programar Viaje';
    document.getElementById('form-prog').reset();

    await Promise.all([cargarConductoresOpts(), cargarVehiculosOpts()]);
    llenarSelectConductores('f-prog-conductor');
    llenarSelectVehiculos('f-prog-vehiculo');
    llenarSelectRutas('f-prog-ruta');

    abrirModal('modal-prog');
}

async function reprogramar(id) {
    const res = await Http.get(`${API.rutas}/programacion/${id}`);
    if (!res.success) { showAlert(res.message, 'error'); return; }

    const p = res.data;
    editandoProgId = id;
    document.getElementById('titulo-modal-prog').textContent = 'Reprogramar Viaje';

    await Promise.all([cargarConductoresOpts(), cargarVehiculosOpts()]);
    llenarSelectConductores('f-prog-conductor');
    llenarSelectVehiculos('f-prog-vehiculo');
    llenarSelectRutas('f-prog-ruta');

    document.getElementById('f-prog-conductor').value = p.conductor_id;
    document.getElementById('f-prog-vehiculo').value  = p.vehiculo_id;
    document.getElementById('f-prog-ruta').value      = p.ruta_id;
    document.getElementById('f-prog-fecha').value     = p.fecha_salida ? p.fecha_salida.split('T')[0] : '';
    document.getElementById('f-prog-hora').value      = p.hora_salida  || '';
    document.getElementById('f-prog-llegada').value   = p.fecha_estimada_llegada ? p.fecha_estimada_llegada.split('T')[0] : '';
    document.getElementById('f-prog-obs').value       = p.observaciones || '';

    abrirModal('modal-prog');
}

async function guardarProgramacion(e) {
    e.preventDefault();

    const body = {
        conductor_id:           parseInt(document.getElementById('f-prog-conductor').value),
        vehiculo_id:            parseInt(document.getElementById('f-prog-vehiculo').value),
        ruta_id:                parseInt(document.getElementById('f-prog-ruta').value),
        fecha_salida:           document.getElementById('f-prog-fecha').value,
        hora_salida:            document.getElementById('f-prog-hora').value,
        fecha_estimada_llegada: document.getElementById('f-prog-llegada').value || null,
        observaciones:          document.getElementById('f-prog-obs').value.trim(),
    };

    if (!body.conductor_id || !body.vehiculo_id || !body.ruta_id) {
        showAlert('Conductor, vehículo y ruta son obligatorios.', 'error');
        return;
    }

    const btn = document.getElementById('btn-guardar-prog');
    btn.disabled = true;

    const res = editandoProgId
        ? await Http.put(`${API.rutas}/programacion/${editandoProgId}`, body)
        : await Http.post(`${API.rutas}/programacion`, body);

    btn.disabled = false;

    if (res.success) {
        showAlert(res.message, 'success');
        cerrarModal('modal-prog');
        cargarProgramacion();
    } else {
        showAlert(res.message, 'error');
    }
}

async function cancelarProg(id) {
    if (!confirmar('¿Cancelar este viaje programado?')) return;

    const res = await Http.delete(`${API.rutas}/programacion/${id}`);
    if (res.success) {
        showAlert(res.message, 'success');
        cargarProgramacion();
    } else {
        showAlert(res.message, 'error');
    }
}

function abrirModal(id) { document.getElementById(id).classList.add('active'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('active'); }
function renderNavUser() {
    const user = UserSession.get();
    const el = document.getElementById('nav-user');
    if (el && user) el.textContent = user.nombre || user.email;
}