<script lang="ts">
  // La campaña: las siete batallas en el orden en que se juegan, con el mapa
  // dibujado tile por tile a partir de los mismos datos que lee el tablero —
  // el mismo "altura, superficie, transitable" que ve el pathfinder, no una
  // captura de pantalla que hay que volver a tomar si el mapa cambia.
  import { onMount } from 'svelte';
  import { STAGE_LIST, type Stage } from '$lib/stages';
  import type { Surface } from '$lib/grid';
  import type { Unit } from '$lib/units';

  // Mismos acentos que /expediente y /jobs, esta vez indexados por el rival
  // de cada batalla — la serie entera comparte una paleta.
  const RIVAL_ACCENT: Record<string, { accent: string; accentDim: string }> = {
    'Gramercy Riffs': { accent: '#e0812f', accentDim: 'rgba(224,129,47,.16)' },
    'Turnbull A.C.': { accent: '#8fa3ba', accentDim: 'rgba(143,163,186,.16)' },
    Orphans: { accent: '#6a8fc2', accentDim: 'rgba(106,143,194,.16)' },
    'Baseball Furies': { accent: '#c23b40', accentDim: 'rgba(194,59,64,.16)' },
    Lizzies: { accent: '#cf5f95', accentDim: 'rgba(207,95,149,.16)' },
    Punks: { accent: '#d3ba46', accentDim: 'rgba(211,186,70,.16)' },
    Rogues: { accent: '#93202c', accentDim: 'rgba(147,32,44,.16)' },
  };

  const SURFACE_COLOR: Record<Surface, [number, number, number]> = {
    grass: [58, 107, 58],
    dirt: [107, 80, 48],
    stone: [127, 138, 151],
    dark: [42, 42, 48],
    sand: [184, 154, 106],
    wood: [138, 106, 66],
    metal: [138, 151, 168],
    carpet: [122, 48, 64],
    tile: [168, 192, 204],
    beach: [216, 192, 144],
    deck: [122, 92, 60],
    water: [58, 106, 154],
  };

  const BLOCKED_COLOR = '#12141c';
  const CELL = 8;

  /** El mismo tono de superficie, más claro cuanto más alto está el nivel —
   *  el mapa se lee como se lee un plano de curvas, sin necesitar la cámara. */
  function tileColor(surface: Surface, height: number): string {
    const [r, g, b] = SURFACE_COLOR[surface];
    const t = Math.min(1, height * 0.075);
    const mix = (c: number) => Math.round(c + (255 - c) * t);
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
  }

  function drawStage(canvas: HTMLCanvasElement, stage: Stage) {
    const map = stage.map;
    canvas.width = map.width * CELL;
    canvas.height = map.depth * CELL;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < map.depth; y++) {
      for (let x = 0; x < map.width; x++) {
        const t = map.tiles[y * map.width + x];
        if (!t) continue;
        ctx.fillStyle = t.walkable ? tileColor(t.surface, t.height) : BLOCKED_COLOR;
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
    // El hueco de la salida o el objetivo, si esta batalla tiene uno, se
    // marca aparte para que el plano diga algo más que "aquí se puede pisar".
    if (stage.exit) {
      ctx.fillStyle = '#79e07a';
      for (let y = stage.exit.y; y < stage.exit.y + stage.exit.d; y++) {
        for (let x = stage.exit.x; x < stage.exit.x + stage.exit.w; x++) {
          ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
        }
      }
    }
  }

  type WinKind = 'exit' | 'head' | 'last';

  type Row = {
    stage: Stage;
    roster: Unit[];
    order: number;
    accent: string;
    accentDim: string;
    allies: number;
    enemies: number;
    winKind: WinKind;
    winLabel: string;
    winDetail: string;
  };

  const DEFAULT_ACCENT = { accent: '#93aad2', accentDim: 'rgba(147,170,210,.16)' };

  const rows: Row[] = STAGE_LIST.map((stage, i) => {
    const roster = stage.roster();
    const allies = roster.filter((u) => u.team === 'ally').length;
    const enemies = roster.filter((u) => u.team === 'enemy').length;
    const acc = RIVAL_ACCENT[stage.rival] ?? DEFAULT_ACCENT;

    let winKind: WinKind = 'last';
    let winLabel = 'Última banda en pie';
    let winDetail = `Hasta que caiga uno de los dos bandos enteros — ${enemies} rivales.`;
    if (stage.exit) {
      winKind = 'exit';
      winLabel = stage.exit.barrier ? 'Romper y salir' : 'Escapar';
      winDetail = stage.exit.barrier
        ? `${stage.exit.needed} de ${allies} tienen que cruzar "${stage.exit.label}", y antes hay que tumbar ${stage.exit.barrier.label.toLowerCase()} (${stage.exit.barrier.hp} PV).`
        : `${stage.exit.needed} de ${allies} tienen que llegar a "${stage.exit.label}".`;
    } else if (stage.head) {
      winKind = 'head';
      winLabel = 'Derribar al objetivo';
      winDetail = `Cae "${stage.head.label}" y la batalla se acaba ahí, gane quien gane el resto.`;
    }

    return {
      stage,
      roster,
      order: i + 1,
      accent: acc.accent,
      accentDim: acc.accentDim,
      allies,
      enemies,
      winKind,
      winLabel,
      winDetail,
    };
  });

  let query = $state('');
  const normalizedQuery = $derived(query.trim().toLowerCase());
  const visibleRows = $derived(
    rows.filter(
      (r) =>
        !normalizedQuery ||
        r.stage.name.toLowerCase().includes(normalizedQuery) ||
        r.stage.rival.toLowerCase().includes(normalizedQuery)
    )
  );
  const nothingFound = $derived(normalizedQuery !== '' && visibleRows.length === 0);

  function canvasAction(node: HTMLCanvasElement, stage: Stage) {
    drawStage(node, stage);
    return {
      update(newStage: Stage) {
        drawStage(node, newStage);
      },
    };
  }

  // El resto del sitio fija html/body a pantalla completa sin scroll — hecho
  // para el lienzo de batalla, no para una lista que hay que recorrer. Se
  // relaja mientras esta página está montada y se devuelve tal cual al salir.
  onMount(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlHeight: html.style.height,
      bodyHeight: body.style.height,
    };
    html.style.overflow = 'auto';
    body.style.overflow = 'auto';
    html.style.height = 'auto';
    body.style.height = 'auto';
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.height = prev.htmlHeight;
      body.style.height = prev.bodyHeight;
    };
  });
