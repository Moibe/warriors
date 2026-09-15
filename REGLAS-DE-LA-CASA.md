# Reglas de la casa

Las invariantes de este proyecto, y **qué se rompió cada vez que se saltaron**.

Ninguna está aquí por gusto. Todas son la cicatriz de un fallo concreto, y el
número de veces que ha caído cada una está apuntado, porque una regla que ha
caído cinco veces necesita leerse distinto de una que nunca ha caído.

---

## Sprites y paletas

### Todo hueco de paleta que use el aspecto común de una banda hay que declararlo

**Ha caído cinco veces.** Es, con diferencia, el fallo más repetido del proyecto.

`palette(GANG_COLORS)` funde los colores de la banda sobre `BASE_PALETTE`. Un hueco
que no declares **no da error**: se queda con el valor base y nadie se entera hasta
que alguien mira una captura.

Las cinco veces, y cada una en una dirección distinta:

1. Cuatro de nueve Turnbull salieron **con pelo**: `H`/`J` (el cráneo rapado) no
   estaban en su paleta y cayeron al castaño base.
2. Dutch salió con **el cuello rojo**: `G` es la camiseta interior en esa plantilla,
   no una cicatriz.
3. El chaleco de los Warriors **desaparecía** sobre la piel oscura.
4. En los Rogues, `G` sin declarar era un **agujero con una luz detrás** sobre arena
   clara.
5. En los Riffs, `G` es la solapa del kimono y lo obvio era el hueso — y el hueso
   habría puesto **el valor más brillante del tablero en el pecho del enemigo**, en
   el único escenario donde el jugador no ha visto nunca ninguna de las dos
   siluetas. Va en negro.

**Cómo se comprueba:** `npm run sheet -- <ids>` dibuja a quien le pidas. Es la única
herramienta que ve esto; `npm run check` no.

### Las plantillas se validan al cargar, pero sólo el ancho

`template()` revienta en desarrollo si las filas de una plantilla no miden lo mismo.
**No comprueba el número de filas**, así que una plantilla de 23 filas donde tocan
24 pasa y descuadra el sprite. Cuando se generen plantillas con un script, se
valida ancho *y* alto antes de escribir.

### La silueta manda sobre el color

A dieciséis píxeles, un Warrior, un Rogue y un Punk son todos "una persona". Lo que
dice cuál es:

- **Punks** — el pie. Bota ancha con ruedas debajo (Vance) o bota estrecha (el resto).
  Y el peto: un rectángulo de tela por el pecho con dos tirantes.
- **Riffs** — las gafas de sol, una **fila entera** de `E` cruzando la cabeza. Es la
  única cara del juego sin nada humano. Y la cruz diagonal del kimono, que ninguna
  otra silueta tiene.
- **Luther** — empieza dos filas más abajo que nadie y es dos columnas más estrecho:
  entre los suyos, es la única cabeza que no llega.

El tono **no** sirve: se ve en un retrato a cuatro aumentos y no se ve en el tablero.

---

## Tableros

### Nada bloqueado por encima del nivel 5

Tapa las unidades del propio jugador. Se descubrió en Gun Hill Road, donde las
columnas del elevado empezaban en el nivel 7 y eran monolitos negros. `check:stage`
lo comprueba.

### El terreno lo dibuja el `#`, no el prop

La malla es decoración. Si el `blocked` del mapa y la huella del prop no coinciden,
tienes gente andando a través de un autobús o un agujero invisible en la calle.

### La superficie `x` (chapa) **no dibuja columna**

Sólo una placa fina hundida dentro de la malla del prop. Sirve **exclusivamente**
para casillas que el techo macizo de un prop cubre **y** se pisan: el mostrador de
los lavabos, el radiador, el banco, el techo de un coche.

Consecuencias que hay que tener presentes:

- Una mampara o un urinario con `x` sería **una losa flotando sobre un agujero**.
  Van con azulejo normal, y la columna del terreno ya los dibuja macizos.
- Un prop sobre `x` tiene que tener **el cuerpo y la tapa cerrados**, o se ve el
  vacío. Por eso el banco lleva faldón bajo los listones y el radiador una tapa.

### Los props de pared cuelgan de una casilla de suelo, nunca de la casilla de pared

Sobre la casilla de pared, la columna del terreno **se los traga enteros**. Costó
una captura del baño de Union Square con **tres tubos fluorescentes invisibles**.

### Una salida nunca más estrecha de tres casillas

