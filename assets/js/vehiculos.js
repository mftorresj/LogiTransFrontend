async function renderVehiculos(){
  show('app', `<section class="card"><h2>Vehículos</h2>
    <div style="margin-bottom:10px"><button class="btn" id="btn-nuevo-vehiculo">Crear vehículo</button></div>
    <div id="vehiculos-list">Cargando...</div></section>`);
  document.getElementById('btn-nuevo-vehiculo').addEventListener('click', ()=> renderVehiculoForm());
  try{
    const res = await fetchWithAuth(CONFIG.vehiculos_url + '/vehiculos');
    if(!res.ok){ document.getElementById('vehiculos-list').innerText = 'Error: ' + res.status; return; }
    const data = await res.json();
    const list = (data.data || data) || [];
    if(list.length === 0){ document.getElementById('vehiculos-list').innerHTML = '<div class="small">No hay vehículos</div>'; return; }
    const rows = list.map(v => `
      <tr>
        <td>${v.id ?? ''}</td>
        <td>${v.placa ?? ''}</td>
        <td>${v.tipo ?? ''}</td>
        <td>${v.capacidad_carga ?? ''}</td>
        <td class="small">${v.estado ?? ''}</td>
        <td>
            <button class="btn" data-id="${v.id}" data-action="edit">Editar</button>
            <button class="btn" data-id="${v.id}" data-action="delete">Eliminar</button>
        </td>
      </tr>
    `).join('');
    document.getElementById('vehiculos-list').innerHTML = `
      <table class="table"><thead><tr><th>ID</th><th>Placa</th><th>Tipo</th><th>Capacidad</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${rows}</tbody></table>
    `;
    document.querySelectorAll('#vehiculos-list button[data-action="edit"]').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        const id = e.currentTarget.getAttribute('data-id');
        try{
          const r = await fetchWithAuth(CONFIG.vehiculos_url + '/vehiculos/' + id);
          const d = await r.json();
          renderVehiculoForm(d.data || d);
        }catch(err){ alert('Error cargando vehículo'); }
      });
    });
    document.querySelectorAll('#vehiculos-list button[data-action="delete"]').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        const id = e.currentTarget.getAttribute('data-id');
        if(!confirm('¿Estás seguro de que quieres eliminar este vehículo?')) return;
        try{
          const res = await fetchWithAuth(CONFIG.vehiculos_url + '/vehiculos/' + id, { method: 'DELETE' });
          const d = await res.json();
          if(!res.ok) return alert(d.message || 'Error al eliminar');
          alert('Vehículo eliminado');
          renderVehiculos();
        }catch(err){ console.error(err); alert('Error en conexión'); }
      });
    });
  }catch(e){ console.error(e); document.getElementById('vehiculos-list').innerText = 'Error de conexión'; }
}

function renderVehiculoForm(vehiculo = {}){
  const isEdit = !!vehiculo.id;
  show('app', `
    <section class="card">
      <h2>${isEdit ? 'Editar' : 'Crear'} Vehículo</h2>
      <div class="form-group"><label>Placa</label><input id="v_placa" value="${vehiculo.placa ?? ''}" /></div>
      <div class="form-group"><label>Tipo</label><input id="v_tipo" value="${vehiculo.tipo ?? ''}" /></div>
      <div class="form-group"><label>Capacidad carga</label><input id="v_capacidad_carga" type="number" value="${vehiculo.capacidad_carga ?? ''}" /></div>
      <div class="form-group"><label>Marca</label><input id="v_marca" value="${vehiculo.marca ?? ''}" /></div>
      <div class="form-group"><label>Modelo</label><input id="v_modelo" value="${vehiculo.modelo ?? ''}" /></div>
      <div class="form-group"><label>Estado</label><select id="v_estado"><option value="disponible">disponible</option><option value="en_ruta">en_ruta</option><option value="mantenimiento">mantenimiento</option><option value="inactivo">inactivo</option></select></div>
      <div style="display:flex;gap:8px"><button class="btn" id="v_submit">Guardar</button><button class="btn" id="v_cancel">Cancelar</button></div>
    </section>
  `);
  if(vehiculo.estado) document.getElementById('v_estado').value = vehiculo.estado;
  document.getElementById('v_cancel').addEventListener('click', ()=> renderVehiculos());
  document.getElementById('v_submit').addEventListener('click', async ()=>{
    const payload = {
      placa: document.getElementById('v_placa').value.trim(),
      tipo: document.getElementById('v_tipo').value.trim(),
      capacidad_carga: Number(document.getElementById('v_capacidad_carga').value) || 0,
      marca: document.getElementById('v_marca').value.trim(),
      modelo: document.getElementById('v_modelo').value.trim(),
      estado: document.getElementById('v_estado').value
    };
    if(!payload.placa || payload.capacidad_carga <= 0){ return alert('Placa y capacidad válidas son obligatorias'); }
    try{
      if(isEdit){
        const res = await fetchWithAuth(CONFIG.vehiculos_url + '/vehiculos/' + vehiculo.id, { method: 'PUT', body: JSON.stringify(payload) });
        const d = await res.json();
        if(!res.ok) return alert(d.message || 'Error al actualizar');
        alert('Vehículo actualizado');
      }else{
        const res = await fetchWithAuth(CONFIG.vehiculos_url + '/vehiculos', { method: 'POST', body: JSON.stringify(payload) });
        const d = await res.json();
        if(!res.ok) return alert(d.message || 'Error al crear');
        alert('Vehículo creado');
      }
      renderVehiculos();
    }catch(err){ console.error(err); alert('Error en conexión'); }
  });
}