</script>

<svelte:head>
  <title>La Campaña</title>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="page">
  <div class="wrap">
    <header class="masthead">
      <p class="eyebrow">Van Cortlandt · Riverside · Gun Hill · la estación del Bronx</p>
      <h1>La Campaña</h1>
      <p class="sub">
        Las siete batallas, en el orden en que se cruzan la ciudad — quién espera en cada una,
        cómo se gana y cómo se pierde. El mapa está dibujado tile por tile, exactamente como lo
        lee el motor: más claro cuanto más alto, oscuro donde no se puede pisar.
      </p>
      <div class="tally">
        <div><b>{rows.length}</b><span>batallas</span></div>
        <div><b>{rows.filter((r) => r.winKind === 'exit').length}</b><span>se ganan saliendo</span></div>
        <div><b>{rows.filter((r) => r.winKind === 'last').length}</b><span>se ganan al último</span></div>
      </div>
      <div class="search-row">
        <input id="q" type="text" placeholder="Buscar batalla o rival…" autocomplete="off" bind:value={query} />
      </div>
    </header>

    <main>
      <ol class="timeline">
        {#each visibleRows as r (r.stage.id)}
          <li class="stage" style="--accent:{r.accent}; --accent-dim:{r.accentDim}">
            <span class="order">{r.order}</span>
            <div class="card">
              <div class="card-top">
                <canvas
                  class="map"
                  use:canvasAction={r.stage}
                  style="aspect-ratio:{r.stage.map.width}/{r.stage.map.depth}"
                ></canvas>
                <div class="head">
                  <h2>{r.stage.name}</h2>
                  <p class="rival">contra <b>{r.stage.rival}</b> · {r.allies} contra {r.enemies}</p>
                  <div class="win">
                    <span class="win-label">{r.winLabel}</span>
                    <p class="win-detail">{r.winDetail}</p>
                  </div>
                </div>
              </div>

              {#if r.stage.brief?.length}
                <blockquote class="brief">
                  {#each r.stage.brief as line}
                    <p>
                      {#if line.speaker}
                        <span class="who">{r.roster.find((u) => u.id === line.speaker)?.name}:</span>
                      {/if}
                      {line.text}
                    </p>
                  {/each}
                </blockquote>
              {/if}

              {#if r.stage.turncoat}
                <p class="turncoat">↺ {r.stage.turncoat.line}</p>
              {/if}

              <div class="outcome">
                <p class="victory"><span>Victoria</span>{r.stage.outcome.victory}</p>
                <p class="defeat"><span>Derrota</span>{r.stage.outcome.defeat}</p>
              </div>
            </div>
          </li>
        {/each}
      </ol>
      {#if nothingFound}
        <p class="empty">Ninguna batalla con ese nombre.</p>
      {/if}
    </main>

    <footer class="note">
      Mapas leídos en vivo del tile map de cada batalla — verde apagado es césped, gris es
      concreto, casi negro es asfalto; lo que no se puede pisar queda de un gris azulado sólido, y
      la salida o el objetivo, si lo hay, se marca en verde.
    </footer>
  </div>
</div>

<style>
  .page {
    --bg: #05070f;
    --bg-upper: #0c1226;
    --bg-lower: #1b2440;
    --glow: rgba(255, 176, 92, 0.16);
    --panel: linear-gradient(180deg, rgba(30, 62, 140, 0.82) 0%, rgba(10, 20, 56, 0.92) 100%);
    --border: rgba(214, 228, 255, 0.28);
    --border-strong: rgba(214, 228, 255, 0.75);
    --ink: #eef3ff;
    --ink-dim: #93aad2;
    --ink-faint: #5f7396;
    --gold: #ffe27a;
    --amber: #ffb35c;
    --good: #79e07a;
    --bad: #e8564e;

    min-height: 100%;
    padding: 0 16px;
    padding-block: 2.5rem 4rem;
    font-family: 'Oswald', 'Segoe UI', system-ui, sans-serif;
    color: var(--ink);
    background:
      radial-gradient(120% 40% at 50% 0%, var(--glow), transparent 60%),
      linear-gradient(180deg, var(--bg) 0%, var(--bg-upper) 45%, var(--bg-lower) 100%);
    background-attachment: fixed;
  }

  .wrap {
    max-width: 880px;
    margin: 0 auto;
  }

  header.masthead {
    text-align: center;
    padding: 1.5rem 0 2.4rem;
    border-bottom: 1px solid var(--border);
    margin-bottom: 2.6rem;
  }

  .eyebrow {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.72rem;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--amber);
    margin: 0 0 0.6rem;
  }

  h1 {
    font-family: 'Bebas Neue', 'Oswald', sans-serif;
    font-weight: 400;
    font-size: clamp(2.6rem, 7vw, 4.6rem);
    letter-spacing: 0.04em;
    margin: 0;
    color: var(--gold);
    text-shadow: 0 3px 18px rgba(255, 210, 74, 0.25);
    text-wrap: balance;
  }

  .sub {
    color: var(--ink-dim);
    font-size: 1rem;
    margin: 0.7rem auto 0;
    max-width: 56ch;
    line-height: 1.5;
  }

  .tally {
    display: flex;
    justify-content: center;
    gap: 2.2rem;
    margin-top: 1.4rem;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    flex-wrap: wrap;
  }

  .tally b {
    display: block;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1.7rem;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }

  .tally span {
    display: block;
    font-size: 0.6rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-faint);
    margin-top: 0.15rem;
    max-width: 12ch;
  }

  .search-row {
    max-width: 420px;
    margin: 1.6rem auto 0;
  }

  #q {
    width: 100%;
    background: rgba(6, 12, 32, 0.55);
    border: 1px solid var(--border);
    border-radius: 5px;
    color: var(--ink);
    font-family: inherit;
    font-size: 0.95rem;
    padding: 0.55rem 0.8rem;
    outline: none;
  }

  #q::placeholder {
    color: var(--ink-faint);
  }

  #q:focus {
    border-color: var(--border-strong);
  }

  .timeline {
    list-style: none;
    margin: 0;
    padding: 0;
    position: relative;
  }

  .timeline::before {
    content: '';
    position: absolute;
    left: 17px;
    top: 6px;
    bottom: 6px;
    width: 2px;
    background: var(--border);
  }

  .stage {
    position: relative;
    padding-left: 3rem;
    margin-bottom: 1.6rem;
  }

  .stage .order {
    position: absolute;
    left: 0;
    top: 0;
    width: 35px;
    height: 35px;
    border-radius: 50%;
    background: var(--panel);
    border: 2px solid var(--accent);
    color: var(--accent);
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1.15rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    border-radius: 8px;
    padding: 0.9rem 1rem 1rem;
  }

  .card-top {
    display: flex;
    gap: 0.9rem;
    align-items: flex-start;
    background: linear-gradient(90deg, var(--accent-dim), transparent 75%);
    margin: -0.9rem -1rem 0;
    padding: 0.9rem 1rem;
    border-radius: 8px 8px 0 0;
  }

  canvas.map {
    flex: none;
    width: 150px;
    max-width: 40vw;
    background: rgba(5, 8, 20, 0.6);
    border: 1px solid var(--border);
    border-radius: 4px;
    image-rendering: pixelated;
  }

  .head {
    min-width: 0;
  }

  .head h2 {
    font-family: 'Bebas Neue', sans-serif;
    font-weight: 400;
    letter-spacing: 0.03em;
    font-size: 1.55rem;
    margin: 0;
    color: var(--ink);
  }

  .rival {
    margin: 0.15rem 0 0;
    font-size: 0.82rem;
    color: var(--ink-dim);
  }

  .rival b {
    color: var(--accent);
    font-weight: 600;
  }

  .win {
    margin-top: 0.55rem;
  }

  .win-label {
    display: inline-block;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.62rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--accent);
    border: 1px solid var(--accent);
    border-radius: 999px;
    padding: 0.1rem 0.5rem;
  }

  .win-detail {
    margin: 0.3rem 0 0;
    font-size: 0.76rem;
    color: var(--ink-dim);
    line-height: 1.4;
  }

  .brief {
    margin: 0.85rem 0 0;
    padding: 0.6rem 0.8rem;
    border-left: 2px solid var(--border-strong);
    background: rgba(6, 12, 32, 0.35);
    border-radius: 0 5px 5px 0;
  }

  .brief p {
    margin: 0;
    font-size: 0.82rem;
    font-style: italic;
    color: var(--ink);
    line-height: 1.5;
  }

  .brief .who {
    font-style: normal;
    font-weight: 600;
    color: var(--accent);
    margin-right: 0.15rem;
  }

  .brief p + p {
    margin-top: 0.3rem;
  }

  .turncoat {
    margin: 0.7rem 0 0;
    font-size: 0.78rem;
    color: var(--gold);
    font-style: italic;
  }

  .outcome {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1.4rem;
    margin-top: 0.85rem;
    padding-top: 0.65rem;
    border-top: 1px dashed var(--border);
  }

  .outcome p {
    margin: 0;
    font-size: 0.76rem;
    color: var(--ink-dim);
    line-height: 1.4;
    flex: 1 1 220px;
  }

  .outcome span {
    display: block;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.6rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 0.15rem;
  }

  .outcome .victory span {
    color: var(--good);
  }

  .outcome .defeat span {
    color: var(--bad);
  }

  .empty {
    text-align: center;
    color: var(--ink-faint);
    padding: 2rem 0;
  }

  footer.note {
    text-align: center;
    color: var(--ink-faint);
    font-size: 0.76rem;
    margin-top: 3rem;
    padding-top: 1.4rem;
    border-top: 1px solid var(--border);
  }

  @media (max-width: 480px) {
    .card-top {
      flex-direction: column;
    }
    canvas.map {
      width: 100%;
      max-width: 100%;
    }
    .stage {
      padding-left: 2.4rem;
    }
    .timeline::before {
      left: 12px;
    }
    .stage .order {
      width: 28px;
      height: 28px;
      font-size: 1rem;
    }
  }
</style>
