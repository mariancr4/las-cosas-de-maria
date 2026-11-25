(() => {
  "use strict";

  const app = document.getElementById("app");
  const btnCasa = document.getElementById("btnCasa");
  const btnSonido = document.getElementById("btnSonido");
  const premio = document.getElementById("premio");

  /* ---------- Utilidades ---------- */
  const azar = (n) => Math.floor(Math.random() * n);
  const barajar = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = azar(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const elegir = (a, n) => barajar(a).slice(0, n);
  const h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };

  /* ---------- Sonido y voz ---------- */
  let sonido = true;
  try { sonido = localStorage.getItem("sonido") !== "no"; } catch (e) {}
  const pintarSonido = () => { btnSonido.textContent = sonido ? "🔊" : "🔇"; };
  pintarSonido();
  btnSonido.onclick = () => {
    sonido = !sonido; pintarSonido();
    try { localStorage.setItem("sonido", sonido ? "si" : "no"); } catch (e) {}
    if (!sonido && "speechSynthesis" in window) speechSynthesis.cancel();
  };

  let vozES = null;
  const cargarVoz = () => {
    if (!("speechSynthesis" in window)) return;
    const voces = speechSynthesis.getVoices();
    vozES = voces.find(v => v.lang === "es-ES") || voces.find(v => v.lang && v.lang.startsWith("es")) || null;
  };
  if ("speechSynthesis" in window) { cargarVoz(); speechSynthesis.onvoiceschanged = cargarVoz; }

  const decir = (texto) => {
    if (!sonido || !("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "es-ES"; u.rate = 0.9; u.pitch = 1.2;
    if (vozES) u.voice = vozES;
    speechSynthesis.speak(u);
  };

  let audioCtx = null;
  const nota = (frec, dur = 0.35, tipo = "sine") => {
    if (!sonido) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = tipo; o.frequency.value = frec;
      g.gain.setValueAtTime(0.3, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + dur);
    } catch (e) {}
  };
  const sonBien = () => { nota(523); setTimeout(() => nota(659), 120); setTimeout(() => nota(784, .5), 240); };
  const sonMal = () => nota(220, .3, "triangle");

  const FELICITAR = ["¡Muy bien!", "¡Genial!", "¡Fenomenal!", "¡Bravo, María!", "¡Lo has conseguido!", "¡Qué lista eres!"];
  const celebrar = (grande = "⭐") => {
    sonBien();
    decir(FELICITAR[azar(FELICITAR.length)]);
    premio.innerHTML = `<div class="grande">${grande}</div>`;
    premio.classList.remove("oculto");
    const simbolos = ["⭐", "🎉", "💖", "🌈", "✨", "🎈"];
    for (let i = 0; i < 18; i++) {
      const c = document.createElement("div");
      c.className = "confeti";
      c.textContent = simbolos[azar(simbolos.length)];
      c.style.left = azar(100) + "vw";
      c.style.animationDelay = (Math.random() * 0.5) + "s";
      premio.appendChild(c);
    }
    setTimeout(() => { premio.classList.add("oculto"); premio.innerHTML = ""; }, 1800);
  };

  /* ---------- Portada ---------- */
  const SECCIONES = [
    { ruta: "colores", ico: "🎨", nombre: "Colores", clase: "c-rosa", voz: "Colores" },
    { ruta: "formas", ico: "🔺", nombre: "Formas", clase: "c-azul", voz: "Formas" },
    { ruta: "memoria", ico: "🃏", nombre: "Parejas", clase: "c-lila", voz: "Parejas" },
    { ruta: "contar", ico: "🔢", nombre: "Contar", clase: "c-amarillo", voz: "Contar" },
    { ruta: "pintar", ico: "🖍️", nombre: "Pintar", clase: "c-verde", voz: "Pintar" },
    { ruta: "musica", ico: "🎹", nombre: "Música", clase: "c-naranja", voz: "Música" },
    { ruta: "videos", ico: "📺", nombre: "Vídeos", clase: "c-cian", voz: "Vídeos" },
  ];

  function portada() {
    const v = h(`<section>
      <div class="saludo">
        <div class="avatar" id="avatar"><img src="/img/maria.png" alt="María"></div>
        <p class="hola">¡Hola, María!</p>
      </div>
      <div class="rejilla"></div>
    </section>`);
    // Si todavía no existe img/maria.png, mostramos un dibujo de reserva
    v.querySelector("#avatar img").onerror = function () { this.parentElement.textContent = "👧"; };
    const rej = v.querySelector(".rejilla");
    SECCIONES.forEach(s => {
      const b = h(`<button class="tarjeta ${s.clase}"><span class="ico">${s.ico}</span>${s.nombre}</button>`);
      b.onclick = () => { decir(s.voz); location.hash = "#/" + s.ruta; };
      rej.appendChild(b);
    });
    return v;
  }

  /* ---------- Plantilla de juego de preguntas ---------- */
  // ronda() devuelve { texto, voz, opciones: [{html, ok}] }
  function juegoPreguntas(ronda, numOpciones) {
    const v = h(`<section>
      <div class="pregunta"><button class="btn-oir" aria-label="Escuchar otra vez">👂</button><span class="txt"></span></div>
      <div class="opciones"></div>
      <div class="estrellas"></div>
    </section>`);
    const txt = v.querySelector(".txt"), ops = v.querySelector(".opciones"), est = v.querySelector(".estrellas");
    let aciertos = 0, actual, bloqueado = false;

    const nueva = () => {
      actual = ronda();
      txt.innerHTML = actual.texto;
      ops.innerHTML = "";
      bloqueado = false;
      barajar(actual.opciones).slice(0, numOpciones).forEach(op => {
        const b = h(`<button class="opcion">${op.html}</button>`);
        if (op.fondo) b.style.background = op.fondo;
        b.setAttribute("aria-label", op.etiqueta || "opción");
        b.onclick = () => {
          if (bloqueado) return;
          if (op.ok) {
            bloqueado = true;
            b.classList.add("bien");
            aciertos++;
            est.textContent = "⭐".repeat(((aciertos - 1) % 5) + 1);
            celebrar(aciertos % 5 === 0 ? "🏆" : "⭐");
            setTimeout(nueva, 1900);
          } else {
            sonMal();
            b.classList.remove("mal"); void b.offsetWidth; b.classList.add("mal");
            if (op.vozMal) decir(op.vozMal);
          }
        };
        ops.appendChild(b);
      });
      setTimeout(() => decir(actual.voz), 300);
    };
    v.querySelector(".btn-oir").onclick = () => decir(actual.voz);
    nueva();
    return v;
  }

  /* ---------- Juego: colores ---------- */
  const COLORES = [
    { n: "rojo", c: "#ff4d4d" }, { n: "azul", c: "#3d8bff" }, { n: "amarillo", c: "#ffd400" },
    { n: "verde", c: "#3cc84a" }, { n: "naranja", c: "#ff9a1f" }, { n: "morado", c: "#9b5cff" },
    { n: "rosa", c: "#ff7ac6" }, { n: "marrón", c: "#9a6233" }, { n: "negro", c: "#2b2b2b" }, { n: "blanco", c: "#ffffff" },
  ];
  function colores() {
    return juegoPreguntas(() => {
      const grupo = elegir(COLORES, 4), meta = grupo[0];
      return {
        texto: `¿Dónde está el <span style="color:${meta.c === "#ffffff" ? "#999" : meta.c}">${meta.n}</span>?`,
        voz: `¿Dónde está el ${meta.n}?`,
        opciones: grupo.map(c => ({
          html: "", fondo: c.c, ok: c === meta, etiqueta: c.n,
          vozMal: c === meta ? null : `Ese es el ${c.n}`,
        })),
      };
    }, 4);
  }

  /* ---------- Juego: formas ---------- */
  const svgForma = (d, color) => `<svg viewBox="0 0 100 100">${d.replace(/COLOR/g, color)}</svg>`;
  const FORMAS = [
    { n: "círculo", art: "el", d: `<circle cx="50" cy="50" r="44" fill="COLOR"/>` },
    { n: "cuadrado", art: "el", d: `<rect x="8" y="8" width="84" height="84" rx="6" fill="COLOR"/>` },
    { n: "triángulo", art: "el", d: `<polygon points="50,6 96,92 4,92" fill="COLOR" stroke-linejoin="round"/>` },
    { n: "estrella", art: "la", d: `<polygon points="50,4 62,38 98,38 69,60 80,95 50,74 20,95 31,60 2,38 38,38" fill="COLOR"/>` },
    { n: "corazón", art: "el", d: `<path d="M50 90 C10 60 2 38 18 20 C32 6 48 14 50 28 C52 14 68 6 82 20 C98 38 90 60 50 90Z" fill="COLOR"/>` },
    { n: "rectángulo", art: "el", d: `<rect x="4" y="24" width="92" height="52" rx="6" fill="COLOR"/>` },
    { n: "óvalo", art: "el", d: `<ellipse cx="50" cy="50" rx="46" ry="30" fill="COLOR"/>` },
  ];
  const COLORES_FORMA = ["#ff6b8b", "#5aa9ff", "#ffc93c", "#5ccf6a", "#a77bff", "#ff9a3c"];
  function formas() {
    return juegoPreguntas(() => {
      const grupo = elegir(FORMAS, 4), meta = grupo[0];
      const cols = barajar(COLORES_FORMA);
      return {
        texto: `¿Dónde está ${meta.art} ${meta.n}?`,
        voz: `¿Dónde está ${meta.art} ${meta.n}?`,
        opciones: grupo.map((f, i) => ({
          html: svgForma(f.d, cols[i]), ok: f === meta, etiqueta: f.n,
          vozMal: f === meta ? null : `Ese es ${f.art} ${f.n}`,
        })),
      };
    }, 4);
  }

  /* ---------- Juego: contar ---------- */
  const COSAS = ["🍎", "🐥", "⭐", "🦋", "🐟", "🌸", "🚗", "🍓", "🐞", "🎈"];
  const NUMEROS = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"];
  function contar() {
    const v = h(`<section>
      <div class="pregunta"><button class="btn-oir" aria-label="Contar en voz alta">👂</button><span>¿Cuántos hay?</span></div>
      <div class="cosas"></div>
      <div class="opciones tres"></div>
      <div class="estrellas"></div>
    </section>`);
    const cosas = v.querySelector(".cosas"), ops = v.querySelector(".opciones"), est = v.querySelector(".estrellas");
    let n = 0, aciertos = 0, bloqueado = false, contando = [];

    const contarEnVoz = () => {
      contando.forEach(clearTimeout); contando = [];
      const spans = [...cosas.children];
      spans.forEach((s, i) => contando.push(setTimeout(() => {
        spans.forEach(x => x.classList.remove("contado"));
        s.classList.add("contado"); nota(400 + i * 60, .2); decir(NUMEROS[i + 1]);
      }, i * 900)));
      contando.push(setTimeout(() => spans.forEach(x => x.classList.remove("contado")), spans.length * 900));
    };

    const nueva = () => {
      bloqueado = false;
      n = 1 + azar(aciertos < 5 ? 5 : 8);
      const cosa = COSAS[azar(COSAS.length)];
      cosas.innerHTML = Array.from({ length: n }, () => `<span>${cosa}</span>`).join("");
      // Cada pieza se puede tocar para contarla
      [...cosas.children].forEach((s, i) => s.onclick = () => { s.classList.add("contado"); decir(NUMEROS[i + 1]); });
      const opciones = new Set([n]);
      while (opciones.size < 3) { const x = 1 + azar(Math.max(6, n + 2)); opciones.add(x); }
      ops.innerHTML = "";
      barajar([...opciones]).forEach(x => {
        const b = h(`<button class="opcion">${x}</button>`);
        b.setAttribute("aria-label", NUMEROS[x]);
        b.onclick = () => {
          if (bloqueado) return;
          if (x === n) {
            bloqueado = true; b.classList.add("bien"); aciertos++;
            est.textContent = "⭐".repeat(((aciertos - 1) % 5) + 1);
            celebrar(aciertos % 5 === 0 ? "🏆" : "⭐");
            setTimeout(nueva, 1900);
          } else {
            sonMal(); b.classList.remove("mal"); void b.offsetWidth; b.classList.add("mal");
            decir("Vamos a contarlos juntas"); setTimeout(contarEnVoz, 1500);
          }
        };
        ops.appendChild(b);
      });
      setTimeout(() => decir("¿Cuántos hay?"), 300);
    };
    v.querySelector(".btn-oir").onclick = contarEnVoz;
    nueva();
    return v;
  }

  /* ---------- Juego: memoria (parejas) ---------- */
  const ANIMALES = ["🐶", "🐱", "🐰", "🐻", "🐸", "🦁", "🐷", "🐵", "🦄", "🐮"];
  function memoria() {
    const v = h(`<section>
      <div class="pregunta"><span>¡Busca las parejas!</span></div>
      <div class="memoria"></div>
    </section>`);
    const tab = v.querySelector(".memoria");
    let pares = 4;

    const empezar = () => {
      tab.innerHTML = "";
      const sel = elegir(ANIMALES, pares);
      const cartas = barajar([...sel, ...sel]);
      let abiertas = [], hechas = 0, bloqueado = false;
      cartas.forEach(a => {
        const c = h(`<button class="carta" aria-label="carta"><div class="carta-in"><div class="cara atras">❓</div><div class="cara frente">${a}</div></div></button>`);
        c.onclick = () => {
          if (bloqueado || c.classList.contains("girada")) return;
          c.classList.add("girada"); nota(600, .15);
          abiertas.push({ c, a });
          if (abiertas.length === 2) {
            const [x, y] = abiertas; abiertas = [];
            if (x.a === y.a) {
              x.c.classList.add("hecha"); y.c.classList.add("hecha"); hechas++;
              setTimeout(() => nota(880, .25), 200);
              if (hechas === pares) {
                setTimeout(() => { celebrar("🏆"); }, 500);
                setTimeout(() => { if (pares < 6) pares++; empezar(); }, 2600);
              }
            } else {
              bloqueado = true;
              setTimeout(() => { x.c.classList.remove("girada"); y.c.classList.remove("girada"); bloqueado = false; }, 1000);
            }
          }
        };
        tab.appendChild(c);
      });
    };
    setTimeout(() => decir("¡Busca las parejas!"), 300);
    empezar();
    return v;
  }

  /* ---------- Pintar ---------- */
  const PALETA = ["#ff4d4d", "#ff9a1f", "#ffd400", "#3cc84a", "#3d8bff", "#9b5cff", "#ff7ac6", "#9a6233", "#2b2b2b"];
  function pintar() {
    const v = h(`<section class="pintar">
      <canvas class="lienzo"></canvas>
      <div class="paleta"></div>
    </section>`);
    const lienzo = v.querySelector("canvas"), pal = v.querySelector(".paleta");
    let ctx, color = PALETA[0], pintando = false, ultimo = null;

    const ajustar = () => {
      const r = lienzo.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      const copia = ctx ? ctx.getImageData(0, 0, lienzo.width, lienzo.height) : null;
      lienzo.width = r.width * dpr; lienzo.height = r.height * dpr;
      ctx = lienzo.getContext("2d");
      ctx.scale(dpr, dpr); ctx.lineCap = "round"; ctx.lineJoin = "round";
      if (copia) ctx.putImageData(copia, 0, 0);
    };
    const pos = (e) => { const r = lienzo.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    lienzo.onpointerdown = (e) => { pintando = true; ultimo = pos(e); lienzo.setPointerCapture(e.pointerId); trazo(e); };
    lienzo.onpointermove = (e) => { if (pintando) trazo(e); };
    lienzo.onpointerup = lienzo.onpointercancel = () => { pintando = false; ultimo = null; };
    function trazo(e) {
      const p = pos(e);
      ctx.strokeStyle = color; ctx.lineWidth = color === "#ffffff" ? 40 : 18;
      ctx.beginPath(); ctx.moveTo(ultimo.x, ultimo.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      ultimo = p;
    }

    PALETA.forEach((c, i) => {
      const b = h(`<button class="color-btn${i === 0 ? " activo" : ""}" aria-label="color"></button>`);
      b.style.background = c;
      b.onclick = () => { color = c; pal.querySelectorAll(".activo").forEach(x => x.classList.remove("activo")); b.classList.add("activo"); };
      pal.appendChild(b);
    });
    const goma = h(`<button class="color-btn goma" aria-label="goma">🧽</button>`);
    goma.onclick = () => { color = "#ffffff"; pal.querySelectorAll(".activo").forEach(x => x.classList.remove("activo")); goma.classList.add("activo"); };
    const borrar = h(`<button class="color-btn goma" aria-label="borrar todo">🗑️</button>`);
    borrar.onclick = () => { ctx.clearRect(0, 0, lienzo.width, lienzo.height); nota(300, .2); };
    pal.append(goma, borrar);

    requestAnimationFrame(ajustar);
    window.addEventListener("resize", ajustar);
    v._limpiar = () => window.removeEventListener("resize", ajustar);
    return v;
  }

  /* ---------- Música ---------- */
  const TECLAS = [
    { f: 261.6, c: "#ff4d4d", e: "🐶" }, { f: 293.7, c: "#ff9a1f", e: "🐱" }, { f: 329.6, c: "#ffd400", e: "🐥" },
    { f: 349.2, c: "#3cc84a", e: "🐸" }, { f: 392.0, c: "#3d8bff", e: "🐟" }, { f: 440.0, c: "#9b5cff", e: "🦄" },
    { f: 493.9, c: "#ff7ac6", e: "🐷" }, { f: 523.3, c: "#9a6233", e: "🐻" },
  ];
  function musica() {
    const v = h(`<section><div class="piano"></div></section>`);
    const p = v.querySelector(".piano");
    TECLAS.forEach(t => {
      const b = h(`<button class="tecla">${t.e}</button>`);
      b.style.background = t.c;
      b.onpointerdown = () => { nota(t.f, .8, "triangle"); b.classList.add("sonando"); setTimeout(() => b.classList.remove("sonando"), 200); };
      p.appendChild(b);
    });
    return v;
  }

  /* ---------- Vídeos ---------- */
  const VIDEOS = (window.VIDEOS_MARIA || []).filter(x => x && /^[\w-]{11}$/.test(x.id));
  function videos() {
    if (!VIDEOS.length) {
      return h(`<section class="aviso"><div class="ico">📺</div><p>¡Pronto habrá vídeos aquí!</p></section>`);
    }
    const v = h(`<section class="lista-videos"></section>`);
    VIDEOS.forEach(x => {
      const b = h(`<button class="miniatura"><img loading="lazy" alt="" src="https://i.ytimg.com/vi/${x.id}/hqdefault.jpg"><div>${x.emoji || "▶️"} ${x.titulo || ""}</div></button>`);
      b.onclick = () => { location.hash = "#/video/" + x.id; };
      v.appendChild(b);
    });
    return v;
  }
  function video(id) {
    if (!VIDEOS.some(x => x.id === id)) return videos();
    return h(`<section><div class="reproductor"><iframe
      src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1"
      title="Vídeo" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div></section>`);
  }

  /* ---------- Navegación ---------- */
  const RUTAS = { colores, formas, memoria, contar, pintar, musica, videos };
  let vistaActual = null;
  function navegar() {
    const partes = location.hash.replace(/^#\/?/, "").split("/");
    const [ruta, extra] = partes;
    if (vistaActual && vistaActual._limpiar) vistaActual._limpiar();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    let vista;
    if (ruta === "video" && extra) vista = video(extra);
    else if (RUTAS[ruta]) vista = RUTAS[ruta]();
    else vista = portada();
    btnCasa.classList.toggle("oculto", !ruta);
    app.replaceChildren(vista);
    vistaActual = vista;
    window.scrollTo(0, 0);
  }
  btnCasa.onclick = () => {
    const ruta = location.hash.replace(/^#\/?/, "").split("/")[0];
    location.hash = ruta === "video" ? "#/videos" : "#/";
  };
  window.addEventListener("hashchange", navegar);
  navegar();

  /* ---------- App instalable (PWA) ---------- */
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }
})();
