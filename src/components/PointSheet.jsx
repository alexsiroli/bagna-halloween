import DirectionsLink from './DirectionsLink.jsx';
import { Chip } from './MapGlyph.jsx';
import Sheet from './Sheet.jsx';
import { POINT_LABELS } from '../mapKinds.js';

// Scheda di un punto non-casa (bar, bagno, parcheggio…): tipo, nome, indirizzo e «Portami qui».
// Nome e indirizzo arrivano da un file: solo testo React, mai HTML. point = null: chiusa.
function PointSheet({ point, onClose }) {
  return (
    <Sheet open={Boolean(point)} onClose={onClose} labelledBy="point-dialog-title" className="vote-dialog">
      {point && (
        <div className="map-dialog">
          <div className="vote-dialog-header">
            <Chip t={point.type} />
            <div className="vote-dialog-headings">
              <p className="map-dialog__address">{POINT_LABELS[point.type]}</p>
              <h2 id="point-dialog-title" className="vote-dialog-house-title">
                {point.name}
              </h2>
            </div>
          </div>
          {point.address && <p className="map-dialog__address">{point.address}</p>}
          <DirectionsLink place={point} />
          <div className="dialog-actions dialog-actions--single">
            <button type="button" className="secondary-btn" onClick={onClose}>
              Chiudi
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

export default PointSheet;
