(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------- Nawigacja ---------- */
  const nav = $('#nav');
  const toggle = $('#navToggle');
  const links = $('#navLinks');
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  $$('a', links).forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
  const onScrollNav = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Pojawianie się elementów ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        e.target.dispatchEvent(new CustomEvent('revealed'));
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });
  $$('.reveal, .stages, .team-art').forEach(el => io.observe(el));

  /* ---------- Podróż zlecenia ---------- */
  const STATIONS = [
    { name: 'Biuro', short: 'Biuro', x: 70, y: 180,
      today: 'Zamówienie przychodzi mailem. Ktoś przepisuje je do arkusza i drukuje kartę zlecenia.',
      us: 'Zamówienie trafia do systemu raz. Zlecenie i karta z kodem QR tworzą się automatycznie.' },
    { name: 'Planowanie', short: 'Plan', x: 290, y: 80,
      today: 'Plan jest drukowany i rozdawany. Po każdej zmianie powstaje nowy wydruk, a stary dalej krąży po hali.',
      us: 'Plan jest jeden i zawsze aktualny: na ekranie w biurze i na tablecie przy maszynie.' },
    { name: 'Hala', short: 'Hala', x: 510, y: 180,
      today: 'Karta zlecenia z ręcznymi dopiskami. Status znają tylko ludzie przy maszynie.',
      us: 'Operator skanuje kod QR i jednym dotknięciem zgłasza postęp. Biuro widzi to od razu.' },
    { name: 'Kontrola jakości', short: 'Jakość', x: 730, y: 80,
      today: 'Protokół na papierze, zdjęcie wady w czyimś telefonie. Za miesiąc nikt go nie znajdzie.',
      us: 'Protokół ze zdjęciami jest przypięty do zlecenia i partii. Historia dostępna w kilka sekund.' },
    { name: 'Magazyn i wysyłka', short: 'Magazyn', x: 930, y: 180,
      today: 'Ilości się nie zgadzają. Zaczyna się szukanie, kto i gdzie się pomylił.',
      us: 'Ilości liczą się same na każdym etapie. Wysyłka bez niespodzianek.' }
  ];
  const COPIES = [1, 2, 3, 3, 4];

  const journey = $('#problem');
  const stage = $('.journey-stage');
  const path = $('#jPath');
  const token = $('#jToken');
  const gStations = $('#jStations');
  const total = path.getTotalLength();

  // pozycje stacji na ścieżce (długość)
  const stationLen = STATIONS.map(st => {
    let best = 0, bestD = Infinity;
    for (let l = 0; l <= total; l += 2) {
      const p = path.getPointAtLength(l);
      const d = (p.x - st.x) ** 2 + (p.y - st.y) ** 2;
      if (d < bestD) { bestD = d; best = l; }
    }
    return best;
  });

  const stationEls = STATIONS.map(st => {
    const g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'j-station');
    const above = st.y < 130;
    g.innerHTML = `
      <circle class="ring" cx="${st.x}" cy="${st.y}" r="17"/>
      <circle class="core" cx="${st.x}" cy="${st.y}" r="7"/>
      <text x="${st.x}" y="${above ? st.y - 36 : st.y + 50}">${st.name}</text>
      <g class="warn-badge"><circle cx="${st.x + 20}" cy="${st.y - 20}" r="11" fill="#dc2626"/><text x="${st.x + 20}" y="${st.y - 13.5}" style="fill:#fff;font-size:15px">!</text></g>`;
    gStations.appendChild(g);
    return g;
  });

  const dots = $('#jDots');
  STATIONS.forEach(st => { const li = document.createElement('li'); li.textContent = st.short; dots.appendChild(li); });
  const dotEls = $$('li', dots);
  // na telefonie przycinamy pusty obszar wokół ścieżki, żeby grafika była większa
  const svgEl = $('.journey-svg');
  const mq = window.matchMedia('(max-width: 640px)');
  const fitViewBox = () => svgEl.setAttribute('viewBox', mq.matches ? '40 48 920 164' : '0 0 1000 260');
  mq.addEventListener('change', fitViewBox); fitViewBox();

  let mode = 'today';
  let current = -1;
  const jName = $('#jName'), jText = $('#jText'), jIdx = $('#jIdx');
  const cHand = $('#cHand'), cCopy = $('#cCopy'), cLive = $('#cLive');
  const cHandL = $('#cHandL'), cCopyL = $('#cCopyL'), cLiveL = $('#cLiveL');

  function setCard(i, force) {
    if (i === current && !force) return;
    current = i;
    const st = STATIONS[i];
    jIdx.textContent = i + 1;
    jName.textContent = st.name;
    jText.textContent = st[mode];
    jText.classList.remove('fade'); void jText.offsetWidth; jText.classList.add('fade');
    stationEls.forEach((el, k) => el.classList.toggle('reached', k <= i));
    dotEls.forEach((el, k) => { el.classList.toggle('reached', k <= i); el.classList.toggle('current', k === i); });
    if (mode === 'today') {
      cHand.textContent = i;            cHandL.textContent = 'przekazań papieru z rąk do rąk';
      cCopy.textContent = COPIES[i];    cCopyL.textContent = 'razy przepisane te same dane';
      cLive.textContent = 'nie';        cLiveL.textContent = 'czy biuro wie, co dzieje się teraz';
    } else {
      cHand.textContent = '1×';         cHandL.textContent = 'dane wpisane tylko raz';
      cCopy.textContent = '0';          cCopyL.textContent = 'ręcznych przepisań';
      cLive.textContent = 'tak';        cLiveL.textContent = 'biuro widzi status na żywo';
    }
  }

  function updateJourney() {
    const rect = journey.getBoundingClientRect();
    const range = journey.offsetHeight - window.innerHeight;
    let p = range > 0 ? -rect.top / range : 0;
    p = Math.min(1, Math.max(0, (p - 0.04) / 0.86));
    const len = p * total;
    const pt = path.getPointAtLength(len);
    token.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
    path.style.strokeDasharray = mode === 'us' ? `${len} ${total}` : '';
    let idx = 0;
    stationLen.forEach((l, k) => { if (len >= l - 4) idx = k; });
    setCard(idx);
  }
  window.addEventListener('scroll', () => requestAnimationFrame(updateJourney), { passive: true });
  window.addEventListener('resize', updateJourney);
  updateJourney();

  // przełącznik dziś / z nami
  const sw = $('.mode-switch');
  const pill = $('.mode-pill');
  const btns = $$('button', sw);
  function placePill() {
    const a = btns.find(b => b.classList.contains('active'));
    pill.style.width = a.offsetWidth + 'px';
    pill.style.transform = `translateX(${a.offsetLeft - 4}px)`;
  }
  btns.forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.mode;
    btns.forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-selected', String(x === b)); });
    sw.classList.toggle('us', mode === 'us');
    stage.dataset.mode = mode;
    placePill();
    updateJourney();
    setCard(current, true);
  }));
  placePill();
  window.addEventListener('resize', placePill);
  document.fonts && document.fonts.ready.then(placePill);

  /* ---------- Przed / po ---------- */
  const ba = $('#ba');
  const range = $('#baRange');
  const setPos = v => ba.style.setProperty('--pos', v + '%');
  range.addEventListener('input', () => setPos(range.value));
  ba.addEventListener('revealed', () => {
    if (reduced) return;
    // krótka podpowiedź ruchem suwaka
    const seq = [50, 72, 28, 50];
    let t0 = null, seg = 0;
    const dur = 700;
    function step(ts) {
      if (range.dataset.touched) return;
      if (!t0) t0 = ts;
      const k = Math.min(1, (ts - t0) / dur);
      const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const v = seq[seg] + (seq[seg + 1] - seq[seg]) * e;
      setPos(v); range.value = v;
      if (k === 1) { seg++; t0 = null; if (seg >= seq.length - 1) return; }
      requestAnimationFrame(step);
    }
    setTimeout(() => requestAnimationFrame(step), 400);
  });
  range.addEventListener('pointerdown', () => { range.dataset.touched = '1'; });

  /* ---------- Siatki funkcji ---------- */
  const big = $('#gridBig'), small = $('#gridSmall');
  const USED = new Set([3, 8, 17, 22, 31, 40, 46, 58, 63, 71, 84, 95, 102, 113]);
  for (let i = 0; i < 120; i++) {
    const c = document.createElement('i');
    if (USED.has(i)) c.className = 'used';
    c.style.transitionDelay = (i * 6) + 'ms';
    big.appendChild(c);
  }
  for (let i = 0; i < 21; i++) {
    const c = document.createElement('i');
    if (i >= 14) c.className = 'later';
    c.style.transitionDelay = (i * 25) + 'ms';
    small.appendChild(c);
  }
  const fit = $('#fit');
  fit.addEventListener('revealed', () => {
    const cnt = $('.count', fit);
    const to = +cnt.dataset.to;
    if (reduced) { cnt.textContent = to; fit.classList.add('lit'); return; }
    let t0 = null;
    const tick = ts => {
      if (!t0) t0 = ts;
      const k = Math.min(1, (ts - t0) / 1000);
      cnt.textContent = Math.round(to * k);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(() => fit.classList.add('lit'), 1100);
  });

  /* ---------- Obszary ---------- */
  const AREAS = [
    { key: 'zlecenia', icon: 'i-clipboard', name: 'Zlecenia produkcyjne',
      today: 'Wydrukowana karta zlecenia wędruje przez halę, statusy żyją w Excelu i w głowach ludzi.',
      us: 'Cyfrowa karta zlecenia na tablecie, kod QR na detalu lub palecie, status widoczny na żywo dla wszystkich.',
      mock: { title: 'Zlecenia · Hala A', kpis: [['14', 'w toku'], ['3', 'opóźnione'], ['22', 'gotowe w tym tyg.']],
        rows: [['Z-117 · Wspornik WS-40', 'Spawanie', 'run', 50], ['Z-118 · Rama RM-2', 'Gięcie', 'run', 30], ['Z-114 · Obudowa OB-7', 'Czeka na materiał', 'warn', 12], ['Z-112 · Konsola K-3', 'Gotowe', 'ok', 100]] } },
    { key: 'plan', icon: 'i-calendar', name: 'Planowanie i widoczność',
      today: 'Planista dzwoni i chodzi po hali, żeby sprawdzić postęp. Plan na papierze dezaktualizuje się w godzinę.',
      us: 'Jeden aktualny plan i tablica na hali i w biurze: co, gdzie, na jakim etapie, co jest zagrożone.',
      mock: { title: 'Obciążenie stanowisk · tydz. 47', kpis: [['86%', 'średnie obciążenie'], ['1', 'wąskie gardło'], ['31', 'zaplanowane zlecenia']],
        rows: [['Piła 2', '82%', 'run', 82], ['Krawędziarka', '96% · wąskie gardło', 'warn', 96], ['Spawanie · st. 3', '74%', 'run', 74], ['Malarnia', '58%', 'ok', 58]] } },
    { key: 'jakosc', icon: 'i-badge', name: 'Kontrola jakości',
      today: 'Papierowe protokoły w segregatorze, zdjęcia wad w telefonie brygadzisty. Przy reklamacji trudno cokolwiek odtworzyć.',
      us: 'Cyfrowe protokoły ze zdjęciami, rejestr niezgodności i pełna historia każdej partii, dostępna w kilka sekund.',
      mock: { title: 'Kontrola jakości · listopad', kpis: [['98,6%', 'zgodnych'], ['2', 'otwarte niezgodności'], ['41', 'protokoły']],
        rows: [['P-2291 · Z-117 · spoiny', 'Zgodne', 'ok', 100], ['N-014 · Z-114 · wymiar', 'Niezgodność · do decyzji', 'err', 40], ['P-2290 · Z-118 · powłoka', 'Zgodne', 'ok', 100], ['P-2289 · Z-112 · wymiary', 'W trakcie', 'run', 60]] } },
    { key: 'magazyn', icon: 'i-box', name: 'Magazyn i materiały',
      today: 'Stany „na oko”, braki materiału wychodzą dopiero w trakcie produkcji.',
      us: 'Proste przyjęcia i wydania, rezerwacja materiału pod zlecenie i powiadomienie, zanim czegoś zabraknie.',
      mock: { title: 'Materiały', kpis: [['128', 'pozycji'], ['4', 'poniżej minimum'], ['12', 'rezerwacji']],
        rows: [['Blacha 4 mm', '2 ark. · zamów', 'warn', 15], ['Profil 40×40', '86 m', 'ok', 70], ['Elektrody 3,2', '0 op. · brak', 'err', 3], ['Farba RAL 7016', '40 l', 'ok', 62]] } },
    { key: 'ur', icon: 'i-wrench', name: 'Utrzymanie ruchu',
      today: 'Awarie zgłaszane ustnie, przeglądy zapisane w kalendarzu na ścianie, historia maszyn w niczyjej pamięci.',
      us: 'Zgłoszenia awarii z telefonu, harmonogram przeglądów z przypomnieniami i historia każdej maszyny.',
      mock: { title: 'Maszyny i zgłoszenia', kpis: [['1', 'awaria otwarta'], ['3', 'przeglądy w tym tyg.'], ['97%', 'dostępność']],
        rows: [['Krawędziarka · wyciek oleju', 'Zgłoszono 08:12', 'err', 20], ['Piła 2 · przegląd', 'Pt, 14:00', 'run', 60], ['Spawarka 3', 'Sprawna', 'ok', 100], ['Sprężarka', 'Przegląd za 12 dni', 'ok', 85]] } },
    { key: 'raporty', icon: 'i-chart', name: 'Raporty dla właściciela',
      today: 'Ktoś co tydzień skleja raport z kilku arkuszy. Zanim powstanie, dane są już nieaktualne.',
      us: 'Panel z aktualnymi danymi w telefonie i komputerze. Raporty tworzą się same.',
      mock: { title: 'Produkcja · ostatnie 8 tygodni', kpis: [['1 240', 'szt. w tym tyg.'], ['+8%', 'vs poprzedni'], ['3,2%', 'braki']],
        chart: [52, 61, 58, 70, 66, 74, 80, 86], labels: ['40', '41', '42', '43', '44', '45', '46', '47'] } },
    { key: 'integracje', icon: 'i-plug', name: 'Integracje i automatyzacje',
      today: 'Dane przepisywane ręcznie między programem księgowym, Excelem i skrzynką mailową.',
      us: 'Programy wymieniają dane same. Powtarzalne czynności, jak zamówienie → zlecenie → faktura, dzieją się automatycznie.',
      mock: { title: 'Połączenia', kpis: [['0', 'ręcznych przepisań'], ['4', 'połączone systemy'], ['10:00', 'ostatnia synchronizacja']],
        rows: [['Skrzynka zamówień → zlecenia', '3 nowe dziś', 'run', 100], ['Zlecenia → program księgowy', 'Zsynchronizowano', 'ok', 100], ['Cennik (Excel) → oferty', 'Zsynchronizowano', 'ok', 100], ['Etykiety → drukarka hali', 'Aktywne', 'ok', 100]] } }
  ];
  const COLORS = { ok: 'var(--ok)', run: 'var(--blue)', warn: 'var(--warn)', err: 'var(--err)' };
  const tabs = $('#areaTabs');
  const panel = $('#areaPanel');
  AREAS.forEach((a, i) => {
    const b = document.createElement('button');
    b.className = 'area-tab';
    b.setAttribute('role', 'tab');
    b.id = 'tab-' + a.key;
    b.innerHTML = `<svg class="ic"><use href="#${a.icon}"/></svg>${a.name}`;
    b.addEventListener('click', () => showArea(i));
    tabs.appendChild(b);
  });
  function mockHTML(m) {
    const kpis = m.kpis.map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join('');
    let body;
    if (m.chart) {
      const max = Math.max(...m.chart);
      body = `<div class="mchart">${m.chart.map((v, k) => `<i style="height:${v / max * 100}%;animation-delay:${k * 60}ms"${k < m.chart.length - 1 ? ' class="dim"' : ''}></i>`).join('')}</div>
              <div class="mchart-l">${m.labels.map(l => `<span>${l}</span>`).join('')}</div>`;
    } else {
      body = `<div class="mrows">${m.rows.map(([t, s, c, w], k) => `
        <div class="mrow"><span class="t">${t}</span><span class="chip ${c}">${s}</span>
        <span class="bar"><i style="width:${w}%;background:${COLORS[c]};animation-delay:${k * 80}ms"></i></span></div>`).join('')}</div>`;
    }
    return `<div class="mock-head"><span>${m.title}</span><span class="dots"><i></i><i></i><i></i></span></div>
            <div class="mock-body"><div class="kpis">${kpis}</div>${body}</div>`;
  }
  function showArea(i) {
    const a = AREAS[i];
    $$('.area-tab', tabs).forEach((b, k) => { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
    panel.setAttribute('aria-labelledby', 'tab-' + a.key);
    $('#areaTitle').textContent = a.name;
    $('#areaToday').textContent = a.today;
    $('#areaUs').textContent = a.us;
    $('#areaMock').innerHTML = mockHTML(a.mock);
    panel.classList.remove('swap'); void panel.offsetWidth; panel.classList.add('swap');
  }
  tabs.addEventListener('keydown', e => {
    const cur = $$('.area-tab', tabs).findIndex(b => b.getAttribute('aria-selected') === 'true');
    let n = null;
    if (['ArrowDown', 'ArrowRight'].includes(e.key)) n = (cur + 1) % AREAS.length;
    if (['ArrowUp', 'ArrowLeft'].includes(e.key)) n = (cur - 1 + AREAS.length) % AREAS.length;
    if (n !== null) { e.preventDefault(); showArea(n); $$('.area-tab', tabs)[n].focus(); }
  });
  showArea(0);
})();