Una mujer plantada en un vano de una casilla lo tapona, y una salida que se tapona
no es una salida.

### El comprobador exige espacio proporcional al reparto

`casillas pisables >= unidades * 8`. Un umbral fijo llamaba pequeño al piso de las
Lizzies, cuando el sentido de esa batalla es precisamente que son tres personas en
un cuarto donde no pueden separarse.

---

## Cámara, altura y oclusión

### La aritmética de tapar

Un luchador mide **1,55**. La cámara está a 30° por defecto (53° levantada) y a 45°
de azimut, así que:

> una pieza de altura **H** tapa, de un hombre **una casilla por detrás**, todo lo
> que quede por debajo de **H − 0,40** (y de **H − 0,93** con la cámara levantada).

De ahí sale la regla práctica que se repite en todos los props:

> **nada ANCHO entre 0,62 y 1,95.** Los cables y los postes pueden cruzar esa banda;
> las masas no.

Y la lección del piso de las Lizzies: *un cuarto a la altura de la cintura es uno
por el que peleas; uno a la altura del hombro es uno donde pierdes gente.*

### Los decorados de fondo, o pivotan o se quedan bajos

Un objeto plantado fuera del tablero está **detrás** de todo en el ángulo por defecto
y **delante** de todo en el opuesto. Hay dos soluciones y conviene saber cuál se está
usando:

- **Coney Island** paga un pivote que cancela el giro de cámara cada cuadro.
- **Van Cortlandt** lo compra con geometría: una pieza fuera del tablero tiene que
  quedar por debajo de `R + 0,40 × N`, donde `R` es la altura del borde tras el que
  está y `N` las casillas que hay más allá.

### Con cámara ortográfica, alejar no encoge: sube en pantalla

Mandar el horizonte de Coney Island once unidades más al fondo para que dejara de
encimarse con el tablero lo sacó por arriba del encuadre. Se paga bajándolo
exactamente lo que subió: `HORIZON_PUSH * V_BACK / V_UP`.

### La cámara está clavada a cuatro azimuts y dos elevaciones, y eso carga peso

`yawIndex` es lo que rota las flechas del teclado para que sigan apuntando como el
jugador ve la pantalla, y **cada sprite elige su pose a partir del azimut**. Un giro
continuo rompe las dos cosas. Por eso el botón central del ratón gira en **cuartos
de vuelta** acumulando el arrastre, no libremente.

---

## Iluminación

### El equipo de luces vive en una banda estrecha, y el motivo son las capas sin luz

Todo lo que el jugador usa para leer las reglas —las superposiciones, el cursor, los
anillos, los sprites, los números— **está deliberadamente sin iluminar**, para que se
apoye encima. Si subes el equipo, el terreno adelanta a esa capa: **no desaparece,
se invierte**, y deja de ser cristal iluminado para convertirse en una mancha.

La banda de los siete escenarios: **ambiente 0,50–0,66 · hemisferio 0,62–0,78 · clave
1,30–1,55.** No se sale nadie.

Medido a la mala: con `NIGHT_MIX = 0.45` un Turnbull **desapareció** del tablero — su
tela vaquera es casi exactamente la pizarra hacia la que se mezclan los caídos.
Está en 0,22.

### Cada equipo se empuja lejos de sus propias superficies

- El piso de las Lizzies es marrón y va iluminado en frío.
- Gun Hill es sodio, *"y sólo un toque: más cálido y el asfalto deja de leerse como
  asfalto"*.
- El baño es cerámica verde y lleva la clave más pálida del juego.
- El parque es piedra neutra y lleva clave cálida sobre relleno frío.

Frío sobre frío, o cálido sobre cálido, es un solo tono para todo el tablero: así es
como una noche se convierte en hojalata.

---

## Motor y reglas de juego

### El aguante NO se recupera. Nunca

Hay **una sola línea** en todo el motor que toca el aguante después de crear a una
unidad, y resta. No hay regeneración por turno, ni objetos, ni nada. Los puntos con
los que entra son todos los que va a tener.

Al llegar a cero no se paraliza: las órdenes de pago salen en gris y le quedan las
gratis. Mover, Esperar y Golpear son gratis para todo el mundo, así que **nadie se
queda sin poder actuar** — pero conviene comprobarlo al diseñar un oficio nuevo. Un
oficio cuya lista entera cuesta aguante se queda seco y **el planificador lo manda a
caminar en círculos para siempre**.

