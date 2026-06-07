async function renderViajes(){
  show('app', `<section class="card"><h2>Viajes</h2><div style="margin-bottom:10px"><button class="btn" id="btn-nuevo-viaje">Crear viaje</button></div><div id="viajes-list">Cargando...</div></section>`);
  document.getElementById('btn-nuevo-viaje').addEventListener('click', ()=> renderViajeForm());
  try{
    const res = await fetchWithAuth(CONFIG.viajes_url + '/viajes');
    if(!res.ok){ document.getElementById('viajes-list').innerText = 'Error: ' + res.status; return; }
    const data = await res.json();
    const list = (data.data || data) || [];
    if(list.length === 0){ document.getElementById('viajes-list').innerHTML = '<div class="small">No hay viajes</div>'; return; }
    const rows = list.map(v => `
      <tr>
        <td>${v.id ?? ''}</td>
        <td>${v.programacion_id ?? ''}</td>
        <td>${v.conductor?.nombres ? v.conductor.nombres + ' ' + (v.conductor.apellidos||'') : (v.conductor_id || '')}</td>
        <td>${v.vehiculo?.placa ?? v.vehiculo_id ?? ''}</td>
        <td>${v.ruta ? (v.ruta.ciudad_origen + ' → ' + v.ruta.ciudad_destino) : (v.ruta_id || '')}</td>
        <td>${v.estado ?? ''}</td>
        <td>
          <button class="btn" data-id="${v.id}" data-action="iniciar">Iniciar</button>
          <button class="btn" data-id="${v.id}" data-action="estado">Estado</button>
          <button class="btn" data-id="${v.id}" data-action="novedad">Novedad</button>
          <button class="btn" data-id="${v.id}" data-action="finalizar">Finalizar</button>
          <button class="btn" data-id="${v.id}" data-action="ver">Ver</button>
        </td>
      </tr>
    `).join('');
    document.getElementById('viajes-list').innerHTML = `<table class="table"><thead><tr><th>ID</th><th>Programación</th><th>Conductor</th><th>Vehículo</th><th>Ruta</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table>`;
    document.querySelectorAll('#viajes-list button').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        const id = e.currentTarget.getAttribute('data-id');
        const action = e.currentTarget.getAttribute('data-action');
        if(action === 'iniciar') return await handleIniciar(id);
        if(action === 'estado') return await renderEstadoForm(id);
        if(action === 'novedad') return await renderNovedadForm(id);
        if(action === 'finalizar') return await handleFinalizar(id);
        if(action === 'ver') return await renderViajeDetalle(id);
      });
    });
  }catch(e){ console.error(e); document.getElementById('viajes-list').innerText = 'Error de conexión'; }
}

async function renderViajeForm(viaje = {}){
  const isEdit = !!viaje.id;
  show('app', `<section class="card"><h2>${isEdit ? 'Editar' : 'Crear'} Viaje</h2><div id="viaje-form">Cargando...</div></section>`);
  try{
    const [pc, pv, pr] = await Promise.all([
      fetchWithAuth(CONFIG.programacion_url + '/programacion'),
      fetchWithAuth(CONFIG.vehiculos_url + '/vehiculos'),
      fetchWithAuth(CONFIG.rutas_url + '/rutas')
    ]);
    const [dc, dv, dr] = await Promise.all([pc.json(), pv.json(), pr.json()]);
    const programaciones = (dc.data || dc) || [];
    const vehiculos = (dv.data || dv) || [];
    const rutas = (dr.data || dr) || [];
    const optProg = programaciones.map(p=>`<option value="${p.id}">${p.id} - ${p.conductor_id || ''} - ${p.vehiculo_id || ''}</option>`).join('');
    const optVeh = vehiculos.map(v=>`<option value="${v.id}">${v.placa}</option>`).join('');
    const optRuta = rutas.map(r=>`<option value="${r.id}">${r.ciudad_origen} → ${r.ciudad_destino}</option>`).join('');
    document.getElementById('viaje-form').innerHTML = `
      <div class="form-group"><label>Programación</label><select id="v_programacion">${optProg}</select></div>
      <div class="form-group"><label>Conductor (opcional)</label><select id="v_conductor"><option value="">(usar programación)</option>${/* conductor list omitted to keep simple */''}</select></div>
      <div class="form-group"><label>Vehículo</label><select id="v_vehiculo">${optVeh}</select></div>
      <div class="form-group"><label>Ruta</label><select id="v_ruta">${optRuta}</select></div>
      <div class="form-group"><label>Observaciones</label><input id="v_observaciones" value="${viaje.observaciones ?? ''}" /></div>
      <div style="display:flex;gap:8px"><button class="btn" id="v_submit">Guardar</button><button class="btn" id="v_cancel">Cancelar</button></div>
    `;
    if(viaje.programacion_id) document.getElementById('v_programacion').value = viaje.programacion_id;
    if(viaje.vehiculo_id) document.getElementById('v_vehiculo').value = viaje.vehiculo_id;
    if(viaje.ruta_id) document.getElementById('v_ruta').value = viaje.ruta_id;
    document.getElementById('v_cancel').addEventListener('click', ()=> renderViajes());
    document.getElementById('v_submit').addEventListener('click', async ()=>{
      const payload = {
        programacion_id: Number(document.getElementById('v_programacion').value) || null,
        conductor_id: null,
        vehiculo_id: Number(document.getElementById('v_vehiculo').value) || null,
        ruta_id: Number(document.getElementById('v_ruta').value) || null,
        observaciones: document.getElementById('v_observaciones').value.trim()
      };
      if(!payload.programacion_id || !payload.vehiculo_id || !payload.ruta_id){ return alert('Programación, vehículo y ruta son obligatorios'); }
      try{
        if(isEdit){
          const res = await fetchWithAuth(CONFIG.viajes_url + '/viajes/' + viaje.id, { method: 'PUT', body: JSON.stringify(payload) });
          const d = await res.json(); if(!res.ok) return alert(d.message || 'Error al actualizar');
          alert('Viaje actualizado');
        }else{
          const res = await fetchWithAuth(CONFIG.viajes_url + '/viajes', { method: 'POST', body: JSON.stringify(payload) });
          const d = await res.json(); if(!res.ok) return alert(d.message || 'Error al crear');
          alert('Viaje creado');
        }
        renderViajes();
      }catch(err){ console.error(err); alert('Error en conexión'); }
    });
  }catch(err){ console.error(err); document.getElementById('viaje-form').innerText = 'Error cargando datos'; }
}

