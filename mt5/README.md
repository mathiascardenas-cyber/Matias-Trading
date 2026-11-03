# Inspección local de MetaTrader 5 · solo lectura

Esta herramienta inventaría una sesión existente de MT5. **No es un puente/API, no conecta la oficina web con MT5 y nunca habilita, crea, modifica ni cierra órdenes.** No inicia sesión ni cambia de cuenta o de Market Watch. Usa únicamente el terminal que ya está instalado y autenticado en Windows.

Configuración declarada por el usuario, todavía no verificada:

- Broker: **Deriv**.
- Servidor exacto esperado: **Deriv.com Limited**.
- Oro: **XAUSD**.
- Nasdaq: **NDAQ.QQ**.

Los nombres se conservan exactamente. Una discrepancia se informa como error y no se sustituye por un servidor o símbolo parecido. El nombre comercial de una entidad no necesariamente coincide con el identificador de servidor que devuelve MT5: comprobarlo en el terminal.

## Ejecutar en Windows

1. Instalar y abrir el terminal MT5 oficial del broker y Python para Windows compatible con el paquete oficial. Iniciar sesión manualmente en una **cuenta demo**. No copiar claves al código ni enviarlas por chat.
2. Consultar la documentación oficial vigente de MetaTrader 5 para Python y verificar la versión y compatibilidad del paquete `MetaTrader5` antes de instalarlo desde PyPI. Mantener verificación TLS; no utilizar paquetes de terceros de nombre similar.
3. Desde la carpeta del proyecto ejecutar:

```powershell
py mt5/inspect_terminal.py
```

El JSON se imprime en la terminal. Si se necesita conservarlo localmente:

```powershell
py mt5/inspect_terminal.py > mt5-inspection.json
```

Ese archivo es un informe técnico; revisarlo antes de compartirlo. El script no imprime número/nombre de cuenta, rutas del terminal, credenciales, entorno ni objetos completos del SDK. No se solicitan credenciales como argumentos ni variables de entorno.

`prepared_for_demo: true` solo significa que **esta inspección** encontró una sesión demo conectada, servidor exacto, especificaciones y ticks recientes para los dos símbolos. **No autoriza trading** ni valida estrategias, sesiones, margen, comisiones completas, reglas de fondeo o límites. `orders_enabled` permanece siempre `false`. Los precios pueden estar obsoletos con mercados cerrados: el umbral inicial es 60 segundos y no se interpreta como una avería automática del broker.

Código de salida 0: inspección satisfactoria. Código 2: falta información, coincidencia, conexión, dependencia o plataforma. En Linux/Mac informa que se necesita el terminal de Windows, sin instalar ni importar el SDK.

## Pruebas locales sin MT5

```sh
python3 -m unittest discover -s mt5 -p 'test_*.py' -v
```

Se usan dobles del SDK. Cubren sesión demo, símbolos exactos, servidor distinto, cuenta real/no confirmada, símbolos/ticks ausentes u obsoletos, errores sanitizados y ausencia de llamadas de escritura. Estas pruebas no demuestran conexión con Deriv.

Después de revisar un informe obtenido realmente en Windows, el siguiente trabajo es diseñar un puente autenticado, conciliación y controles de riesgo independientes. Nada de eso se incluye en este script.
