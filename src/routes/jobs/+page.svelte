<script lang="ts">
  // Los oficios: el catálogo completo detrás de cada tarjeta de personaje.
  // El nombre y el retrato ya estaban en /expediente; lo que falta es lo que
  // decide un turno — las siete estadísticas y el arsenal de cada oficio,
  // sacados del mismo catálogo JOBS que lee el motor de combate, no de una
  // copia a mano.
  import { onMount } from 'svelte';
  import { warriors, furies, turnbull, orphans, lizzies, riffs, punks, rogues, mercy, type Unit } from '$lib/units';
  import { getPortraitUrl } from '$lib/sprites';
  import { JOBS, type Ability, type JobId } from '$lib/jobs';

  type GangKey = 'warriors' | 'furies' | 'turnbull' | 'orphans' | 'lizzies' | 'riffs' | 'punks' | 'rogues' | 'mercy';

  // Mismo reparto, mismos acentos que /expediente — son la misma serie de
  // documentos y se leen como tal.
  const GANGS: { key: GangKey; label: string; kicker: string; accent: string; accentDim: string; roster: () => Unit[] }[] = [
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

  const KIND_LABEL: Record<Ability['kind'], string> = {
    physical: 'Cuerpo a cuerpo',
    ranged: 'A distancia',
    rally: 'Arenga',
  };

  const PROJECTILE_LABEL: Record<'bottle' | 'brick', string> = {
    bottle: 'botella',
    brick: 'ladrillo',
  };

  function abilityChips(a: Ability): string[] {
    const chips: string[] = [];
    chips.push(`×${a.power} ${a.kind === 'physical' ? 'FUE' : 'MAÑA'}`);
    if (a.mp) chips.push(`${a.mp} AG`);
    if (a.accuracy !== undefined) chips.push(`${a.accuracy}%`);
    chips.push(a.range === 1 && a.minRange === 0 ? 'alcance 1' : `alcance ${a.minRange}–${a.range}`);
    if (a.aoe > 0) chips.push(`radio ${a.aoe}`);
    if (a.vertical !== null && a.vertical !== Infinity && a.vertical < 90) chips.push(`altura ${a.vertical}`);
    if (a.backstab) chips.push(`×${a.backstab} espalda`);
    if (a.barrierMul) chips.push(`×${a.barrierMul} valla`);
    if (a.needsWeapon) chips.push('necesita arma');
    if (a.disarm) chips.push('desarma');
    if (a.sight) chips.push('línea de vista');
    if (a.projectile) chips.push(PROJECTILE_LABEL[a.projectile]);
    return chips;
  }

  // Calculado una sola vez: el catálogo de oficios es dato estático y un
  // retrato es una instantánea de canvas, no algo que valga la pena
  // re-derivar en cada tick.
  const sections = GANGS.map((g) => {
    const seen = new Map<JobId, { job: (typeof JOBS)[JobId]; users: string[] }>();
    for (const u of g.roster()) {
      let entry = seen.get(u.job);
      if (!entry) {
        entry = { job: JOBS[u.job], users: [] };
        seen.set(u.job, entry);
      }
      entry.users.push(u.name);
    }
    const jobs = [...seen.values()].map(({ job, users }) => ({
      id: job.id,
      name: job.name,
      tag: job.tag,
      stats: job.stats,
      abilities: job.abilities,
      portrait: getPortraitUrl(job.id, undefined, 6, job.sprite.hat),
      users,
    }));
    return { key: g.key, label: g.label, kicker: g.kicker, accent: g.accent, accentDim: g.accentDim, jobs };
  });

  const totalJobs = sections.reduce((n, s) => n + s.jobs.length, 0);
  const totalAbilities = sections.reduce((n, s) => n + s.jobs.reduce((m, j) => m + j.abilities.length, 0), 0);

  let query = $state('');
  const normalizedQuery = $derived(query.trim().toLowerCase());

  function jobMatches(j: (typeof sections)[number]['jobs'][number], q: string): boolean {
    if (!q) return true;
    if (j.name.toLowerCase().includes(q) || j.tag.toLowerCase().includes(q)) return true;
    if (j.users.some((n) => n.toLowerCase().includes(q))) return true;
    return j.abilities.some((a) => a.name.toLowerCase().includes(q));
  }

  const visibleSections = $derived(
    sections
      .map((s) => ({ ...s, total: s.jobs.length, jobs: s.jobs.filter((j) => jobMatches(j, normalizedQuery)) }))
      .filter((s) => s.jobs.length > 0)
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
  <title>Los Oficios</title>
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
      <h1>Los Oficios</h1>
      <p class="sub">
        Lo que cada puesto reparte al llegar a la formación — las siete estadísticas y el arsenal
        que trae de fábrica. El mismo puesto nunca pesa ni golpea igual de un bando a otro.
      </p>
      <div class="tally">
        <div><b>{totalJobs}</b><span>oficios</span></div>
        <div><b>{totalAbilities}</b><span>habilidades</span></div>
        <div><b>{sections.length}</b><span>bandas</span></div>
      </div>
      <div class="search-row">
        <input
          id="q"
          type="text"
          placeholder="Buscar oficio, habilidad o nombre…"
          autocomplete="off"
          bind:value={query}
        />
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
          <div class="jobs">
            {#each s.jobs as j (j.id)}
              <article class="job">
                <div class="job-head">
                  <div class="portrait"><img src={j.portrait} alt={j.name} width="108" height="120" /></div>
                  <div class="job-id">
                    <span class="name">{j.name}</span>
                    <span class="tag">{j.tag}</span>
                    <p class="users">{j.users.join(', ')}</p>
                  </div>
                </div>

                <div class="stats">
                  <span><b>{j.stats.hp}</b>PV</span>
                  <span><b>{j.stats.mp}</b>AG</span>
                  <span><b>{j.stats.pa}</b>FUE</span>
                  <span><b>{j.stats.ma}</b>MAÑA</span>
                  <span><b>{j.stats.speed}</b>VEL</span>
                  <span><b>{j.stats.move}</b>MOV</span>
                  <span><b>{j.stats.jump}</b>SALTO</span>
                </div>

                <ul class="abilities">
                  {#each j.abilities as a (a.id)}
                    <li class="ability">
                      <div class="ability-head">
                        <span class="kind {a.kind}">{KIND_LABEL[a.kind]}</span>
                        <span class="ability-name">{a.name}</span>
                      </div>
                      <div class="chips">
                        {#each abilityChips(a) as chip}
                          <span class="chip">{chip}</span>
                        {/each}
                      </div>
                      <p class="desc">{a.desc}</p>
                    </li>
                  {/each}
                </ul>
              </article>
            {/each}
          </div>
        </section>
      {/each}
      {#if nothingFound}
        <p class="empty">Nada en el expediente con ese nombre.</p>
      {/if}
    </main>

    <footer class="note">
      Estadísticas y habilidades leídas en vivo del catálogo JOBS que corre el combate — no una
      copia aparte que se pueda desactualizar.
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
    --ranged: #6fb3ff;
    --rally: #79e07a;

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
    max-width: 52ch;
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
    margin-bottom: 2.8rem;
  }

  .gang-head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.15rem 0.75rem;
    border-left: 4px solid var(--accent);
    padding: 0.15rem 0 0.15rem 0.85rem;
    margin-bottom: 1.1rem;
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

  .jobs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 0.9rem;
    align-items: start;
  }

  .job {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.85rem 0.9rem 1rem;
  }

  .job-head {
    display: flex;
    gap: 0.7rem;
    align-items: center;
  }

  .portrait {
    flex: none;
    width: 54px;
    aspect-ratio: 18 / 20;
    background: rgba(5, 8, 20, 0.55);
    border: 1px solid var(--border);
    border-radius: 5px;
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

  .job-id {
    min-width: 0;
  }

  .job-id .name {
    font-size: 1.05rem;
    font-weight: 500;
    color: var(--ink);
    margin-right: 0.4rem;
  }

  .job-id .tag {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.6rem;
    letter-spacing: 0.03em;
    color: var(--accent, var(--amber));
    border: 1px solid currentColor;
    border-radius: 3px;
    padding: 0.03rem 0.28rem;
  }

  .job-id .users {
    margin: 0.15rem 0 0;
    font-size: 0.72rem;
    color: var(--ink-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 0.65rem;
    margin: 0.7rem 0 0;
    padding: 0.5rem 0;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.66rem;
    letter-spacing: 0.05em;
    color: var(--ink-faint);
  }

  .stats b {
    font-family: 'Oswald', sans-serif;
    font-size: 0.85rem;
    color: var(--ink);
    font-weight: 500;
    margin-right: 0.2rem;
  }

  .abilities {
    list-style: none;
    margin: 0.7rem 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .ability {
    padding-top: 0.5rem;
  }

  .ability:not(:first-child) {
    border-top: 1px dashed var(--border);
  }

  .ability-head {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .ability-name {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--ink);
  }

  .kind {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.56rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.05rem 0.32rem;
    border-radius: 3px;
    border: 1px solid currentColor;
  }

  .kind.physical {
    color: var(--amber);
  }
  .kind.ranged {
    color: var(--ranged);
  }
  .kind.rally {
    color: var(--rally);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 0.3rem;
  }

  .chip {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.62rem;
    color: var(--ink-dim);
    background: rgba(6, 12, 32, 0.5);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 0.06rem 0.4rem;
  }

  .desc {
    margin: 0.35rem 0 0;
    font-size: 0.78rem;
    font-style: italic;
    color: var(--ink-dim);
    line-height: 1.4;
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
    .jobs {
      grid-template-columns: 1fr;
    }
    .tally {
      gap: 1.4rem;
    }
  }
</style>
