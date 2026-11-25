/*
  JUEGOS NUEVOS (3): Une los puntos, Laberintos y A lavarse los dientes.
  Igual que juegos2.js: cada juego se añade a window.JUEGOS_EXTRA y recibe H
  (h, decir, celebrar, nota, azar, barajar, elegir) desde app.js.
*/
(() => {
  "use strict";
  const J = (window.JUEGOS_EXTRA = window.JUEGOS_EXTRA || []);
  const SVGNS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const NUM = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"];

  /* ---------- Une los puntos ---------- */
  const estrella = () => Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 17 : 40;
    return [50 + r * Math.cos(a), 54 + r * Math.sin(a)];
  });
  const FIGURAS = [
    { n: "una cometa", c: "#ff7ac6", p: [[50, 10], [82, 45], [50, 90], [18, 45]] },
    { n: "una casa", c: "#ffb35c", p: [[20, 88], [20, 46], [50, 16], [80, 46], [80, 88]] },
    { n: "un barco", c: "#5aa9ff", p: [[22, 62], [47, 62], [47, 12], [78, 58], [53, 58], [53, 62], [86, 62], [72, 84], [30, 84]] },
    { n: "un pez", c: "#3cc84a", p: [[12, 50], [32, 31], [58, 29], [74, 44], [90, 28], [90, 72], [74, 56], [58, 71], [32, 69]] },
    { n: "una estrella", c: "#ffd400", p: estrella() },
    { n: "un corazón", c: "#ff4d6d", p: [[50, 86], [20, 56], [14, 36], [24, 20], [40, 19], [50, 32], [60, 19], [76, 20], [86, 36], [80, 56]] },
  ];

  J.push({
    ruta: "puntos", ico: "✏️", nombre: "Une los puntos", clase: "c-amarillo",
    crear(H) {
      const v = H.h(`<section class="puntos-juego">
        <div class="pregunta"><button class="btn-oir" aria-label="Escuchar">👂</button><span class="txt">Une los puntos: 1, 2, 3…</span></div>
        <div class="hoja-puntos"><svg viewBox="0 0 100 100"></svg></div>
        <div class="acciones"><button class="btn-accion" data-a="otra">➡️ Otro dibujo</button></div>
      </section>`);
      const svg = v.querySelector("svg"), txt = v.querySelector(".txt");
      let fig = 0, sig = 0, trazo = null, puntos = [], forma = null, hecho = false, dibujando = false;

      const empezar = () => {
        const F = FIGURAS[fig % FIGURAS.length];
        svg.replaceChildren(); sig = 0; hecho = false;
        forma = el("polygon", { points: F.p.map(p => p.join(",")).join(" "), class: "forma-puntos" });
        forma.style.setProperty("--c", F.c);
        trazo = el("polyline", { points: "", class: "trazo-puntos" });
        svg.append(forma, trazo);
        puntos = F.p.map(([x, y], i) => {
          const g = el("g", { class: "punto" + (i === 0 ? " siguiente" : "") });
          g.append(el("circle", { cx: x, cy: y, r: 4.2 }));
          const t = el("text", { x: x, y: y - 6.5 }); t.textContent = i + 1;
          g.append(t); svg.append(g);
          return { x, y, g };
        });
        txt.textContent = "Une los puntos: 1, 2, 3…";
        H.decir("Une los puntos");
      };
      const unir = (i) => {
        const p = puntos[i];
        p.g.classList.remove("siguiente"); p.g.classList.add("unido");
        const ya = trazo.getAttribute("points");
        trazo.setAttribute("points", (ya ? ya + " " : "") + p.x + "," + p.y);
        H.nota(400 + i * 50, .15);
        H.decir(NUM[i + 1] || String(i + 1));
        sig++;
        if (sig < puntos.length) { puntos[sig].g.classList.add("siguiente"); return; }
        // Último punto: se cierra la figura y se colorea
        hecho = true;
        trazo.setAttribute("points", trazo.getAttribute("points") + " " + puntos[0].x + "," + puntos[0].y);
        forma.classList.add("rellena");
        const F = FIGURAS[fig % FIGURAS.length];
        setTimeout(() => { txt.textContent = "¡Es " + F.n + "!"; H.celebrar("⭐"); setTimeout(() => H.decir("¡Es " + F.n + "!"), 900); }, 300);
        setTimeout(() => { if (v.isConnected) { fig++; empezar(); } }, 4200);
      };
      const comprobar = (e) => {
        if (hecho || sig >= puntos.length) return;
        const r = svg.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100;
        const p = puntos[sig];
        if (Math.hypot(p.x - x, p.y - y) < 8) unir(sig);
      };
      svg.addEventListener("pointerdown", (e) => { dibujando = true; svg.setPointerCapture(e.pointerId); comprobar(e); });
      svg.addEventListener("pointermove", (e) => { if (dibujando) comprobar(e); });
      svg.addEventListener("pointerup", () => { dibujando = false; });
      svg.addEventListener("pointercancel", () => { dibujando = false; });
      v.querySelector(".btn-oir").onclick = () => H.decir("Une los puntos");
      v.querySelector('[data-a="otra"]').onclick = () => { fig++; empezar(); };
      empezar();
      return v;
    },
  });

  /* ---------- Laberintos: lleva al pollito con su mamá ---------- */
  // Laberinto perfecto (siempre hay un único camino) con el algoritmo de «vuelta atrás»
  const crearLaberinto = (n) => {
    const muros = Array.from({ length: n * n }, () => ({ n: true, s: true, e: true, o: true }));
    const visto = new Set([0]), pila = [0];
    const vecinos = (i) => {
      const x = i % n, y = Math.floor(i / n), v = [];
      if (y > 0) v.push([i - n, "n", "s"]);
      if (y < n - 1) v.push([i + n, "s", "n"]);
      if (x < n - 1) v.push([i + 1, "e", "o"]);
      if (x > 0) v.push([i - 1, "o", "e"]);
      return v;
    };
    while (pila.length) {
      const i = pila[pila.length - 1];
      const libres = vecinos(i).filter(([j]) => !visto.has(j));
      if (!libres.length) { pila.pop(); continue; }
      const [j, a, b] = libres[Math.floor(Math.random() * libres.length)];
      muros[i][a] = false; muros[j][b] = false; visto.add(j); pila.push(j);
    }
    return muros;
  };
  const TAMANOS = [3, 4, 5, 6, 7];

  J.push({
    ruta: "laberinto", ico: "🌀", nombre: "Laberintos", clase: "c-verde",
    crear(H) {
      const v = H.h(`<section class="laberinto-juego">
        <div class="pregunta"><button class="btn-oir" aria-label="Escuchar">👂</button><span>Lleva al pollito con su mamá</span></div>
        <div class="hoja-laberinto"><svg></svg></div>
        <div class="acciones"><button class="btn-accion" data-a="otro">🔄 Otro laberinto</button></div>
      </section>`);
      const svg = v.querySelector("svg");
      let nivel = 0, n, muros, pos, camino, pollito, ruta, moviendo = false, fin = false;
      const T = 20; // tamaño de cada casilla en el dibujo

      const centro = (i) => [(i % n) * T + T / 2, Math.floor(i / n) * T + T / 2];
      const empezar = () => {
        n = TAMANOS[Math.min(nivel, TAMANOS.length - 1)];
        muros = crearLaberinto(n); pos = 0; camino = [0]; fin = false;
        svg.setAttribute("viewBox", `-2 -2 ${n * T + 4} ${n * T + 4}`);
        svg.replaceChildren(el("rect", { x: 0, y: 0, width: n * T, height: n * T, rx: 3, class: "suelo" }));
        ruta = el("polyline", { class: "rastro", points: centro(0).join(",") });
        svg.append(ruta);
        let d = "";
        muros.forEach((m, i) => {
          const x = (i % n) * T, y = Math.floor(i / n) * T;
          if (m.n) d += `M${x} ${y}h${T}`;
          if (m.o) d += `M${x} ${y}v${T}`;
          if (m.s) d += `M${x} ${y + T}h${T}`;
          if (m.e) d += `M${x + T} ${y}v${T}`;
        });
        svg.append(el("path", { d, class: "muros" }));
        const emoji = (txt, i, cls) => { const [x, y] = centro(i); const t = el("text", { x, y, class: cls }); t.textContent = txt; svg.append(t); return t; };
        emoji("🐔", n * n - 1, "mama");
        pollito = emoji("🐥", 0, "pollito");
        H.decir("Lleva al pollito con su mamá");
      };
      const mover = (j) => {
        pos = j;
        const k = camino.indexOf(j);
        if (k >= 0) camino = camino.slice(0, k + 1); else camino.push(j); // volver atrás borra el rastro
        ruta.setAttribute("points", camino.map(i => centro(i).join(",")).join(" "));
        const [x, y] = centro(j); pollito.setAttribute("x", x); pollito.setAttribute("y", y);
        H.nota(500 + (camino.length % 8) * 40, .08);
        if (j === n * n - 1) {
          fin = true;
          setTimeout(() => { H.celebrar("🐥"); }, 200);
          setTimeout(() => { if (v.isConnected) { nivel++; empezar(); } }, 2600);
        }
      };
      // Se puede arrastrar el dedo o ir tocando casillas: el pollito avanza solo por donde no hay pared
      const intentar = (e) => {
        if (fin) return;
        const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
        const x = vb.x + (e.clientX - r.left) / r.width * vb.width, y = vb.y + (e.clientY - r.top) / r.height * vb.height;
        const cx = Math.floor(x / T), cy = Math.floor(y / T);
        if (cx < 0 || cy < 0 || cx >= n || cy >= n) return;
        const j = cy * n + cx, i = pos;
        if (j === i) return;
        const m = muros[i];
        const ok = (j === i - n && !m.n) || (j === i + n && !m.s) || (j === i + 1 && !m.e && i % n < n - 1) || (j === i - 1 && !m.o && i % n > 0);
        if (ok) mover(j);
      };
      svg.addEventListener("pointerdown", (e) => { moviendo = true; svg.setPointerCapture(e.pointerId); intentar(e); });
      svg.addEventListener("pointermove", (e) => { if (moviendo) intentar(e); });
      svg.addEventListener("pointerup", () => { moviendo = false; });
      svg.addEventListener("pointercancel", () => { moviendo = false; });
      v.querySelector(".btn-oir").onclick = () => H.decir("Lleva al pollito con su mamá");
      v.querySelector('[data-a="otro"]').onclick = () => empezar();
      empezar();
      return v;
    },
  });

  /* ---------- A lavarse los dientes (2 minutos) ---------- */
  const ZONAS = [
    { voz: "Primero, los dientes de arriba", cls: "z-arriba" },
    { voz: "Ahora, los de abajo", cls: "z-abajo" },
    { voz: "Ahora, por dentro", cls: "z-dentro" },
    { voz: "¡Y las muelas del fondo!", cls: "z-muelas" },
  ];
  const MELODIA = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 784, 659, 587, 523];

  J.push({
    ruta: "dientes", ico: "🪥", nombre: "Dientes", clase: "c-cian",
    crear(H) {
      const v = H.h(`<section class="dientes-juego">
        <div class="pregunta"><span class="txt">¡A lavarse los dientes!</span></div>
        <div class="boca-caja">
          <svg class="reloj" viewBox="0 0 120 120"><circle class="fondo" cx="60" cy="60" r="54"/><circle class="progreso" cx="60" cy="60" r="54"/></svg>
          <svg class="boca" viewBox="0 0 200 140">
            <path class="labios" d="M10 40 Q100 -10 190 40 Q190 120 100 135 Q10 120 10 40 Z"/>
            <path class="encia" d="M24 44 Q100 6 176 44 L176 62 Q100 40 24 62 Z"/>
            <path class="encia" d="M30 100 Q100 128 170 100 L168 86 Q100 106 32 86 Z"/>
            <g class="fila-dientes arriba"></g>
            <g class="fila-dientes abajo"></g>
          </svg>
          <div class="cepillo">🪥</div>
          <div class="tiempo">2:00</div>
        </div>
        <div class="acciones">
          <button class="btn-accion btn-grande" data-a="empezar">▶️ ¡A cepillar!</button>
          <button class="btn-accion oculto" data-a="parar">⏹️ Parar</button>
        </div>
      </section>`);
      const txt = v.querySelector(".txt"), caja = v.querySelector(".boca-caja"), tiempo = v.querySelector(".tiempo");
      const prog = v.querySelector(".progreso"), LARGO = 2 * Math.PI * 54;
      prog.style.strokeDasharray = LARGO; prog.style.strokeDashoffset = LARGO;
      // Dientes con «manchitas» que se van limpiando
      const arriba = v.querySelector(".arriba"), abajo = v.querySelector(".abajo"), manchas = [];
      for (let i = 0; i < 8; i++) {
        const x = 30 + i * 18;
        arriba.append(el("rect", { x, y: 50 + Math.abs(i - 3.5) * 2, width: 16, height: 22, rx: 5, class: "diente" }));
        abajo.append(el("rect", { x: x + 2, y: 74 - Math.abs(i - 3.5) * 1.5, width: 14, height: 18, rx: 5, class: "diente" }));
        const m1 = el("circle", { cx: x + 8, cy: 64, r: 3, class: "mancha" }), m2 = el("circle", { cx: x + 9, cy: 84, r: 2.6, class: "mancha" });
        arriba.append(m1); abajo.append(m2); manchas.push(m1, m2);
      }
      const DUR = 120; // segundos
      let reloj = null, musica = null, t = 0, zona = -1, paso = 0;
      const pintar = () => {
        const queda = DUR - t;
        tiempo.textContent = Math.floor(queda / 60) + ":" + String(queda % 60).padStart(2, "0");
        prog.style.strokeDashoffset = LARGO * (1 - t / DUR);
        const limpias = Math.floor(manchas.length * t / DUR);
        manchas.forEach((m, i) => m.classList.toggle("limpia", i < limpias));
      };
      const parar = (terminado) => {
        clearInterval(reloj); clearInterval(musica); reloj = musica = null;
        caja.classList.remove("cepillando", ...ZONAS.map(z => z.cls));
        v.querySelector('[data-a="empezar"]').classList.remove("oculto");
        v.querySelector('[data-a="parar"]').classList.add("oculto");
        if (terminado) { txt.textContent = "¡Dientes limpios y brillantes! ✨"; caja.classList.add("brillan"); H.celebrar("🦷"); }
      };
      const empezar = () => {
        t = 0; zona = -1; caja.classList.remove("brillan"); pintar();
        caja.classList.add("cepillando");
        v.querySelector('[data-a="empezar"]').classList.add("oculto");
        v.querySelector('[data-a="parar"]').classList.remove("oculto");
        H.decir("¡A cepillar!");
        musica = setInterval(() => { H.nota(MELODIA[paso % MELODIA.length], .25, "triangle"); paso++; }, 400);
        reloj = setInterval(() => {
          t++; pintar();
          const z = Math.min(ZONAS.length - 1, Math.floor(t / (DUR / ZONAS.length)));
          if (z !== zona) {
            if (zona >= 0) caja.classList.remove(ZONAS[zona].cls);
            zona = z; caja.classList.add(ZONAS[z].cls);
            txt.textContent = ZONAS[z].voz; H.decir(ZONAS[z].voz);
          }
          if (t === 60) H.decir("¡Ya vamos por la mitad!");
          if (t >= DUR) parar(true);
        }, 1000);
      };
      v.querySelector('[data-a="empezar"]').onclick = empezar;
      v.querySelector('[data-a="parar"]').onclick = () => { parar(false); txt.textContent = "¡A lavarse los dientes!"; };
      v._limpiar = () => { clearInterval(reloj); clearInterval(musica); };
      pintar();
      return v;
    },
  });
})();