### `vertical` se comprueba con valor absoluto, así que la ventaja de altura es de un solo sentido

`Math.abs(altura_objetivo − altura_origen) > ability.vertical`. Con `vertical: 0` una
unidad no alcanza ni arriba ni abajo. Como los Warriors llevan `vertical: 2` en el
puñetazo, un Warrior subido pega hacia abajo y Vance no puede responder: subirse es
terreno alto de verdad, no un escondite.

### La IA no resta el daño a los suyos

`planAiTurn` puntúa **sólo al objetivo principal**. Un ataque en área en manos del
enemigo lo usaría para machacar a su propia banda. Por eso el Cadenero de los Punks
tiene alcance 2 y **no** un barrido en área, que era la idea bonita.

Sí respeta el aguante (descarta lo que no puede pagar) y prefiere un poco lo barato.

### Los caídos se quedan en el suelo y cambian el mapa

Un cuerpo no se borra del reparto: conserva casilla, orientación, nombre y arma. En
el pathfinding, **un aliado vivo y un cuerpo se atraviesan pero no se pisan**; un
enemigo vivo es un muro.

### El ataque en área sí golpea a los tuyos

*"Que un golpe ancho alcance a los tuyos es un coste real de golpear ancho, y se
queda."* La arenga es la excepción: sólo llega a su propio bando, porque gritarle a
tu banda para levantar a la contraria no es un coste, es un sinsentido.

---

## Svelte, Threlte y three.js

### `$state.raw` es obligatorio para referencias a three.js

Un proxy profundo sobre un `Object3D` convierte las escrituras internas de three en
escrituras reactivas y **entra en bucle infinito**. También para el mapa ya parseado,
por los bucles calientes del pathfinding.

### Los materiales de ámbito de módulo sólo son seguros si nadie escribe en ellos

Es lo que permite que un piso amueblado comparta un juego de materiales entre diez
props. Hay dos excepciones documentadas y las dos valen **porque se coloca una sola
instancia**: el coche que arde y la baliza de la patrulla. Si alguien coloca una
segunda, parpadearán al unísono.

### Threlte renderiza **bajo demanda**, pero `useTask` se auto-invalida

`renderMode` es `'on-demand'` por defecto. Una tarea en marcha se añade a
`autoInvalidations` y mantiene el cuadro vivo, así que una animación por `useTask`
funciona sin llamar a `invalidate()`. Comprobado en el código, no supuesto — parecía
que la noria se congelaba y no era eso.

### Nunca `npm run build` con el servidor de desarrollo en marcha

El vigilante de Vite se muere escaneando `.svelte-kit/output` y el servidor cae con
`UNKNOWN: scandir`. Se para, se construye, se vuelve a arrancar.

---

## El banco de pruebas

### `import()` dentro de `page.evaluate` devuelve una **segunda instancia del módulo**

Responde con los valores por defecto, no con lo que hay en pantalla. **El estado vivo
de la batalla no se puede leer ni escribir así** — hay que observar por el DOM. Ha
mordido dos veces: una leyendo una batalla fantasma (turno 0, 18 vivos, registro de
Riverside) y otra haciendo que el fotógrafo abriera el escenario equivocado.

`stages.ts` sí se puede leer así: son datos congelados.

### El menú de escenarios selecciona **al pasar el ratón por encima**

`onmouseenter={() => (index = i)}`. El banco de pruebas aparca el puntero en un punto
fijo, y al añadir la sexta escena las filas se movieron bajo ese puntero y empezó a
abrir otra batalla. Por eso `shoot.mjs` elige **haciendo clic en el nombre** y
después **comprueba que salió el que pidió**.

### La cámara sigue a quien actúa

Para comparar dos capturas separadas en el tiempo hay que esperar a que le toque a un
Warrior —el menú `Órdenes` sólo se dibuja en turno del jugador, y ahí la cámara se
para— y recortar en Python sobre el cuadro entero. Un `clip` a ciegas compara dos
sitios distintos. Y el `clip` de Playwright va en **píxeles CSS**, no en los del
`deviceScaleFactor`.

### Las herramientas

```bash
npm run check                  # svelte-check
npm run check:stage [escena]   # invariantes del tablero, con el servidor en marcha
npm run shot -- <escena> [wide]
npm run sheet -- [ids...]      # sprites; sin ids, uno por cada tipo de cuerpo
```

---

## Los commits

Sin línea de co-autor y sin pie de "Generated with". Nunca se sobreescribe la
identidad de git.
