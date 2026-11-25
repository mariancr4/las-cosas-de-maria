/*
  DIBUJOS PARA COLOREAR
  Cada dibujo es un SVG de 200×200. Las zonas que se pueden pintar llevan class="z".
  Las líneas que no se pintan (ojos, bigotes...) llevan class="l".
*/
window.DIBUJOS_MARIA = [
  {
    id: "perrito", nombre: "Perrito", ico: "🐶",
    svg: `
      <ellipse class="z" cx="52" cy="82" rx="22" ry="40" transform="rotate(20 52 82)"/>
      <ellipse class="z" cx="148" cy="82" rx="22" ry="40" transform="rotate(-20 148 82)"/>
      <circle class="z" cx="100" cy="105" r="62"/>
      <ellipse class="z" cx="100" cy="135" rx="34" ry="26"/>
      <circle class="z" cx="76" cy="95" r="12"/>
      <circle class="z" cx="124" cy="95" r="12"/>
      <circle cx="76" cy="95" r="5" fill="#2f2147"/>
      <circle cx="124" cy="95" r="5" fill="#2f2147"/>
      <ellipse class="z" cx="100" cy="122" rx="12" ry="9"/>
      <path class="l" d="M100 131 v10 M100 141 q-12 10 -20 0 M100 141 q12 10 20 0"/>
      <path class="z" d="M92 150 q8 18 16 0 z"/>`,
  },
  {
    id: "gatito", nombre: "Gatito", ico: "🐱",
    svg: `
      <path class="z" d="M48 70 L58 22 L88 52 Z"/>
      <path class="z" d="M152 70 L142 22 L112 52 Z"/>
      <ellipse class="z" cx="100" cy="100" rx="62" ry="56"/>
      <ellipse class="z" cx="78" cy="92" rx="11" ry="14"/>
      <ellipse class="z" cx="122" cy="92" rx="11" ry="14"/>
      <circle cx="80" cy="95" r="5" fill="#2f2147"/>
      <circle cx="124" cy="95" r="5" fill="#2f2147"/>
      <path class="z" d="M92 112 h16 l-8 9 z"/>
      <path class="l" d="M100 121 q-8 10 -16 4 M100 121 q8 10 16 4 M60 112 h-30 M60 120 l-28 8 M140 112 h30 M140 120 l28 8"/>
      <ellipse class="z" cx="100" cy="176" rx="40" ry="16"/>`,
  },
  {
    id: "casa", nombre: "Casita", ico: "🏠",
    svg: `
      <rect class="z" x="0" y="160" width="200" height="40"/>
      <circle class="z" cx="166" cy="34" r="20"/>
      <path class="l" d="M166 6 v6 M166 56 v6 M136 34 h6 M190 34 h6 M145 13 l4 4 M183 51 l4 4 M187 13 l-4 4 M149 51 l-4 4"/>
      <rect class="z" x="40" y="90" width="110" height="74"/>
      <path class="z" d="M30 94 L95 40 L160 94 Z"/>
      <rect class="z" x="118" y="46" width="16" height="30"/>
      <rect class="z" x="82" y="118" width="28" height="46" rx="4"/>
      <circle cx="104" cy="142" r="2.5" fill="#2f2147"/>
      <rect class="z" x="52" y="104" width="22" height="22"/>
      <rect class="z" x="122" y="104" width="22" height="22"/>
      <path class="l" d="M63 104 v22 M52 115 h22 M133 104 v22 M122 115 h22"/>`,
  },
  {
    id: "arcoiris", nombre: "Arcoíris", ico: "🌈",
    svg: `
      <path class="z" d="M10 150 A90 90 0 0 1 190 150 L176 150 A76 76 0 0 0 24 150 Z"/>
      <path class="z" d="M24 150 A76 76 0 0 1 176 150 L162 150 A62 62 0 0 0 38 150 Z"/>
      <path class="z" d="M38 150 A62 62 0 0 1 162 150 L148 150 A48 48 0 0 0 52 150 Z"/>
      <path class="z" d="M52 150 A48 48 0 0 1 148 150 L134 150 A34 34 0 0 0 66 150 Z"/>
      <path class="z" d="M6 160 q-2 -22 20 -22 q6 -16 24 -8 q14 -4 18 12 q14 2 10 18 z"/>
      <path class="z" d="M122 160 q-2 -22 20 -22 q6 -16 24 -8 q14 -4 18 12 q14 2 10 18 z"/>`,
  },
  {
    id: "pez", nombre: "Pez", ico: "🐟",
    svg: `
      <path class="z" d="M140 100 L186 64 L178 100 L186 136 Z"/>
      <ellipse class="z" cx="92" cy="100" rx="66" ry="46"/>
      <path class="z" d="M70 56 Q96 24 124 60 Z"/>
      <path class="z" d="M86 144 Q100 168 116 142 Z"/>
      <path class="z" d="M94 56 Q76 100 94 144 Q112 100 94 56 Z"/>
      <circle class="z" cx="54" cy="88" r="12"/>
      <circle cx="51" cy="88" r="5" fill="#2f2147"/>
      <path class="l" d="M30 112 q10 8 20 2"/>
      <circle class="z" cx="20" cy="56" r="7"/>
      <circle class="z" cx="34" cy="30" r="10"/>`,
  },
  {
    id: "mariposa", nombre: "Mariposa", ico: "🦋",
    svg: `
      <path class="z" d="M96 96 C60 30 10 40 22 84 C30 110 70 108 96 100 Z"/>
      <path class="z" d="M104 96 C140 30 190 40 178 84 C170 110 130 108 104 100 Z"/>
      <path class="z" d="M96 104 C60 110 30 150 52 168 C72 180 92 140 96 112 Z"/>
      <path class="z" d="M104 104 C140 110 170 150 148 168 C128 180 108 140 104 112 Z"/>
      <circle class="z" cx="56" cy="74" r="12"/>
      <circle class="z" cx="144" cy="74" r="12"/>
      <circle class="z" cx="64" cy="146" r="9"/>
      <circle class="z" cx="136" cy="146" r="9"/>
      <ellipse class="z" cx="100" cy="112" rx="9" ry="44"/>
      <circle class="z" cx="100" cy="62" r="12"/>
      <path class="l" d="M96 52 Q86 30 76 28 M104 52 Q114 30 124 28"/>`,
  },
  {
    id: "flor", nombre: "Flor", ico: "🌸",
    svg: `
      <rect class="z" x="0" y="176" width="200" height="24"/>
      <path class="z" d="M96 110 h8 v68 h-8 z"/>
      <path class="z" d="M100 150 C120 126 150 130 150 130 C140 152 120 158 100 156 Z"/>
      <path class="z" d="M100 160 C80 136 50 140 50 140 C60 162 80 168 100 166 Z"/>
      <circle class="z" cx="100" cy="40" r="24"/>
      <circle class="z" cx="140" cy="68" r="24"/>
      <circle class="z" cx="126" cy="112" r="24"/>
      <circle class="z" cx="74" cy="112" r="24"/>
      <circle class="z" cx="60" cy="68" r="24"/>
      <circle class="z" cx="100" cy="80" r="26"/>
      <circle cx="92" cy="76" r="3" fill="#2f2147"/>
      <circle cx="108" cy="76" r="3" fill="#2f2147"/>
      <path class="l" d="M90 88 q10 8 20 0"/>`,
  },
  {
    id: "coche", nombre: "Coche", ico: "🚗",
    svg: `
      <rect class="z" x="0" y="160" width="200" height="40"/>
      <path class="z" d="M20 140 V108 Q20 98 32 96 L60 92 L82 60 Q86 54 96 54 H138 Q148 54 154 62 L172 92 Q184 94 184 108 V140 Z"/>
      <path class="z" d="M88 66 H116 V92 H70 Z"/>
      <path class="z" d="M124 66 H146 L160 92 H124 Z"/>
      <rect class="z" x="170" y="104" width="14" height="12" rx="3"/>
      <circle class="z" cx="58" cy="144" r="22"/>
      <circle class="z" cx="146" cy="144" r="22"/>
      <circle class="z" cx="58" cy="144" r="9"/>
      <circle class="z" cx="146" cy="144" r="9"/>
      <path class="l" d="M120 96 V136 M104 108 h10"/>`,
  },
];
