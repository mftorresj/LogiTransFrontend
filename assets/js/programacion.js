let programacionData = [];
let conductoresDisp  = [];
let vehiculosDisp    = [];
let rutasAll         = [];
let editandoId       = null;

document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();
    renderNavUser();

    await cargarDatosSelects();
    cargarProgramacion();

    document.getElementById('btn-nueva')?.addEventListener('click', abrirModalNueva);
    document.getElementById('form-prog')?.addEventListener('submit', guardarProgramacion);
    document.getElementById('btn-cancelar')?.addEventListener('click', cerrarModal);

    document.getElementById('filtro-estado')?.addEventListener('change', aplicarFiltros);
    document.getElementById('filtro-fecha')?.addEventListener('change',  aplicarFiltros);
    document.getElementById('buscar')?.addEventListener('input',
        debounce(aplicarFiltros, 350)
    );
});

async function cargarDatosSelects() {
    const [rCond, rVeh, rRutas] = await Promise.all([
        Http.get(`${API.conductores}/conductores`),
        Http.get(`${API.vehiculos}/vehiculos`),
        Http.get(`${API.rutas}/rutas`),
    ]);

    conductoresDisp = rCond.success  ? (rCond.data  || []) : [];
    vehiculosDisp   = rVeh.success   ? (rVeh.data   || []) : [];
    rutasAll        = rRutas.success ? (rRutas.data || []) : [];
}

async function cargarProgramacion() {
    showLoader('loader', true);
    const res = await Http.get(`${API.rutas}/programacion`);
    showLoader('loader', false);

    if (res.success) {
        programacionData = res.data || [];
        renderTabla(programacionData);
        actualizarContador(programacionData.length);
    } else {
        showAlert(res.message, 'error');
    }
}

