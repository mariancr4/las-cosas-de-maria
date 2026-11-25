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
  const circulo = (cx, cy, r) => { const p = []; for (let a = -90; a <= 270; a += 15) p.push([cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)]); return p; };
  const TRAZOS = [
    { t: "M", voz: "La eme de María", s: [[[18, 90], [18, 12], [50, 60], [82, 12], [82, 90]]] },
    { t: "A", voz: "La a", s: [[[18, 90], [50, 12], [82, 90]], [[32, 62], [68, 62]]] },
    { t: "R", voz: "La erre", s: [[[24, 90], [24, 12], [58, 12], [74, 24], [74, 40], [58, 52], [24, 52]], [[50, 52], [78, 90]]] },
    { t: "I", voz: "La i", s: [[[50, 12], [50, 90]]] },
    { t: "O", voz: "La o", s: [circulo(50, 51, 38)] },
    { t: "1", voz: "El número uno", s: [[[34, 28], [54, 12], [54, 90]]] },
    { t: "2", voz: "El número dos", s: [[[26, 30], [36, 16], [52, 12], [68, 18], [74, 32], [66, 50], [26, 90], [78, 90]]] },
    { t: "3", voz: "El número tres", s: [[[26, 20], [44, 12], [64, 14], [72, 28], [64, 44], [46, 50], [66, 56], [74, 72], [64, 86], [44, 90], [26, 82]]] },
  ];
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
        <div class="pregunta"><button class="btn-oir" aria-label="Escuchar">👂</button><span class="txt"></span></div>
        <div class="hoja-letra"><svg viewBox="0 0 100 100"></svg></div>
        <div class="acciones"><button class="btn-accion otra">➡️ Otra</button></div>
      </section>`);
      const svg = v.querySelector("svg"), txt = v.querySelector(".txt");
      let idx = 0, puntos = [], sig = 0, trazoActual = 0;
      const NS = "http://www.w3.org/2000/svg";
      const el = (tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); return e; };
      const cargar = () => {
        const L = TRAZOS[idx % TRAZOS.length];
        txt.textContent = L.t === "M" ? "La M de María" : L.voz;
        v.querySelector(".btn-oir").onclick = () => H.decir(L.voz);
        H.decir(L.voz);
        svg.innerHTML = "";
        puntos = []; sig = 0;
        L.s.forEach((s, si) => {
          svg.appendChild(el("polyline", { points: s.map(p => p.join(",")).join(" "), class: "guia" }));
          muestrear(s).forEach(p => puntos.push({ x: p[0], y: p[1], s: si }));
        });
        // Puntos de salida numerados
        L.s.forEach((s, si) => {
          svg.appendChild(el("circle", { cx: s[0][0], cy: s[0][1], r: 5.5, class: "salida" }));
          const t = el("text", { x: s[0][0], y: s[0][1] + 2.2, class: "num" }); t.textContent = si + 1; svg.appendChild(t);
        });
        trazoActual = el("polyline", { points: "", class: "hecho" }); svg.appendChild(trazoActual);
        const guia = el("circle", { r: 4, class: "siguiente-punto" }); svg.appendChild(guia);
        marcar(guia);
      };
      const marcar = (g) => {
        const guia = g || svg.querySelector(".siguiente-punto");
        if (puntos[sig]) { guia.setAttribute("cx", puntos[sig].x); guia.setAttribute("cy", puntos[sig].y); }
        const hechos = puntos.slice(0, sig);
        // Dibuja lo repasado separado por trazos
        svg.querySelectorAll(".hecho").forEach(x => x.remove());
        const porTrazo = {};
        hechos.forEach(p => (porTrazo[p.s] = porTrazo[p.s] || []).push(p));
        Object.values(porTrazo).forEach(ps => svg.insertBefore(el("polyline", { points: ps.map(p => p.x + "," + p.y).join(" "), class: "hecho" }), svg.querySelector(".salida")));
      };
      const pos = (e) => { const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) * 100 / r.width, y: (e.clientY - r.top) * 100 / r.height }; };
      let dedo = false;
      const mover = (e) => {
        if (!dedo || sig >= puntos.length) return;
        const p = pos(e);
        let avanzo = false;
        // Acepta el siguiente punto (o salta uno si va rápido)
        for (let k = 0; k < 3 && puntos[sig]; k++) {
          const q = puntos[sig];
          if (Math.hypot(q.x - p.x, q.y - p.y) < 9) { sig++; avanzo = true; } else break;
        }
        if (avanzo) {
          if (sig % 4 === 0) H.nota(400 + sig * 8, .08);
          marcar();
          if (sig >= puntos.length) { H.celebrar("✍️"); idx++; setTimeout(cargar, 2200); }
        }
      };
      svg.addEventListener("pointerdown", (e) => { dedo = true; svg.setPointerCapture(e.pointerId); mover(e); });
      svg.addEventListener("pointermove", mover);
      svg.addEventListener("pointerup", () => { dedo = false; });
      v.querySelector(".otra").onclick = () => { idx++; cargar(); };
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
