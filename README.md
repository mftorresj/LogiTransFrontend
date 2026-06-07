# frontend-logistica (LogiTrans Express)

Frontend sencillo en HTML/CSS/JS que consume los microservicios locales del proyecto.

Requisitos
- Colocar esta carpeta en `htdocs` de XAMPP y acceder desde: `http://localhost/LogiTransFrontend/`
- Asegurarse de que los microservicios estén corriendo en los puertos indicados en `ENDPOINTS.md`.

Archivos generados
- [index.html](index.html) — punto de entrada
- [assets/css/styles.css](assets/css/styles.css) — estilos base
- [assets/js/app.js](assets/js/app.js) — router, helpers y token handling
- [assets/js/auth.js](assets/js/auth.js) — login
- [assets/js/conductores.js](assets/js/conductores.js) — listado de conductores
- [assets/js/vehiculos.js](assets/js/vehiculos.js) — listado de vehículos

Uso rápido
1. Abrir en el navegador: `http://localhost/LogiTransFrontend/`
2. Hacer login con un usuario existente en `ms-auth`.
3. Navegar a Conductores o Vehículos.

Siguientes pasos sugeridos
- Implementar formularios de creación/edición para cada módulo.
- Agregar manejo de errores y mensajes de éxito en formularios.
- Crear módulos para `rutas`, `programacion` y `viajes`.
- Mejorar la UI y validaciones del lado cliente.
