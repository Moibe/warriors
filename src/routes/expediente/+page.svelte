<script lang="ts">
  // El expediente: un mosaico con todos los que salieron esa noche, banda por
  // banda. Cada retrato sale del mismo motor de sprites que dibuja el tablero
  // — mismo job, misma paleta, mismo sombrero — así que la cara de aquí es
  // exactamente la cara que se ve en combate, no una segunda versión que
  // mantener a mano.
  import { onMount } from 'svelte';
  import { warriors, furies, turnbull, orphans, lizzies, riffs, punks, rogues, mercy, hatOf } from '$lib/units';
  import { getPortraitUrl } from '$lib/sprites';
  import { JOBS } from '$lib/jobs';

  type GangKey = 'warriors' | 'furies' | 'turnbull' | 'orphans' | 'lizzies' | 'riffs' | 'punks' | 'rogues' | 'mercy';

  const GANGS: { key: GangKey; label: string; kicker: string; accent: string; accentDim: string; roster: () => ReturnType<typeof warriors> }[] = [
    {
      key: 'warriors',
      label: 'Los Warriors',
      kicker: 'Tu bando · nueve delegados, sin nada encima',
      accent: '#e2a15a',
      accentDim: 'rgba(226,161,90,.16)',
      roster: warriors,
    },
    {
      key: 'furies',
      label: 'Baseball Furies',
      kicker: 'Riverside Park · pintura de guerra y un bate cada uno',
      accent: '#c23b40',
      accentDim: 'rgba(194,59,64,.18)',
      roster: furies,
    },
    {
      key: 'turnbull',
      label: 'Turnbull A.C.',
      kicker: 'Gun Hill Road · más viejos, más pesados, vinieron en autobús',
      accent: '#8fa3ba',
      accentDim: 'rgba(143,163,186,.18)',
      roster: turnbull,
    },
    {
      key: 'orphans',
      label: 'Orphans',
      kicker: 'Sus tres cuadras · sin nada a juego salvo el nombre pintado a mano',
      accent: '#6a8fc2',
      accentDim: 'rgba(106,143,194,.18)',
      roster: orphans,
    },
    {
      key: 'lizzies',
      label: 'Lizzies',
      kicker: 'El piso franco · el único bando sin uniforme común',
      accent: '#cf5f95',
      accentDim: 'rgba(207,95,149,.18)',
      roster: lizzies,
    },
    {
      key: 'riffs',
      label: 'Gramercy Riffs',
      kicker: 'El cónclave · anfitriones, no buscan a nadie',
      accent: '#e0812f',
      accentDim: 'rgba(224,129,47,.18)',
      roster: riffs,
    },
    {
      key: 'punks',
      label: 'Punks',
      kicker: 'La estación · un corte de peto, siete camisas distintas',
      accent: '#d3ba46',
      accentDim: 'rgba(211,186,70,.18)',
      roster: punks,
    },
    {
      key: 'rogues',
      label: 'Rogues',
      kicker: 'La playa · cinco alrededor de uno solo',
      accent: '#93202c',
      accentDim: 'rgba(147,32,44,.18)',
      roster: rogues,
    },
    {
      key: 'mercy',
      label: 'Mercy',
      kicker: 'No es de nadie, y aun así vino',
      accent: '#c2456a',
      accentDim: 'rgba(194,69,106,.18)',
      roster: mercy,
    },
  ];

  // Calculado una sola vez: el plantel es dato estático y un retrato es una
  // instantánea de canvas, no algo que valga la pena re-derivar en cada tick.
  const sections = GANGS.map((g) => ({
    key: g.key,
    label: g.label,
    kicker: g.kicker,
    accent: g.accent,
    accentDim: g.accentDim,
    members: g.roster().map((u) => ({
      id: u.id,
      name: u.name,
      jobName: JOBS[u.job].name,
      tag: JOBS[u.job].tag,
      portrait: getPortraitUrl(u.job, u.paletteOverride, 6, hatOf(u)),
    })),
  }));

  const totalCount = sections.reduce((n, s) => n + s.members.length, 0);

  let query = $state('');
  const normalizedQuery = $derived(query.trim().toLowerCase());

  const visibleSections = $derived(
    sections
      .map((s) => ({
        ...s,
        total: s.members.length,
        members: s.members.filter((m) => !normalizedQuery || m.name.toLowerCase().includes(normalizedQuery)),
      }))
      .filter((s) => s.members.length > 0)
  );

  const nothingFound = $derived(normalizedQuery !== '' && visibleSections.length === 0);

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
  <title>El Expediente</title>
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
      <h1>El Expediente</h1>
      <p class="sub">
        Todos los que salieron esa noche, banda por banda — el nombre que lleva cada uno en la
        calle y el puesto que ocupa en la formación.
      </p>
      <div class="tally">
        <div><b>{totalCount}</b><span>hombres y mujeres</span></div>
        <div><b>{sections.length}</b><span>bandas</span></div>
      </div>
      <div class="search-row">
        <input id="q" type="text" placeholder="Buscar por nombre…" autocomplete="off" bind:value={query} />
      </div>
    </header>

    <main>
      {#each visibleSections as s (s.key)}
        <section class="gang" style="--accent:{s.accent}; --accent-dim:{s.accentDim}">
          <header class="gang-head">
            <h2>{s.label}</h2>
            <p class="kicker">{s.kicker}</p>
            <span class="count">{s.total}</span>
          </header>
          <div class="grid">
            {#each s.members as m (m.id)}
              <figure class="card">
                <div class="portrait"><img src={m.portrait} alt={m.name} width="108" height="120" /></div>
                <figcaption>
                  <span class="name">{m.name}</span>
                  <span class="job"><span class="tag">{m.tag}</span>{m.jobName}</span>
                </figcaption>
              </figure>
            {/each}
          </div>
        </section>
      {/each}
      {#if nothingFound}
        <p class="empty">Nadie en la calle con ese nombre.</p>
      {/if}
    </main>

    <footer class="note">Retratos generados por el mismo motor de sprites del juego — la misma cara que ves en el tablero.</footer>
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
    max-width: 1180px;
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
    max-width: 46ch;
    line-height: 1.5;
  }

  .tally {
    display: flex;
    justify-content: center;
    gap: 2.2rem;
    margin-top: 1.4rem;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
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
    font-size: 0.62rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-faint);
    margin-top: 0.15rem;
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

  .gang {
    margin-bottom: 2.6rem;
  }

  .gang-head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.15rem 0.75rem;
    border-left: 4px solid var(--accent);
    padding: 0.15rem 0 0.15rem 0.85rem;
    margin-bottom: 1rem;
    background: linear-gradient(90deg, var(--accent-dim), transparent 70%);
  }

  .gang-head h2 {
    font-family: 'Bebas Neue', sans-serif;
    font-weight: 400;
    letter-spacing: 0.03em;
    font-size: 1.7rem;
    margin: 0;
    color: var(--ink);
  }

  .gang-head .kicker {
    margin: 0;
    font-size: 0.78rem;
    color: var(--ink-dim);
    flex: 1 1 240px;
  }

  .gang-head .count {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.78rem;
    color: var(--accent);
    border: 1px solid var(--accent);
    border-radius: 999px;
    padding: 0.1rem 0.55rem;
    line-height: 1.5;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
    gap: 0.65rem;
  }

  .card {
    margin: 0;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
    transition:
      border-color 0.15s ease,
      transform 0.15s ease;
  }

  .card:hover {
    border-color: var(--border-strong);
    transform: translateY(-2px);
  }

  .portrait {
    aspect-ratio: 18 / 20;
    background: rgba(5, 8, 20, 0.55);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    overflow: hidden;
  }

  .portrait img {
    width: 92%;
    height: auto;
    image-rendering: pixelated;
    display: block;
  }

  figcaption {
    padding: 0.4rem 0.55rem 0.55rem;
  }

  .name {
    display: block;
    font-size: 0.92rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    color: var(--ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .job {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-top: 0.2rem;
    font-size: 0.66rem;
    color: var(--ink-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tag {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.6rem;
    letter-spacing: 0.03em;
    color: var(--accent, var(--amber));
    border: 1px solid currentColor;
    border-radius: 3px;
    padding: 0.03rem 0.28rem;
    flex: none;
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
    .grid {
      grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
    }
    .tally {
      gap: 1.4rem;
    }
  }
</style>
