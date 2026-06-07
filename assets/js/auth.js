function renderLogin(){
  show('app', `
    <section class="card">
      <h2>Login</h2>
      <div class="form-group">
        <label>Usuario (email)</label>
        <input id="login-username" />
      </div>
      <div class="form-group">
        <label>Contraseña</label>
        <input id="login-password" type="password" />
      </div>
      <button class="btn" id="login-submit">Ingresar</button>
    </section>
  `);
  document.getElementById('login-submit').addEventListener('click', async ()=>{
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    if(!username || !password) return alert('Completa usuario y contraseña');
    try{
      const res = await fetch(CONFIG.auth_url + '/auth/login', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if(!res.ok) return alert(data.message || 'Error al loguear');
      setToken(data.data.token);
      renderConductores();
    }catch(err){ console.error(err); alert('Error en conexión'); }
  });
}