function renderTabla(datos) {
    const tbody = document.getElementById('tabla-prog');
    if (!tbody) return;

    if (!datos.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted" style="padding:2rem">
                    No hay viajes programados. Usa el botón "+ Programar viaje" para crear uno.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = datos.map(p => {
        const rutaNombre = p.ruta
            ? `${p.ruta.ciudad_origen} → ${p.ruta.ciudad_destino}`
            : `Ruta #${p.ruta_id}`;

        const conductor = conductoresDisp.find(c => c.id === p.conductor_id);
        const vehiculo  = vehiculosDisp.find(v => v.id === p.vehiculo_id);

        const conductorNombre = conductor
            ? `${conductor.nombres} ${conductor.apellidos}`
            : `ID ${p.conductor_id}`;
        const vehiculoNombre = vehiculo
            ? `${vehiculo.placa} — ${vehiculo.marca}`
            : `ID ${p.vehiculo_id}`;

        const puedoReprogramar = p.estado === 'programado';

        return `
        <tr>
            <td><strong>#${p.id}</strong></td>
            <td>
                <span title="${rutaNombre}" style="font-weight:500">${rutaNombre}</span>
            </td>
            <td>
                <div>${conductorNombre}</div>
                <div class="text-muted text-sm">ID: ${p.conductor_id}</div>
            </td>
            <td>
                <div>${vehiculoNombre}</div>
                <div class="text-muted text-sm">ID: ${p.vehiculo_id}</div>
            </td>
            <td>
                <div>${formatDate(p.fecha_salida)}</div>
                <div class="text-muted text-sm">${p.hora_salida || ''}</div>
            </td>
            <td>${formatDate(p.fecha_estimada_llegada)}</td>
            <td>${estadoBadge(p.estado)}</td>
            <td class="text-muted text-sm">
                ${p.observaciones
                    ? p.observaciones.substring(0, 35) + (p.observaciones.length > 35 ? '…' : '')
                    : '—'}
            </td>
            <td class="actions">
                ${puedoReprogramar ? `
                    <button class="btn btn-sm btn-primary"
                            onclick="reprogramarViaje(${p.id})"
                            title="Reprogramar este viaje">
                           Reprogramar
                    </button>
                    <button class="btn btn-sm btn-danger"
                            onclick="cancelarProgramacion(${p.id})"
                            title="Cancelar programación">
                        ✕ Cancelar
                    </button>
                ` : `<span class="text-muted text-sm">Sin acciones</span>`}
            </td>
        </tr>`;
    }).join('');
}

function aplicarFiltros() {
    const estado = document.getElementById('filtro-estado')?.value || '';
    const fecha  = document.getElementById('filtro-fecha')?.value  || '';
    const texto  = (document.getElementById('buscar')?.value || '').toLowerCase().trim();

    let filtrados = [...programacionData];

    if (estado) {
        filtrados = filtrados.filter(p => p.estado === estado);
    }

    if (fecha) {
        filtrados = filtrados.filter(p =>
            p.fecha_salida && p.fecha_salida.startsWith(fecha)
        );
    }

    if (texto) {
        filtrados = filtrados.filter(p => {
            const conductor = conductoresDisp.find(c => c.id === p.conductor_id);
            const vehiculo  = vehiculosDisp.find(v => v.id === p.vehiculo_id);
            const ruta      = p.ruta || rutasAll.find(r => r.id === p.ruta_id);

            return (
                String(p.id).includes(texto) ||
                (conductor && `${conductor.nombres} ${conductor.apellidos}`.toLowerCase().includes(texto)) ||
                (vehiculo  && vehiculo.placa.toLowerCase().includes(texto)) ||
                (ruta      && `${ruta.ciudad_origen} ${ruta.ciudad_destino}`.toLowerCase().includes(texto))
            );
        });
    }

    renderTabla(filtrados);
    actualizarContador(filtrados.length);
}

function llenarSelectores(conductorSeleccionado = null, vehiculoSeleccionado = null, rutaSeleccionada = null) {
    const selConductor = document.getElementById('f-conductor');
    const selVehiculo  = document.getElementById('f-vehiculo');
    const selRuta      = document.getElementById('f-ruta');

    const conductoresFiltrados = conductoresDisp.filter(c =>
        c.estado === 'disponible' || c.id === conductorSeleccionado
    );

    selConductor.innerHTML = '<option value="">— Seleccionar conductor disponible —</option>' +
        conductoresFiltrados.map(c => {
            const vencida = c.fecha_vencimiento_licencia &&
                new Date(c.fecha_vencimiento_licencia) < new Date();
            const label = `${c.nombres} ${c.apellidos} · Doc: ${c.documento} · Lic: ${c.numero_licencia}${vencida ? ' ⚠️ LICENCIA VENCIDA' : ''}`;
            return `<option value="${c.id}" ${c.id === conductorSeleccionado ? 'selected' : ''}
                    ${vencida ? 'style="color:#dc2626"' : ''}>${label}</option>`;
        }).join('');

    if (!conductoresFiltrados.length) {
        selConductor.innerHTML = '<option value="">No hay conductores disponibles</option>';
    }

    const vehiculosFiltrados = vehiculosDisp.filter(v =>
        v.estado === 'disponible' || v.id === vehiculoSeleccionado
    );

    selVehiculo.innerHTML = '<option value="">— Seleccionar vehículo disponible —</option>' +
        vehiculosFiltrados.map(v => {
            const enMantenimiento = v.estado === 'mantenimiento';
            const label = `${v.placa} · ${v.marca} ${v.modelo} · ${v.capacidad_carga} ton${enMantenimiento ? ' 🔧 MANTENIMIENTO' : ''}`;
            return `<option value="${v.id}" ${v.id === vehiculoSeleccionado ? 'selected' : ''}
                    ${enMantenimiento ? 'style="color:#dc2626"' : ''}>${label}</option>`;
        }).join('');

    if (!vehiculosFiltrados.length) {
        selVehiculo.innerHTML = '<option value="">No hay vehículos disponibles</option>';
    }

    selRuta.innerHTML = '<option value="">— Seleccionar ruta —</option>' +
        rutasAll.map(r =>
            `<option value="${r.id}" ${r.id === rutaSeleccionada ? 'selected' : ''}>
                ${r.ciudad_origen} → ${r.ciudad_destino} · ${r.distancia_km} km · ~${r.tiempo_estimado_horas || '?'} h
            </option>`
        ).join('');

    if (!rutasAll.length) {
        selRuta.innerHTML = '<option value="">No hay rutas registradas — crea una primero</option>';
    }
}

async function abrirModalNueva() {
    editandoId = null;
    document.getElementById('modal-titulo').textContent = 'Programar Viaje';
    document.getElementById('form-prog').reset();

    await cargarDatosSelects();
    llenarSelectores();

    document.getElementById('f-fecha-salida').min = new Date().toISOString().split('T')[0];

    document.getElementById('modal-prog').classList.add('active');
}

async function reprogramarViaje(id) {
    const res = await Http.get(`${API.rutas}/programacion/${id}`);
    if (!res.success) { showAlert(res.message, 'error'); return; }

    const p = res.data;

    if (p.estado !== 'programado') {
        showAlert(`No se puede reprogramar un viaje en estado "${p.estado}".`, 'error');
        return;
    }

    editandoId = id;
    document.getElementById('modal-titulo').textContent = `Reprogramar Viaje #${id}`;

    await cargarDatosSelects();
    llenarSelectores(p.conductor_id, p.vehiculo_id, p.ruta_id);

    document.getElementById('f-fecha-salida').value  = p.fecha_salida ? p.fecha_salida.split('T')[0] : '';
    document.getElementById('f-hora-salida').value   = p.hora_salida  || '';
    document.getElementById('f-fecha-llegada').value = p.fecha_estimada_llegada
        ? p.fecha_estimada_llegada.split('T')[0] : '';
    document.getElementById('f-observaciones').value = p.observaciones || '';

    document.getElementById('modal-prog').classList.add('active');
}

async function guardarProgramacion(e) {
    e.preventDefault();

    const conductorId = parseInt(document.getElementById('f-conductor').value);
    const vehiculoId  = parseInt(document.getElementById('f-vehiculo').value);
    const rutaId      = parseInt(document.getElementById('f-ruta').value);
    const fechaSalida = document.getElementById('f-fecha-salida').value;
    const horaSalida  = document.getElementById('f-hora-salida').value;
    const fechaLleg   = document.getElementById('f-fecha-llegada').value;
    const obs         = document.getElementById('f-observaciones').value.trim();

    if (!conductorId) { showAlert('Debes seleccionar un conductor.', 'error'); return; }
    if (!vehiculoId)  { showAlert('Debes seleccionar un vehículo.', 'error');  return; }
    if (!rutaId)      { showAlert('Debes seleccionar una ruta.', 'error');     return; }
    if (!fechaSalida) { showAlert('La fecha de salida es obligatoria.', 'error'); return; }
    if (!horaSalida)  { showAlert('La hora de salida es obligatoria.', 'error');  return; }

    const conductor = conductoresDisp.find(c => c.id === conductorId);
    if (conductor && conductor.estado === 'inactivo') {
        showAlert('No puedes asignar un conductor con estado "inactivo".', 'error');
        return;
    }

    const vehiculo = vehiculosDisp.find(v => v.id === vehiculoId);
    if (vehiculo && vehiculo.estado === 'mantenimiento') {
        showAlert('No puedes asignar un vehículo en "mantenimiento".', 'error');
        return;
    }
    if (vehiculo && vehiculo.estado === 'inactivo') {
        showAlert('No puedes asignar un vehículo con estado "inactivo".', 'error');
        return;
    }

    if (fechaLleg && fechaLleg < fechaSalida) {
        showAlert('La fecha estimada de llegada no puede ser anterior a la fecha de salida.', 'error');
        return;
    }

    const body = {
        conductor_id:           conductorId,
        vehiculo_id:            vehiculoId,
        ruta_id:                rutaId,
        fecha_salida:           fechaSalida,
        hora_salida:            horaSalida,
        fecha_estimada_llegada: fechaLleg || null,
        observaciones:          obs,
    };

    const btn = document.getElementById('btn-guardar');
    btn.disabled    = true;
    btn.textContent = editandoId ? 'Reprogramando...' : 'Programando...';

    const res = editandoId
        ? await Http.put(`${API.rutas}/programacion/${editandoId}`, body)
        : await Http.post(`${API.rutas}/programacion`, body);

    btn.disabled    = false;
    btn.textContent = editandoId ? 'Guardar cambios' : 'Programar viaje';

    if (res.success) {
        showAlert(res.message, 'success');
        cerrarModal();
        await cargarDatosSelects();
        cargarProgramacion();
    } else {
        showAlert(res.message, 'error');
    }
}
async function cancelarProgramacion(id) {
    if (!confirmar(`¿Cancelar la programación #${id}?\nEsta acción no se puede deshacer.`)) return;

    const res = await Http.delete(`${API.rutas}/programacion/${id}`);
    if (res.success) {
        showAlert('Programación cancelada correctamente.', 'success');
        cargarProgramacion();
    } else {
        showAlert(res.message, 'error');
    }
}

function cerrarModal() {
    document.getElementById('modal-prog').classList.remove('active');
    editandoId = null;
}

function actualizarContador(n) {
    const el = document.getElementById('contador');
    if (el) el.textContent = `${n} registro${n !== 1 ? 's' : ''}`;
}

function renderNavUser() {
    const user = UserSession.get();
    const el   = document.getElementById('nav-user');
    if (el && user) el.textContent = user.nombre || user.email;
}