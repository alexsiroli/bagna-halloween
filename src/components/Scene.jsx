import Skyline, { LAMPADINE, LUCI } from './Skyline.jsx';

// Il quartiere con i livelli HTML sopra lo Skyline (Home e Contest): candele nelle zucche grandi, nebbia,
// aloni che respirano sulle finestre accese e sulle lampadine. Tutto solo opacity/transform, l'SVG resta fermo.
// Coordinate in cqw: la scena e' tagliata sulla larghezza e allineata in basso (vedi .luce in halloween.css).
function Scene({ className }) {
  return (
    <div className={className}>
      <Skyline />
      <span className="fiamma" style={{ '--x': 19.2 }} aria-hidden="true" />
      <span className="fiamma" style={{ '--x': 70.8, '--d': '4.1s' }} aria-hidden="true" />
      {LUCI.map(([x, y], index) => (
        <span
          key={`${x}-${y}`}
          className="luce"
          style={{ '--x': x, '--y': y, '--d': `${3.2 + (index % 4) * 0.9}s`, '--w': `${2.4 + (index % 5) * 0.7}s` }}
          aria-hidden="true"
        />
      ))}
      {LAMPADINE.map(([x, y], index) => (
        <span
          key={`l${index}`}
          className="luce luce--lampadina"
          style={{ '--x': x, '--y': y, '--i': index, '--d': `${2.6 + (index % 3) * 0.8}s`, '--w': `${2.6 + (index % 6) * 0.45}s` }}
          aria-hidden="true"
        />
      ))}
      <span className="banco-nebbia" aria-hidden="true" />
    </div>
  );
}

export default Scene;
