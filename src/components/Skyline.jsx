// Il quartiere di notte: case di paese con le finestre che si accendono e le luminarie della festa.
// Illustrazione geometrica, generata da questi numeri.
const GROUND = 250;
const HOUSES = [
  { x: 6, w: 62, h: 96, roof: 26 },
  { x: 72, w: 78, h: 132, roof: 30, chimney: 58 },
  { x: 154, w: 58, h: 84, roof: 24, pumpkin: true },
  { x: 216, w: 86, h: 150, roof: 32, chimney: 20 },
  { x: 306, w: 60, h: 104, roof: 26, pumpkin: true },
  { x: 370, w: 72, h: 122, roof: 28, chimney: 50 },
];

// Finestre in griglia; qualcuna resta spenta, come in ogni via vera.
function windowsOf({ x, w, h }, houseIndex) {
  const cols = w > 70 ? 3 : 2;
  const rows = h > 115 ? 3 : 2;
  const gapX = w / (cols + 1);
  const list = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const seed = (houseIndex * 7 + row * 3 + col * 5) % 9;
      list.push({
        x: x + gapX * (col + 1) - 5,
        y: GROUND - h + 16 + row * 30,
        lit: seed !== 0 && seed !== 4,
        order: (seed * 5 + houseIndex * 3) % 17,
      });
    }
  }
  return list;
}

// Filo di lampadine lungo una curva quadratica.
const BULBS = Array.from({ length: 15 }, (_, index) => {
  const t = index / 14;
  const [x0, y0, cx, cy, x1, y1] = [-6, 34, 224, 112, 454, 22];
  return {
    x: (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1,
    y: (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1 + 7,
  };
});

function Skyline() {
  return (
    <svg className="skyline" viewBox="0 0 448 262" aria-hidden="true" focusable="false">
      <path className="skyline__wire" d="M-6 34 Q224 112 454 22" />
      {BULBS.map((bulb, index) => (
        <g key={index} className="skyline__bulb" style={{ '--i': index }}>
          <path d={`M${bulb.x} ${bulb.y - 7}v4`} />
          <circle cx={bulb.x} cy={bulb.y + 2} r="4.2" />
        </g>
      ))}

      {HOUSES.map((house, houseIndex) => {
        const top = GROUND - house.h;
        return (
          <g key={house.x} className="skyline__house">
            {house.chimney && (
              <rect x={house.x + house.chimney} y={top - house.roof + 2} width="10" height={house.roof} />
            )}
            <path
              d={`M${house.x - 4} ${top + 1}L${house.x + house.w / 2} ${top - house.roof}L${house.x + house.w + 4} ${top + 1}Z`}
              className="skyline__roof"
            />
            <rect x={house.x} y={top} width={house.w} height={house.h} />
            <rect className="skyline__door" x={house.x + house.w / 2 - 7} y={GROUND - 24} width="14" height="24" rx="7" />
            {windowsOf(house, houseIndex).map((win) => (
              <rect
                key={`${win.x}-${win.y}`}
                className="skyline__window"
                data-lit={win.lit}
                style={{ '--i': win.order }}
                x={win.x}
                y={win.y}
                width="10"
                height="14"
                rx="1.5"
              />
            ))}
            {house.pumpkin && (
              <g className="skyline__pumpkin" transform={`translate(${house.x + house.w / 2 + 14} ${GROUND - 9})`}>
                <ellipse rx="7" ry="6" />
                <path d="M-2 -3.5l1.6 -2.2 1.6 2.2zM1.4 -3.5l1.6 -2.2 1.6 2.2zM-3.6 0.5c1.8 2.6 5.4 2.6 7.2 0z" />
              </g>
            )}
          </g>
        );
      })}
      <rect className="skyline__ground" x="0" y={GROUND} width="448" height="12" />
    </svg>
  );
}

export default Skyline;
