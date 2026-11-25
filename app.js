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

  // Frases grabadas juntas en un solo MP3 («sprite»): { archivo, frases: { nombre: [inicio, fin] } }
  const SPRITES = window.AUDIOS_SPRITES || [];
  const enSprite = (n) => { for (const sp of SPRITES) if (sp.frases[n]) return { archivo: sp.archivo, tramo: sp.frases[n] }; return null; };

  // Si no hay grabación, elegimos la voz española más natural que tenga el aparato
  let vozES = null;
  const puntuarVoz = (v) => {
    const n = (v.name || "").toLowerCase(), l = (v.lang || "").toLowerCase().replace("_", "-");
    if (!l.startsWith("es")) return -1;
    let p = 0;
    if (l === "es-es") p += 30; else if (l === "es-mx" || l === "es-us") p += 15;
    if (/premium|mejorad|enhanced|neural|natural/.test(n)) p += 50;
    if (/google/.test(n)) p += 35;
    if (/m[oó]nica|paulina|marisol|elvira|helena|laura|lucia|luc[ií]a|paloma/.test(n)) p += 25;
    if (/compact|eloquence|grandma|grandpa|abuel|bad news|bells|bubbles|jester|organ|superstar|trinoids|whisper|wobble|zarvox|albert|bahh|boing|cellos|fred|junior|kathy|ralph|rocko|shelley|flo|reed|sandy|eddy/.test(n)) p -= 60;
    if (v.localService) p += 5;
    return p;
  };
  const cargarVoz = () => {
    if (!("speechSynthesis" in window)) return;
    const voces = speechSynthesis.getVoices().filter(v => puntuarVoz(v) >= 0);
    vozES = voces.sort((a, b) => puntuarVoz(b) - puntuarVoz(a))[0] || null;
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
      const p = fetch(n.startsWith("/") ? n : "/audio/" + n + ".mp3")
        .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(b => new Promise((ok, mal) => ctxAudio().decodeAudioData(b, ok, mal)));
      p.catch(() => buffers.delete(n));
      buffers.set(n, p);
    }
    return buffers.get(n);
  };
  // El primer toque desbloquea el audio (iPad/iPhone) y precarga las voces
  let precargado = false;
  // En iPhone el interruptor de silencio apaga el Web Audio: pedimos sonido como «reproducción»
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  try { if (esIOS && navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
  let desbloqueado = false;
  const desbloquear = () => {
    try {
      const ctx = ctxAudio();
      if (ctx.state !== "running") ctx.resume();
      if (!desbloqueado) { // un sonido mudo dentro del toque deja el audio desbloqueado en iOS
        desbloqueado = true;
        const src = ctx.createBufferSource(); src.buffer = ctx.createBuffer(1, 1, 22050);
        src.connect(ctx.destination); src.start(0);
      }
    } catch (e) {}
    if (!precargado) { precargado = true; AUDIOS.forEach(n => cargarBuffer(n).catch(() => {})); SPRITES.forEach(sp => cargarBuffer(sp.archivo).catch(() => {})); }
  };
  ["pointerdown", "touchend", "click", "keydown"].forEach(ev => document.addEventListener(ev, desbloquear, true));
  // Al volver a la app (o tras una llamada) iOS deja el audio «interrumpido»
  document.addEventListener("visibilitychange", () => { if (!document.hidden && audioCtx && audioCtx.state !== "running") audioCtx.resume().catch(() => {}); });

  let turno = 0, fuente = null, elAudio = null;
  const callar = () => {
    turno++;
    if (fuente) { try { fuente.stop(); } catch (e) {} fuente = null; }
    if (elAudio) { elAudio.pause(); elAudio = null; }
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  };

  // La voz solo suena cuando se toca un botón de escuchar (👂) o en el piano.
  // Cualquier otro toque retira el permiso, así no se oyen frases a destiempo.
  const VOZ_BOTONES = ".btn-oir, .musica button, [data-voz]";
  let vozHasta = 0;
  document.addEventListener("pointerdown", (e) => {
    vozHasta = e.target.closest && e.target.closest(VOZ_BOTONES) ? Date.now() + 12000 : 0;
  }, true);
  document.addEventListener("keydown", (e) => { if (e.target.closest && e.target.closest(VOZ_BOTONES)) vozHasta = Date.now() + 12000; }, true);
  const decir = (texto, siempre) => {
    if (!sonido) return;
    if (!siempre && Date.now() > vozHasta) return;
    callar();
    const n = nombreAudio(texto);
    const sp = !AUDIOS.has(n) && enSprite(n);
    if (sp) {
      const mio = turno;
      cargarBuffer(sp.archivo).then(buf => {
        if (mio !== turno) return;
        const ctx = ctxAudio(), src = ctx.createBufferSource();
        src.buffer = buf; src.connect(ctx.destination);
        src.start(0, sp.tramo[0], sp.tramo[1] - sp.tramo[0]);
        fuente = src;
      }).catch(() => { if (mio === turno) vozNavegador(texto); });
      return;
    }
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

  // Plan B para navegadores que no dejan arrancar el Web Audio (p. ej. Safari en algunos Mac):
  // se genera la nota como un pequeño WAV en memoria y se toca con <audio>.
  const wavs = new Map();
  const wavNota = (frec, dur, tipo) => {
    const k = frec + "|" + dur + "|" + tipo;
    if (wavs.has(k)) return wavs.get(k);
    const sr = 22050, n = Math.round(sr * dur), datos = new DataView(new ArrayBuffer(44 + n * 2));
    const txt = (o, t) => { for (let i = 0; i < t.length; i++) datos.setUint8(o + i, t.charCodeAt(i)); };
    txt(0, "RIFF"); datos.setUint32(4, 36 + n * 2, true); txt(8, "WAVE"); txt(12, "fmt ");
    datos.setUint32(16, 16, true); datos.setUint16(20, 1, true); datos.setUint16(22, 1, true);
    datos.setUint32(24, sr, true); datos.setUint32(28, sr * 2, true); datos.setUint16(32, 2, true); datos.setUint16(34, 16, true);
    txt(36, "data"); datos.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) {
      const t = i / sr, fase = (t * frec) % 1;
      let y = tipo === "triangle" ? 1 - 4 * Math.abs(fase - .5) : tipo === "square" ? (fase < .5 ? 1 : -1) * .6 : Math.sin(2 * Math.PI * fase);
      y *= .3 * Math.exp(-5 * t / dur) * Math.min(1, i / 60);
      datos.setInt16(44 + i * 2, Math.max(-1, Math.min(1, y)) * 32767, true);
    }
    const url = URL.createObjectURL(new Blob([datos], { type: "audio/wav" }));
    wavs.set(k, url);
    return url;
  };
  const notaHTML = (frec, dur, tipo) => { try { new Audio(wavNota(frec, dur, tipo)).play().catch(() => {}); } catch (e) {} };
  const notaWeb = (frec, dur, tipo) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = tipo; o.frequency.value = frec;
    g.gain.setValueAtTime(0.3, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  };
  const nota = (frec, dur = 0.35, tipo = "sine") => {
    if (!sonido) return;
    try {
      ctxAudio();
      if (audioCtx.state === "running") { notaWeb(frec, dur, tipo); return; }
      // Si el Web Audio no arranca enseguida, tocamos la nota con el plan B
      let hecho = false;
      const plan = setTimeout(() => { if (!hecho) { hecho = true; notaHTML(frec, dur, tipo); } }, 150);
      audioCtx.resume().then(() => {
        if (hecho) return;
        hecho = true; clearTimeout(plan);
        if (audioCtx.state === "running") notaWeb(frec, dur, tipo); else notaHTML(frec, dur, tipo);
      }).catch(() => { if (!hecho) { hecho = true; clearTimeout(plan); notaHTML(frec, dur, tipo); } });
    } catch (e) { notaHTML(frec, dur, tipo); }
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
    { ruta: "fotos", ico: "📸", nombre: "Fotos", clase: "c-naranja", voz: "Fotos" },
    { ruta: "videos", ico: "📺", nombre: "Vídeos", clase: "c-cian", voz: "Vídeos" },
  ];

  /* Categorías de la portada. Un juego nuevo que no esté en ninguna lista va a «Jugar». */
  const CATEGORIAS = [
    { id: "aprender", ico: "🧠", nombre: "Aprender", clase: "c-azul", rutas: ["colores", "formas", "contar", "letras", "tamanos", "sombras", "puntos", "laberinto"] },
    { id: "jugar", ico: "🎲", nombre: "Jugar", clase: "c-rosa", rutas: ["memoria", "puzle", "burbujas", "tarta", "dientes"] },
    { id: "crear", ico: "🎨", nombre: "Crear", clase: "c-verde", rutas: ["pintar", "colorear", "rasca", "musica", "fotos"] },
    { id: "ver", ico: "📺", nombre: "Ver", clase: "c-lila", rutas: ["videos"] },
  ];
  const todasSecciones = () => SECCIONES.concat((window.JUEGOS_EXTRA || []).map(j => ({ ...j, voz: j.nombre })));
  const seccion = (ruta) => todasSecciones().find(s => s.ruta === ruta);
  const categoriaDe = (ruta) => CATEGORIAS.find(c => c.rutas.includes(ruta)) || CATEGORIAS[1];
  // Ajustes de la zona para mayores (se comparten por la hoja de Google; copia en el dispositivo)
  let ajustes = {};
  try { ajustes = JSON.parse(localStorage.getItem("ajustes-hoja") || "{}") || {}; } catch (e) {}
  const guardarAjustes = (a) => { ajustes = a || {}; try { localStorage.setItem("ajustes-hoja", JSON.stringify(ajustes)); } catch (e) {} };
  const listaAjuste = (n) => new Set(String(ajustes[n] || "").split(",").filter(Boolean));
  const seccionesDe = (cat) => {
    const conocidas = new Set(CATEGORIAS.flatMap(c => c.rutas));
    const lista = cat.rutas.map(seccion).filter(Boolean);
    if (cat.id === "jugar") todasSecciones().forEach(s => { if (!conocidas.has(s.ruta)) lista.push(s); });
    const ocultos = listaAjuste("ocultos");
    return lista.filter(s => !ocultos.has(s.ruta));
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
    const candado = h(`<button class="btn-accion btn-instalar btn-mayores">🔒 Mayores</button>`);
    candado.onclick = () => { location.hash = "#/mayores"; };
    v.querySelector(".instalar-zona").appendChild(candado);
    // Si todavía no existe img/maria.png, mostramos la muñequita dibujada (img/maria.svg)
    v.querySelector("#avatar img").onerror = function () {
      if (!this.src.endsWith("/img/maria.svg")) this.src = "/img/maria.svg";
      else this.parentElement.textContent = "👧🏻";
    };
    const rej = v.querySelector(".rejilla-categorias");
    CATEGORIAS.forEach(c => {
      const b = h(`<button class="tarjeta tarjeta-categoria ${c.clase}"><span class="ico">${c.ico}</span>${c.nombre}</button>`);
      b.onclick = () => { decir(c.nombre); location.hash = "#/cat/" + c.id; };
      rej.appendChild(b);
    });
    const rec = leerRecientes().filter(r => !listaAjuste("ocultos").has(r)).map(seccion).filter(Boolean);
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
    const dibOcultos = listaAjuste("dibujos-ocultos");
    DIBUJOS.filter(d => !dibOcultos.has(d.id)).forEach(d => {
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
    { nombre: "Cumpleaños feliz", ico: "🎂", n: [0,0,1,0,3,2, 0,0,1,0,4,3, 0,0,7,5,3,2,1, 5,5,5,3,4,3] },
    // Versión sencilla: el piano tiene solo 8 teclas, así que la parte aguda se adapta
    { nombre: "Noche de paz", ico: "🌟", n: [4,5,4,2, 4,5,4,2, 6,6,4, 7,7,4, 5,5,7,6,5,4,5,4,2, 5,5,7,6,5,4,5,4,2, 7,4,2,4,3,1,0] },
    { nombre: "Cascabel", ico: "🎄", n: [2,2,2, 2,2,2, 2,4,0,1,2, 3,3,3,3, 3,2,2,2, 2,1,1,2, 1,4, 2,2,2, 2,2,2, 2,4,0,1,2, 3,3,3,3, 3,2,2,2, 4,4,3,1,0] },
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

  /* ---------- Fotos con filtros y pegatinas ----------
     La cámara solo se usa en este dispositivo: las fotos no se suben a ningún sitio. */
  const FILTROS = [
    { ico: "🙂", f: "none" },
    { ico: "🖤", f: "grayscale(1) contrast(1.1)" },
    { ico: "🧸", f: "sepia(.85) saturate(1.2)" },
    { ico: "🌸", f: "saturate(1.6) hue-rotate(-25deg) brightness(1.08)" },
    { ico: "🌊", f: "saturate(1.4) hue-rotate(170deg)" },
    { ico: "✨", f: "saturate(2.2) contrast(1.15)" },
    { ico: "☀️", f: "sepia(.35) saturate(1.5) brightness(1.08)" },
    { ico: "❄️", f: "saturate(1.2) hue-rotate(200deg) brightness(1.1)" },
    { ico: "🦸", f: "contrast(1.8) saturate(2.6)" },
    { ico: "👽", f: "hue-rotate(90deg) saturate(1.8)" },
    { ico: "🍇", f: "hue-rotate(260deg) saturate(1.6)" },
    { ico: "👻", f: "invert(1)" },
    { ico: "🌙", f: "grayscale(.4) brightness(.75) contrast(1.3) hue-rotate(200deg)" },
    { ico: "☁️", f: "blur(3px) brightness(1.15) saturate(1.3)" },
  ];
  const COLORES_PINCEL = ["#ff3b6b", "#ff9f1c", "#ffe02e", "#3ddc84", "#2fa4ff", "#9b5cff", "#ffffff", "#2a1b14"];
  // Safari no aplica ctx.filter: hacemos los filtros a mano en los píxeles
  function filtrarPixeles(ctx, w, h2, f) {
    if (!f || f === "none") return;
    const d = ctx.getImageData(0, 0, w, h2), p = d.data;
    const num = (n, def) => { const m = f.match(new RegExp(n + "\\(([-\\d.]+)")); return m ? parseFloat(m[1]) : def; };
    const inv = num("invert", 0), gris = num("grayscale", 0), sepia = num("sepia", 0), sat = num("saturate", 1), con = num("contrast", 1), bri = num("brightness", 1), hue = num("hue-rotate", 0) * Math.PI / 180;
    const cs = Math.cos(hue), sn = Math.sin(hue);
    for (let i = 0; i < p.length; i += 4) {
      let r = p[i], g = p[i + 1], b = p[i + 2];
      if (inv) { r += (255 - 2 * r) * inv; g += (255 - 2 * g) * inv; b += (255 - 2 * b) * inv; }
      if (gris) { const l = .2126 * r + .7152 * g + .0722 * b; r += (l - r) * gris; g += (l - g) * gris; b += (l - b) * gris; }
      if (sepia) { const sr = .393 * r + .769 * g + .189 * b, sg = .349 * r + .686 * g + .168 * b, sb = .272 * r + .534 * g + .131 * b; r += (sr - r) * sepia; g += (sg - g) * sepia; b += (sb - b) * sepia; }
      if (sat !== 1) { const l = .2126 * r + .7152 * g + .0722 * b; r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat; }
      if (hue) {
        const nr = r * (.213 + cs * .787 - sn * .213) + g * (.715 - cs * .715 - sn * .715) + b * (.072 - cs * .072 + sn * .928);
        const ng = r * (.213 - cs * .213 + sn * .143) + g * (.715 + cs * .285 + sn * .140) + b * (.072 - cs * .072 - sn * .283);
        const nb = r * (.213 - cs * .213 - sn * .787) + g * (.715 - cs * .715 + sn * .715) + b * (.072 + cs * .928 + sn * .072);
        r = nr; g = ng; b = nb;
      }
      if (con !== 1) { r = (r - 128) * con + 128; g = (g - 128) * con + 128; b = (b - 128) * con + 128; }
      if (bri !== 1) { r *= bri; g *= bri; b *= bri; }
      p[i] = r; p[i + 1] = g; p[i + 2] = b;
    }
    ctx.putImageData(d, 0, 0);
  }
  const PEGATINAS = ["👑", "🎀", "👓", "🌸", "⭐", "💖", "🌈", "🦄", "🐱", "🐶", "🦋", "🍓"];

  function fotos() {
    const v = h(`<section class="fotos">
      <div class="visor">
        <video playsinline muted autoplay></video>
        <canvas class="vista-camara"></canvas>
        <canvas class="capa-pintura"></canvas>
        <div class="capa-pegatinas"></div>
        <img class="foto-hecha oculto" alt="Mi foto">
        <div class="aviso-camara oculto"></div>
      </div>
      <div class="titulo-fila">🎨 Filtros</div>
      <div class="fila filtros"></div>
      <div class="fila modos">
        <button class="btn-modo activo" data-modo="pegar">✨ Dibujitos</button>
        <button class="btn-modo" data-modo="pintar">🖌️ Pintar</button>
      </div>
      <div class="fila pegatinas"></div>
      <div class="fila pinceles oculto"></div>
      <div class="acciones">
        <button class="btn-accion btn-disparar" data-a="foto">📸 ¡Foto!</button>
        <button class="btn-accion oculto" data-a="guardar">💾 Guardar</button>
        <button class="btn-accion oculto" data-a="otra">🔄 Otra</button>
        <button class="btn-accion" data-a="limpiar">🧽 Borrar todo</button>
      </div>
    </section>`);
    const video = v.querySelector("video"), capa = v.querySelector(".capa-pegatinas");
    const hecha = v.querySelector(".foto-hecha"), aviso = v.querySelector(".aviso-camara");
    const btn = (a) => v.querySelector(`[data-a="${a}"]`);
    let flujo = null, filtro = "none", pegatina = PEGATINAS[0], ultima = null;

    const avisar = (txt, conPlanB = true) => {
      aviso.innerHTML = txt + (conPlanB ? `<br><label class="btn-accion btn-encender plan-b">📷 Usar la cámara del móvil<input type="file" accept="image/*" capture="user" hidden></label>` : "");
      aviso.classList.remove("oculto");
      const inp = aviso.querySelector(".plan-b input");
      if (inp) inp.onchange = (e) => usarFotoFija(e.target.files[0]);
    };
    const ua = navigator.userAgent;
    const appInterna = /FBAN|FBAV|Instagram|WhatsApp|Line\/|GSA\/|Telegram/i.test(ua);
    // La cámara solo se enciende al pulsar el botón
    const encender = async () => {
      if (!window.isSecureContext) { avisar("📷<br>La cámara solo funciona en la dirección segura (https)."); return; }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        avisar(appInterna ? "📷<br>Abre la web en <b>Safari</b> o <b>Chrome</b> para usar la cámara." : "📷<br>Este navegador no deja usar la cámara aquí.");
        return;
      }
      aviso.classList.add("oculto");
      const intentos = [
        { video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false },
        { video: { facingMode: "user" }, audio: false },
        { video: true, audio: false },
      ];
      let error = null;
      for (const c of intentos) {
        try { flujo = await navigator.mediaDevices.getUserMedia(c); error = null; break; }
        catch (e) { error = e; if (e.name === "NotAllowedError" || e.name === "SecurityError") break; }
      }
      if (!flujo) {
        const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        const msg = error && (error.name === "NotAllowedError" || error.name === "SecurityError")
          ? (ios ? "📷<br>La cámara está bloqueada.<br><small>En el iPhone: toca <b>aA</b> en la barra de Safari → <b>Ajustes del sitio web</b> → <b>Cámara: Permitir</b>. O en Ajustes → Safari → Cámara.</small>"
                 : "📷<br>La cámara está bloqueada.<br><small>Toca el candado de la barra de direcciones y permite la cámara.</small>")
          : "📷<br>No se ha podido encender la cámara.";
        avisar(msg);
        return;
      }
      video.muted = true; video.playsInline = true;
      video.setAttribute("playsinline", ""); video.setAttribute("muted", ""); video.setAttribute("autoplay", "");
      video.srcObject = flujo;
      const reproducir = () => video.play().catch(() => {
        // Si el navegador no deja arrancar el vídeo solo, un toque lo arranca
        aviso.replaceChildren(h(`<button class="btn-accion btn-encender">👆 Toca para ver la cámara</button>`));
        aviso.classList.remove("oculto");
        aviso.querySelector("button").onclick = () => { aviso.classList.add("oculto"); video.play().catch(() => {}); };
      });
      if (video.readyState >= 1) reproducir(); else video.onloadedmetadata = reproducir;
      pintarVista();
    };
    // Safari del iPhone a veces no muestra el <video> de la cámara (sale negro):
    // copiamos cada fotograma a un canvas, en espejo y con el filtro elegido.
    const vista = v.querySelector(".vista-camara"), vctx = vista.getContext("2d");
    const filtroCanvas = "filter" in vctx;
    let bucle = 0;
    const pintarVista = () => {
      cancelAnimationFrame(bucle);
      const paso = () => {
        if (!flujo || !vista.isConnected) return;
        const r = vista.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const W = Math.round(r.width * dpr), Hh = Math.round(r.height * dpr);
        if (vista.width !== W || vista.height !== Hh) { vista.width = W; vista.height = Hh; }
        const vw = video.videoWidth, vh = video.videoHeight;
        if (vw && vh && video.readyState >= 2) {
          const k = Math.max(W / vw, Hh / vh), dw = vw * k, dh = vh * k;
          vctx.save(); vctx.translate(W, 0); vctx.scale(-1, 1);
          if (filtroCanvas) vctx.filter = filtro;
          vctx.drawImage(video, (W - dw) / 2, (Hh - dh) / 2, dw, dh);
          vctx.restore();
        }
        bucle = requestAnimationFrame(paso);
      };
      bucle = requestAnimationFrame(paso);
    };
    // Plan B (sirve siempre en iPhone): hacer la foto con la cámara del sistema y decorarla después
    let fija = null;
    const usarFotoFija = (archivo) => {
      if (!archivo) return;
      const img = new Image();
      img.onload = () => {
        fija = img;
        if (flujo) { flujo.getTracks().forEach(t => t.stop()); flujo = null; }
        video.classList.add("oculto"); vista.classList.add("oculto");
        let ff = v.querySelector(".foto-fija");
        if (!ff) { ff = h(`<img class="foto-fija" alt="">`); v.querySelector(".visor").insertBefore(ff, capa); }
        ff.src = img.src; ff.style.filter = filtro;
        aviso.classList.add("oculto");
      };
      img.src = URL.createObjectURL(archivo);
    };
    aviso.classList.remove("oculto");
    aviso.replaceChildren(h(`<div class="botones-camara"><button class="btn-accion btn-encender">📷 Encender la cámara</button><label class="btn-accion btn-encender plan-b">🤳 Hacer una foto<input type="file" accept="image/*" capture="user" hidden></label></div>`));
    aviso.querySelector("button").onclick = encender;
    aviso.querySelector(".plan-b input").onchange = (e) => usarFotoFija(e.target.files[0]);
    v._limpiar = () => { cancelAnimationFrame(bucle); if (flujo) flujo.getTracks().forEach(t => t.stop()); };

    FILTROS.forEach((x, i) => {
      const b = h(`<button class="chip chip-filtro${i === 0 ? " activo" : ""}" aria-label="filtro"><span class="muestra"></span><span class="ico-filtro">${x.ico}</span></button>`);
      b.querySelector(".muestra").style.filter = x.f;
      b.onclick = () => {
        filtro = x.f; video.style.filter = x.f;
        if (!filtroCanvas) vista.style.filter = x.f;
        const ff = v.querySelector(".foto-fija"); if (ff) ff.style.filter = x.f;
        v.querySelectorAll(".filtros .activo").forEach(y => y.classList.remove("activo")); b.classList.add("activo"); nota(700, .08);
      };
      v.querySelector(".filtros").appendChild(b);
    });
    PEGATINAS.forEach((p, i) => {
      const b = h(`<button class="chip${i === 0 ? " activo" : ""}">${p}</button>`);
      b.onclick = () => { pegatina = p; v.querySelectorAll(".pegatinas .activo").forEach(y => y.classList.remove("activo")); b.classList.add("activo"); nota(800, .08); };
      v.querySelector(".pegatinas").appendChild(b);
    });

    // Pintar con el dedo encima de la foto
    const lienzo = v.querySelector(".capa-pintura"), lctx = lienzo.getContext("2d");
    let modo = "pegar", color = COLORES_PINCEL[0], goma = false, trazo = null;
    const ajustarLienzo = () => {
      const r = lienzo.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = Math.round(r.width * dpr), Hh = Math.round(r.height * dpr);
      if (!W || (lienzo.width === W && lienzo.height === Hh)) return;
      let copia = null;
      if (lienzo.width && lienzo.height) { copia = document.createElement("canvas"); copia.width = lienzo.width; copia.height = lienzo.height; copia.getContext("2d").drawImage(lienzo, 0, 0); }
      lienzo.width = W; lienzo.height = Hh;
      if (copia) lctx.drawImage(copia, 0, 0, W, Hh);
    };
    const punto = (e) => { const r = lienzo.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * lienzo.width, y: (e.clientY - r.top) / r.height * lienzo.height, k: lienzo.width / r.width }; };
    lienzo.addEventListener("pointerdown", (e) => {
      ajustarLienzo(); lienzo.setPointerCapture(e.pointerId);
      trazo = punto(e);
      lctx.globalCompositeOperation = goma ? "destination-out" : "source-over";
      lctx.fillStyle = color; lctx.beginPath(); lctx.arc(trazo.x, trazo.y, (goma ? 18 : 7) * trazo.k, 0, Math.PI * 2); lctx.fill();
    });
    lienzo.addEventListener("pointermove", (e) => {
      if (!trazo) return;
      const p = punto(e);
      lctx.globalCompositeOperation = goma ? "destination-out" : "source-over";
      lctx.strokeStyle = color; lctx.lineWidth = (goma ? 36 : 14) * p.k; lctx.lineCap = lctx.lineJoin = "round";
      lctx.beginPath(); lctx.moveTo(trazo.x, trazo.y); lctx.lineTo(p.x, p.y); lctx.stroke();
      trazo = p;
    });
    const soltar = () => { trazo = null; lctx.globalCompositeOperation = "source-over"; };
    lienzo.addEventListener("pointerup", soltar); lienzo.addEventListener("pointercancel", soltar);
    COLORES_PINCEL.forEach((c, i) => {
      const b = h(`<button class="chip chip-color${i === 0 ? " activo" : ""}" aria-label="color"></button>`);
      b.style.background = c;
      b.onclick = () => { color = c; goma = false; v.querySelectorAll(".pinceles .activo").forEach(y => y.classList.remove("activo")); b.classList.add("activo"); nota(500 + i * 60, .08); };
      v.querySelector(".pinceles").appendChild(b);
    });
    const bGoma = h(`<button class="chip" aria-label="goma">🧽</button>`);
    bGoma.onclick = () => { goma = true; v.querySelectorAll(".pinceles .activo").forEach(y => y.classList.remove("activo")); bGoma.classList.add("activo"); nota(300, .08); };
    v.querySelector(".pinceles").appendChild(bGoma);
    v.querySelectorAll(".btn-modo").forEach(b => b.onclick = () => {
      modo = b.dataset.modo;
      v.querySelectorAll(".btn-modo").forEach(y => y.classList.toggle("activo", y === b));
      v.querySelector(".pegatinas").classList.toggle("oculto", modo !== "pegar");
      v.querySelector(".pinceles").classList.toggle("oculto", modo !== "pintar");
      v.querySelector(".visor").classList.toggle("pintando", modo === "pintar");
      ajustarLienzo(); nota(650, .08);
    });

    // Tocar la imagen pone la pegatina elegida; tocar una pegatina la quita
    capa.addEventListener("pointerdown", (e) => {
      if (e.target.classList.contains("pegatina")) { e.target.remove(); nota(300, .1); return; }
      const r = capa.getBoundingClientRect();
      const p = h(`<span class="pegatina">${pegatina}</span>`);
      p.style.left = ((e.clientX - r.left) / r.width * 100) + "%";
      p.style.top = ((e.clientY - r.top) / r.height * 100) + "%";
      capa.appendChild(p); nota(600 + azar(300), .12);
    });

    btn("foto").onclick = () => {
      const fuente = fija || (flujo && video.videoWidth ? video : null);
      if (!fuente) return;
      const w = fija ? fija.naturalWidth : video.videoWidth, hh = fija ? fija.naturalHeight : video.videoHeight;
      const c = document.createElement("canvas"); c.width = w; c.height = hh;
      const ctx = c.getContext("2d");
      ctx.save();
      if (!fija) { ctx.translate(w, 0); ctx.scale(-1, 1); } // como un espejo, igual que se ve en pantalla
      const filtroNativo = "filter" in ctx;
      if (filtroNativo) ctx.filter = filtro;
      ctx.drawImage(fuente, 0, 0, w, hh); ctx.restore();
      if (filtroNativo) ctx.filter = "none"; else filtrarPixeles(ctx, w, hh, filtro);
      // El vídeo se muestra recortado (object-fit: cover): calculamos dónde cae cada pegatina
      const r = capa.getBoundingClientRect();
      const k = Math.max(r.width / w, r.height / hh), ox = (w * k - r.width) / 2, oy = (hh * k - r.height) / 2;
      if (lienzo.width) ctx.drawImage(lienzo, -ox / k, -oy / k, r.width / k, r.height / k);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      capa.querySelectorAll(".pegatina").forEach(p => {
        const pr = p.getBoundingClientRect();
        const x = (pr.left + pr.width / 2 - r.left + ox) / k, y = (pr.top + pr.height / 2 - r.top + oy) / k;
        ctx.font = `${pr.height / k}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        ctx.fillText(p.textContent, x, y);
      });
      nota(1200, .05, "square"); setTimeout(() => nota(900, .08, "square"), 60);
      v.querySelector(".visor").classList.add("flash"); setTimeout(() => v.querySelector(".visor").classList.remove("flash"), 300);
      c.toBlob(b => {
        ultima = b; hecha.src = URL.createObjectURL(b); hecha.classList.remove("oculto");
        btn("foto").classList.add("oculto"); btn("guardar").classList.remove("oculto"); btn("otra").classList.remove("oculto");
      }, "image/jpeg", .92);
    };
    btn("otra").onclick = () => {
      if (fija && !flujo) { fija = null; const ff = v.querySelector(".foto-fija"); if (ff) ff.remove(); vista.classList.remove("oculto"); aviso.classList.remove("oculto"); }
      hecha.classList.add("oculto"); btn("foto").classList.remove("oculto");
      btn("guardar").classList.add("oculto"); btn("otra").classList.add("oculto");
    };
    btn("limpiar").onclick = () => { capa.querySelectorAll(".pegatina").forEach(p => p.remove()); lctx.clearRect(0, 0, lienzo.width, lienzo.height); nota(300, .2); };
    btn("guardar").onclick = async () => {
      if (!ultima) return;
      const nombre = "foto-de-maria-" + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") + ".jpg";
      const archivo = new File([ultima], nombre, { type: "image/jpeg" });
      // En iPad/iPhone «Compartir → Guardar imagen» la deja en Fotos
      if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
        try { await navigator.share({ files: [archivo] }); celebrar("📸"); return; } catch (e) { if (e.name === "AbortError") return; }
      }
      const a = document.createElement("a"); a.href = URL.createObjectURL(ultima); a.download = nombre;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      celebrar("📸");
    };
    return v;
  }

  /* ---------- Vídeos ----------
     La lista viene de la hoja de Google (window.HOJA_VIDEOS, en videos.js) si está conectada;
     si no, de VIDEOS_MARIA. Se guarda una copia en el dispositivo para que funcione sin conexión. */
  const ID_OK = /^[\w-]{11}$/;
  const HOJA = window.HOJA_VIDEOS || "";
  const videosFijos = (window.VIDEOS_MARIA || []).filter(x => x && ID_OK.test(x.id)).map(x => ({ categoria: x.categoria || "Bluey", ...x }));
  const leerCacheVideos = () => { try { const c = JSON.parse(localStorage.getItem("videos-hoja") || "null"); return Array.isArray(c) ? c : null; } catch (e) { return null; } };
  let listaVideos = (HOJA && leerCacheVideos()) || videosFijos;
  const guardarListaVideos = (l) => {
    listaVideos = l.filter(x => x && ID_OK.test(x.id));
    try { localStorage.setItem("videos-hoja", JSON.stringify(listaVideos)); } catch (e) {}
  };
  let pidiendoVideos = null;
  const actualizarVideos = () => {
    if (!HOJA) return Promise.resolve(false);
    if (!pidiendoVideos) {
      const antes = JSON.stringify(listaVideos);
      pidiendoVideos = fetch(HOJA, { cache: "no-store" }).then(r => r.json())
        .then(d => {
          const aAntes = JSON.stringify(ajustes);
          if (d && d.ok && Array.isArray(d.videos)) guardarListaVideos(d.videos);
          if (d && d.ok && d.ajustes) guardarAjustes(d.ajustes);
          return JSON.stringify(listaVideos) !== antes || JSON.stringify(ajustes) !== aAntes;
        })
        .catch(() => false).finally(() => { pidiendoVideos = null; });
    }
    return pidiendoVideos;
  };
  const enviarHoja = (datos) => fetch(HOJA, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(datos) })
    .then(r => r.json()).then(d => { if (d && d.ok && Array.isArray(d.videos)) guardarListaVideos(d.videos); if (d && d.ok && d.ajustes) guardarAjustes(d.ajustes); return d; });
  const categoriasVideos = () => [...new Set(listaVideos.map(x => x.categoria || "Vídeos"))];
  const ICO_CAT = (c) => /bluey/i.test(c) ? "🐶" : /canci|músic|music/i.test(c) ? "🎵" : /cuento/i.test(c) ? "📖" : /dibujo/i.test(c) ? "🎨" : /ingl/i.test(c) ? "🇬🇧" : "📺";
  const miniVideo = (x) => {
    const b = h(`<button class="miniatura"><img loading="lazy" alt="" src="https://i.ytimg.com/vi/${x.id}/hqdefault.jpg"><div></div></button>`);
    b.querySelector("div").textContent = `${x.emoji || "▶️"} ${x.titulo || ""}`;
    b.onclick = () => { location.hash = "#/video/" + x.id; };
    return b;
  };
  // Si la hoja trae cambios mientras se ve la lista, la repintamos
  const refrescarAlVolver = (v) => { actualizarVideos().then(cambio => { if (cambio && v.isConnected) navegar(); }); };
  function videos(cat) {
    const v = h(`<section></section>`);
    refrescarAlVolver(v);
    if (!listaVideos.length) { v.appendChild(h(`<div class="aviso"><div class="ico">📺</div><p>¡Pronto habrá vídeos aquí!</p></div>`)); return v; }
    const cats = categoriasVideos();
    if (cat === undefined && cats.length > 1) {
      const rej = h(`<div class="rejilla rejilla-carpetas-video"></div>`);
      cats.forEach(c => {
        const primero = listaVideos.find(x => (x.categoria || "Vídeos") === c);
        const b = h(`<button class="carpeta-video"><img loading="lazy" alt="" src="https://i.ytimg.com/vi/${primero.id}/hqdefault.jpg"><div class="nombre"><span class="ico"></span> <span class="txt"></span></div></button>`);
        b.querySelector(".ico").textContent = ICO_CAT(c); b.querySelector(".txt").textContent = c;
        b.onclick = () => { decir(c); location.hash = "#/videos/" + encodeURIComponent(c); };
        rej.appendChild(b);
      });
      v.appendChild(rej); return v;
    }
    const lista = h(`<div class="lista-videos"></div>`);
    listaVideos.filter(x => cat === undefined || (x.categoria || "Vídeos") === cat).forEach(x => lista.appendChild(miniVideo(x)));
    v.appendChild(lista);
    return v;
  }
  function video(id) {
    if (!ID_OK.test(id) || !listaVideos.some(x => x.id === id)) return videos();
    return h(`<section><div class="reproductor"><iframe
      src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1"
      title="Vídeo" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div></section>`);
  }

  /* ---------- Zona para mayores ---------- */
  const idDeEnlace = (t) => {
    t = (t || "").trim();
    if (ID_OK.test(t)) return t;
    const m = t.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : "";
  };
  function mayores() {
    const v = h(`<section class="mayores"></section>`);
    // Pregunta de adulto: una multiplicación que María todavía no sabe
    const a = 6 + azar(4), b = 6 + azar(4), ok = a * b;
    const opciones = barajar([ok, ok + a, ok - b, ok + 10].filter((x, i, l) => l.indexOf(x) === i));
    const puerta = h(`<div class="puerta-mayores"><p class="titulo-mayores">🔒 Solo para mayores</p><p class="pregunta-mayores">¿Cuánto es ${a} × ${b}?</p><div class="opciones-mayores"></div></div>`);
    opciones.forEach(n => {
      const bt = h(`<button class="btn-accion">${n}</button>`);
      bt.onclick = () => { if (n === ok) { puerta.remove(); panel(); } else location.hash = "#/"; };
      puerta.querySelector(".opciones-mayores").appendChild(bt);
    });
    v.appendChild(puerta);
    const panel = () => {
      const t = h(`<div class="pestanas-mayores">
        <button class="activa" data-p="videos">📺 Vídeos</button><button data-p="juegos">🎲 Juegos</button>
        <button data-p="dibujos">🖍️ Dibujos</button><button data-p="sonido">🔊 Sonido</button></div>`);
      v.appendChild(t);
      const p = h(`<div class="panel-mayores" data-p="videos">
        <h2>📺 Añadir un vídeo</h2>
        <p class="ayuda-mayores">Copia el enlace del vídeo en YouTube (botón «Compartir» → «Copiar enlace») y pégalo aquí.</p>
        <form class="form-video">
          <label>Enlace de YouTube<input name="enlace" type="url" inputmode="url" placeholder="https://youtu.be/…" required></label>
          <label>Nombre que verá María<input name="titulo" maxlength="60" placeholder="Por ejemplo: Canción de los colores" required></label>
          <label>Categoría (escribe una nueva para crearla)<input name="categoria" list="cats-video" maxlength="30" placeholder="Bluey" required></label>
          <datalist id="cats-video"></datalist>
          <div class="emojis-video"></div>
          <label class="campo-clave">Palabra clave<input name="clave" autocomplete="off" autocapitalize="off"></label>
          <button class="btn-accion" type="submit">➕ Añadir vídeo</button>
          <p class="estado-mayores"></p>
        </form>
        <h2>🗂️ Vídeos que hay</h2>
        <div class="lista-mayores"></div>
      </div>`);
      v.appendChild(p);
      const f = p.querySelector("form"), estado = p.querySelector(".estado-mayores");
      const clave = f.elements.clave;
      try { clave.value = localStorage.getItem("clave-mayores") || ""; } catch (e) {}
      if (clave.value) p.querySelector(".campo-clave").classList.add("oculto");
      let emoji = "▶️";
      ["▶️", "🐶", "🎵", "📖", "🎨", "🦄", "🚗", "🌈", "⭐", "🐻"].forEach((e, i) => {
        const bt = h(`<button type="button" class="chip${i === 0 ? " activo" : ""}">${e}</button>`);
        bt.onclick = () => { emoji = e; p.querySelectorAll(".emojis-video .activo").forEach(y => y.classList.remove("activo")); bt.classList.add("activo"); };
        p.querySelector(".emojis-video").appendChild(bt);
      });
      const pintarLista = () => {
        p.querySelector("#cats-video").replaceChildren(...categoriasVideos().map(c => { const o = document.createElement("option"); o.value = c; return o; }));
        const l = p.querySelector(".lista-mayores"); l.replaceChildren();
        categoriasVideos().forEach(c => {
          const g = h(`<div class="grupo-mayores"><h3></h3></div>`); g.querySelector("h3").textContent = `${ICO_CAT(c)} ${c}`;
          listaVideos.filter(x => (x.categoria || "Vídeos") === c).forEach(x => {
            const fila = h(`<div class="fila-mayores"><img alt="" src="https://i.ytimg.com/vi/${x.id}/default.jpg"><span></span><button class="btn-borrar" ${HOJA ? "" : "disabled"}>🗑️</button></div>`);
            fila.querySelector("span").textContent = `${x.emoji || "▶️"} ${x.titulo || ""}`;
            const bb = fila.querySelector("button");
            bb.onclick = async () => {
              if (!bb.classList.contains("seguro")) { bb.classList.add("seguro"); bb.textContent = "¿Quitar?"; setTimeout(() => { bb.classList.remove("seguro"); bb.textContent = "🗑️"; }, 3000); return; }
              bb.disabled = true;
              const d = await enviarHoja({ clave: clave.value.trim(), accion: "borrar", id: x.id, categoria: x.categoria }).catch(() => null);
              if (!d || !d.ok) { estado.textContent = d && d.error === "clave" ? "❌ La palabra clave no es correcta." : "❌ No se ha podido quitar. ¿Hay conexión?"; bb.disabled = false; mostrarClave(); return; }
              pintarLista();
            };
            g.appendChild(fila);
          });
          l.appendChild(g);
        });
      };
      const mostrarClave = () => p.querySelector(".campo-clave").classList.remove("oculto");
      if (!HOJA) { estado.textContent = "⚠️ Falta conectar la hoja de Google: de momento no se pueden guardar vídeos."; f.querySelector("[type=submit]").disabled = true; }
      f.onsubmit = async (e) => {
        e.preventDefault();
        const id = idDeEnlace(f.elements.enlace.value);
        if (!id) { estado.textContent = "❌ Ese enlace no parece de YouTube."; return; }
        if (!clave.value.trim()) { mostrarClave(); estado.textContent = "Escribe la palabra clave."; clave.focus(); return; }
        estado.textContent = "⏳ Guardando…";
        const d = await enviarHoja({ clave: clave.value.trim(), accion: "anadir", id, titulo: f.elements.titulo.value.trim(), categoria: f.elements.categoria.value.trim(), emoji }).catch(() => null);
        if (!d || !d.ok) {
          estado.textContent = d && d.error === "clave" ? "❌ La palabra clave no es correcta." : "❌ No se ha podido guardar. ¿Hay conexión?";
          if (d && d.error === "clave") mostrarClave();
          return;
        }
        try { localStorage.setItem("clave-mayores", clave.value.trim()); } catch (e2) {}
        p.querySelector(".campo-clave").classList.add("oculto");
        estado.textContent = "✅ ¡Vídeo añadido! Ya sale en todos los dispositivos.";
        f.elements.enlace.value = ""; f.elements.titulo.value = "";
        pintarLista();
      };
      pintarLista();
      actualizarVideos().then(c => { if (c && p.isConnected) { pintarLista(); pintarJuegos(); pintarDibujos(); } });

      // Guarda un ajuste en la hoja (y en este dispositivo)
      const guardarAjuste = async (nombre, valor, aviso) => {
        guardarAjustes({ ...ajustes, [nombre]: valor });
        if (!HOJA) { aviso.textContent = "✅ Guardado en este dispositivo."; return; }
        if (!clave.value.trim()) { aviso.textContent = "✅ Guardado en este dispositivo. Escribe la palabra clave en Vídeos para que valga en todos."; return; }
        aviso.textContent = "⏳ Guardando…";
        const d = await enviarHoja({ clave: clave.value.trim(), accion: "ajuste", nombre, valor }).catch(() => null);
        aviso.textContent = d && d.ok ? "✅ Guardado en todos los dispositivos." : d && d.error === "clave" ? "❌ La palabra clave no es correcta." : "⚠️ Guardado solo aquí (sin conexión).";
      };
      const interruptor = (txt, encendido, alCambiar) => {
        const f = h(`<label class="interruptor"><span class="txt"></span><input type="checkbox"><span class="pista"></span></label>`);
        f.querySelector(".txt").innerHTML = txt; const c = f.querySelector("input"); c.checked = encendido;
        c.onchange = () => alCambiar(c.checked);
        return f;
      };

      // 🎲 Juegos: mostrar u ocultar cada juego
      const pj = h(`<div class="panel-mayores oculto" data-p="juegos"><h2>🎲 Juegos que ve María</h2><p class="ayuda-mayores">Apaga los que no quieras que salgan.</p><div class="lista-interruptores"></div><p class="estado-mayores"></p></div>`);
      v.appendChild(pj);
      const pintarJuegos = () => {
        const l = pj.querySelector(".lista-interruptores"); l.replaceChildren();
        CATEGORIAS.forEach(cat => {
          const conocidas = new Set(CATEGORIAS.flatMap(c => c.rutas));
          const rutas = cat.rutas.slice();
          if (cat.id === "jugar") todasSecciones().forEach(s => { if (!conocidas.has(s.ruta)) rutas.push(s.ruta); });
          const g = h(`<div class="grupo-mayores"><h3>${cat.ico} ${cat.nombre}</h3></div>`);
          rutas.map(seccion).filter(Boolean).forEach(sx => {
            g.appendChild(interruptor(`${sx.ico} ${sx.nombre}`, !listaAjuste("ocultos").has(sx.ruta), (si) => {
              const o = listaAjuste("ocultos"); si ? o.delete(sx.ruta) : o.add(sx.ruta);
              guardarAjuste("ocultos", [...o].join(","), pj.querySelector(".estado-mayores"));
            }));
          });
          l.appendChild(g);
        });
      };
      pintarJuegos();

      // 🖍️ Dibujos: ocultar dibujos de la web y quitar los añadidos en este dispositivo
      const pd = h(`<div class="panel-mayores oculto" data-p="dibujos">
        <h2>🖍️ Dibujos de la web</h2><p class="ayuda-mayores">Apaga los que no quieras que salgan en Colorear.</p><div class="lista-dib-web"></div><p class="estado-mayores"></p>
        <h2>📥 Láminas de este dispositivo</h2>
        <p class="ayuda-mayores">Las láminas que añadís (fotos, PDF o carpetas, como las de Bluey) se guardan solo en este dispositivo y no se publican en internet. Para añadir más, ve a Colorear → «Añadir dibujo».</p>
        <button class="btn-accion" data-a="ir-colorear">🖍️ Ir a Colorear</button>
        <div class="lista-dib-mios"></div></div>`);
      v.appendChild(pd);
      pd.querySelector('[data-a="ir-colorear"]').onclick = () => { location.hash = "#/colorear"; };
      const pintarDibujos = () => {
        const l = pd.querySelector(".lista-dib-web"); l.replaceChildren();
        DIBUJOS.forEach(d => l.appendChild(interruptor(`${d.ico || "🖍️"} ${d.nombre}`, !listaAjuste("dibujos-ocultos").has(d.id), (si) => {
          const o = listaAjuste("dibujos-ocultos"); si ? o.delete(d.id) : o.add(d.id);
          guardarAjuste("dibujos-ocultos", [...o].join(","), pd.querySelector(".estado-mayores"));
        })));
        misDibujos.listar().then(lista => {
          const m = pd.querySelector(".lista-dib-mios"); m.replaceChildren();
          if (!lista || !lista.length) { m.appendChild(h(`<p class="ayuda-mayores">Todavía no hay láminas en este dispositivo.</p>`)); return; }
          const grupos = {};
          lista.forEach(d => { const c = [d.categoria, d.subcategoria].filter(Boolean).join(" › ") || "Sin carpeta"; (grupos[c] = grupos[c] || []).push(d); });
          Object.keys(grupos).sort().forEach(c => {
            const fila = h(`<div class="fila-mayores"><span></span><button class="btn-borrar">🗑️</button></div>`);
            fila.querySelector("span").textContent = `📁 ${c} (${grupos[c].length})`;
            const bb = fila.querySelector("button");
            bb.onclick = async () => {
              if (!bb.classList.contains("seguro")) { bb.classList.add("seguro"); bb.textContent = "¿Quitar?"; setTimeout(() => { bb.classList.remove("seguro"); bb.textContent = "🗑️"; }, 3000); return; }
              for (const d of grupos[c]) await misDibujos.borrar(d.id);
              pintarDibujos();
            };
            m.appendChild(fila);
          });
        }).catch(() => {});
      };
      pintarDibujos();

      // 🔊 Sonido de este dispositivo
      const ps = h(`<div class="panel-mayores oculto" data-p="sonido"><h2>🔊 Sonido</h2><p class="ayuda-mayores">Esto se guarda solo en este dispositivo.</p><div class="lista-interruptores"></div></div>`);
      v.appendChild(ps);
      ps.querySelector(".lista-interruptores").appendChild(interruptor("🔊 Sonidos y voz", sonido, (si) => { if (si !== sonido) btnSonido.click(); }));

      t.querySelectorAll("button").forEach(b => b.onclick = () => {
        t.querySelectorAll("button").forEach(y => y.classList.toggle("activa", y === b));
        v.querySelectorAll(".panel-mayores").forEach(x => x.classList.toggle("oculto", x.dataset.p !== b.dataset.p));
      });
    };
    return v;
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
  const RUTAS = { colores, formas, memoria, contar, pintar, colorear, musica, videos, fotos };
  EXTRA.forEach(j => { RUTAS[j.ruta] = () => j.crear(H); });
  let vistaActual = null;
  function navegar() {
    const partes = location.hash.replace(/^#\/?/, "").split("/");
    const [ruta, extra] = partes;
    if (vistaActual && vistaActual._limpiar) vistaActual._limpiar();
    callar();
    let vista;
    if (ruta === "video" && extra) vista = video(extra);
    else if (ruta === "videos" && extra) vista = videos(decodeURIComponent(extra));
    else if (ruta === "mayores") vista = mayores();
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
    if (ruta === "video" || (ruta === "videos" && partes[1])) { location.hash = "#/videos"; return; }
    if (ruta === "mayores") { location.hash = "#/"; return; }
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
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then(reg => {
        // Busca versión nueva al abrir y cada vez que se vuelve a la app
        document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); });
      }).catch(() => {});
    });
    // Cuando llega una versión nueva, recarga una sola vez para usarla
    let recargada = false;
    const habiaControl = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!habiaControl || recargada) return;
      recargada = true; location.reload();
    });
  }
})();
