let viajesData        = [];
let _conductoresMap   = {};
let _vehiculosMap     = {};
let _programacionesMap = {};

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    renderNavUser();
    cargarViajes();

    document.getElementById('filtro-estado')?.addEventListener('change', e => {
        const val = e.target.value;
        const filtrados = val ? viajesData.filter(v => v.estado === val) : viajesData;
        renderTabla(filtrados);
    });

    document.getElementById('buscar')?.addEventListener('input',
        debounce(e => filtrarViajes(e.target.value), 350)
    );

    document.getElementById('form-novedad')?.addEventListener('submit', guardarNovedad);
    document.getElementById('btn-cancelar-novedad')?.addEventListener('click',
        () => cerrarModal('modal-novedad')
    );
});

async function cargarViajes() {
    showLoader('loader', true);

    const [vRes, cRes, veRes, pRes] = await Promise.all([
        Http.get(`${API.viajes}/viajes`),
        Http.get(`${API.conductores}/conductores`),
        Http.get(`${API.vehiculos}/vehiculos`),
        Http.get(`${API.rutas}/programacion`)
    ]);

    showLoader('loader', false);

    if (cRes.success) {
        (cRes.data || []).forEach(c => {
            _conductoresMap[c.id] = `${c.nombres} ${c.apellidos}`;
        });
    }

    if (veRes.success) {
        (veRes.data || []).forEach(v => {
            _vehiculosMap[v.id] = `${v.placa} — ${v.marca}`;
        });
    }

    if (pRes.success) {
        (pRes.data || []).forEach(p => {
            _programacionesMap[p.id] = p;
        });
    }

    if (vRes.success) {
        viajesData = vRes.data || [];
        renderTabla(viajesData);
    } else {
        showAlert(vRes.message, 'error');
    }
}

function resolverNombres(v) {
    const prog      = _programacionesMap[v.programacion_viaje_id] ?? {};
    const conductor = _conductoresMap[prog.conductor_id] ?? `Conductor #${prog.conductor_id ?? '?'}`;
    const vehiculo  = _vehiculosMap[prog.vehiculo_id]   ?? `Vehículo #${prog.vehiculo_id   ?? '?'}`;
    return { prog, conductor, vehiculo };
}

function renderTabla(datos) {
    const tbody = document.getElementById('tabla-viajes');
    if (!tbody) return;

    if (!datos.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay viajes registrados.</td></tr>';
        return;
    }

    tbody.innerHTML = datos.map(v => {
        const { prog, conductor, vehiculo } = resolverNombres(v);
        console.log(prog)
        return `
            <tr>
                <td>${v.id}</td>
                <td>${prog.id ?? v.programacion_viaje_id ?? '—'}</td>
                <td>${conductor}</td>
                <td>${vehiculo}</td>
                <td>${estadoBadge(v.estado)}</td>
                <td>${formatDateTime(prog.fecha_salida)}</td>
                <td>${formatDateTime(prog.fecha_estimada_llegada)}</td>
                <td class="actions">${accionesViaje(v)}</td>
            </tr>
        `;
    }).join('');
}

function accionesViaje(v) {
    const btns = [];

    if (v.estado === 'programado') {
        btns.push(`<button class="btn btn-sm btn-success" onclick="iniciarViaje(${v.id})">Iniciar</button>`);
    }

    if (v.estado === 'en_transito' || v.estado === 'retrasado') {
        btns.push(`<button class="btn btn-sm btn-primary" onclick="abrirModalNovedad(${v.id})">Novedad</button>`);
        btns.push(`<button class="btn btn-sm btn-secondary" onclick="finalizarViaje(${v.id})">Finalizar</button>`);
    }

    if (!['finalizado', 'cancelado'].includes(v.estado)) {
        btns.push(`<button class="btn btn-sm btn-warning" onclick="cancelarViaje(${v.id})">Cancelar</button>`);
    }

    btns.push(`<button class="btn btn-sm btn-info" onclick="verSeguimiento(${v.id})">Seguimiento</button>`);

    return btns.join(' ');
}

function filtrarViajes(texto) {
    const t = texto.toLowerCase();
    const filtrados = viajesData.filter(v => {
        const { conductor, vehiculo } = resolverNombres(v);
        return (
            String(v.id).includes(t) ||
            conductor.toLowerCase().includes(t) ||
            vehiculo.toLowerCase().includes(t) ||
            v.estado.toLowerCase().includes(t)
        );
    });
    renderTabla(filtrados);
}

