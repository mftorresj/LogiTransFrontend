async function renderRutas(){
  show('app', `<section class="card"><h2>Rutas</h2><div style="margin-bottom:10px"><button class="btn" id="btn-nueva-ruta">Crear ruta</button></div><div id="rutas-list">Cargando...</div></section>`);
  document.getElementById('btn-nueva-ruta').addEventListener('click', ()=> renderRutaForm());
  try{
    const res = await fetchWithAuth(CONFIG.rutas_url + '/rutas');
    if(!res.ok){ document.getElementById('rutas-list').innerText = 'Error: ' + res.status; return; }
    const data = await res.json();
    const list = (data.data || data) || [];
    if(list.length === 0){ document.getElementById('rutas-list').innerHTML = '<div class="small">No hay rutas</div>'; return; }
    const rows = list.map(r => `
      <tr>
        <td>${r.id ?? ''}</td>
        <td>${r.ciudad_origen ?? ''}</td>
        <td>${r.ciudad_destino ?? ''}</td>
        <td>${r.distancia_km ?? r.distancia ?? ''}</td>
        <td>${r.tiempo_estimado_horas ?? ''}</td>
        <td><button class="btn" data-id="${r.id}" data-action="edit">Editar</button></td>
      </tr>
    `).join('');
    document.getElementById('rutas-list').innerHTML = `<table class="table"><thead><tr><th>ID</th><th>Origen</th><th>Destino</th><th>Distancia (km)</th><th>Tiempo (hrs)</th><th>Acción</th></tr></thead><tbody>${rows}</tbody></table>`;
    document.querySelectorAll('#rutas-list button[data-action="edit"]').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        const id = e.currentTarget.getAttribute('data-id');
        try{
          const r = await fetchWithAuth(CONFIG.rutas_url + '/rutas/' + id);
          const d = await r.json();
          renderRutaForm(d.data || d);
        }catch(err){ alert('Error cargando ruta'); }
      });
    });
  }catch(e){ console.error(e); document.getElementById('rutas-list').innerText = 'Error de conexión'; }
}

function renderRutaForm(ruta = {}){
  const isEdit = !!ruta.id;
  show('app', `
    <section class="card">
      <h2>${isEdit ? 'Editar' : 'Crear'} Ruta</h2>
      <div class="form-group"><label>Ciudad origen</label><input id="r_origen" value="${ruta.ciudad_origen ?? ''}" /></div>
      <div class="form-group"><label>Ciudad destino</label><input id="r_destino" value="${ruta.ciudad_destino ?? ''}" /></div>
      <div class="form-group"><label>Distancia (km)</label><input id="r_distancia" type="number" value="${ruta.distancia_km ?? ruta.distancia ?? ''}" /></div>
      <div class="form-group"><label>Tiempo estimado (horas)</label><input id="r_tiempo" type="number" step="0.1" value="${ruta.tiempo_estimado_horas ?? ''}" /></div>
      <div class="form-group"><label>Observaciones</label><input id="r_obs" value="${ruta.observaciones ?? ''}" /></div>
      <div style="display:flex;gap:8px"><button class="btn" id="r_submit">Guardar</button><button class="btn" id="r_cancel">Cancelar</button></div>
    </section>
  `);
  document.getElementById('r_cancel').addEventListener('click', ()=> renderRutas());
  document.getElementById('r_submit').addEventListener('click', async ()=>{
    const payload = {
      ciudad_origen: document.getElementById('r_origen').value.trim(),
      ciudad_destino: document.getElementById('r_destino').value.trim(),
      distancia_km: Number(document.getElementById('r_distancia').value) || 0,
      tiempo_estimado_horas: Number(document.getElementById('r_tiempo').value) || 0,
      observaciones: document.getElementById('r_obs').value.trim()
    };
    if(!payload.ciudad_origen || !payload.ciudad_destino || payload.distancia_km <= 0){ return alert('Origen, destino y distancia son obligatorios'); }
    try{
      if(isEdit){
        const res = await fetchWithAuth(CONFIG.rutas_url + '/rutas/' + ruta.id, { method: 'PUT', body: JSON.stringify(payload) });
        const d = await res.json(); if(!res.ok) return alert(d.message || 'Error al actualizar');
        alert('Ruta actualizada');
      }else{
        const res = await fetchWithAuth(CONFIG.rutas_url + '/rutas', { method: 'POST', body: JSON.stringify(payload) });
        const d = await res.json(); if(!res.ok) return alert(d.message || 'Error al crear');
        alert('Ruta creada');
      }
      renderRutas();
    }catch(err){ console.error(err); alert('Error en conexión'); }
  });
}
