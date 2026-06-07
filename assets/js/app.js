const CONFIG = {
  auth_url: 'http://localhost:8001',
  conductores_url: 'http://localhost:8002',
  vehiculos_url: 'http://localhost:8003'
};

// agregar endpoints de rutas y programacion
CONFIG.rutas_url = 'http://localhost:8004';
CONFIG.programacion_url = CONFIG.rutas_url; // mismo servicio
CONFIG.viajes_url = 'http://localhost:8005';

function setToken(token){ localStorage.setItem('lt_token', token); updateNav(); }
function getToken(){ return localStorage.getItem('lt_token'); }
function clearToken(){ localStorage.removeItem('lt_token'); updateNav(); }

async function fetchWithAuth(url, opts = {}){
  opts.headers = opts.headers || {};
  const token = getToken();
  if(token) opts.headers['Authorization'] = 'Bearer ' + token;
  opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json';
  const res = await fetch(url, opts);
  if(res.status === 401){ clearToken(); renderLogin(); throw new Error('Unauthorized'); }
  return res;
}

function show(selector, html){ document.getElementById('app').innerHTML = html; }

function updateNav(){
  const logged = !!getToken();
  document.getElementById('nav-login').style.display = logged ? 'none' : 'inline';
  document.getElementById('nav-conductores').style.display = logged ? 'inline' : 'none';
  document.getElementById('nav-rutas').style.display = logged ? 'inline' : 'none';
  document.getElementById('nav-programacion').style.display = logged ? 'inline' : 'none';
  document.getElementById('nav-vehiculos').style.display = logged ? 'inline' : 'none';
  document.getElementById('nav-logout').style.display = logged ? 'inline' : 'none';
}

function attachNav(){
  document.getElementById('nav-login').addEventListener('click', (e)=>{ e.preventDefault(); renderLogin(); });
  document.getElementById('nav-conductores').addEventListener('click', (e)=>{ e.preventDefault(); renderConductores(); });
  document.getElementById('nav-rutas').addEventListener('click', (e)=>{ e.preventDefault(); renderRutas(); });
  document.getElementById('nav-programacion').addEventListener('click', (e)=>{ e.preventDefault(); renderProgramacion(); });
  document.getElementById('nav-viajes').addEventListener('click', (e)=>{ e.preventDefault(); renderViajes(); });
  document.getElementById('nav-vehiculos').addEventListener('click', (e)=>{ e.preventDefault(); renderVehiculos(); });
  document.getElementById('nav-logout').addEventListener('click', (e)=>{ e.preventDefault(); handleLogout(); });
}

async function handleLogout(){
  const token = getToken();
  if(!token){ clearToken(); renderLogin(); return; }
  try{
    await fetch(CONFIG.auth_url + '/auth/logout', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } });
  }catch(e){ console.warn(e); }
  clearToken(); renderLogin();
}

function init(){ attachNav(); updateNav(); if(getToken()) renderConductores(); else renderLogin(); }

window.addEventListener('DOMContentLoaded', init);
