# Cárdenas and Corp. · Arquitectura del laboratorio

## Alcance de esta versión

La oficina 3D representa un laboratorio de trading con 35 agentes animados. El motor local permite explorar investigación, pruebas y controles de riesgo con datos sintéticos reproducibles. Los personajes no son agentes de IA conectados: sus funciones actuales están definidas por reglas locales.

Las seis cuentas son simulaciones locales de USD 100.000 cada una, para un capital nominal ficticio total de USD 600.000. No son cuentas demo abiertas en MetaTrader 5, no contienen dinero y no envían órdenes a un broker. El resultado de una simulación sintética no demuestra rentabilidad.

El nombre y la oficina identifican el proyecto de software. No constituyen una sociedad ni un fondo de inversiones. La gestión de capital ajeno requerirá una estructura jurídica y revisión profesional apropiadas a la jurisdicción elegida.

## Equipos y responsabilidades

| Equipo | Agentes | Distribución y entrega |
| --- | ---: | --- |
| Investigación | 7 | Un coordinador y tres investigadores por mercado. Hipótesis, especificación de estrategia, datos, costes y resultados reproducibles. |
| Pruebas | 6 | Tres bots por mercado, cada uno con una cuenta separada de USD 100.000. Informes de backtest, validación y forward test demo. |
| Riesgo | 12 | Cinco responsables por mercado y dos transversales para cartera y controles comunes de conectividad, ejecución y reglas de cuentas propias o de fondeo. |
| Desarrollo | 3 | Un desarrollador por mercado y uno para infraestructura común. Código versionado, pruebas, paquetes y despliegues controlados. |
| Noticias | 3 | Un responsable por mercado y un coordinador del calendario. Fuentes, eventos relevantes, actualización y ventanas de bloqueo. |
| Operadores | 4 | Uno por mercado, un coordinador y un responsable de conciliación. Ejecución de versiones aprobadas y supervisión. |

La auditoría y la validación independiente son funciones transversales de estos equipos. Una estrategia no debe aprobar su propia evaluación.

## Mercados y contrato del instrumento

Solo se habilitarán **oro y Nasdaq**, con tres cuentas demo locales por mercado. El usuario ha indicado la siguiente configuración objetivo:

| Campo | Valor indicado por el usuario | Estado |
| --- | --- | --- |
| Plataforma | MetaTrader 5 | Integración pendiente |
| Broker | Deriv | No verificado contra el terminal |
| Servidor | `Deriv.com Limited` | No verificado contra el terminal |
| Oro | `XAUSD` | Símbolo indicado por el usuario, no verificado |
| Nasdaq | `NDAQ.QQ` | Símbolo indicado por el usuario, no verificado |

Estos datos son metadatos proporcionados por el usuario: no prueban acceso, disponibilidad del instrumento ni conectividad. No se corrigen ni sustituyen los símbolos por suposiciones. Debe consultarse el catálogo de instrumentos del terminal para confirmar sus nombres exactos, productos y especificaciones antes de habilitar órdenes.

Antes de habilitar un símbolo, registrar y verificar en MT5: nombre exacto, tipo de producto, divisa de beneficio y margen, tamaño de contrato, tick size y tick value, lotaje mínimo/máximo y paso, stops mínimos, modo de ejecución, sesiones, zona horaria, comisiones, swaps y restricciones de órdenes. Una discrepancia entre la especificación y el terminal bloquea nuevas entradas.

## Servicios previstos

```text
Oficina 3D / interfaz
        |
API autenticada y control de acceso
        |
Orquestador de trabajos y registro de estrategias
        |-- Investigación / agentes IA / herramientas restringidas
        |-- Servicio de datos históricos y calendario de noticias
        |-- Backtesting y validación fuera de muestra
        |-- Motor de riesgo independiente y límites de cartera
        |-- Registro de decisiones y aprobaciones
        |-- Puente MT5 -> terminal Windows -> broker
        |-- Conciliación de posiciones, órdenes y operaciones
        |
Base de datos y almacenamiento de artefactos versionados
```

La interfaz muestra estados y solicita acciones a la API; no decide ni autoriza órdenes por sí sola. El motor de riesgo valida cada intención de orden inmediatamente antes de enviarla. Los agentes IA proponen hipótesis y cambios mediante herramientas acotadas, sin acceso directo a credenciales ni capacidad para cambiar sus propios límites.

Para la integración prevista con Python/MT5, preparar un servicio en Windows con un terminal MT5 instalado, autenticado y supervisado. Una página web en un Mac no conecta directamente con ese terminal. El servicio debe usar una API autenticada, transporte cifrado, lista explícita de cuentas/símbolos y controles de idempotencia para evitar órdenes duplicadas. Las credenciales permanecen en el servidor o almacén seguro; nunca en HTML, JavaScript del navegador, repositorios o chat.

Esta versión no implementa esos servicios ni el puente MT5.

## Flujo de una estrategia

