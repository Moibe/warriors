# Warriors

Táctico por turnos con estética **Final Fantasy Tactics**: mapa isométrico con
altura por casilla, cámara ortográfica que gira en cuartos de vuelta, sprites
pixel-art y sistema de turnos por Charge Time.

Construido sobre el stack habitual de estos proyectos —
**SvelteKit 2 + Svelte 5 (runes) + TypeScript + Threlte 8 / Three.js** — igual que
`hexa-turnos` y `buzito`, pero con rejilla cuadrada con relieve en vez de hexágonos.

```bash
npm install
npm run dev      # http://localhost:3030
npm run check    # svelte-check
npm run build
```

---

## Qué hay hecho

Una batalla jugable de principio a fin:

- **Terreno con altura.** Cada casilla tiene un nivel entero; la altura decide a
  dónde puedes saltar, hasta dónde llega un arco y cuánto daño extra da atacar
  desde arriba.
- **Cámara isométrica** ortográfica, 4 azimuts a 90°, 2 inclinaciones, zoom y
  desplazamiento, todo interpolado.
- **Sprites generados por código.** No hay ni un solo archivo de imagen: los
  personajes se dibujan pixel a pixel desde plantillas ASCII y se pintan con la
  paleta de cada trabajo.
- **Turnos por CT.** No hay rondas: un reloj sube el CT de cada unidad según su
  Velocidad y actúa quien pasa de 100. La ventana de orden de turno es una
  simulación real hacia adelante.
- **Combate** con ángulo de ataque (frente / flanco / espalda), ventaja de
  altura, probabilidad de acierto mostrada antes de confirmar, área de efecto,
  PM y curación.
- **IA enemiga** que puntúa cada par (habilidad, blanco) alcanzable este turno
  por daño esperado, prioriza rematar y, si no llega a nadie, avanza.
- **HUD** completo con la estética de ventana azul del original.

## Controles

| | |
|---|---|
| Clic en casilla | mover / apuntar (según la fase) |
| `1` | Mover · `2`…`9` habilidades · `0` Esperar |
| `Esc` | cancelar |
| `Q` / `E` | girar la cámara un cuarto de vuelta |
| `R` | cambiar inclinación · `C` centrar |
| Rueda | zoom · botón central o derecho arrastrando: desplazar |

---

## Estructura

```
src/lib/
  grid.ts             tipos de casilla, conversión rejilla↔mundo, parser de mapas ASCII
  maps.ts             los mapas, escritos como capas de texto
  jobs.ts             catálogo de trabajos: stats, habilidades, paleta y equipo del sprite
  units.ts            modelo de unidad + el reparto inicial
  pathfinding.ts      alcance de movimiento (BFS con Salto), rutas, rangos de habilidad
  combat.ts           ángulo, altura, fórmulas de acierto y daño (previsión y tirada)
  battle.svelte.ts    estado reactivo + motor de turnos + IA
  sprites.ts          generador de sprites pixel-art
  textures.ts         cursor, paneles de rango, sombras y números flotantes

  Scene.svelte        ensambla el mundo 3D y corre el bucle de frame
  CameraRig.svelte    cámara ortográfica isométrica
  Terrain.svelte      el mapa en dos InstancedMesh (columnas + tapas)
  TileOverlays.svelte paneles de color sobre casillas
  TileCursor.svelte   marco y flecha del cursor
  UnitSprite.svelte   sprite billboard + sombra + anillo de bando
  FloatingNumber.svelte  números de daño
  Chapel.svelte       la capilla, hecha con primitivas

  ui/                 ventanas del HUD (Window, UnitPanel, TurnOrder, CommandMenu…)

src/routes/
  +page.svelte        canvas + HUD + entrada de teclado y ratón
  +page.ts            ssr: false (todo se dibuja en canvas en el cliente)
```

---

## Cómo tocar cada cosa

### Editar el mapa

Los mapas viven en `src/lib/maps.ts` como capas paralelas de texto, un carácter
por casilla. Editar el terreno es editar el texto:

```ts
heights:  '333333..555444'   // '0'-'9','a'-'z' = niveles, '.' = hueco
surfaces: 'gggggg..kkkkkk'   // g césped · d tierra · s piedra · k roca oscura
blocked:  '.###..........'   // '#' = se dibuja pero nadie puede pisarla
```

Las tres capas deben tener las mismas filas y columnas. Para un mapa nuevo:
añade otro `MapSource`, pásalo por `parseMap()` y cámbialo en `battle.svelte.ts`
(`export const map = ...`).

### Añadir un trabajo

Una entrada en `JOBS` (`src/lib/jobs.ts`) con sus stats, su lista de habilidades
y su receta de sprite (cuerpo, sombrero, arma, escudo, paleta). No hay que tocar
nada más: el menú de órdenes, el retrato y el sprite salen de ahí.

### Dibujar un sprite nuevo

`src/lib/sprites.ts`. Los cuerpos son plantillas de 16×24 caracteres y los
complementos (cascos, sombreros, armas) son plantillas pequeñas que se estampan
encima con su propio desplazamiento. Cada letra es un hueco de la paleta:

```
O contorno   S piel      K sombra piel   H pelo    J sombra pelo   E ojo
A principal  B secundario C tela         M metal   W madera        P tocado
G piel monstruo   F acento   (espacio) transparente
```

En desarrollo, una fila con un ancho distinto al resto lanza un error al cargar,
así que no se puede desalinear una plantilla sin enterarse.

### Ajustar el equilibrio

- Stats y potencia de habilidades: `src/lib/jobs.ts`.
- Fórmulas (bonus por flanco, por altura, varianza, efecto de Fe): `combat.ts`.
- Reglas de turno (bonus de CT por no actuar / no moverse): `endTurn()` en
  `battle.svelte.ts`.

---

## Notas de implementación

- **Dos mallas instanciadas para todo el terreno.** Una caja por casilla para la
  columna y una tapa ligeramente encogida encima. Las columnas vecinas se tapan
  entre sí, así que solo se dibujan los acantilados expuestos, y el borde de
  columna que asoma alrededor de cada tapa es la retícula del tablero — gratis.
- **`$state.raw` en toda referencia a un objeto de three.js.** Un proxy profundo
  de `$state` sobre un `Object3D` convierte las mutaciones internas de three en
  escrituras reactivas y entra en bucle infinito.
- **Poses de sprite.** Solo hay dos dibujos por personaje (de frente y de
  espaldas). La orientación en pantalla se calcula proyectando la cara de la
  unidad sobre los ejes de la cámara; el espejo horizontal cubre las otras dos
  vistas. Por eso al girar la cámara los personajes se giran solos.
- **`toneMapping` desactivado** en el `<Canvas>`: el mapeado tonal por defecto
  (AgX) desatura el pixel-art. Y el canvas es transparente, así que el cielo es
  un degradado CSS por detrás.
- **La previsión y la tirada usan la misma función** (`forecast` / `rollAttack`),
  para que lo que promete la ventana de confirmación sea exactamente lo que se
  tira.

## Siguientes pasos naturales

- Más mapas y un selector de batalla.
- Objetos y equipo (ahora el arma es solo dibujo, el daño sale de la habilidad).
- Estados alterados y reacciones (contraataque, cubrir).
- Animaciones de ataque por trabajo (ahora la acción se resuelve con una pausa).
- Persistencia del escuadrón entre batallas.
