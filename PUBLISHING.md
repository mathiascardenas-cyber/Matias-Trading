# Vista previa web de Cárdenas and Corp.

El contenido publicable está en `docs/index.html`, una aplicación autocontenida con recursos locales. `npm run build` actualiza `dist/` y `docs/` simultáneamente. `docs/.nojekyll` evita el procesamiento Jekyll. No subir credenciales ni informes de cuentas.

## Publicación en GitHub Pages

Repositorio: `mathiascardenas-cyber/Matias-Trading`.

Origen que debe seleccionarse una vez en **Settings → Pages**:

- Source: **Deploy from a branch**.
- Branch: **main**.
- Folder: **/docs**.
- **Save**.

Ajustes: https://github.com/mathiascardenas-cyber/Matias-Trading/settings/pages

Dirección prevista: `https://mathiascardenas-cyber.github.io/Matias-Trading/`. Esta dirección es una previsión hasta que Pages confirme el despliegue y una petición HTTPS verifique el contenido. No presentar un sitio pendiente como activo.

La publicación solo contiene la demostración local con precios y cuentas sintéticos. No hay conexión a Deriv ni modelos de IA. El frontend no contiene contraseñas ni ejecuta órdenes externas. GitHub Pages no proporciona por sí solo un backend, autenticación privada ni conexión MT5.

## Actualizaciones

1. Cambiar la fuente y ejecutar las comprobaciones pertinentes.
2. Ejecutar `npm run build`.
3. Subir la fuente y `docs/index.html` a `main`.
4. Esperar a que finalice el despliegue Pages y revisar la versión por HTTPS.

## Acceso del entorno

Para administrar y verificar el sitio desde esta instancia se necesita HTTPS hacia `api.github.com` y `mathiascardenas-cyber.github.io`, además del acceso Git a GitHub. Guardar estos dominios en un borrador no cambia por sí mismo la política de red actual.

El CLI debe reutilizar la autenticación disponible; no pegar tokens en comandos ni archivos. Si la API sigue bloqueada, el propietario puede habilitar la fuente Pages en los ajustes anteriores sin crear secretos adicionales.
