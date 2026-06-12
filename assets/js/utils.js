const Token = {
    set(token) { localStorage.setItem('lt_token', token); },
    get()      { return localStorage.getItem('lt_token'); },
    remove()   { localStorage.removeItem('lt_token'); localStorage.removeItem('lt_user'); },
    exists()   { return !!localStorage.getItem('lt_token'); },
};

const UserSession = {
    set(user)  { localStorage.setItem('lt_user', JSON.stringify(user)); },
    get()      {
        const u = localStorage.getItem('lt_user');
        return u ? JSON.parse(u) : null;
    },
};

async function http(url, options = {}) {
    const token = Token.get();

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const res = await fetch(url, { ...options, headers });
        const json = await res.json();
        return json;
    } catch (err) {
        console.error('[HTTP Error]', url, err);
        return { success: false, message: 'Error de conexión con el servidor.', data: null };
    }
}

const Http = {
    get:    (url)          => http(url, { method: 'GET' }),
    post:   (url, body)    => http(url, { method: 'POST',  body: JSON.stringify(body) }),
    put:    (url, body)    => http(url, { method: 'PUT',   body: JSON.stringify(body) }),
    patch:  (url, body)    => http(url, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (url)          => http(url, { method: 'DELETE' }),
};

function showAlert(message, type = 'success', containerId = 'alert-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

    container.innerHTML = `
        <div class="alert alert-${type}">
            <span class="alert-icon">${icons[type] || 'ℹ'}</span>
            <span class="alert-msg">${message}</span>
            <button class="alert-close" onclick="this.parentElement.remove()">×</button>
        </div>
    `;

    if (type === 'success') {
        setTimeout(() => {
            const el = container.querySelector('.alert');
            if (el) el.remove();
        }, 4000);
    }
}

function showLoader(id, show = true) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? 'flex' : 'none';
}

function requireAuth() {
    if (!Token.exists()) {
        window.location.href = 'index.html';
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('es-CO');
}

function estadoBadge(estado) {
    const map = {
        disponible:   'badge-success',
        en_ruta:      'badge-warning',
        inactivo:     'badge-secondary',
        mantenimiento:'badge-danger',
        programado:   'badge-info',
        en_transito:  'badge-primary',
        retrasado:    'badge-warning',
        finalizado:   'badge-success',
        cancelado:    'badge-danger',
    };
    const cls = map[estado] || 'badge-secondary';
    return `<span class="badge ${cls}">${estado.replace('_', ' ')}</span>`;
}

function debounce(fn, delay = 400) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

function confirmar(mensaje) {
    return window.confirm(mensaje);
}