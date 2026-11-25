/*
  JUEGOS CON FOTOS PROPIAS: «Mis parejas» y «¿Quién es?».
  Las fotos (de la familia, de casa…) se añaden en la zona para mayores → «📷 Mis fotos».
  Se guardan SOLO en este dispositivo (IndexedDB «maria-fotos»): nunca se suben a internet.
*/
(() => {
  "use strict";
  const J = (window.JUEGOS_EXTRA = window.JUEGOS_EXTRA || []);

  /* ---------- Almacén de fotos en el dispositivo ---------- */
  const Fotos = (() => {
    let db = null;
    const abrir = () => db || (db = new Promise((ok, mal) => {
      const r = indexedDB.open("maria-fotos", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("fotos", { keyPath: "id" });
      r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error);
    }));
    const op = (modo, fn) => abrir().then(d => new Promise((ok, mal) => {
      const t = d.transaction("fotos", modo), r = fn(t.objectStore("fotos"));
      t.oncomplete = () => ok(r && r.result); t.onerror = () => mal(t.error);
    }));
    return {
      listar: () => op("readonly", s => s.getAll()).then(l => (l || []).sort((a, b) => a.fecha - b.fecha)),
      guardar: (f) => op("readwrite", s => s.put(f)),
      borrar: (id) => op("readwrite", s => s.delete(id)),
    };
  })();

  // Reduce la foto a 600 px como mucho (lado mayor) y la guarda en JPEG
  const reducir = (archivo) => new Promise((ok, mal) => {
    const url = URL.createObjectURL(archivo), img = new Image();
    img.onload = () => {
      const k = Math.min(1, 600 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? ok(b) : mal(new Error("foto")), "image/jpeg", .85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error("foto")); };
    img.src = url;
  });
  const urls = new Map(); // id → URL de la imagen (se reutiliza mientras la web está abierta)
  const urlDe = (f) => { if (!urls.has(f.id)) urls.set(f.id, URL.createObjectURL(f.blob)); return urls.get(f.id); };

  /* ---------- Pestaña «📷 Mis fotos» de la zona para mayores ---------- */
  const panel = (h) => {
    const p = h(`<div class="panel-mayores oculto" data-p="fotos">
      <h2>📷 Mis fotos</h2>
      <p class="ayuda-mayores">Fotos para los juegos «Mis parejas» y «¿Quién es?». Se guardan <b>solo en este dispositivo</b> (no se suben a internet) y se reducen de tamaño. Ponle a cada una el nombre que dirá el juego: «Mamá», «la abuela», «Toby»…</p>
      <label class="btn-accion btn-subir-fotos">➕ Elegir fotos<input type="file" accept="image/*" multiple hidden></label>
      <div class="fotos-nuevas"></div>
      <p class="estado-mayores"></p>
      <h2>🖼️ Fotos guardadas</h2>
      <div class="rejilla-fotos"></div>
    </div>`);
    const nuevas = p.querySelector(".fotos-nuevas"), estado = p.querySelector(".estado-mayores"), rej = p.querySelector(".rejilla-fotos");
    const pintar = () => Fotos.listar().then(l => {
      rej.replaceChildren();
      if (!l.length) { rej.appendChild(h(`<p class="ayuda-mayores">Todavía no hay fotos.</p>`)); return; }
      l.forEach(f => {
        const fila = h(`<div class="foto-guardada"><img alt=""><span></span><button class="btn-borrar">🗑️</button></div>`);
        fila.querySelector("img").src = urlDe(f); fila.querySelector("span").textContent = f.nombre;
        const bb = fila.querySelector("button");
        bb.onclick = async () => {
          if (!bb.classList.contains("seguro")) { bb.classList.add("seguro"); bb.textContent = "¿Quitar?"; setTimeout(() => { bb.classList.remove("seguro"); bb.textContent = "🗑️"; }, 3000); return; }
          await Fotos.borrar(f.id); pintar();
        };
        rej.appendChild(fila);
      });
    }).catch(() => { estado.textContent = "❌ Este navegador no deja guardar fotos (¿modo privado?)."; });

    p.querySelector("input[type=file]").onchange = async (e) => {
      const archivos = [...e.target.files]; e.target.value = "";
      if (!archivos.length) return;
      estado.textContent = "⏳ Preparando fotos…";
      nuevas.replaceChildren();
      const listas = [];
      for (const a of archivos) {
        try {
          const blob = await reducir(a);
          const fila = h(`<div class="foto-nueva"><img alt=""><input maxlength="30" placeholder="¿Quién o qué es?"></div>`);
          const u = URL.createObjectURL(blob); fila.querySelector("img").src = u;
          nuevas.appendChild(fila); listas.push({ blob, fila });
        } catch (err) { /* foto que no se puede leer: se salta */ }
      }
      if (!listas.length) { estado.textContent = "❌ No he podido abrir esas fotos."; return; }
      estado.textContent = "Escribe el nombre de cada foto y pulsa Guardar.";
      const bt = h(`<button class="btn-accion">💾 Guardar fotos</button>`);
      nuevas.appendChild(bt);
      listas[0].fila.querySelector("input").focus();
      bt.onclick = async () => {
        const faltan = listas.filter(x => !x.fila.querySelector("input").value.trim());
        if (faltan.length) { estado.textContent = "Falta poner nombre a alguna foto."; faltan[0].fila.querySelector("input").focus(); return; }
        bt.disabled = true;
        let i = 0;
        for (const x of listas) {
          await Fotos.guardar({ id: Date.now().toString(36) + "-" + (i++), nombre: x.fila.querySelector("input").value.trim(), blob: x.blob, fecha: Date.now() + i });
        }
        nuevas.replaceChildren();
        estado.textContent = `✅ ${listas.length === 1 ? "Foto guardada" : listas.length + " fotos guardadas"} en este dispositivo.`;
        pintar();
      };
    };
    pintar();
    return p;
  };
  window.FotosMaria = { panel };

  // Mensaje cuando todavía no hay (suficientes) fotos
  const sinFotos = (H, minimo) => H.h(`<section class="aviso"><div class="ico">📷</div>
    <p>Este juego usa vuestras fotos.<br>${minimo > 1 ? "Hacen falta al menos " + minimo : "Hace falta al menos una"}.</p>
    <p><small>Un mayor puede añadirlas en <b>🔒 Mayores → 📷 Mis fotos</b> (abajo del todo en la portada).</small></p></section>`);

  /* ---------- Mis parejas: memoria con las fotos de casa ---------- */
  J.push({
    ruta: "misparejas", ico: "🖼️", nombre: "Mis parejas", clase: "c-lila",
    crear(H) {
      const v = H.h(`<section><div class="pregunta"><span>¡Busca las parejas!</span></div><div class="memoria memoria-fotos"></div></section>`);
      const tab = v.querySelector(".memoria");
      Fotos.listar().then(lista => {
        if (lista.length < 2) { v.replaceWith(sinFotos(H, 2)); return; }
        let pares = Math.min(3, lista.length);
        const empezar = () => {
          tab.replaceChildren();
          const sel = H.elegir(lista, pares);
          const cartas = H.barajar([...sel, ...sel]);
          let abiertas = [], hechas = 0, bloqueado = false;
          cartas.forEach(f => {
            const c = H.h(`<button class="carta" aria-label="carta"><div class="carta-in"><div class="cara atras">❓</div><div class="cara frente"><img alt=""></div></div></button>`);
            c.querySelector("img").src = urlDe(f);
            c.onclick = () => {
              if (bloqueado || c.classList.contains("girada")) return;
              c.classList.add("girada"); H.nota(600, .15);
              abiertas.push({ c, f });
              if (abiertas.length < 2) return;
              const [x, y] = abiertas; abiertas = [];
              if (x.f.id === y.f.id) {
                x.c.classList.add("hecha"); y.c.classList.add("hecha"); hechas++;
                setTimeout(() => H.decir(f.nombre), 250);
                if (hechas === pares) {
                  setTimeout(() => H.celebrar("🏆"), 900);
                  setTimeout(() => { if (v.isConnected) { pares = Math.min(pares + 1, 6, lista.length); empezar(); } }, 3200);
                }
              } else {
                bloqueado = true;
                setTimeout(() => { x.c.classList.remove("girada"); y.c.classList.remove("girada"); bloqueado = false; }, 1000);
              }
            };
            tab.appendChild(c);
          });
        };
        H.decir("¡Busca las parejas!");
        empezar();
      }).catch(() => v.replaceWith(sinFotos(H, 2)));
      return v;
    },
  });

  /* ---------- ¿Quién es? / ¿Qué es? ---------- */
  J.push({
    ruta: "quienes", ico: "🤔", nombre: "¿Quién es?", clase: "c-naranja",
    crear(H) {
      const v = H.h(`<section class="quienes-juego">
        <div class="pregunta"><button class="btn-oir" aria-label="Escuchar">👂</button><span>¿Quién es?</span></div>
        <div class="foto-quien"><img alt=""></div>
        <div class="opciones opciones-nombres"></div>
        <div class="estrellas"></div>
      </section>`);
      const img = v.querySelector(".foto-quien img"), ops = v.querySelector(".opciones-nombres"), est = v.querySelector(".estrellas");
      Fotos.listar().then(lista => {
        if (lista.length < 2) { v.replaceWith(sinFotos(H, 2)); return; }
        let aciertos = 0, anterior = null;
        const nueva = () => {
          // Una foto distinta de la anterior y hasta 3 opciones con nombres distintos
          const posibles = lista.filter(f => f !== anterior);
          const meta = posibles[H.azar(posibles.length)]; anterior = meta;
          const otros = H.barajar(lista.filter(f => f.nombre.toLowerCase() !== meta.nombre.toLowerCase()))
            .filter((f, i, l) => l.findIndex(g => g.nombre.toLowerCase() === f.nombre.toLowerCase()) === i).slice(0, 2);
          img.src = urlDe(meta);
          ops.replaceChildren();
          let bloqueado = false;
          H.barajar([meta, ...otros]).forEach(f => {
            const b = H.h(`<button class="opcion opcion-nombre"></button>`);
            b.textContent = f.nombre;
            b.onclick = () => {
              if (bloqueado) return;
              if (f === meta) {
                bloqueado = true; b.classList.add("bien"); aciertos++;
                est.textContent = "⭐".repeat(((aciertos - 1) % 5) + 1);
                H.celebrar(aciertos % 5 === 0 ? "🏆" : "⭐");
                setTimeout(() => H.decir(meta.nombre), 1100);
                setTimeout(() => { if (v.isConnected) nueva(); }, 2600);
              } else {
                H.nota(220, .3, "triangle");
                b.classList.remove("mal"); void b.offsetWidth; b.classList.add("mal");
                H.decir(f.nombre);
              }
            };
            ops.appendChild(b);
          });
          setTimeout(() => H.decir("¿Quién es?"), 300);
        };
        v.querySelector(".btn-oir").onclick = () => H.decir("¿Quién es?");
        nueva();
      }).catch(() => v.replaceWith(sinFotos(H, 2)));
      return v;
    },
  });
})();