async function handleIniciar(id){
  if(!confirm('Iniciar viaje ' + id + '?')) return;
  try{
    const res = await fetchWithAuth(CONFIG.viajes_url + '/viajes/' + id + '/iniciar', { method: 'POST' });
    if(!res.ok){ const d = await res.json(); return alert(d.message || 'Error'); }
    alert('Viaje iniciado'); renderViajes();
  }catch(e){ console.error(e); alert('Error en conexión'); }
}

async function handleFinalizar(id){
  if(!confirm('Finalizar viaje ' + id + '?')) return;
  try{
    const res = await fetchWithAuth(CONFIG.viajes_url + '/viajes/' + id + '/finalizar', { method: 'POST' });
    if(!res.ok){ const d = await res.json(); return alert(d.message || 'Error'); }
    alert('Viaje finalizado'); renderViajes();
  }catch(e){ console.error(e); alert('Error en conexión'); }
}

async function renderEstadoForm(id){
  show('app', `<section class="card"><h2>Actualizar Estado</h2><div class="form-group"><label>Estado</label><select id="estado_select"><option value="programado">programado</option><option value="en_transito">en_transito</option><option value="retrasado">retrasado</option><option value="finalizado">finalizado</option><option value="cancelado">cancelado</option></select></div><div style="display:flex;gap:8px"><button class="btn" id="estado_submit">Actualizar</button><button class="btn" id="estado_cancel">Cancelar</button></div></section>`);
  document.getElementById('estado_cancel').addEventListener('click', ()=> renderViajes());
  document.getElementById('estado_submit').addEventListener('click', async ()=>{
    const estado = document.getElementById('estado_select').value;
    try{
      const res = await fetchWithAuth(CONFIG.viajes_url + '/viajes/' + id + '/estado', { method: 'PATCH', body: JSON.stringify({ estado }) });
      const d = await res.json(); if(!res.ok) return alert(d.message || 'Error al actualizar');
      alert('Estado actualizado'); renderViajes();
    }catch(e){ console.error(e); alert('Error en conexión'); }
  });
}

async function renderNovedadForm(id){
  show('app', `<section class="card"><h2>Registrar Novedad</h2><div class="form-group"><label>Tipo</label><select id="n_tipo"><option value="observacion">observacion</option><option value="retraso">retraso</option><option value="incidente">incidente</option></select></div><div class="form-group"><label>Descripción</label><input id="n_desc" /></div><div class="form-group"><label>Registrado por</label><input id="n_por" /></div><div style="display:flex;gap:8px"><button class="btn" id="n_submit">Enviar</button><button class="btn" id="n_cancel">Cancelar</button></div></section>`);
  document.getElementById('n_cancel').addEventListener('click', ()=> renderViajes());
  document.getElementById('n_submit').addEventListener('click', async ()=>{
    const payload = { tipo: document.getElementById('n_tipo').value, descripcion: document.getElementById('n_desc').value.trim(), registrado_por: document.getElementById('n_por').value.trim() };
    if(!payload.descripcion) return alert('Descripción obligatoria');
    try{
      const res = await fetchWithAuth(CONFIG.viajes_url + '/viajes/' + id + '/novedades', { method: 'POST', body: JSON.stringify(payload) });
      const d = await res.json(); if(!res.ok) return alert(d.message || 'Error al crear novedad');
      alert('Novedad registrada'); renderViajes();
    }catch(e){ console.error(e); alert('Error en conexión'); }
  });
}

async function renderViajeDetalle(id){
  show('app', `<section class="card"><h2>Detalle viaje ${id}</h2><div id="viaje-detalle">Cargando...</div></section>`);
  try{
    const res = await fetchWithAuth(CONFIG.viajes_url + '/viajes/' + id);
    if(!res.ok){ document.getElementById('viaje-detalle').innerText = 'Error: ' + res.status; return; }
    const d = await res.json(); const v = d.data || d;
    document.getElementById('viaje-detalle').innerHTML = `
      <div><strong>ID:</strong> ${v.id ?? ''}</div>
      <div><strong>Estado:</strong> ${v.estado ?? ''}</div>
      <div><strong>Programación:</strong> ${v.programacion_id ?? ''}</div>
      <div><strong>Observaciones:</strong> ${v.observaciones ?? ''}</div>
      <div style="margin-top:8px"><button class="btn" id="detalle_back">Volver</button></div>
    `;
    document.getElementById('detalle_back').addEventListener('click', ()=> renderViajes());
  }catch(e){ console.error(e); document.getElementById('viaje-detalle').innerText = 'Error de conexión'; }
}
