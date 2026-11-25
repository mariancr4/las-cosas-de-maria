/*
  JUEGOS NUEVOS: Burbujas, Puzle, Sombras, De pequeño a grande, Letras y Tarta.
  Cada juego recibe H, las utilidades de app.js (h, decir, celebrar, nota, azar, barajar, elegir).
*/
window.JUEGOS_EXTRA = [];
(() => {
  "use strict";
  const J = window.JUEGOS_EXTRA;

  /* ---------- Burbujas ---------- */
  const COLORES_B = [
    { n: "rojas", c: "#ff4d4d" }, { n: "azules", c: "#3d8bff" }, { n: "amarillas", c: "#ffd400" },
    { n: "verdes", c: "#3cc84a" }, { n: "moradas", c: "#9b5cff" }, { n: "rosas", c: "#ff7ac6" },
  ];
  J.push({
    ruta: "burbujas", ico: "🫧", nombre: "Burbujas", clase: "c-cian",
    crear(H) {
      const v = H.h(`<section class="burbujas-juego">
        <div class="pregunta"><button class="btn-oir" aria-label="Escuchar">👂</button><span class="txt"></span></div>
        <div class="zona-burbujas"></div>
        <div class="estrellas"></div>
      </section>`);
      const zona = v.querySelector(".zona-burbujas"), txt = v.querySelector(".txt"), est = v.querySelector(".estrellas");
      let meta = null, cuenta = 0, ronda = 0, vivo = true;
      const nuevaRonda = () => {
        ronda++; cuenta = 0;
        meta = ronda % 2 === 0 ? COLORES_B[H.azar(COLORES_B.length)] : null;
        const frase = meta ? `¡Explota las ${meta.n}!` : "¡Explota las burbujas!";
        txt.innerHTML = meta ? `¡Explota las <span style="color:${meta.c}">${meta.n}</span>!` : frase;
        est.textContent = "";
        H.decir(frase);
        v.querySelector(".btn-oir").onclick = () => H.decir(frase);
      };
      const crearBurbuja = () => {
        if (!vivo || !zona.isConnected) return;
        // En las rondas de color, una de cada dos burbujas es del color pedido
        const col = meta && Math.random() < .5 ? meta : COLORES_B[H.azar(COLORES_B.length)];
        const tam = 70 + H.azar(50);
        const b = document.createElement("button");
        b.className = "burbuja"; b.setAttribute("aria-label", "burbuja");
        b.style.cssText = `width:${tam}px;height:${tam}px;left:${H.azar(85)}%;--c:${col.c};animation-duration:${6 + Math.random() * 4}s`;
        b.onpointerdown = () => {
          if (meta && col !== meta) { H.nota(220, .2, "triangle"); b.classList.add("mal"); setTimeout(() => b.classList.remove("mal"), 400); return; }
          b.classList.add("pop"); H.nota(600 + H.azar(500), .12);
          setTimeout(() => b.remove(), 250);
          cuenta++; est.textContent = "🫧".repeat(cuenta);
          if (cuenta >= 8) { H.celebrar("🏆"); setTimeout(nuevaRonda, 1800); }
        };
        b.addEventListener("animationend", () => b.remove());
        zona.appendChild(b);
      };
      const reloj = setInterval(crearBurbuja, 900);
      nuevaRonda();
      v._limpiar = () => { vivo = false; clearInterval(reloj); };
      return v;
    },
  });

  /* ---------- Puzle (tocar dos piezas para cambiarlas) ---------- */
  const RELLENOS = ["#ff9ec4", "#8fd3ff", "#ffe27a", "#a6f08a", "#c9a8ff", "#ffc07a", "#f5d0a9", "#ff7a7a"];
  J.push({
    ruta: "puzle", ico: "🧩", nombre: "Puzle", clase: "c-naranja",
    crear(H) {
      const v = H.h(`<section>
        <div class="pregunta"><span>Toca dos piezas para cambiarlas</span></div>
        <div class="puzle-zona"><div class="modelo"></div><div class="puzle"></div></div>
      </section>`);
      const tab = v.querySelector(".puzle"), modelo = v.querySelector(".modelo");
      let nivel = 0;
      const empezar = () => {
        const dib = (window.DIBUJOS_MARIA || [])[H.azar((window.DIBUJOS_MARIA || []).length)];
        const fondo = ["#fff4d6", "#e3f3ff", "#ffe3ec", "#eafff2"][H.azar(4)];
        const svgTxt = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="dibujo"><rect width="200" height="200" fill="${fondo}"/>${dib.svg}</svg>`;
        const tmp = H.h(`<div>${svgTxt}</div>`);
        tmp.querySelectorAll(".z").forEach((z, i) => z.style.fill = RELLENOS[(i * 3) % RELLENOS.length]);
        const svgFinal = tmp.innerHTML;
        modelo.innerHTML = svgFinal;
        const cols = 2, filas = nivel < 2 ? 2 : 3;
        tab.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        tab.style.aspectRatio = `${cols} / ${filas}`;
        const piezas = [];
        for (let i = 0; i < cols * filas; i++) piezas.push(i);
        let orden = H.barajar(piezas);
        while (orden.every((p, i) => p === i)) orden = H.barajar(piezas);
        let sel = null;
        const pintar = () => {
          tab.innerHTML = "";
          orden.forEach((p, pos) => {
            const x = (p % cols) * (200 / cols), y = Math.floor(p / cols) * (200 / filas);
            const b = H.h(`<button class="pieza${sel === pos ? " sel" : ""}${p === pos ? " bien" : ""}"><svg viewBox="${x} ${y} ${200 / cols} ${200 / filas}" preserveAspectRatio="none">${tmp.querySelector("svg").innerHTML}</svg></button>`);
            b.onclick = () => {
              if (sel === null) { sel = pos; H.nota(700, .08); pintar(); return; }
              [orden[sel], orden[pos]] = [orden[pos], orden[sel]]; sel = null; H.nota(500, .12);
              pintar();
              if (orden.every((q, i) => q === i)) { H.celebrar("🧩"); nivel++; setTimeout(empezar, 2200); }
            };
            tab.appendChild(b);
          });
        };
        pintar();
      };
      H.decir("Haz el puzle");
      empezar();
      return v;
    },
  });

  /* ---------- Sombras ---------- */
  const ANIMALES_S = ["🐶", "🐱", "🐰", "🦒", "🐘", "🦋", "🐢", "🦆", "🐌", "🦀", "🐿️", "🦕", "🐳", "🐓"];
  J.push({
    ruta: "sombras", ico: "👤", nombre: "Sombras", clase: "c-lila",
    crear(H) {
      const v = H.h(`<section>
        <div class="pregunta"><span>¿De quién es esta sombra?</span></div>
        <div class="sombra-grande"></div>
        <div class="opciones"></div>
        <div class="estrellas"></div>
      </section>`);
      const sombra = v.querySelector(".sombra-grande"), ops = v.querySelector(".opciones"), est = v.querySelector(".estrellas");
      let aciertos = 0, bloq = false;
      const nueva = () => {
        bloq = false;
        const grupo = H.elegir(ANIMALES_S, 3), meta = grupo[0];
        sombra.textContent = meta; sombra.classList.remove("revelada");
        ops.innerHTML = "";
        H.barajar(grupo).forEach(a => {
          const b = H.h(`<button class="opcion">${a}</button>`);
          b.onclick = () => {
            if (bloq) return;
            if (a === meta) {
              bloq = true; b.classList.add("bien"); sombra.classList.add("revelada"); aciertos++;
              est.textContent = "⭐".repeat(((aciertos - 1) % 5) + 1);
              H.celebrar(aciertos % 5 === 0 ? "🏆" : "⭐"); setTimeout(nueva, 2000);
            } else { H.nota(220, .3, "triangle"); b.classList.remove("mal"); void b.offsetWidth; b.classList.add("mal"); }
          };
          ops.appendChild(b);
        });
      };
      H.decir("¿De quién es esta sombra?");
      nueva();
      return v;
    },
  });

  /* ---------- De pequeño a grande ---------- */
  const COSAS_T = ["🍎", "🐻", "⭐", "🎈", "🐟", "🌳", "🚗", "🐘", "🧸", "🌼"];
  J.push({
    ruta: "tamanos", ico: "📏", nombre: "Tamaños", clase: "c-verde",
    crear(H) {
      const v = H.h(`<section>
        <div class="pregunta"><button class="btn-oir" aria-label="Escuchar">👂</button><span>Del más pequeño al más grande</span></div>
        <div class="fila-tamanos"></div>
        <div class="fila-orden"></div>
      </section>`);
      const fila = v.querySelector(".fila-tamanos"), orden = v.querySelector(".fila-orden");
      const frase = "Toca del más pequeño al más grande";
      v.querySelector(".btn-oir").onclick = () => H.decir(frase);
      let ronda = 0;
      const nueva = () => {
        const n = ronda < 3 ? 3 : 4, cosa = COSAS_T[H.azar(COSAS_T.length)];
        const tams = [1.6, 2.8, 4.2, 5.6].slice(0, n);
        let sig = 0;
        fila.innerHTML = ""; orden.innerHTML = "";
        for (let i = 0; i < n; i++) orden.appendChild(H.h(`<span class="hueco"></span>`));
        H.barajar(tams.map((t, i) => ({ t, i }))).forEach(o => {
          const b = H.h(`<button class="cosa-tam" style="font-size:${o.t}rem">${cosa}</button>`);
          b.onclick = () => {
            if (o.i !== sig) { H.nota(220, .3, "triangle"); b.classList.remove("mal"); void b.offsetWidth; b.classList.add("mal"); return; }
            H.nota(440 + sig * 120, .2);
            orden.children[sig].textContent = cosa; orden.children[sig].style.fontSize = o.t * .7 + "rem"; orden.children[sig].classList.add("lleno");
            b.style.visibility = "hidden"; sig++;
            if (sig === n) { ronda++; H.celebrar("⭐"); setTimeout(nueva, 2000); }
          };
          fila.appendChild(b);
        });
      };
      H.decir(frase);
      nueva();
      return v;
    },
  });

  /* ---------- Letras y números para repasar con el dedo ---------- */
  // Cada trazo es una lista de puntos en una hoja de 100×100. Se repasan en orden.
  const arco = (cx, cy, rx, ry, a1, a2, paso = 12) => {
    const p = [], d = a2 > a1 ? paso : -paso;
    for (let a = a1; d > 0 ? a <= a2 : a >= a2; a += d) p.push([+(cx + rx * Math.cos(a * Math.PI / 180)).toFixed(1), +(cy + ry * Math.sin(a * Math.PI / 180)).toFixed(1)]);
    return p;
  };
  const GLIFOS = {
    A: [[[18, 90], [50, 12], [82, 90]], [[32, 62], [68, 62]]],
    B: [[[24, 12], [24, 90]], [[24, 12], [56, 12], [70, 20], [72, 32], [62, 46], [24, 50]], [[24, 50], [62, 50], [76, 60], [78, 76], [66, 88], [24, 90]]],
    C: [arco(52, 51, 34, 39, -40, -320)],
    D: [[[24, 12], [24, 90]], [[24, 12], [50, 12], [70, 22], [78, 40], [78, 62], [70, 80], [50, 90], [24, 90]]],
    E: [[[76, 12], [24, 12], [24, 90], [76, 90]], [[24, 51], [64, 51]]],
    F: [[[76, 12], [24, 12], [24, 90]], [[24, 51], [64, 51]]],
    G: [arco(52, 51, 34, 39, -40, -355), [[56, 54], [86, 54]]],
    H: [[[22, 12], [22, 90]], [[78, 12], [78, 90]], [[22, 51], [78, 51]]],
    I: [[[50, 12], [50, 90]]],
    J: [[[70, 12], [70, 70], [64, 84], [50, 90], [36, 84], [30, 72]]],
    K: [[[24, 12], [24, 90]], [[76, 12], [24, 60]], [[42, 44], [78, 90]]],
    L: [[[26, 12], [26, 90], [78, 90]]],
    M: [[[18, 90], [18, 12], [50, 60], [82, 12], [82, 90]]],
    N: [[[22, 90], [22, 12], [78, 90], [78, 12]]],
    "Ñ": [[[22, 92], [22, 22], [78, 92], [78, 22]], [[32, 10], [42, 4], [58, 10], [68, 4]]],
    O: [arco(50, 51, 36, 39, -90, -450)],
    P: [[[24, 90], [24, 12], [58, 12], [72, 20], [76, 32], [72, 44], [58, 52], [24, 52]]],
    Q: [arco(50, 48, 34, 37, -90, -450), [[58, 66], [84, 92]]],
    R: [[[24, 90], [24, 12], [58, 12], [74, 24], [74, 40], [58, 52], [24, 52]], [[50, 52], [78, 90]]],
    S: [[[76, 22], [64, 13], [48, 12], [32, 17], [26, 30], [34, 43], [50, 50], [66, 57], [76, 70], [70, 84], [52, 90], [34, 88], [22, 78]]],
    T: [[[18, 12], [82, 12]], [[50, 12], [50, 90]]],
    U: [[[22, 12], [22, 64], [30, 82], [50, 90], [70, 82], [78, 64], [78, 12]]],
    V: [[[18, 12], [50, 90], [82, 12]]],
    W: [[[10, 12], [28, 90], [50, 36], [72, 90], [90, 12]]],
    X: [[[20, 12], [80, 90]], [[80, 12], [20, 90]]],
    Y: [[[20, 12], [50, 50], [80, 12]], [[50, 50], [50, 90]]],
    Z: [[[20, 12], [80, 12], [20, 90], [80, 90]]],
    "0": [arco(50, 51, 28, 39, -90, -450)],
    "1": [[[34, 28], [54, 12], [54, 90]]],
    "2": [[[26, 30], [36, 16], [52, 12], [68, 18], [74, 32], [66, 50], [26, 90], [78, 90]]],
    "3": [[[26, 20], [44, 12], [64, 14], [72, 28], [64, 44], [46, 50], [66, 56], [74, 72], [64, 86], [44, 90], [26, 82]]],
    "4": [[[62, 90], [62, 12], [18, 66], [84, 66]]],
    "5": [[[74, 12], [32, 12], [28, 46], [48, 40], [66, 46], [76, 62], [70, 80], [52, 90], [32, 86], [24, 76]]],
    "6": [[[70, 16], [54, 11], [38, 18], [28, 36], [26, 60], [32, 80], [50, 90], [68, 82], [74, 66], [66, 52], [50, 48], [34, 54], [27, 64]]],
    "7": [[[20, 12], [80, 12], [42, 90]]],
    "8": [[[50, 50], [34, 42], [30, 28], [38, 15], [50, 12], [62, 15], [70, 28], [66, 42], [50, 50], [32, 58], [26, 72], [34, 86], [50, 90], [66, 86], [74, 72], [68, 58], [50, 50]]],
    "9": [[[72, 36], [66, 20], [50, 12], [34, 20], [28, 34], [34, 48], [50, 54], [66, 48], [72, 36], [72, 60], [66, 80], [50, 90], [34, 86]]],
  };
  const NOMBRE_LETRA = { A: "a", B: "be", C: "ce", D: "de", E: "e", F: "efe", G: "ge", H: "hache", I: "i", J: "jota", K: "ka", L: "ele", M: "eme", N: "ene", "Ñ": "eñe", O: "o", P: "pe", Q: "cu", R: "erre", S: "ese", T: "te", U: "u", V: "uve", W: "uve doble", X: "equis", Y: "i griega", Z: "zeta" };
  const NOMBRE_NUM = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
  const vozDe = (c) => /\d/.test(c) ? `El número ${NOMBRE_NUM[+c]}` : (c === "M" ? "La eme de María" : `La ${NOMBRE_LETRA[c]}`);
  const LETRAS = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");
  const NUMEROS = "0123456789".split("");
  // Quita tildes pero respeta la Ñ
  const normalizar = (txt) => txt.toUpperCase().replace(/Ñ/g, "\u0001").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\u0001/g, "Ñ");

  const muestrear = (pts, paso = 6) => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], d = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(d / paso));
      for (let k = 0; k < n; k++) out.push([x1 + (x2 - x1) * k / n, y1 + (y2 - y1) * k / n]);
    }
    out.push(pts[pts.length - 1]);
    return out;
  };

  J.push({
    ruta: "letras", ico: "✍️", nombre: "Letras", clase: "c-amarillo",
    crear(H) {
      const v = H.h(`<section class="letras-juego">
        <div class="modos">
          <button class="btn-accion activa" data-m="letras">🔤 Letras</button>
          <button class="btn-accion" data-m="numeros">🔢 Números</button>
          <button class="btn-accion" data-m="palabra">✏️ Palabra</button>
        </div>
        <form class="escribir oculto">
          <input type="text" maxlength="14" placeholder="Escribe una palabra…" autocomplete="off" autocapitalize="characters" spellcheck="false">
          <button class="btn-accion" type="submit">¡Vamos!</button>
        </form>
        <div class="palabra-modelo oculto"></div>
        <div class="pregunta"><button class="btn-oir" aria-label="Escuchar">👂</button><span class="txt"></span></div>
        <div class="hoja-letra"><svg viewBox="0 0 100 100"></svg></div>
        <div class="acciones"><button class="btn-accion atras">⬅️</button><button class="btn-accion otra">➡️ Otra</button></div>
      </section>`);
      const svg = v.querySelector("svg"), txt = v.querySelector(".txt"), form = v.querySelector(".escribir"), modelo = v.querySelector(".palabra-modelo");
      let modo = "letras", lista = LETRAS, idx = 12 /* empieza por la M */, palabra = [], puntos = [], sig = 0;
      const NS = "http://www.w3.org/2000/svg";
      const el = (tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); return e; };

      const pintarModelo = () => {
        modelo.innerHTML = palabra.map((c, i) => c === " " ? `<span class="hueco-palabra"></span>`
          : `<span class="${i < idx ? "hecha" : i === idx ? "ahora" : ""}">${c}</span>`).join("");
      };
      const cargar = () => {
        if (modo === "palabra") {
          while (palabra[idx] === " ") idx++;
          if (idx >= palabra.length) return;
          pintarModelo();
        }
        const c = modo === "palabra" ? palabra[idx] : lista[((idx % lista.length) + lista.length) % lista.length];
        const trazos = GLIFOS[c];
        const voz = vozDe(c);
        txt.textContent = c === "M" ? "La M de María" : voz;
        v.querySelector(".btn-oir").onclick = () => H.decir(voz);
        H.decir(voz);
        svg.innerHTML = ""; puntos = []; sig = 0;
        trazos.forEach((s, si) => {
          svg.appendChild(el("polyline", { points: s.map(p => p.join(",")).join(" "), class: "guia" }));
          muestrear(s).forEach(p => puntos.push({ x: p[0], y: p[1], s: si }));
        });
        trazos.forEach((s, si) => {
          svg.appendChild(el("circle", { cx: s[0][0], cy: s[0][1], r: 5.5, class: "salida" }));
          const t = el("text", { x: s[0][0], y: s[0][1] + 2.2, class: "num" }); t.textContent = si + 1; svg.appendChild(t);
        });
        svg.appendChild(el("circle", { r: 4, class: "siguiente-punto" }));
        marcar();
      };
      const marcar = () => {
        const guia = svg.querySelector(".siguiente-punto");
        if (puntos[sig]) { guia.setAttribute("cx", puntos[sig].x); guia.setAttribute("cy", puntos[sig].y); }
        svg.querySelectorAll(".hecho").forEach(x => x.remove());
        const porTrazo = {};
        puntos.slice(0, sig).forEach(p => (porTrazo[p.s] = porTrazo[p.s] || []).push(p));
        Object.values(porTrazo).forEach(ps => svg.insertBefore(el("polyline", { points: ps.map(p => p.x + "," + p.y).join(" "), class: "hecho" }), svg.querySelector(".salida")));
      };
      const terminado = () => {
        if (modo === "palabra") {
          idx++;
          if (idx >= palabra.length) {
            pintarModelo();
            const texto = palabra.join("");
            H.celebrar("🏆"); setTimeout(() => H.decir(`¡Has escrito ${texto.toLowerCase()}!`), 400);
          } else { H.nota(880, .2); setTimeout(cargar, 700); }
        } else { H.celebrar("✍️"); idx++; setTimeout(cargar, 2200); }
      };
      const pos = (e) => { const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) * 100 / r.width, y: (e.clientY - r.top) * 100 / r.height }; };
      let dedo = false;
      const mover = (e) => {
        if (!dedo || sig >= puntos.length) return;
        const p = pos(e);
        let avanzo = false;
        for (let k = 0; k < 3 && puntos[sig]; k++) {
          const q = puntos[sig];
          if (Math.hypot(q.x - p.x, q.y - p.y) < 9) { sig++; avanzo = true; } else break;
        }
        if (avanzo) {
          if (sig % 4 === 0) H.nota(400 + sig * 8, .08);
          marcar();
          if (sig >= puntos.length) terminado();
        }
      };
      svg.addEventListener("pointerdown", (e) => { dedo = true; svg.setPointerCapture(e.pointerId); mover(e); });
      svg.addEventListener("pointermove", mover);
      svg.addEventListener("pointerup", () => { dedo = false; });

      const ponerModo = (m) => {
        modo = m;
        v.querySelectorAll(".modos .btn-accion").forEach(b => b.classList.toggle("activa", b.dataset.m === m));
        form.classList.toggle("oculto", m !== "palabra");
        modelo.classList.toggle("oculto", m !== "palabra");
        v.querySelector(".atras").classList.toggle("oculto", m === "palabra");
        v.querySelector(".otra").classList.toggle("oculto", m === "palabra");
        if (m === "palabra") {
          svg.innerHTML = ""; txt.textContent = "Escribe una palabra arriba"; modelo.innerHTML = "";
          form.querySelector("input").focus();
          return;
        }
        lista = m === "numeros" ? NUMEROS : LETRAS;
        idx = m === "numeros" ? 0 : 12;
        cargar();
      };
      v.querySelectorAll(".modos .btn-accion").forEach(b => b.onclick = () => ponerModo(b.dataset.m));
      form.onsubmit = (e) => {
        e.preventDefault();
        const inp = form.querySelector("input");
        const limpio = normalizar(inp.value).split("").filter(c => GLIFOS[c] || c === " ");
        if (!limpio.some(c => c !== " ")) return;
        palabra = limpio; idx = 0;
        inp.blur();
        H.decir(`Vamos a escribir ${inp.value.toLowerCase()}`);
        setTimeout(cargar, 1500);
      };
      v.querySelector(".otra").onclick = () => { idx++; cargar(); };
      v.querySelector(".atras").onclick = () => { idx--; cargar(); };
      cargar();
      return v;
    },
  });

  /* ---------- Decorar una tarta ---------- */
  const ADORNOS = ["🍓", "🍒", "🫐", "🍫", "🍬", "⭐", "🌸", "❤️", "🕯️"];
  J.push({
    ruta: "tarta", ico: "🎂", nombre: "Tarta", clase: "c-rosa",
    crear(H) {
      const v = H.h(`<section class="tarta-juego">
        <div class="pregunta"><span>¡Decora la tarta!</span></div>
        <div class="tarta">
          <svg viewBox="0 0 200 160" class="tarta-svg">
            <ellipse cx="100" cy="148" rx="92" ry="10" fill="#e9dcff"/>
            <rect x="22" y="78" width="156" height="68" rx="14" fill="#ffd7a8"/>
            <rect x="22" y="78" width="156" height="22" rx="10" fill="#ff9ec4"/>
            <path d="M22 96 q13 16 26 0 q13 16 26 0 q13 16 26 0 q13 16 26 0 q13 16 26 0 q13 16 26 0" fill="#ff9ec4"/>
            <rect x="40" y="30" width="120" height="52" rx="12" fill="#fff1d6"/>
            <rect x="40" y="30" width="120" height="16" rx="8" fill="#c9a8ff"/>
            <path d="M40 42 q10 12 20 0 q10 12 20 0 q10 12 20 0 q10 12 20 0 q10 12 20 0 q10 12 20 0" fill="#c9a8ff"/>
          </svg>
          <div class="adornos-puestos"></div>
        </div>
        <div class="paleta adornos"></div>
        <div class="acciones">
          <button class="btn-accion" data-a="soplar">💨 Soplar las velas</button>
          <button class="btn-accion" data-a="otra">🔄 Otra tarta</button>
        </div>
      </section>`);
      const puestos = v.querySelector(".adornos-puestos"), pal = v.querySelector(".adornos"), tarta = v.querySelector(".tarta");
      let adorno = ADORNOS[0];
      ADORNOS.forEach((a, i) => {
        const b = H.h(`<button class="color-btn adorno${i === 0 ? " activo" : ""}">${a}</button>`);
        b.onclick = () => { adorno = a; pal.querySelectorAll(".activo").forEach(x => x.classList.remove("activo")); b.classList.add("activo"); H.nota(700, .08); };
        pal.appendChild(b);
      });
      tarta.addEventListener("pointerdown", (e) => {
        const r = tarta.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100;
        const s = H.h(`<span class="puesto" style="left:${x}%;top:${y}%">${adorno}</span>`);
        if (adorno === "🕯️") s.classList.add("vela");
        puestos.appendChild(s); H.nota(500 + H.azar(500), .12);
      });
      v.querySelector('[data-a="soplar"]').onclick = () => {
        const velas = puestos.querySelectorAll(".vela");
        if (!velas.length) { H.decir("Pon alguna vela"); return; }
        velas.forEach((vl, i) => setTimeout(() => { vl.textContent = "💨"; setTimeout(() => vl.remove(), 600); }, i * 150));
        setTimeout(() => { H.decir("¡Cumpleaños feliz!"); H.celebrar("🎉"); }, velas.length * 150 + 300);
      };
      v.querySelector('[data-a="otra"]').onclick = () => { puestos.innerHTML = ""; H.nota(300, .2); };
      H.decir("¡Decora la tarta!");
      return v;
    },
  });
})();
