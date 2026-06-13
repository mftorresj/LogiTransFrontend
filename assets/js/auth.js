
async function logout() {
    if (!confirmar('¿Cerrar sesión?')) return;

    await Http.post(`${API.auth}/auth/logout`, {});
    Token.remove();
    window.location.href = 'index.html';
}