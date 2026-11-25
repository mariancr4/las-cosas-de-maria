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
    if (!sonido) callar();
  };

  // Voces grabadas (ElevenLabs) en la carpeta audio/. Si una frase no tiene MP3,
  // se usa la voz del navegador como reserva.
  const AUDIOS = new Set(window.AUDIOS_MARIA || []);
  const nombreAudio = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  let vozES = null;
  const cargarVoz = () => {
    if (!("speechSynthesis" in window)) return;
    const voces = speechSynthesis.getVoices();
    vozES = voces.find(v => v.lang === "es-ES") || voces.find(v => v.lang && v.lang.startsWith("es")) || null;
  };
  if ("speechSynthesis" in window) { cargarVoz(); speechSynthesis.onvoiceschanged = cargarVoz; }
  const vozNavegador = (texto) => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "es-ES"; u.rate = 0.9; u.pitch = 1.2;
    if (vozES) u.voice = vozES;
    speechSynthesis.speak(u);
  };

  let audioCtx = null;
  const ctxAudio = () => (audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)());
  const buffers = new Map();
  const cargarBuffer = (n) => {
    if (!buffers.has(n)) {
      const p = fetch("/audio/" + n + ".mp3")
        .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(b => new Promise((ok, mal) => ctxAudio().decodeAudioData(b, ok, mal)));
      p.catch(() => buffers.delete(n));
      buffers.set(n, p);
    }
    return buffers.get(n);
  };
  // El primer toque desbloquea el audio (iPad/iPhone) y precarga las voces
  let precargado = false;
  document.addEventListener("pointerdown", () => {
    try { ctxAudio().resume(); } catch (e) {}
    if (!precargado) { precargado = true; AUDIOS.forEach(n => cargarBuffer(n).catch(() => {})); }
  }, true);

  let turno = 0, fuente = null, elAudio = null;
  const callar = () => {
    turno++;
    if (fuente) { try { fuente.stop(); } catch (e) {} fuente = null; }
    if (elAudio) { elAudio.pause(); elAudio = null; }
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  };

  const decir = (texto) => {
    if (!sonido) return;
    callar();
    const n = nombreAudio(texto);
    if (!AUDIOS.has(n)) return vozNavegador(texto);
    const mio = turno;
    cargarBuffer(n).then(buf => {
      if (mio !== turno) return;
      const ctx = ctxAudio(), src = ctx.createBufferSource();
      src.buffer = buf; src.connect(ctx.destination); src.start();
      fuente = src;
    }).catch(() => {
      // Abriendo index.html con doble clic fetch no funciona: probamos con <audio>
      if (mio !== turno) return;
      elAudio = new Audio("/audio/" + n + ".mp3");
      elAudio.play().catch(() => { if (mio === turno) vozNavegador(texto); });
    });
  };

  const nota = (frec, dur = 0.35, tipo = "sine") => {
    if (!sonido) return;
    try {
      ctxAudio();
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
    { ruta: "colorear", ico: "🖌️", nombre: "Colorear", clase: "c-lila2", voz: "Colorear" },
    { ruta: "musica", ico: "🎹", nombre: "Música", clase: "c-naranja", voz: "Música" },
    { ruta: "videos", ico: "📺", nombre: "Vídeos", clase: "c-cian", voz: "Vídeos" },
  ];

  /* Categorías de la portada. Un juego nuevo que no esté en ninguna lista va a «Jugar». */
  const CATEGORIAS = [
    { id: "aprender", ico: "🧠", nombre: "Aprender", clase: "c-azul", rutas: ["colores", "formas", "contar", "letras", "tamanos", "sombras"] },
    { id: "jugar", ico: "🎲", nombre: "Jugar", clase: "c-rosa", rutas: ["memoria", "puzle", "burbujas", "tarta"] },
    { id: "crear", ico: "🎨", nombre: "Crear", clase: "c-verde", rutas: ["pintar", "colorear", "musica"] },
    { id: "ver", ico: "📺", nombre: "Ver", clase: "c-lila", rutas: ["videos"] },
  ];
  const todasSecciones = () => SECCIONES.concat((window.JUEGOS_EXTRA || []).map(j => ({ ...j, voz: j.nombre })));
  const seccion = (ruta) => todasSecciones().find(s => s.ruta === ruta);
  const categoriaDe = (ruta) => CATEGORIAS.find(c => c.rutas.includes(ruta)) || CATEGORIAS[1];
  const seccionesDe = (cat) => {
    const conocidas = new Set(CATEGORIAS.flatMap(c => c.rutas));
    const lista = cat.rutas.map(seccion).filter(Boolean);
    if (cat.id === "jugar") todasSecciones().forEach(s => { if (!conocidas.has(s.ruta)) lista.push(s); });
    return lista;
  };

  // «Lo último»: los 3 juegos usados más recientemente
  const leerRecientes = () => { try { return JSON.parse(localStorage.getItem("recientes") || "[]"); } catch (e) { return []; } };
  const apuntarReciente = (ruta) => {
    const r = [ruta, ...leerRecientes().filter(x => x !== ruta)].slice(0, 3);
    try { localStorage.setItem("recientes", JSON.stringify(r)); } catch (e) {}
  };

  const tarjetaSeccion = (s) => {
    const b = h(`<button class="tarjeta ${s.clase}"><span class="ico">${s.ico}</span>${s.nombre}</button>`);
    b.onclick = () => { decir(s.voz); location.hash = "#/" + s.ruta; };
    return b;
  };

  function portada() {
    const v = h(`<section>
      <div class="saludo">
        <div class="avatar" id="avatar"><img src="/img/maria.png" alt="María"></div>
        <p class="hola">¡Hola, María!</p>
      </div>
      <div class="rejilla rejilla-categorias"></div>
      <div class="recientes oculto"><p class="recientes-titulo">⭐ Lo último</p><div class="rejilla rejilla-recientes"></div></div>
      <div class="acciones instalar-zona"></div>
    </section>`);
    botonInstalar(v.querySelector(".instalar-zona"));
    // Si todavía no existe img/maria.png, mostramos un dibujo de reserva
    v.querySelector("#avatar img").onerror = function () { this.parentElement.textContent = "👧"; };
    const rej = v.querySelector(".rejilla-categorias");
    CATEGORIAS.forEach(c => {
      const b = h(`<button class="tarjeta tarjeta-categoria ${c.clase}"><span class="ico">${c.ico}</span>${c.nombre}</button>`);
      b.onclick = () => { decir(c.nombre); location.hash = "#/cat/" + c.id; };
      rej.appendChild(b);
    });
    const rec = leerRecientes().map(seccion).filter(Boolean);
    if (rec.length) {
      v.querySelector(".recientes").classList.remove("oculto");
      rec.forEach(s => v.querySelector(".rejilla-recientes").appendChild(tarjetaSeccion(s)));
    }
    return v;
  }

  function categoria(id) {
    const c = CATEGORIAS.find(x => x.id === id);
    if (!c) return portada();
    const v = h(`<section class="categoria">
      <div class="cabecera-categoria ${c.clase}"><span class="ico">${c.ico}</span>${c.nombre}</div>
      <div class="rejilla"></div>
    </section>`);
    const rej = v.querySelector(".rejilla");
    seccionesDe(c).forEach(s => rej.appendChild(tarjetaSeccion(s)));
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


  /* ---------- Libro para colorear ---------- */
  const DIBUJOS = window.DIBUJOS_MARIA || [];
  const PALETA_COLOREAR = ["#ff4d4d", "#ff9a1f", "#ffd400", "#3cc84a", "#22b8cf", "#3d8bff", "#9b5cff", "#ff7ac6", "#9a6233", "#f5d0a9", "#9e9e9e", "#2b2b2b", "#ffffff"];
  const svgDibujo = (d) => `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="dibujo">${d.svg}</svg>`;
  const guardados = {}; // colores de cada dibujo mientras la web está abierta

  function colorear() {
    const v = h(`<section>
      <div class="pregunta"><span>¿Qué quieres colorear?</span></div>
      <div class="rejilla-dibujos"></div>
      <div class="acciones"><a class="btn-accion" href="/libro-para-colorear.pdf" download>📥 Libro para imprimir (PDF)</a></div>
    </section>`);
    const rej = v.querySelector(".rejilla-dibujos");
    DIBUJOS.forEach(d => {
      const b = h(`<button class="miniatura-dibujo" aria-label="${d.nombre}">${svgDibujo(d)}</button>`);
      pintarGuardado(b.querySelector("svg"), d.id);
      b.onclick = () => { decir(d.nombre); location.hash = "#/colorear/" + d.id; };
      rej.appendChild(b);
    });
    // Dibujos que se cargan desde este dispositivo (se guardan solo aquí, no en la web)
    // Dibujos y carpetas que se cargan desde este dispositivo (se guardan solo aquí, no en la web)
    misDibujos.listar().then(lista => {
      const sueltos = lista.filter(d => !d.categoria);
      const cats = {};
      lista.filter(d => d.categoria).forEach(d => (cats[d.categoria] = cats[d.categoria] || []).push(d));
      Object.keys(cats).sort().forEach(c => rej.appendChild(tarjetaCarpeta(c, cats[c], "#/colorear/cat/" + encodeURIComponent(c))));
      sueltos.forEach(d => rej.appendChild(miniaturaMia(d)));
      rej.appendChild(botonImportar("➕", "Añadir dibujo", false));
      rej.appendChild(botonImportar("📂", "Importar carpeta", "carpeta"));
      rej.appendChild(botonImportar("🗜️", "Importar .zip", "zip"));
    }).catch(() => {});
    setTimeout(() => decir("¿Qué quieres colorear?"), 300);
    return v;
  }


  function miniaturaMia(d) {
    const b = h(`<button class="miniatura-dibujo propia" aria-label="dibujo"><img alt="" loading="lazy"></button>`);
    b.querySelector("img").src = URL.createObjectURL(d.coloreado || d.miniatura || d.original);
    b.onclick = () => { location.hash = "#/colorear/mio-" + d.id; };
    return b;
  }
  function tarjetaCarpeta(nombre, items, destino) {
    const muestra = items[0];
    const b = h(`<button class="miniatura-dibujo carpeta"><img alt=""><span class="nombre-carpeta">📁 ${nombre.replace(/[<>&]/g, "")}</span><span class="cuenta">${items.length}</span></button>`);
    if (muestra) b.querySelector("img").src = URL.createObjectURL(muestra.miniatura || muestra.original);
    b.onclick = () => { decir(nombre); location.hash = destino; };
    return b;
  }
  function botonImportar(ico, texto, modo) {
    const accept = modo === "zip" ? ".zip,application/zip" : "image/*,application/pdf";
    const extra = modo === "carpeta" ? "webkitdirectory directory" : "multiple";
    const b = h(`<label class="miniatura-dibujo anadir"><span>${ico}</span><small>${texto}</small><input type="file" accept="${accept}" ${extra} hidden></label>`);
    b.querySelector("input").onchange = async (e) => {
      const lista = [];
      if (modo === "zip") {
        await cargarScript("/lib/jszip.min.js");
        for (const f of e.target.files) {
          const zip = await JSZip.loadAsync(f);
          for (const [ruta, ent] of Object.entries(zip.files)) {
            if (ent.dir || /(^|\/)(__MACOSX|\.)/.test(ruta)) continue;
            if (!/\.(pdf|png|jpe?g|webp|gif)$/i.test(ruta)) continue;
            const blob = await ent.async("blob");
            const tipo = /\.pdf$/i.test(ruta) ? "application/pdf" : "image/" + ruta.split(".").pop().toLowerCase().replace("jpg", "jpeg");
            lista.push({ ruta, archivo: new File([blob], ruta.split("/").pop(), { type: tipo }) });
          }
        }
      } else {
        for (const f of e.target.files) lista.push({ ruta: f.webkitRelativePath || f.name, archivo: f });
      }
      await importarLaminas(lista);
      location.hash = "#/colorear"; navegar();
    };
    return b;
  }
  const cargarScript = (src) => new Promise((ok, mal) => {
    if (document.querySelector(`script[src="${src}"]`)) return ok();
    const sc = document.createElement("script"); sc.src = src; sc.onload = ok; sc.onerror = mal; document.head.appendChild(sc);
  });

  // Importa archivos respetando las carpetas: Carpeta/Subcarpeta/lámina.pdf
  async function importarLaminas(lista) {
    lista = lista.filter(x => /\.(pdf|png|jpe?g|webp|gif)$/i.test(x.archivo.name) || /^image\//.test(x.archivo.type));
    if (!lista.length) return;
    const aviso = h(`<div class="ayuda-instalar"><div class="caja"><div class="ico">⏳</div><p>Guardando dibujos… <b class="n">0</b> de ${lista.length}</p></div></div>`);
    document.body.appendChild(aviso);
    let n = 0;
    for (const { ruta, archivo } of lista) {
      const partes = ruta.split("/").filter(Boolean);
      const categoria = partes.length >= 2 ? partes[0] : "";
      const sub = partes.length >= 3 ? partes.slice(1, -1).join(" · ") : "";
      try {
        const imgs = archivo.type === "application/pdf" || /\.pdf$/i.test(archivo.name) ? await pdfAImagenes(archivo) : [archivo];
        for (const img of imgs) {
          const d = await prepararLamina(img);
          d.categoria = categoria; d.sub = sub; d.nombre = archivo.name.replace(/\.[^.]+$/, "");
          await misDibujos.guardar(d);
        }
      } catch (err) { console.warn("No se pudo cargar", ruta, err); }
      aviso.querySelector(".n").textContent = ++n;
    }
    aviso.remove();
  }

  function colorearCarpeta(cat, sub) {
    const v = h(`<section>
      <div class="pregunta"><span>📁 ${(sub || cat).replace(/[<>&]/g, "")}</span></div>
      <div class="rejilla-dibujos"></div>
      <div class="acciones"><button class="btn-accion quitar-carpeta">❌ Quitar esta carpeta</button></div>
    </section>`);
    const rej = v.querySelector(".rejilla-dibujos");
    misDibujos.listar().then(lista => {
      const items = lista.filter(d => d.categoria === cat && (sub === undefined || d.sub === sub));
      if (sub === undefined) {
        const subs = {};
        items.filter(d => d.sub).forEach(d => (subs[d.sub] = subs[d.sub] || []).push(d));
        Object.keys(subs).sort().forEach(s => rej.appendChild(tarjetaCarpeta(s, subs[s], `#/colorear/cat/${encodeURIComponent(cat)}/${encodeURIComponent(s)}`)));
        items.filter(d => !d.sub).forEach(d => rej.appendChild(miniaturaMia(d)));
      } else items.forEach(d => rej.appendChild(miniaturaMia(d)));
      // Quitar: hay que mantener pulsado para que María no lo borre sin querer
      const q = v.querySelector(".quitar-carpeta"); let t = null;
      q.onclick = () => { q.textContent = "❌ Mantén pulsado para quitar"; };
      q.onpointerdown = () => { t = setTimeout(async () => { for (const d of items) await misDibujos.borrar(d.id); location.hash = "#/colorear"; }, 1500); };
      q.onpointerup = q.onpointerleave = () => clearTimeout(t);
    });
    return v;
  }

  /* ---------- Mis dibujos (guardados en este dispositivo con IndexedDB) ---------- */
  const misDibujos = (() => {
    const abrir = () => new Promise((ok, mal) => {
      const r = indexedDB.open("maria-dibujos", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("dibujos", { keyPath: "id", autoIncrement: true });
      r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error);
    });
    const tx = async (modo, fn) => {
      const db = await abrir();
      return new Promise((ok, mal) => {
        const t = db.transaction("dibujos", modo), st = t.objectStore("dibujos");
        const r = fn(st); t.oncomplete = () => ok(r && r.result); t.onerror = () => mal(t.error);
      });
    };
    return {
      listar: () => tx("readonly", st => st.getAll()),
      leer: (id) => tx("readonly", st => st.get(id)),
      guardar: (d) => tx("readwrite", st => st.put(d)),
      borrar: (id) => tx("readwrite", st => st.delete(id)),
    };
  })();

  // Convierte cada página de un PDF en una imagen (carga pdf.js solo cuando hace falta)
  let pdfjs = null;
  async function pdfAImagenes(archivo) {
    if (!pdfjs) {
      await cargarScript("/lib/pdf.min.js");
      pdfjs = window.pdfjsLib;
      pdfjs.GlobalWorkerOptions.workerSrc = "/lib/pdf.worker.min.js";
    }
    const doc = await pdfjs.getDocument({ data: await archivo.arrayBuffer() }).promise;
    const imagenes = [];
    for (let n = 1; n <= Math.min(doc.numPages, 10); n++) {
      const pag = await doc.getPage(n);
      const base = pag.getViewport({ scale: 1 });
      const vp = pag.getViewport({ scale: 1400 / Math.max(base.width, base.height) });
      const c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height;
      const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
      await pag.render({ canvasContext: ctx, viewport: vp }).promise;
      imagenes.push(await new Promise(ok => c.toBlob(ok, "image/png")));
    }
    return imagenes;
  }

  // Convierte la imagen a blanco y negro limpio para que el relleno funcione bien
  function prepararLamina(archivo) {
    return new Promise((ok, mal) => {
      const img = new Image();
      img.onload = () => {
        const max = 1400, k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const d = ctx.getImageData(0, 0, c.width, c.height), px = d.data;
        for (let i = 0; i < px.length; i += 4) {
          const luz = px[i] * .3 + px[i + 1] * .59 + px[i + 2] * .11;
          const v = luz < 150 ? 0 : 255; px[i] = px[i + 1] = px[i + 2] = v; px[i + 3] = 255;
        }
        ctx.putImageData(d, 0, 0);
        URL.revokeObjectURL(img.src);
        c.toBlob(b => {
          const m = document.createElement("canvas"), km = 300 / Math.max(c.width, c.height);
          m.width = Math.round(c.width * km); m.height = Math.round(c.height * km);
          m.getContext("2d").drawImage(c, 0, 0, m.width, m.height);
          m.toBlob(mb => ok({ original: b, miniatura: mb, coloreado: null, fecha: Date.now() }), "image/jpeg", .8);
        }, "image/png");
      };
      img.onerror = mal;
      img.src = URL.createObjectURL(archivo);
    });
  }

  function colorearMio(id) {
    const v = h(`<section class="colorear">
      <div class="hoja hoja-lienzo"><canvas></canvas></div>
      <div class="paleta"></div>
      <div class="acciones">
        <button class="btn-accion" data-a="deshacer">↩️ Deshacer</button>
        <button class="btn-accion" data-a="borrar">🗑️ Empezar de nuevo</button>
        <button class="btn-accion" data-a="descargar">📥 Descargar mi dibujo</button>
        <button class="btn-accion" data-a="quitar">❌ Quitar dibujo</button>
      </div>
    </section>`);
    const lienzo = v.querySelector("canvas"), pal = v.querySelector(".paleta");
    const ctx = lienzo.getContext("2d", { willReadFrequently: true });
    let color = PALETA_COLOREAR[0], dibujo = null, lineas = null, historial = [];

    const cargarImg = (blob) => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.src = URL.createObjectURL(blob); });
    misDibujos.leer(id).then(async d => {
      if (!d) { location.hash = "#/colorear"; return; }
      dibujo = d;
      const base = await cargarImg(d.original);
      lienzo.width = base.width; lienzo.height = base.height;
      ctx.drawImage(base, 0, 0);
      lineas = ctx.getImageData(0, 0, lienzo.width, lienzo.height).data.slice(); // líneas negras de la lámina
      if (d.coloreado) ctx.drawImage(await cargarImg(d.coloreado), 0, 0);
      v.querySelector(".hoja").style.aspectRatio = `${base.width} / ${base.height}`;
    });

    const guardar = () => lienzo.toBlob(b => { dibujo.coloreado = b; misDibujos.guardar(dibujo); }, "image/png");

    lienzo.addEventListener("pointerdown", (e) => {
      if (!lineas) return;
      const r = lienzo.getBoundingClientRect();
      const x = Math.floor((e.clientX - r.left) * lienzo.width / r.width);
      const y = Math.floor((e.clientY - r.top) * lienzo.height / r.height);
      const img = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
      historial.push(img.data.slice()); if (historial.length > 15) historial.shift();
      if (rellenar(img, lineas, x, y, color)) { ctx.putImageData(img, 0, 0); nota(500 + azar(400), .15); guardar(); }
      else historial.pop();
    });

    PALETA_COLOREAR.forEach((c, i) => {
      const b = h(`<button class="color-btn${i === 0 ? " activo" : ""}" aria-label="color"></button>`);
      b.style.background = c;
      b.onclick = () => { color = c; pal.querySelectorAll(".activo").forEach(x => x.classList.remove("activo")); b.classList.add("activo"); nota(700, .08); };
      pal.appendChild(b);
    });
    v.querySelector('[data-a="deshacer"]').onclick = () => {
      const prev = historial.pop(); if (!prev) return;
      ctx.putImageData(new ImageData(prev, lienzo.width, lienzo.height), 0, 0); guardar();
    };
    v.querySelector('[data-a="borrar"]').onclick = () => {
      if (!lineas) return;
      ctx.putImageData(new ImageData(lineas.slice(), lienzo.width, lienzo.height), 0, 0); historial = [];
      dibujo.coloreado = null; misDibujos.guardar(dibujo); nota(300, .2);
    };
    v.querySelector('[data-a="descargar"]').onclick = () => lienzo.toBlob(b => {
      const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "dibujo-de-maria.png";
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); celebrar("🖼️");
    }, "image/png");
    // Para quitar un dibujo hay que mantener pulsado (así María no lo borra sin querer)
    const quitar = v.querySelector('[data-a="quitar"]');
    let t = null;
    quitar.onclick = () => { quitar.textContent = "❌ Mantén pulsado para quitar"; };
    quitar.onpointerdown = () => { t = setTimeout(async () => { await misDibujos.borrar(id); location.hash = "#/colorear"; }, 1200); };
    quitar.onpointerup = quitar.onpointerleave = () => clearTimeout(t);
    return v;
  }

  // Relleno por inundación: pinta la zona tocada hasta las líneas negras
  function rellenar(img, lineas, x, y, hex) {
    const w = img.width, hgt = img.height, px = img.data;
    if (x < 0 || y < 0 || x >= w || y >= hgt) return false;
    const esLinea = (i) => lineas[i] < 128;
    const ini = (y * w + x) * 4;
    if (esLinea(ini)) return false;
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    const visto = new Uint8Array(w * hgt);
    const pila = [x, y];
    while (pila.length) {
      const cy = pila.pop(), cx = pila.pop();
      let lx = cx;
      while (lx >= 0 && !visto[cy * w + lx] && !esLinea((cy * w + lx) * 4)) lx--;
      lx++;
      let arriba = false, abajo = false;
      for (let xx = lx; xx < w; xx++) {
        const k = cy * w + xx;
        if (visto[k] || esLinea(k * 4)) break;
        visto[k] = 1; const i = k * 4; px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
        if (cy > 0) { const ka = k - w, libre = !visto[ka] && !esLinea(ka * 4); if (libre && !arriba) { pila.push(xx, cy - 1); arriba = true; } else if (!libre) arriba = false; }
        if (cy < hgt - 1) { const kb = k + w, libre = !visto[kb] && !esLinea(kb * 4); if (libre && !abajo) { pila.push(xx, cy + 1); abajo = true; } else if (!libre) abajo = false; }
      }
    }
    return true;
  }

  function pintarGuardado(svg, id) {
    const zonas = svg.querySelectorAll(".z");
    (guardados[id] || []).forEach((c, i) => { if (c && zonas[i]) zonas[i].style.fill = c; });
  }

  function colorearDibujo(id) {
    const d = DIBUJOS.find(x => x.id === id);
    if (!d) return colorear();
    const v = h(`<section class="colorear">
      <div class="hoja">${svgDibujo(d)}</div>
      <div class="paleta"></div>
      <div class="acciones">
        <button class="btn-accion" data-a="borrar">🗑️ Empezar de nuevo</button>
        <button class="btn-accion" data-a="descargar">📥 Descargar mi dibujo</button>
      </div>
    </section>`);
    const svg = v.querySelector("svg"), pal = v.querySelector(".paleta");
    const zonas = [...svg.querySelectorAll(".z")];
    guardados[id] = guardados[id] || [];
    pintarGuardado(svg, id);
    let color = PALETA_COLOREAR[0];

    zonas.forEach((z, i) => {
      z.addEventListener("click", () => {
        z.style.fill = color; guardados[id][i] = color;
        nota(500 + azar(400), .15);
      });
    });
    PALETA_COLOREAR.forEach((c, i) => {
      const b = h(`<button class="color-btn${i === 0 ? " activo" : ""}" aria-label="color"></button>`);
      b.style.background = c;
      b.onclick = () => { color = c; pal.querySelectorAll(".activo").forEach(x => x.classList.remove("activo")); b.classList.add("activo"); nota(700, .08); };
      pal.appendChild(b);
    });
    v.querySelector('[data-a="borrar"]').onclick = () => { zonas.forEach(z => z.style.fill = ""); guardados[id] = []; nota(300, .2); };
    v.querySelector('[data-a="descargar"]').onclick = () => descargarDibujo(svg, d.nombre);
    return v;
  }

  function descargarDibujo(svg, nombre) {
    const copia = svg.cloneNode(true);
    copia.setAttribute("width", "1200"); copia.setAttribute("height", "1200");
    // Incrustamos los estilos para que la imagen se vea igual fuera de la web
    copia.querySelectorAll(".z").forEach(z => { z.setAttribute("fill", z.style.fill || "#ffffff"); z.removeAttribute("style"); });
    copia.querySelectorAll(".z, .l").forEach(z => { z.setAttribute("stroke", "#2f2147"); z.setAttribute("stroke-width", "3.5"); z.setAttribute("stroke-linejoin", "round"); z.setAttribute("stroke-linecap", "round"); });
    copia.querySelectorAll(".l").forEach(z => z.setAttribute("fill", "none"));
    const datos = new XMLSerializer().serializeToString(copia);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = 1200; c.height = 1200;
      const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 1200, 1200);
      ctx.drawImage(img, 0, 0, 1200, 1200);
      c.toBlob(b => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b); a.download = `dibujo-de-maria-${nombre.toLowerCase()}.png`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        celebrar("🖼️");
      }, "image/png");
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(datos);
  }

  /* ---------- Música ---------- */
  const TECLAS = [
    { f: 261.6, c: "#ff4d4d", e: "🐶" }, { f: 293.7, c: "#ff9a1f", e: "🐱" }, { f: 329.6, c: "#ffd400", e: "🐥" },
    { f: 349.2, c: "#3cc84a", e: "🐸" }, { f: 392.0, c: "#3d8bff", e: "🐟" }, { f: 440.0, c: "#9b5cff", e: "🦄" },
    { f: 493.9, c: "#ff7ac6", e: "🐷" }, { f: 523.3, c: "#9a6233", e: "🐻" },
  ];
  // Melodías tradicionales (dominio público). Números = tecla (0 = primera, 7 = última)
  const MELODIAS = [
    { nombre: "Estrellita", ico: "⭐", n: [0,0,4,4,5,5,4, 3,3,2,2,1,1,0, 4,4,3,3,2,2,1, 4,4,3,3,2,2,1, 0,0,4,4,5,5,4, 3,3,2,2,1,1,0] },
    { nombre: "Los pollitos", ico: "🐥", n: [0,1,2,3,4,4, 5,5,5,5,4, 3,3,3,3,2,2, 1,1,1,1,0] },
    { nombre: "Martinillo", ico: "🔔", n: [0,1,2,0, 0,1,2,0, 2,3,4, 2,3,4] },
    { nombre: "Corderito", ico: "🐑", n: [2,1,0,1,2,2,2, 1,1,1, 2,4,4, 2,1,0,1,2,2,2,2, 1,1,2,1,0] },
    { nombre: "Himno de la alegría", ico: "🎉", n: [2,2,3,4,4,3,2,1,0,0,1,2,2,1,1, 2,2,3,4,4,3,2,1,0,0,1,2,1,0,0] },
  ];

  function musica() {
    const v = h(`<section class="musica">
      <div class="piano"></div>
      <div class="partitura oculto"><div class="bolas"></div></div>
      <div class="melodias"></div>
    </section>`);
    const p = v.querySelector(".piano"), part = v.querySelector(".partitura"), bolas = v.querySelector(".bolas"), lista = v.querySelector(".melodias");
    const teclas = [];
    let actual = null, pos = 0, tocando = [];

    const sonar = (i) => {
      nota(TECLAS[i].f, .8, "triangle");
      teclas[i].classList.add("sonando"); setTimeout(() => teclas[i].classList.remove("sonando"), 200);
    };
    const marcar = () => {
      teclas.forEach(t => t.classList.remove("siguiente"));
      [...bolas.children].forEach((b, i) => { b.classList.toggle("hecha", i < pos); b.classList.toggle("ahora", i === pos); });
      const ahora = bolas.children[pos];
      if (ahora) { ahora.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }); teclas[actual.n[pos]].classList.add("siguiente"); }
    };
    const parar = () => { tocando.forEach(clearTimeout); tocando = []; };

    TECLAS.forEach((t, i) => {
      const b = h(`<button class="tecla">${t.e}</button>`);
      b.style.background = t.c;
      b.onpointerdown = () => {
        sonar(i);
        if (actual && actual.n[pos] === i) {
          pos++;
          if (pos >= actual.n.length) { marcar(); setTimeout(() => celebrar("🎶"), 400); setTimeout(() => { pos = 0; marcar(); }, 2400); }
          else marcar();
        }
      };
      teclas.push(b); p.appendChild(b);
    });

    const elegir = (m, boton) => {
      parar(); actual = m; pos = 0;
      lista.querySelectorAll(".activa").forEach(x => x.classList.remove("activa")); boton.classList.add("activa");
      bolas.innerHTML = m.n.map(i => `<span style="background:${TECLAS[i].c}">${TECLAS[i].e}</span>`).join("");
      part.classList.remove("oculto");
      marcar();
    };
    MELODIAS.forEach(m => {
      const b = h(`<button class="btn-accion">${m.ico} ${m.nombre}</button>`);
      b.onclick = () => { decir(m.nombre); elegir(m, b); };
      lista.appendChild(b);
    });
    const escuchar = h(`<button class="btn-accion">👂 Escuchar</button>`);
    escuchar.onclick = () => {
      if (!actual) return;
      parar(); pos = 0; marcar();
      actual.n.forEach((i, k) => tocando.push(setTimeout(() => {
        sonar(i);
        [...bolas.children].forEach((b, j) => b.classList.toggle("ahora", j === k));
        bolas.children[k].scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      }, k * 420)));
      tocando.push(setTimeout(marcar, actual.n.length * 420 + 300));
    };
    lista.appendChild(escuchar);
    v._limpiar = parar;
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

  function botonInstalar(zona) {
    const yaApp = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    if (yaApp) return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const b = h(`<button class="btn-accion btn-instalar">📲 Instalar la app</button>`);
    b.onclick = async () => {
      if (avisoInstalar) { avisoInstalar.prompt(); await avisoInstalar.userChoice; avisoInstalar = null; return; }
      const ayuda = h(`<div class="ayuda-instalar" role="dialog"><div class="caja">
        <div class="ico">📲</div>
        <p>${ios
          ? "En el iPad o iPhone: toca el botón <b>Compartir</b> <span class='ic'>⬆️</span> de Safari y luego <b>«Añadir a pantalla de inicio»</b>."
          : "En el menú del navegador <b>⋮</b> elige <b>«Instalar aplicación»</b> o <b>«Añadir a pantalla de inicio»</b>."}</p>
        <button class="btn-accion">¡Vale!</button></div></div>`);
      ayuda.onclick = (e) => { if (e.target === ayuda || e.target.tagName === "BUTTON") ayuda.remove(); };
      document.body.appendChild(ayuda);
    };
    zona.appendChild(b);
  }

  /* ---------- Juegos extra (juegos2.js) ---------- */
  const H = { h, decir, celebrar, nota, azar, barajar, elegir };
  const EXTRA = window.JUEGOS_EXTRA || [];

  /* ---------- Navegación ---------- */
  const RUTAS = { colores, formas, memoria, contar, pintar, colorear, musica, videos };
  EXTRA.forEach(j => { RUTAS[j.ruta] = () => j.crear(H); });
  let vistaActual = null;
  function navegar() {
    const partes = location.hash.replace(/^#\/?/, "").split("/");
    const [ruta, extra] = partes;
    if (vistaActual && vistaActual._limpiar) vistaActual._limpiar();
    callar();
    let vista;
    if (ruta === "video" && extra) vista = video(extra);
    else if (ruta === "colorear" && extra === "cat" && partes[2]) vista = colorearCarpeta(decodeURIComponent(partes[2]), partes[3] !== undefined ? decodeURIComponent(partes[3]) : undefined);
    else if (ruta === "colorear" && extra && extra.startsWith("mio-")) vista = colorearMio(Number(extra.slice(4)));
    else if (ruta === "colorear" && extra) vista = colorearDibujo(extra);
    else if (ruta === "cat" && extra) vista = categoria(extra);
    else if (RUTAS[ruta]) { vista = RUTAS[ruta](); apuntarReciente(ruta); }
    else vista = portada();
    btnCasa.classList.toggle("oculto", !ruta);
    app.replaceChildren(vista);
    vistaActual = vista;
    window.scrollTo(0, 0);
  }
  btnCasa.onclick = () => {
    const ruta = location.hash.replace(/^#\/?/, "").split("/")[0];
    const partes = location.hash.replace(/^#\/?/, "").split("/");
    if (ruta === "colorear" && partes[1] === "cat" && partes.length > 3) { location.hash = "#/" + partes.slice(0, 3).join("/"); return; }
    if (ruta === "video") { location.hash = "#/videos"; return; }
    if (ruta === "colorear" && partes[1]) { location.hash = "#/colorear"; return; }
    // Desde un juego se vuelve a su categoría; desde la categoría, a la portada
    location.hash = (ruta && ruta !== "cat" && RUTAS[ruta]) ? "#/cat/" + categoriaDe(ruta).id : "#/";
  };
  window.addEventListener("hashchange", navegar);
  navegar();

  /* ---------- App instalable (PWA) ---------- */
  let avisoInstalar = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); avisoInstalar = e; document.querySelectorAll(".btn-instalar").forEach(b => b.classList.remove("oculto")); });
  window.addEventListener("appinstalled", () => document.querySelectorAll(".btn-instalar").forEach(b => b.remove()));
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }
})();
