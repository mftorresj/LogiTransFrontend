document.addEventListener('DOMContentLoaded', () => {

    if (Token.exists()) {
        window.location.href = 'dashboard.html';
        return;
    }

    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', handleLogin);
    }
});

async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const btn      = document.getElementById('btn-login');

    if (!username || !password) {
        showAlert('Ingresa usuario y contraseña.', 'error');
        return;
    }

    btn.disabled    = true;
    btn.textContent = 'Ingresando...';

    const res = await Http.post(`${API.auth}/auth/login`, { username, password });

    btn.disabled    = false;
    btn.textContent = 'Ingresar';

    if (res.success) {
        Token.set(res.data.token);
        UserSession.set(res.data.user);
        window.location.href = 'dashboard.html';
    } else {
        showAlert(res.message || 'Error al iniciar sesión.', 'error');
    }
}

async function logout() {
    if (!confirmar('¿Cerrar sesión?')) return;

    await Http.post(`${API.auth}/auth/logout`, {});
    Token.remove();
    window.location.href = 'index.html';
}