async function iniciarViaje(id) {
    if (!confirmar('¿Iniciar este viaje?')) return;

    const res = await Http.post(`${API.viajes}/viajes/${id}/iniciar`, {});
    if (res.success) {
        showAlert(res.message, 'success');
        cargarViajes();
    } else {
        showAlert(res.message, 'error');
    }
}

async function finalizarViaje(id) {
    const obs = prompt('Observaciones de cierre (opcional):') || '';
    if (obs === null) return;

    const res = await Http.post(`${API.viajes}/viajes/${id}/finalizar`, { observaciones: obs });
    if (res.success) {
        showAlert(res.message, 'success');
        cargarViajes();
    } else {
        showAlert(res.message, 'error');
    }
}

async function cancelarViaje(id) {
    if (!confirmar('¿Cancelar este viaje?')) return;

    const res = await Http.patch(`${API.viajes}/viajes/${id}/estado`, { estado: 'cancelado' });
    if (res.success) {
        showAlert(res.message, 'success');
        cargarViajes();
    } else {
        showAlert(res.message, 'error');
    }
}

let viajeNovedad = null;

function abrirModalNovedad(id) {
    viajeNovedad = id;
    document.getElementById('form-novedad').reset();
    document.getElementById('modal-novedad').classList.add('active');
}

function cerrarModalNovedad() {
    document.getElementById('modal-novedad').classList.remove('active');
    viajeNovedad = null;
}

async function guardarNovedad(e) {
    e.preventDefault();

    const body = {
        tipo:           document.getElementById('f-tipo-novedad').value,
        descripcion:    document.getElementById('f-desc-novedad').value.trim(),
        registrado_por: document.getElementById('f-registrado-por').value.trim() || 'Operador',
    };

    if (!body.descripcion) {
        showAlert('La descripción es obligatoria.', 'error');
        return;
    }

    const btn = document.getElementById('btn-guardar-novedad');
    btn.disabled = true;

    const res = await Http.post(`${API.viajes}/viajes/${viajeNovedad}/novedades`, body);
    
    btn.disabled = false;

    if (res.success) {
        showAlert('Novedad registrada correctamente.', 'success');
        cerrarModal('modal-novedad');
        cargarViajes();
    } else {
        showAlert(res.message, 'error');
    }
}

async function verSeguimiento(id) {
    const res = await Http.get(`${API.viajes}/viajes/${id}/seguimiento`);
    
    if (!res.success) {
        showAlert(res.message, 'error');
        return;
    }

    const { viaje, novedades, resumen } = res.data;
    const { prog, conductor, vehiculo } = resolverNombres(viaje);    
    const panel = document.getElementById('panel-seguimiento');
    if (!panel) return;

    panel.innerHTML = `
        <div class="seguimiento-header">
            <h3>Seguimiento — Viaje #${viaje.id}</h3>
            <button class="btn btn-sm" onclick="cerrarSeguimiento()">✕ Cerrar</button>
        </div>
        <div class="seguimiento-info">
            <div class="info-grid">
                <div><label>Estado</label><div>${estadoBadge(viaje.estado)}</div></div>
                <div><label>Conductor</label><div>${conductor}</div></div>
                <div><label>Vehículo</label><div>${vehiculo}</div></div>
                <div><label>Inicio</label><div>${formatDateTime(viaje.fecha_inicio)}</div></div>
                <div><label>Fin</label><div>${formatDateTime(viaje.fecha_fin)}</div></div>
                <div><label>Programación</label><div>${prog.id ?? viaje.programacion_viaje_id ?? '—'}</div></div>
            </div>
            <div class="resumen-novedades">
                <span class="badge badge-info">Total novedades: ${resumen.total_novedades}</span>
                <span class="badge badge-warning">Retrasos: ${resumen.retrasos}</span>
                <span class="badge badge-danger">Incidentes: ${resumen.incidentes}</span>
            </div>
        </div>
        <h4>Historial de novedades</h4>
        ${novedades.length ? `
            <table class="table">
                <thead><tr><th>Descripción</th></tr></thead>
                <tbody>
                    ${novedades.map(n => `
                        <tr>
                            <td>${n}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p class="text-muted">Sin novedades registradas.</p>'}
    `;

    panel.classList.add('active');
}

function cerrarSeguimiento() {
    document.getElementById('panel-seguimiento')?.classList.remove('active');
}

function cerrarModal(id) { document.getElementById(id)?.classList.remove('active'); }

function renderNavUser() {
    const user = UserSession.get();
    const el = document.getElementById('nav-user');
    if (el && user) el.textContent = user.nombre || user.email;
}