import { Link } from 'react-router-dom';
import { houseAddress } from '../data.js';
import { KindTag } from './MapGlyph.jsx';

// Riga di una casa sotto la mappa: targa, titolo, indirizzo, tipo e Vota.
function HouseRow({ house }) {
  return (
    <li className="house-row">
      <span className="plate" aria-hidden="true">
        {house.number}
      </span>
      <div className="house-row__text">
        <h3>
          Casa {house.number}: {house.title || 'Senza titolo'}
        </h3>
        {houseAddress(house) && <p>{houseAddress(house)}</p>}
        <KindTag kind={house.kind} />
      </div>
      <Link className="primary-btn" to={`/vota/${house.number}`} aria-label={`Vota la casa ${house.number}`}>
        Vota
      </Link>
    </li>
  );
}

export default HouseRow;