1. **Hipótesis:** mercado, horizonte, reglas de señal y salida, parámetros, presupuesto de experimentos y criterios de rechazo definidos antes de buscar resultados.
2. **Desarrollo:** implementación versionada y pruebas de órdenes, costes, tamaños de posición, sesiones y ausencia de anticipación.
3. **Backtest:** históricos adecuados al instrumento, separación temporal entrenamiento/validación/test y costes realistas. Guardar datos, semilla, código y parámetros de cada corrida.
4. **Validación independiente:** resultados fuera de muestra, walk-forward, sensibilidad, distintos regímenes, estrés de spread/deslizamiento y número suficiente de operaciones. Registrar todos los intentos para reducir sesgos de selección.
5. **Demo MT5:** conexión primero de solo lectura, después forward test con órdenes demo y conciliación. Asignar tres cuentas al oro y tres al Nasdaq, usando seis cuentas separadas si el broker las proporciona; de lo contrario, documentar el aislamiento disponible sin afirmar que existen seis cuentas independientes.
6. **Revisión:** comparar ejecución real de la demo con el modelo, estabilidad, drawdown, riesgo agregado y reglas del broker/firma de fondeo. Los umbrales se acuerdan antes de evaluar.
7. **Aprobación humana:** autorizar una versión de bot, cuenta, símbolo y límites concretos. Un resultado positivo no promueve automáticamente a real.
8. **Real autorizado:** comenzar con un alcance y tamaño acotados, supervisión, conciliación continua y posibilidad de volver a demo. Cualquier modificación material exige nueva validación.

El motor sintético puede ilustrar etapas y cálculos; no satisface los criterios para entrar en demo MT5 ni en real.

## Datos históricos y noticias

Elegir proveedores, cobertura, granularidad y licencias antes de evaluar estrategias. Conservar procedencia, versión, zona horaria, discontinuidades y costes. No mezclar sin ajuste un índice, un CFD y un futuro; para futuros definir la política de vencimientos y rollovers.

Noticias necesita calendario económico y una fuente verificable, con hora del evento, divisa, impacto, última actualización y ventanas configurables antes y después. La falta de calendario no significa ausencia de noticias. La política para datos o calendario obsoletos debe bloquear nuevas entradas cuando no pueda demostrarse que las condiciones son válidas. El control manual del prototipo es una prueba de bloqueo y no representa una noticia real.

## Riesgo y parada

Los valores iniciales del laboratorio —0,25% por operación, 1% de pérdida diaria y 3% total— son límites de demostración, no una recomendación calibrada. Para cada cuenta acordar la base de cálculo, la zona horaria de reinicio diario, el tratamiento de equity flotante, depósitos y retiradas, y las reglas de pérdidas estáticas o trailing de la firma de fondeo.

Aplicar límites de posición, cuenta, estrategia y cartera. Oro y Nasdaq pueden compartir factores de riesgo: seis cuentas no garantizan diversificación. Medir la exposición agregada de las tres cuentas por mercado y sus dependencias entre mercados. Validar stop, margen, spread, deslizamiento, antigüedad de precio, conexión y horario antes de cada orden. Si falta un dato necesario, rechazar nuevas entradas.

Separar dos acciones:

- **Detener nuevas entradas:** bloquea nuevas órdenes; mantiene la gestión de las posiciones existentes.
- **Cerrar posiciones:** solicita liquidación y confirma su ejecución mediante conciliación. No debe afirmarse que una posición está cerrada por haber enviado la solicitud.

La parada de emergencia de producción debe persistir en el servidor, seguir vigente tras reinicios y exigir revisión explícita para rearmarse. El estado de una página o botón no es un control suficiente.

## Auditoría y operación

Guardar de forma persistente señales, datos de entrada, versión del bot, límites aplicados, rechazos, aprobaciones, solicitudes, respuestas del broker y conciliaciones. El registro visual acotado del prototipo no es un historial de auditoría de producción. Incorporar monitorización, alertas, copias de seguridad, control de acceso y recuperación de fallos antes de operar.

## Información pendiente

- Verificar en el terminal el broker Deriv, el servidor `Deriv.com Limited` y los símbolos indicados `XAUSD` y `NDAQ.QQ`.
- Confirmar disponibilidad de seis cuentas demo, tres por mercado, su divisa y las especificaciones de los dos instrumentos.
- Tipo de cuentas reales: propias o firma de fondeo, y reglas de cada una.
- Proveedores y licencias de históricos y noticias.
- Proveedor de IA, presupuesto y política de herramientas/autorizaciones.
- Límites aprobados de riesgo, criterios de validación y persona responsable de autorizar despliegues.
- Infraestructura Windows para el terminal y despliegue seguro de API, base de datos y trabajadores.

El siguiente paso de integración es comprobar en el terminal la configuración de Deriv indicada por el usuario y verificar una cuenta demo MT5 en modo de solo lectura. La habilitación de órdenes demo viene después de comprobar instrumentos, permisos, datos y controles; la operación real queda para una aprobación específica posterior.
