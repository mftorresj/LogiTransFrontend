async function renderProgramacion(){
  show('app', `<section class="card"><h2>Programación de Viajes</h2><div style="margin-bottom:10px"><button class="btn" id="btn-nueva-programacion">Crear programación</button></div><div id="programacion-list">Cargando...</div></section>`);
  document.getElementById('btn-nueva-programacion').addEventListener('click', ()=> renderProgramacionForm());
  try{
    const res = await fetchWithAuth(CONFIG.programacion_url + '/programacion');
    if(!res.ok){ document.getElementById('programacion-list').innerText = 'Error: ' + res.status; return; }
    const data = await res.json();
    const list = (data.data || data) || [];
    if(list.length === 0){ document.getElementById('programacion-list').innerHTML = '<div class="small">No hay programaciones</div>'; return; }
    const rows = list.map(p => `
      <tr>
        <td>${p.id ?? ''}</td>
        <td>${p.conductor?.nombres ? p.conductor.nombres + ' ' + (p.conductor.apellidos||'') : (p.conductor_id || '')}</td>
        <td>${p.vehiculo?.placa ?? p.vehiculo_id ?? ''}</td>
        <td>${p.ruta ? (p.ruta.ciudad_origen + ' → ' + p.ruta.ciudad_destino) : (p.ruta_id || '')}</td>
        <td>${p.fecha_salida ?? ''} ${p.hora_salida ?? ''}</td>
        <td class="small">${p.estado ?? ''}</td>
        <td><button class="btn" data-id="${p.id}" data-action="edit">Editar</button></td>
      </tr>
    `).join('');
    document.getElementById('programacion-list').innerHTML = `<table class="table"><thead><tr><th>ID</th><th>Conductor</th><th>Vehículo</th><th>Ruta</th><th>Salida</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${rows}</tbody></table>`;
    document.querySelectorAll('#programacion-list button[data-action="edit"]').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        const id = e.currentTarget.getAttribute('data-id');
        try{
          const r = await fetchWithAuth(CONFIG.programacion_url + '/programacion/' + id);
          const d = await r.json();
          renderProgramacionForm(d.data || d);
        }catch(err){ alert('Error cargando programación'); }
      });
    });
  }catch(e){ console.error(e); document.getElementById('programacion-list').innerText = 'Error de conexión'; }
}

async function renderProgramacionForm(prog = {}){
  const isEdit = !!prog.id;
  show('app', `<section class="card"><h2>${isEdit ? 'Editar' : 'Crear'} Programación</h2><div id="prog-form">Cargando formulario...</div></section>`);
  try{
    // fetch conductores, vehiculos, rutas para select
    const [rc, rv, rr] = await Promise.all([
      fetchWithAuth(CONFIG.conductores_url + '/conductores'),
      fetchWithAuth(CONFIG.vehiculos_url + '/vehiculos'),
      fetchWithAuth(CONFIG.rutas_url + '/rutas')
    ]);
    const [dc, dv, dr] = await Promise.all([rc.json(), rv.json(), rr.json()]);
    const conductores = (dc.data || dc) || [];
    const vehiculos = (dv.data || dv) || [];
    const rutas = (dr.data || dr) || [];
    const optionsConductor = conductores.map(c=>`<option value="${c.id}">${c.nombres} ${c.apellidos} (${c.documento})</option>`).join('');
    const optionsVehiculo = vehiculos.map(v=>`<option value="${v.id}">${v.placa} - ${v.marca || ''} ${v.modelo || ''}</option>`).join('');
    const optionsRuta = rutas.map(r=>`<option value="${r.id}">${r.ciudad_origen} → ${r.ciudad_destino} (${r.distancia_km ?? r.distancia} km)</option>`).join('');
    document.getElementById('prog-form').innerHTML = `
      <div class="form-group"><label>Conductor</label><select id="p_conductor">${optionsConductor}</select></div>
      <div class="form-group"><label>Vehículo</label><select id="p_vehiculo">${optionsVehiculo}</select></div>
      <div class="form-group"><label>Ruta</label><select id="p_ruta">${optionsRuta}</select></div>
      <div class="form-group"><label>Fecha salida</label><input id="p_fecha_salida" type="date" value="${prog.fecha_salida ?? ''}" /></div>
      <div class="form-group"><label>Hora salida</label><input id="p_hora_salida" type="time" value="${prog.hora_salida ?? ''}" /></div>
      <div class="form-group"><label>Fecha estimada llegada</label><input id="p_fecha_llegada" type="date" value="${prog.fecha_estimada_llegada ?? ''}" /></div>
      <div class="form-group"><label>Observaciones</label><input id="p_obs" value="${prog.observaciones ?? ''}" /></div>
      <div style="display:flex;gap:8px"><button class="btn" id="p_submit">Guardar</button><button class="btn" id="p_cancel">Cancelar</button></div>
    `;
    if(prog.conductor_id) document.getElementById('p_conductor').value = prog.conductor_id;
    if(prog.vehiculo_id) document.getElementById('p_vehiculo').value = prog.vehiculo_id;
    if(prog.ruta_id) document.getElementById('p_ruta').value = prog.ruta_id;
    document.getElementById('p_cancel').addEventListener('click', ()=> renderProgramacion());
    document.getElementById('p_submit').addEventListener('click', async ()=>{
      const payload = {
        conductor_id: Number(document.getElementById('p_conductor').value) || null,
        vehiculo_id: Number(document.getElementById('p_vehiculo').value) || null,
        ruta_id: Number(document.getElementById('p_ruta').value) || null,
        fecha_salida: document.getElementById('p_fecha_salida').value,
        hora_salida: document.getElementById('p_hora_salida').value,
        fecha_estimada_llegada: document.getElementById('p_fecha_llegada').value,
        observaciones: document.getElementById('p_obs').value.trim()
      };
      if(!payload.conductor_id || !payload.vehiculo_id || !payload.ruta_id || !payload.fecha_salida){ return alert('Conductor, vehículo, ruta y fecha de salida son obligatorios'); }
      try{
        if(isEdit){
          const res = await fetchWithAuth(CONFIG.programacion_url + '/programacion/' + prog.id, { method: 'PUT', body: JSON.stringify(payload) });
          const d = await res.json(); if(!res.ok) return alert(d.message || 'Error al actualizar');
          alert('Programación actualizada');
        }else{
          const res = await fetchWithAuth(CONFIG.programacion_url + '/programacion', { method: 'POST', body: JSON.stringify(payload) });
          const d = await res.json(); if(!res.ok) return alert(d.message || 'Error al crear');
          alert('Programación creada');
        }
        renderProgramacion();
      }catch(err){ console.error(err); alert('Error en conexión'); }
    });
  }catch(err){ console.error(err); document.getElementById('prog-form').innerText = 'Error cargando datos para el formulario'; }
}
