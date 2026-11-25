/*
  JUEGOS NUEVOS (4): Baña al perrito, Pesca de colores, Mi jardín, Dale de comer y Rasca y descubre.
  Todos los dibujos son originales. Cada juego recibe H (h, decir, celebrar, nota, azar, barajar, elegir).
*/
(() => {
  "use strict";
  const J = window.JUEGOS_EXTRA = window.JUEGOS_EXTRA || [];

  // Rascar / frotar sobre un canvas: devuelve una función que mide cuánto queda (0..1)
  const medidor = (cv) => {
    const ctx = cv.getContext("2d");
    return () => {
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let n = 0, t = 0;
      for (let i = 3; i < d.length; i += 4 * 16) { t++; if (d[i] > 40) n++; }
      return t ? n / t : 0;
    };
  };
  // Pinta con el dedo un trazo en «destination-out» (borra) sobre el canvas
  const frotar = (cv, grosor, alMover, alSoltar) => {
    const ctx = cv.getContext("2d");
    let ult = null;
    const pto = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * cv.width, y: (e.clientY - r.top) / r.height * cv.height, cx: e.clientX - r.left, cy: e.clientY - r.top }; };
    const borrar = (a, b) => {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = grosor; ctx.lineCap = ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x + .1, b.y); ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    };
    cv.addEventListener("pointerdown", (e) => { cv.setPointerCapture(e.pointerId); ult = pto(e); borrar(ult, ult); alMover && alMover(ult); });
    cv.addEventListener("pointermove", (e) => { if (!ult) return; const p = pto(e); borrar(ult, p); ult = p; alMover && alMover(p); });
    const fin = () => { if (ult) { ult = null; alSoltar && alSoltar(); } };
    cv.addEventListener("pointerup", fin); cv.addEventListener("pointercancel", fin);
  };

  /* ---------- Baña al perrito ---------- */
  const PERRO = `<svg viewBox="0 0 300 300" class="perro-svg" aria-hidden="true">
    <path d="M236 170 q34 -24 30 -62" fill="none" stroke="#e9c79a" stroke-width="16" stroke-linecap="round"/>
    <ellipse cx="160" cy="200" rx="84" ry="58" fill="#fff4e3" stroke="#4a3b5c" stroke-width="5"/>
    <rect x="96" y="226" width="30" height="50" rx="14" fill="#fff4e3" stroke="#4a3b5c" stroke-width="5"/>
    <rect x="196" y="226" width="30" height="50" rx="14" fill="#fff4e3" stroke="#4a3b5c" stroke-width="5"/>
    <ellipse cx="180" cy="190" rx="26" ry="20" fill="#e9c79a"/>
    <ellipse cx="62" cy="84" rx="24" ry="44" transform="rotate(18 62 84)" fill="#c98f5a" stroke="#4a3b5c" stroke-width="5"/>
    <ellipse cx="158" cy="84" rx="24" ry="44" transform="rotate(-18 158 84)" fill="#c98f5a" stroke="#4a3b5c" stroke-width="5"/>
    <circle cx="110" cy="112" r="62" fill="#fff4e3" stroke="#4a3b5c" stroke-width="5"/>
    <ellipse cx="138" cy="94" rx="20" ry="16" fill="#e9c79a"/>
    <circle cx="88" cy="104" r="9" fill="#2f2147"/><circle cx="132" cy="104" r="9" fill="#2f2147"/>
    <circle cx="91" cy="101" r="3" fill="#fff"/><circle cx="135" cy="101" r="3" fill="#fff"/>
    <ellipse cx="110" cy="132" rx="14" ry="10" fill="#2f2147"/>
    <path d="M110 142 v8 M110 150 q-12 10 -22 0 M110 150 q12 10 22 0" fill="none" stroke="#2f2147" stroke-width="4" stroke-linecap="round"/>
    <path d="M102 158 q8 16 16 0 z" fill="#ff7a9c"/>
    <ellipse cx="74" cy="132" rx="10" ry="6" fill="#ffb6c8" opacity=".8"/><ellipse cx="146" cy="132" rx="10" ry="6" fill="#ffb6c8" opacity=".8"/>
    <rect x="76" y="168" width="70" height="12" rx="6" fill="#ff5f9e"/><circle cx="111" cy="186" r="8" fill="#ffd400"/>
  </svg>`;
  // Dónde van las manchas de barro (en coordenadas 300×300), siempre encima del perrito
  const MANCHAS = [[80, 70], [150, 60], [70, 130], [140, 140], [110, 100], [130, 200], [190, 210], [220, 180], [110, 250], [210, 255], [170, 175], [240, 140], [60, 90]];
  J.push({
    ruta: "perrito", ico: "🛁", nombre: "Baña al perrito", clase: "c-cian",
    crear(H) {
      const v = H.h(`<section class="bano-juego">
        <div class="pregunta"><button class="btn-oir" aria-label="Escuchar">👂</button><span class="txt"></span></div>
        <div class="bano">
          ${PERRO}
          <canvas class="barro" width="300" height="300"></canvas>
          <canvas class="espuma" width="300" height="300"></canvas>
          <div class="brillos oculto">✨</div>
          <div class="herramienta" aria-hidden="true"></div>
        </div>
        <div class="fila-herramientas">
          <button class="chip-grande activo" data-h="jabon">🧽</button>
          <button class="chip-grande" data-h="ducha">🚿</button>
          <button class="chip-grande" data-h="toalla">🧺</button>
        </div>
        <div class="acciones"><button class="btn-accion oculto" data-a="otra">🐾 ¡Otra vez a jugar en el barro!</button></div>
      </section>`);
      const bano = v.querySelector(".bano"), barro = v.querySelector(".barro"), espuma = v.querySelector(".espuma");
      const bctx = barro.getContext("2d"), ectx = espuma.getContext("2d");
      const txt = v.querySelector(".txt"), herr = v.querySelector(".herramienta"), brillos = v.querySelector(".brillos");
      let paso = "jabon", inicioBarro = 1, movs = 0;
      const PASOS = {
        jabon: { frase: "¡Uy, qué sucio está! Frótalo con la esponja.", ico: "🧽" },
        ducha: { frase: "¡Cuánta espuma! Ahora, la ducha.", ico: "🚿" },
        toalla: { frase: "¡Está mojado! Sécalo con la toalla.", ico: "🧺" },
      };
      const decirPaso = () => { txt.textContent = PASOS[paso].frase; H.decir(PASOS[paso].frase); };
      v.querySelector(".btn-oir").onclick = decirPaso;
      const elegirH = (n) => {
        paso = n; herr.textContent = PASOS[n].ico;
        v.querySelectorAll("[data-h]").forEach(b => b.classList.toggle("activo", b.dataset.h === n));
        bano.dataset.paso = n; decirPaso();
      };
      v.querySelectorAll("[data-h]").forEach(b => b.onclick = () => { if (b.dataset.h === paso) return; H.nota(220, .2, "triangle"); b.classList.add("temblar"); setTimeout(() => b.classList.remove("temblar"), 400); });

      const ensuciar = () => {
        bctx.clearRect(0, 0, 300, 300); ectx.clearRect(0, 0, 300, 300);
        MANCHAS.forEach(([x, y]) => {
          const r = 16 + H.azar(14);
          bctx.fillStyle = ["#7a4f2a", "#8b5a2b", "#6b4423"][H.azar(3)];
          bctx.beginPath();
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
            const rr = r * (.75 + Math.random() * .5);
            bctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
          }
          bctx.closePath(); bctx.fill();
          for (let k = 0; k < 3; k++) { bctx.beginPath(); bctx.arc(x + (Math.random() - .5) * r * 3, y + (Math.random() - .5) * r * 3, 3 + H.azar(5), 0, 7); bctx.fill(); }
        });
        inicioBarro = queda(barro) || 1;
        brillos.classList.add("oculto"); v.querySelector('[data-a="otra"]').classList.add("oculto");
        elegirH("jabon");
      };
      const queda = (cv) => medidor(cv)();
      // Espuma: burbujas blancas donde frota con la esponja
      const burbujas = (p, n = 3) => {
        for (let i = 0; i < n; i++) {
          const x = p.x + (Math.random() - .5) * 50, y = p.y + (Math.random() - .5) * 50, r = 5 + Math.random() * 12;
          ectx.fillStyle = "rgba(255,255,255,.92)"; ectx.strokeStyle = "rgba(140,200,255,.9)"; ectx.lineWidth = 2;
          ectx.beginPath(); ectx.arc(x, y, r, 0, 7); ectx.fill(); ectx.stroke();
        }
      };
      const gotas = (p) => {
        const g = document.createElement("span"); g.className = "gota"; g.textContent = "💧";
        g.style.left = (p.cx + (Math.random() - .5) * 40) + "px"; g.style.top = p.cy + "px";
        bano.appendChild(g); setTimeout(() => g.remove(), 700);
      };
      // Todo se hace sobre la capa de arriba; según el paso, borramos barro o espuma
      const pto = (e) => { const r = espuma.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 300, y: (e.clientY - r.top) / r.height * 300, cx: e.clientX - r.left, cy: e.clientY - r.top }; };
      let ult = null;
      const borrarEn = (ctx, a, b, g) => { ctx.globalCompositeOperation = "destination-out"; ctx.lineWidth = g; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x + .1, b.y); ctx.stroke(); ctx.globalCompositeOperation = "source-over"; };
      const mover = (p) => {
        herr.style.left = p.cx + "px"; herr.style.top = p.cy + "px";
        if (paso === "jabon") { borrarEn(bctx, ult, p, 34); burbujas(p); if (movs % 4 === 0) H.nota(700 + H.azar(500), .06); }
        else if (paso === "ducha") { borrarEn(ectx, ult, p, 44); if (movs % 2 === 0) gotas(p); if (movs % 5 === 0) H.nota(1200 + H.azar(400), .04); }
        else { borrarEn(ectx, ult, p, 50); if (movs % 6 === 0) H.nota(300 + H.azar(100), .05, "triangle"); }
        ult = p; movs++;
        if (movs % 12 === 0) comprobar();
      };
      const comprobar = () => {
        if (paso === "jabon" && queda(barro) / inicioBarro < .06) {
          bctx.clearRect(0, 0, 300, 300); H.nota(880, .2);
          // La espuma cubre al perrito: hay que aclararlo
          for (let i = 0; i < 40; i++) burbujas({ x: 40 + H.azar(240), y: 40 + H.azar(240) }, 2);
          setTimeout(() => elegirH("ducha"), 300);
        } else if (paso === "ducha" && queda(espuma) < .05) {
          ectx.clearRect(0, 0, 300, 300);
          // Queda mojado: gotitas de agua que se secan con la toalla
          ectx.fillStyle = "rgba(120,190,255,.75)";
          for (let i = 0; i < 70; i++) { ectx.beginPath(); ectx.arc(40 + H.azar(240), 40 + H.azar(240), 4 + H.azar(6), 0, 7); ectx.fill(); }
          setTimeout(() => elegirH("toalla"), 300);
        } else if (paso === "toalla" && queda(espuma) < .05) {
          ectx.clearRect(0, 0, 300, 300); paso = "fin"; herr.textContent = "";
          brillos.classList.remove("oculto"); bano.dataset.paso = "fin";
          H.celebrar("🐶"); setTimeout(() => H.decir("¡Qué limpito y qué guapo!"), 1600);
          v.querySelector('[data-a="otra"]').classList.remove("oculto");
        }
      };
      espuma.addEventListener("pointerdown", (e) => { if (paso === "fin") return; espuma.setPointerCapture(e.pointerId); ult = pto(e); mover(ult); });
      espuma.addEventListener("pointermove", (e) => { if (ult) mover(pto(e)); });
      const soltar = () => { if (ult) { ult = null; comprobar(); } };
      espuma.addEventListener("pointerup", soltar); espuma.addEventListener("pointercancel", soltar);
      v.querySelector('[data-a="otra"]').onclick = () => { H.nota(300, .2); ensuciar(); };
      setTimeout(ensuciar, 0);
      return v;
    },
  });

  /* ---------- Pesca de colores ---------- */
  const PECES = [
    { n: "rosa", c: "#ff7ac6" }, { n: "azul", c: "#3d8bff" }, { n: "amarillo", c: "#ffd400" },
    { n: "verde", c: "#3cc84a" }, { n: "naranja", c: "#ff8a2b" }, { n: "morado", c: "#9b5cff" },
  ];
  const svgPez = (c) => `<svg viewBox="0 0 120 70"><path d="M86 35 L118 10 L112 35 L118 60 Z" fill="${c}" stroke="#2f2147" stroke-width="4" stroke-linejoin="round"/>
    <ellipse cx="52" cy="35" rx="44" ry="28" fill="${c}" stroke="#2f2147" stroke-width="4"/>
    <path d="M60 14 q10 21 0 42" fill="none" stroke="#2f2147" stroke-width="3" opacity=".35"/>
    <circle cx="28" cy="30" r="7" fill="#fff" stroke="#2f2147" stroke-width="3"/><circle cx="26" cy="30" r="3.5" fill="#2f2147"/>
    <path d="M10 42 q6 5 12 1" fill="none" stroke="#2f2147" stroke-width="3" stroke-linecap="round"/></svg>`;
  J.push({
    ruta: "pesca", ico: "🎣", nombre: "Pesca", clase: "c-azul",
    crear(H) {
      const v = H.h(`<section class="pesca-juego">
        <div class="pregunta"><button class="btn-oir" aria-label="Escuchar">👂</button><span class="txt"></span></div>
        <div class="mar"><div class="cana">🎣</div></div>
        <div class="cubo"></div>
      </section>`);
      const mar = v.querySelector(".mar"), txt = v.querySelector(".txt"), cubo = v.querySelector(".cubo");
      let peces = [], meta = null, frase = "", vivo = true, pescados = 0, bucle = 0;
      v.querySelector(".btn-oir").onclick = () => H.decir(frase);
      const ronda = () => {
        peces.forEach(p => p.el.remove()); peces = [];
        const tipo = H.azar(3); // 0 color, 1 grande, 2 pequeño
        const cols = H.barajar(PECES.slice()).slice(0, 5);
        meta = tipo === 0 ? { col: cols[0] } : { tam: tipo === 1 ? "grande" : "pequeño" };
        frase = tipo === 0 ? `¡Pesca el pez ${meta.col.n}!` : `¡Pesca el pez ${meta.tam}!`;
        txt.innerHTML = tipo === 0 ? `¡Pesca el pez <b style="color:${meta.col.c}">${meta.col.n}</b>!` : frase;
        H.decir(frase);
        const W = mar.clientWidth, Hh = mar.clientHeight;
        cols.forEach((col, i) => {
          const esMeta = tipo === 0 ? i === 0 : i === 0;
          const escala = tipo === 1 ? (esMeta ? 1.6 : .8) : tipo === 2 ? (esMeta ? .55 : 1.1) : .7 + Math.random() * .5;
          const w = Math.min(130, W * .28) * escala;
          const el = H.h(`<button class="pez" aria-label="pez ${col.n}">${svgPez(col.c)}</button>`);
          el.style.width = w + "px";
          const p = { el, col, esMeta, w, x: Math.random() * (W - w), y: 30 + (i / cols.length) * (Hh - 80), vx: (1 + Math.random() * 1.4) * (Math.random() < .5 ? -1 : 1), fase: Math.random() * 6, vivo: true };
          el.onpointerdown = () => tocar(p);
          mar.appendChild(el); peces.push(p);
        });
      };
      const tocar = (p) => {
        if (!p.vivo) return;
        if (!p.esMeta) { H.nota(220, .25, "triangle"); p.el.classList.add("temblar"); setTimeout(() => p.el.classList.remove("temblar"), 400); return; }
        p.vivo = false; p.el.classList.add("pescado"); H.nota(660, .1); setTimeout(() => H.nota(990, .2), 120);
        p.el.style.transform += " translateY(-120%)";
        pescados++;
        setTimeout(() => {
          cubo.insertAdjacentHTML("beforeend", `<span class="mini-pez" style="--c:${p.col.c}">${svgPez(p.col.c)}</span>`);
          if (pescados % 5 === 0) { H.celebrar("🐟"); setTimeout(() => { cubo.innerHTML = ""; ronda(); }, 1900); }
          else { H.decir(["¡Muy bien!", "¡Genial!", "¡Bravo, María!"][H.azar(3)]); setTimeout(ronda, 900); }
        }, 600);
      };
      const nadar = (t) => {
        if (!vivo || !mar.isConnected) return;
        const W = mar.clientWidth;
        peces.forEach(p => {
          if (!p.vivo) return;
          p.x += p.vx;
          if (p.x < 0) { p.x = 0; p.vx *= -1; } if (p.x > W - p.w) { p.x = W - p.w; p.vx *= -1; }
          const y = p.y + Math.sin(t / 600 + p.fase) * 8;
          p.el.style.transform = `translate(${p.x}px, ${y}px) scaleX(${p.vx > 0 ? -1 : 1})`;
        });
        bucle = requestAnimationFrame(nadar);
      };
      setTimeout(() => { ronda(); bucle = requestAnimationFrame(nadar); }, 50);
      v._limpiar = () => { vivo = false; cancelAnimationFrame(bucle); };
      return v;
    },
  });

  /* ---------- Mi jardín ---------- */
  const FLORES = [
    { n: "rosa", c: "#ff7ac6" }, { n: "roja", c: "#ff4d4d" }, { n: "amarilla", c: "#ffd400" },
    { n: "morada", c: "#9b5cff" }, { n: "azul", c: "#3d8bff" }, { n: "naranja", c: "#ff8a2b" },
  ];
  const svgFlor = (c, h = 1) => {
    const pet = [0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="60" cy="${40 - 22}" rx="13" ry="20" fill="${c}" stroke="#2f2147" stroke-width="3" transform="rotate(${a} 60 40)"/>`).join("");
    return `<svg viewBox="0 0 120 200" class="flor-svg"><path d="M60 200 V60" stroke="#3cc84a" stroke-width="8" stroke-linecap="round"/>
      <ellipse cx="40" cy="${130}" rx="20" ry="9" fill="#5ad46a" transform="rotate(-30 40 130)"/><ellipse cx="80" cy="${150}" rx="20" ry="9" fill="#5ad46a" transform="rotate(30 80 150)"/>
      ${pet}<circle cx="60" cy="40" r="14" fill="#ffe27a" stroke="#2f2147" stroke-width="3"/></svg>`;
  };
  J.push({
    ruta: "jardin", ico: "🌷", nombre: "Mi jardín", clase: "c-verde",
    crear(H) {
      const v = H.h(`<section class="jardin-juego">
        <div class="pregunta"><button class="btn-oir" aria-label="Escuchar">👂</button><span class="txt"></span></div>
        <div class="escena-jardin" data-fase="0">
          <div class="sol">☀️</div><div class="nube">☁️</div>
          <div class="lluvia"></div>
          <div class="planta">
            <div class="brote"><svg viewBox="0 0 60 60"><path d="M30 60 V30" stroke="#3cc84a" stroke-width="6" stroke-linecap="round"/><ellipse cx="18" cy="28" rx="13" ry="7" fill="#5ad46a" transform="rotate(-25 18 28)"/><ellipse cx="42" cy="28" rx="13" ry="7" fill="#5ad46a" transform="rotate(25 42 28)"/></svg></div>
            <div class="flor-grande"></div>
          </div>
          <div class="semilla">🌰</div>
          <div class="tierra"></div>
        </div>
        <div class="fila-herramientas jardin-botones"></div>
        <div class="mi-jardin"></div>
      </section>`);
      const esc = v.querySelector(".escena-jardin"), txt = v.querySelector(".txt"), bots = v.querySelector(".jardin-botones");
      const lluvia = v.querySelector(".lluvia"), florG = v.querySelector(".flor-grande"), mio = v.querySelector(".mi-jardin");
      let frase = "";
      const decirF = (f) => { frase = f; txt.textContent = f; H.decir(f); };
      v.querySelector(".btn-oir").onclick = () => H.decir(frase);
      const boton = (ico, alTocar) => { bots.replaceChildren(); const b = H.h(`<button class="chip-grande latir">${ico}</button>`); b.onclick = () => { b.disabled = true; alTocar(); }; bots.appendChild(b); };
      const fase = (n) => { esc.dataset.fase = n; };
      const empezar = () => {
        fase(0); florG.innerHTML = "";
        decirF("¡Vamos a plantar una semilla!");
        boton("🌰", () => {
          fase(1); H.nota(400, .2);
          setTimeout(() => {
            decirF("Ahora, ¡riégala!");
            boton("🚿", () => {
              fase(2); lluvia.innerHTML = Array.from({ length: 14 }, (_, i) => `<span style="left:${10 + i * 6}%;animation-delay:${(i % 5) * .12}s">💧</span>`).join("");
              for (let i = 0; i < 6; i++) setTimeout(() => H.nota(1100 + H.azar(500), .05), i * 140);
              setTimeout(() => {
                lluvia.innerHTML = ""; fase(3); H.nota(600, .3);
                decirF("¡Ha salido un brote! Ahora, que salga el sol.");
                boton("☀️", () => {
                  fase(4); H.nota(523); setTimeout(() => H.nota(659), 150);
                  setTimeout(() => {
                    decirF("¿De qué color quieres tu flor?");
                    bots.replaceChildren();
                    FLORES.forEach(f => {
                      const b = H.h(`<button class="chip-grande chip-flor" aria-label="${f.n}" style="background:${f.c}"></button>`);
                      b.onclick = () => {
                        bots.replaceChildren();
                        florG.innerHTML = svgFlor(f.c); fase(5);
                        H.celebrar("🌷"); setTimeout(() => H.decir(`¡Una flor ${f.n}!`), 1700);
                        const m = H.h(`<span class="flor-mini">${svgFlor(f.c)}</span>`);
                        setTimeout(() => { mio.appendChild(m); if (mio.children.length > 10) mio.firstElementChild.remove(); boton("🌱", empezar); }, 2400);
                      };
                      bots.appendChild(b);
                    });
                  }, 1200);
                });
              }, 2000);
            });
          }, 900);
        });
      };
      empezar();
      return v;
    },
  });

  /* ---------- Dale de comer ---------- */
  const ANIMALES = [
    { a: "🐰", n: "el conejo", c: "🥕", cn: "la zanahoria" },
    { a: "🐶", n: "el perro", c: "🦴", cn: "el hueso" },
    { a: "🐱", n: "el gato", c: "🐟", cn: "el pescado" },
    { a: "🐵", n: "el mono", c: "🍌", cn: "el plátano" },
    { a: "🐭", n: "el ratón", c: "🧀", cn: "el queso" },
    { a: "🐼", n: "el panda", c: "🎋", cn: "el bambú" },
    { a: "🐝", n: "la abeja", c: "🌸", cn: "la flor" },
    { a: "🐻", n: "el oso", c: "🍯", cn: "la miel" },
    { a: "🐔", n: "la gallina", c: "🌽", cn: "el maíz" },
  ];
  J.push({
    ruta: "comer", ico: "🥕", nombre: "Dale de comer", clase: "c-naranja",
    crear(H) {
      const v = H.h(`<section class="comer-juego">
        <div class="pregunta"><button class="btn-oir" aria-label="Escuchar">👂</button><span class="txt">¡Tienen hambre! Lleva a cada uno su comida.</span></div>
        <div class="animales"></div>
        <div class="comidas"></div>
      </section>`);
      const zA = v.querySelector(".animales"), zC = v.querySelector(".comidas");
      const frase = "¡Tienen hambre! Lleva a cada uno su comida.";
      v.querySelector(".btn-oir").onclick = () => H.decir(frase);
      let quedan = 0, elegida = null;
      const dar = (comida, animal) => {
        if (comida.dataset.c !== animal.dataset.c) {
          H.nota(220, .25, "triangle"); animal.classList.add("temblar"); setTimeout(() => animal.classList.remove("temblar"), 400);
          H.decir("¡Eso no le gusta!"); return false;
        }
        const x = ANIMALES.find(y => y.c === comida.dataset.c);
        comida.remove(); animal.classList.add("comiendo"); animal.querySelector(".bocado").textContent = x.c;
        H.nota(500, .1); setTimeout(() => H.nota(700, .1), 120); setTimeout(() => H.nota(900, .15), 240);
        H.decir(`¡Ñam! ${x.n.startsWith("el ") ? "Al " + x.n.slice(3) : "A " + x.n} le gusta ${x.cn}.`);
        quedan--;
        if (!quedan) setTimeout(() => { H.celebrar("😋"); setTimeout(ronda, 1900); }, 900);
        return true;
      };
      const ronda = () => {
        zA.replaceChildren(); zC.replaceChildren(); elegida = null;
        const sel = H.barajar(ANIMALES.slice()).slice(0, 3); quedan = 3;
        sel.forEach(x => zA.appendChild(H.h(`<div class="animal" data-c="${x.c}"><span class="cara">${x.a}</span><span class="bocado"></span></div>`)));
        H.barajar(sel.slice()).forEach(x => {
          const c = H.h(`<button class="comida" data-c="${x.c}" aria-label="${x.cn}">${x.c}</button>`);
          // Arrastrar con el dedo (o tocar la comida y luego el animal)
          let ini = null, movido = false;
          c.addEventListener("pointerdown", (e) => { c.setPointerCapture(e.pointerId); ini = { x: e.clientX, y: e.clientY }; movido = false; c.classList.add("arrastrando"); });
          c.addEventListener("pointermove", (e) => {
            if (!ini) return;
            const dx = e.clientX - ini.x, dy = e.clientY - ini.y;
            if (Math.abs(dx) + Math.abs(dy) > 8) movido = true;
            c.style.transform = `translate(${dx}px, ${dy}px) scale(1.15)`;
          });
          const soltar = (e) => {
            if (!ini) return; ini = null; c.classList.remove("arrastrando");
            c.style.visibility = "hidden";
            const debajo = document.elementFromPoint(e.clientX, e.clientY);
            c.style.visibility = ""; c.style.transform = "";
            const an = debajo && debajo.closest(".animal");
            if (movido) { if (an) dar(c, an); return; }
            zC.querySelectorAll(".elegida").forEach(y => y.classList.remove("elegida"));
            elegida = c; c.classList.add("elegida"); H.nota(800, .08);
          };
          c.addEventListener("pointerup", soltar);
          c.addEventListener("pointercancel", () => { ini = null; c.style.transform = ""; c.classList.remove("arrastrando"); });
          zC.appendChild(c);
        });
      };
      zA.addEventListener("click", (e) => {
        const an = e.target.closest(".animal");
        if (an && elegida && elegida.isConnected) { if (dar(elegida, an)) elegida = null; }
      });
      H.decir(frase);
      ronda();
      return v;
    },
  });

  /* ---------- Rasca y descubre (y luego a colorear) ---------- */
  const PASTEL = ["#ff9ec4", "#8fd3ff", "#ffe27a", "#a6f08a", "#c9a8ff", "#ffc07a", "#ff8a8a", "#7fe3d0"];
  J.push({
    ruta: "rasca", ico: "🪄", nombre: "Rasca y descubre", clase: "c-amarillo",
    crear(H) {
      const DIB = window.DIBUJOS_MARIA || [];
      const v = H.h(`<section class="rasca-juego">
        <div class="pregunta"><button class="btn-oir" aria-label="Escuchar">👂</button><span class="txt">¿Qué habrá escondido? ¡Rasca con el dedo!</span></div>
        <div class="rasca"><div class="oculto-dibujo"></div><canvas width="400" height="400"></canvas></div>
        <div class="acciones">
          <button class="btn-accion oculto" data-a="colorear">🖍️ ¡A colorearlo!</button>
          <button class="btn-accion oculto" data-a="otro">🔄 Otro</button>
        </div>
      </section>`);
      const cv = v.querySelector("canvas"), ctx = cv.getContext("2d"), dib = v.querySelector(".oculto-dibujo"), txt = v.querySelector(".txt");
      let actual = null, listo = false, movs = 0, ultimo = -1;
      let frase = txt.textContent;
      v.querySelector(".btn-oir").onclick = () => H.decir(frase);
      const queda = medidor(cv);
      const tapar = () => {
        const g = ctx.createLinearGradient(0, 0, 400, 400);
        g.addColorStop(0, "#d9c2ff"); g.addColorStop(.5, "#f4e9ff"); g.addColorStop(1, "#c6a6ff");
        ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = g; ctx.fillRect(0, 0, 400, 400);
        ctx.font = "44px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        for (let y = 40; y < 400; y += 80) for (let x = (y / 80) % 2 ? 80 : 40; x < 400; x += 80) { ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fillText(["⭐", "❓", "✨"][(x + y) % 3], x, y); }
        ctx.font = "bold 140px sans-serif"; ctx.fillStyle = "rgba(139,92,255,.55)"; ctx.fillText("?", 200, 210);
      };
      const nuevo = () => {
        if (!DIB.length) return;
        let i; do { i = H.azar(DIB.length); } while (DIB.length > 1 && i === ultimo);
        ultimo = i; actual = DIB[i]; listo = false; movs = 0;
        dib.innerHTML = `<svg viewBox="0 0 200 200" class="dibujo">${actual.svg}</svg>`;
        dib.querySelectorAll(".z").forEach(z => z.style.fill = PASTEL[H.azar(PASTEL.length)]);
        cv.style.opacity = 1; cv.classList.remove("oculto");
        v.querySelectorAll(".acciones .btn-accion").forEach(b => b.classList.add("oculto"));
        frase = "¿Qué habrá escondido? ¡Rasca con el dedo!"; txt.textContent = frase; H.decir(frase);
        tapar();
      };
      frotar(cv, 46, () => { movs++; if (movs % 5 === 0) H.nota(1400 + H.azar(600), .03, "square"); if (movs % 15 === 0) mirar(); }, () => mirar());
      const mirar = () => {
        if (listo || queda() > .45) return;
        listo = true; cv.style.opacity = 0; setTimeout(() => cv.classList.add("oculto"), 500);
        frase = `¡Es un ${actual.nombre.toLowerCase()}!`.replace("un estrella", "una estrella").replace("un flor", "una flor").replace("un casa", "una casa").replace("un mariposa", "una mariposa").replace("un tortuga", "una tortuga").replace("un ballena", "una ballena");
        txt.textContent = frase;
        H.celebrar(actual.ico || "🎉"); setTimeout(() => H.decir(frase), 1700);
        v.querySelectorAll(".acciones .btn-accion").forEach(b => b.classList.remove("oculto"));
      };
      v.querySelector('[data-a="colorear"]').onclick = () => { location.hash = "#/colorear/" + actual.id; };
      v.querySelector('[data-a="otro"]').onclick = () => { H.nota(500, .1); nuevo(); };
      setTimeout(nuevo, 0);
      return v;
    },
  });
})();
