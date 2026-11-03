# Cárdenas and Corp. · Investment Lab

Oficina 3D de bloques con **35 personajes animados**, seis departamentos y laboratorio de estrategias para **oro y Nasdaq**. Construida con Three.js y JavaScript; interfaz en español.

## Qué funciona hoy

- Oficina WebGL con cámara orbital, zoom, selección de salas y personajes, pausa de animación y fichas de equipos.
- Equipos: Investigación (7), Pruebas (6), Riesgo (12), Desarrollo (3), Noticias (3), Operadores (4).
- Seis cuentas **locales** de USD 100.000, tres por mercado. No son cuentas MT5.
- Señales programadas de tendencia 8/25, ruptura 20 y reversión a la media, simulaciones reproducibles, entrenamiento/OOS, costes y métricas calculadas. Los datos son **sintéticos**, no cotizaciones ni históricos reales.
- Posiciones virtuales, stops/objetivos, riesgo planificado 0,25%, límite diario 1% y total 3%. No se garantiza contener una pérdida real en esos porcentajes.
- Filtro manual de noticias, parada de emergencia, reinicio y exportación JSON de sesión.
- Estrategias en revisión quedan pendientes; ninguna pasa automáticamente a ejecución real.

**No implementado:** modelos de IA, agentes autónomos, generación de bots MQL5, conexión MT5, históricos reales, calendario/noticias en vivo, ejecución demo del broker o real, persistencia de sesiones y auditoría de producción. Los nombres de agentes son funciones visuales y no 35 procesos de IA. No hay chat simulado que se presente como IA.

## Ejecutar en el entorno

Node.js 24, npm 11 y Python 3 disponibles en la instancia actual.

```sh
cd /workspace/Matias-Trading
npm ci --no-audit --no-fund
npm start
```

`npm start` compila y sirve **dist/** en el puerto 3000. Los archivos fuente del directorio raíz requieren compilación; no servir `index.html` fuente directamente como aplicación terminada.

## Abrir en Mac

Después de `npm run build`, **dist/Cardenas-and-Corp.html** contiene todo el programa en un solo archivo (sin CDN, fuentes remotas ni servicios externos). Si transfieres ese archivo a tu Mac, ábrelo con Safari 16 o posterior, o Chrome, con WebGL habilitado. No necesita Node ni Python en el Mac. La transferencia/descarga depende de la interfaz de archivos del entorno; no hay un enlace público desplegado por esta tarea.

También puede servirse `dist/` con cualquier hosting estático. No publicar credenciales en el navegador. Un servidor localhost de la nube no se convierte en un enlace público para tu Mac.

## Validación

```sh
npm test
npm run build
npm run test:browser
```

Las pruebas de navegador usan el Chromium del entorno (`/usr/bin/chromium`) y un servidor HTTP local; ver `browser-smoke.test.js` para configuración. Si el sistema restringe el navegador, puede requerir permisos de ejecución adicionales. No descargar un navegador adicional si el existente funciona.

## Modelo de la simulación

Semilla 42 por defecto. Cada ciclo representa una barra sintética de cinco minutos y un día tiene 288 barras, sin sesiones reales ni fechas de noticias. Se evalúa un tramo de 700 barras para entrenamiento (30 de calentamiento) y 300 fuera de muestra. Los precios artificiales tienen regímenes incorporados; los resultados favorables en ellos no son evidencia predictiva. El filtro ilustrativo exige PnL positivo dentro/fuera de muestra, al menos 5 operaciones OOS y drawdown OOS menor al 3%; no es un criterio suficiente para uso real.

Un punto de exposición en el motor es una unidad artificial, **no un lote MT5**. Los límites diarios y totales se evalúan al cierre de cada barra. No modela contratos, apalancamiento, margen, swaps, todas las comisiones ni gaps de mercado reales. El navegador recargado pierde la sesión. El registro conserva como máximo 100 eventos y el gráfico 180 puntos: exportar JSON no es una auditoría histórica completa.

El botón Pausar detiene también el tiempo artificial. La parada de emergencia cierra posiciones locales al último precio sintético y exige reinicio; no envía órdenes externas. El bloqueo por noticias impide entradas, manteniendo las salidas de posiciones existentes.

## Integración MT5 y arquitectura

[ARCHITECTURE.md](ARCHITECTURE.md) describe la separación futura entre interfaz, API, datos, IA, riesgo, auditoría y puente MT5 en Windows. Broker declarado: Deriv. Servidor declarado: `Deriv.com Limited`. Símbolos declarados: oro `XAUSD`, Nasdaq `NDAQ.QQ`. Son datos aportados por el usuario, todavía no verificados contra el terminal. Faltan conexión, especificaciones de contrato, cuentas demo, reglas de fondeo, datos/noticias, proveedor de IA y aprobación de límites.

La aplicación identifica un proyecto de laboratorio; no constituye por sí misma un fondo de inversión. El código 3D depende de Three.js, bajo licencia MIT, cuyo aviso se conserva en la compilación.

## Inspección MT5 de solo lectura

Se añadió [mt5/inspect_terminal.py](mt5/inspect_terminal.py) para inspeccionar una sesión demo existente en Windows sin enviar órdenes ni leer credenciales. Instrucciones en [mt5/README.md](mt5/README.md). No es un puente de conexión con la web. Las pruebas con dobles del SDK no validan acceso real a Deriv.

## Publicación de la vista previa

`npm run build` también genera `docs/index.html` y `docs/.nojekyll`. El destino previsto es GitHub Pages, rama `main`, carpeta `/docs`. Ver [PUBLISHING.md](PUBLISHING.md) para habilitarlo y comprobar la publicación. El enlace no debe anunciarse como activo hasta verificarlo por HTTPS.
