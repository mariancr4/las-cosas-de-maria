/*
  VÍDEOS DE MARÍA
  ----------------
  Para añadir un vídeo de YouTube:
  1. Abre el vídeo en YouTube y copia su dirección, por ejemplo:
       https://www.youtube.com/watch?v=AbCdEf12345
  2. El código es lo que va después de "v=" (aquí: AbCdEf12345).
     En enlaces cortos (https://youtu.be/AbCdEf12345) es lo que va tras la barra.
  3. Añade una línea como esta dentro de la lista:
       { titulo: "Canción de los colores", id: "AbCdEf12345", emoji: "🎨" },

  Los vídeos se ven con youtube-nocookie.com (modo de privacidad mejorada)
  y sin recomendaciones de otros canales al terminar.
*/
window.VIDEOS_MARIA = [
  // Vídeos de Bluey en español (canal oficial «Bluey - Español», youtube.com/@BlueyEspanol)
  { titulo: "Episodios de Bluey", id: "6sLHsFToPCQ", emoji: "💙" },
  { titulo: "Más episodios de Bluey", id: "Cbdd2FUQCB4", emoji: "✨" },
  { titulo: "Tiempo de piscina", id: "wnsZ7_WHB_s", emoji: "☀️" },
  { titulo: "Pasar el paquete", id: "HUQqmdnHKXc", emoji: "📦" },
  { titulo: "Momentos encantadores", id: "orBygrdo4Sw", emoji: "🧡" },
  { titulo: "Muffin no quiere compartir", id: "XY1fO-slkVA", emoji: "😠" },
  { titulo: "Bluey aprende sobre el mundo", id: "lwS2eVhekz0", emoji: "🌎" },
  { titulo: "La carrera de Bluey de bebé", id: "5uu6t21vR4I", emoji: "🏁" },
  // { titulo: "Ejemplo", id: "CODIGO_DEL_VIDEO", emoji: "🐶" },
];

// Dirección de la conexión con la hoja de Google (vídeos y ajustes de la zona para mayores).
// Si está vacía, se usa la lista de arriba.
window.HOJA_VIDEOS = "https://script.google.com/macros/s/AKfycbzp9kZ5-dVvOY5Cl1WinXqD227pYovhwAbko-2pUCiqQr2J1BzSsAO4ekVA9Gb1BbxS/exec";
