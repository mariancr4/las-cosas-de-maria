# Las cosas de María 🌈

Web infantil sencilla (HTML, CSS y JavaScript, sin instalar nada) con juegos y vídeos para María.

## Qué hay dentro
- **Colores**: «¿Dónde está el rojo?» con voz.
- **Formas**: círculo, cuadrado, triángulo, estrella, corazón…
- **Parejas**: juego de memoria con animales (empieza con 4 parejas y sube hasta 6).
- **Contar**: ¿cuántos hay? Si falla, la web cuenta en voz alta con ella.
- **Pintar**: dibujo libre con el dedo.
- **Música**: piano de colores.
- **Vídeos**: los que pongas en `videos.js` (modo privacidad de YouTube).

## Añadir vídeos
Edita `videos.js` y añade líneas como:
```js
{ titulo: "Canción de los colores", id: "CODIGO_DEL_VIDEO", emoji: "🎨" },
```

## Poner el dibujo de María
Guarda la ilustración como `img/maria.png` (cuadrada, unos 500×500 px). Mientras no exista, se muestra 👧.

## Probarla en tu ordenador
Abre `index.html` con doble clic en el navegador.

## Publicar en GitHub y Vercel
1. En github.com crea un repositorio nuevo, por ejemplo `las-cosas-de-maria`.
2. Pulsa «uploading an existing file» y arrastra todos estos archivos y la carpeta `img`. Pulsa «Commit changes».
3. Entra en vercel.com con tu cuenta de GitHub → «Add New… → Project» → elige el repositorio → «Deploy» (no hace falta cambiar ninguna opción).
4. Vercel te da una dirección tipo `las-cosas-de-maria.vercel.app`. Cada vez que cambies algo en GitHub, se actualiza sola.
