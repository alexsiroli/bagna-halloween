import { MapPinIcon } from '@phosphor-icons/react';
import { directionsUrl } from '../directions.js';

// «Portami qui»: apre le mappe del telefono in una nuova scheda. Niente link senza coordinate valide.
function DirectionsLink({ place }) {
  const href = directionsUrl(place, navigator);
  if (!href) return null;
  return (
    <a className="secondary-btn dialog-link" href={href} target="_blank" rel="noopener noreferrer">
      <MapPinIcon aria-hidden="true" weight="bold" /> Portami qui
    </a>
  );
}

export default DirectionsLink;
