async function renderConductores(){
  show('app', `<section class="card"><h2>Conductores</h2>
    <div style="margin-bottom:10px"><button class="btn" id="btn-nuevo-conductor">Crear conductor</button></div>
    <div id="conductores-list">Cargando...</div></section>`);
  document.getElementById('btn-nuevo-conductor').addEventListener('click', ()=> renderConductorForm());
  try{
    const res = await fetchWithAuth(CONFIG.conductores_url + '/conductores');
    if(!res.ok){ document.getElementById('conductores-list').innerText = 'Error: ' + res.status; return; }
    const data = await res.json();
    const list = (data.data || data) || [];
    if(list.length === 0){ document.getElementById('conductores-list').innerHTML = '<div class="small">No hay conductores</div>'; return; }
    const rows = list.map(c => `
      <tr>
        <td>${c.id ?? ''}</td>
        <td>${c.nombres ?? ''} ${c.apellidos ?? ''}</td>
        <td>${c.documento ?? ''}</td>
        <td>${c.numero_licencia ?? ''}</td>
        <td class="small">${c.estado ?? ''}</td>
        <td>
            <button class="btn" data-id="${c.id}" data-action="edit">Editar</button>
            <button class="btn" data-id="${c.id}" data-action="delete">Eliminar</button>
        </td>
      </tr>
    `).join('');
    document.getElementById('conductores-list').innerHTML = `
      <table class="table"><thead><tr><th>ID</th><th>Nombre</th><th>Documento</th><th>Licencia</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${rows}</tbody></table>
    `;
    document.querySelectorAll('#conductores-list button[data-action="edit"]').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        const id = e.currentTarget.getAttribute('data-id');
        try{
          const r = await fetchWithAuth(CONFIG.conductores_url + '/conductores/' + id);
          const d = await r.json();
          renderConductorForm(d.data || d);
        }catch(err){ alert('Error cargando conductor'); }
      });
    });
    document.querySelectorAll('#conductores-list button[data-action="delete"]').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        const id = e.currentTarget.getAttribute('data-id');
        if(!confirm('¿Estás seguro de que quieres eliminar este conductor?')) return;
        try{
          const res = await fetchWithAuth(CONFIG.conductores_url + '/conductores/' + id, { method: 'DELETE' });
          const d = await res.json();
          if(!res.ok) return alert(d.message || 'Error al eliminar');
          alert('Conductor eliminado');
          renderConductores();
        }catch(err){ console.error(err); alert('Error en conexión'); }
      });
    });
  }catch(e){ console.error(e); document.getElementById('conductores-list').innerText = 'Error de conexión'; }
}

function renderConductorForm(conductor = {}){
  const isEdit = !!conductor.id;
  show('app', `
    <section class="card">
      <h2>${isEdit ? 'Editar' : 'Crear'} Conductor</h2>
      <div class="form-group"><label>Nombres</label><input id="c_nombres" value="${conductor.nombres ?? ''}" /></div>
      <div class="form-group"><label>Apellidos</label><input id="c_apellidos" value="${conductor.apellidos ?? ''}" /></div>
      <div class="form-group"><label>Documento</label><input id="c_documento" value="${conductor.documento ?? ''}" /></div>
      <div class="form-group"><label>Número licencia</label><input id="c_numero_licencia" value="${conductor.numero_licencia ?? ''}" /></div>
      <div class="form-group"><label>Teléfono</label><input id="c_telefono" value="${conductor.telefono ?? ''}" /></div>
      <div class="form-group"><label>Email</label><input id="c_email" value="${conductor.email ?? ''}" /></div>
      <div class="form-group"><label>Categoría licencia</label><input id="c_categoria_licencia" value="${conductor.categoria_licencia ?? ''}" /></div>
      <div class="form-group"><label>Fecha vencimiento licencia</label><input id="c_fecha_vencimiento_licencia" type="date" value="${conductor.fecha_vencimiento_licencia ?? ''}" /></div>
      <div style="display:flex;gap:8px"><button class="btn" id="c_submit">Guardar</button><button class="btn" id="c_cancel">Cancelar</button></div>
    </section>
  `);
  document.getElementById('c_cancel').addEventListener('click', ()=> renderConductores());
  document.getElementById('c_submit').addEventListener('click', async ()=>{
    const payload = {
      nombres: document.getElementById('c_nombres').value.trim(),
      apellidos: document.getElementById('c_apellidos').value.trim(),
      documento: document.getElementById('c_documento').value.trim(),
      numero_licencia: document.getElementById('c_numero_licencia').value.trim(),
      telefono: document.getElementById('c_telefono').value.trim(),
      email: document.getElementById('c_email').value.trim(),
      categoria_licencia: document.getElementById('c_categoria_licencia').value.trim(),
      fecha_vencimiento_licencia: document.getElementById('c_fecha_vencimiento_licencia').value
    };
    if(!payload.nombres || !payload.apellidos || !payload.documento || !payload.numero_licencia){ return alert('Completa los campos obligatorios'); }
    try{
      if(isEdit){
        const res = await fetchWithAuth(CONFIG.conductores_url + '/conductores/' + conductor.id, { method: 'PUT', body: JSON.stringify(payload) });
        const d = await res.json();
        if(!res.ok) return alert(d.message || 'Error al actualizar');
        alert('Conductor actualizado');
      }else{
        const res = await fetchWithAuth(CONFIG.conductores_url + '/conductores', { method: 'POST', body: JSON.stringify(payload) });
        const d = await res.json();
        if(!res.ok) return alert(d.message || 'Error al crear');
        alert('Conductor creado');
      }
      renderConductores();
    }catch(err){ console.error(err); alert('Error en conexión'); }
  });
}
