import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Bagnarola di Cesenatico: vista di ripiego finche' nessuna casa ha una posizione.
const CENTER = [44.2, 12.34];
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const round = (value) => Math.round(value * 1e6) / 1e6;

// Solo numeri nell'HTML: niente testo dei partecipanti dentro innerHTML.
const pinHtml = (number, rank) => {
  const ranked = rank !== undefined;
  return (
    `<span class="pin" data-ranked="${ranked}" data-podium="${ranked && rank < 3}" style="--order:${rank ?? 0}">` +
    `<span class="pin__plate">${Number(number)}</span>` +
    (ranked && rank < 3 ? `<span class="pin__rank">${rank + 1}°</span>` : '') +
    '</span>'
  );
};

/**
 * Mappa Leaflet con tessere OpenStreetMap.
 * - houses: case con lat/lng (number, title, lat, lng).
 * - ranking: numeri in ordine di classifica (se pubblicata): le prime tre portano il badge.
 * - onSelect(house): tocco su un segnaposto (mappa pubblica).
 * - onPick({lat, lng}): modalita' admin, un tocco sulla mappa sceglie il punto; i segnaposto non sono toccabili.
 * - startAt: punti su cui il selettore si centra all'apertura (uno: zoom sulla casa; piu' di uno: li inquadra tutti).
 */
function HouseMap({ houses, ranking = null, onSelect, onPick, startAt = [], className = '' }) {
  const ref = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const fitted = useRef(false);
  const handlers = useRef({});
  handlers.current = { onSelect, onPick };
  const picking = Boolean(onPick);
  const [start] = useState(startAt); // letto una volta: scrivere nei campi non deve spostare la mappa

  useEffect(() => {
    const instance = L.map(ref.current, {
      center: CENTER,
      zoom: 15,
      scrollWheelZoom: false, // sul desktop la rotella deve scorrere la pagina
    });
    L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(instance);
    instance.on('click', (event) => handlers.current.onPick?.({ lat: round(event.latlng.lat), lng: round(event.latlng.lng) }));
    // Dentro il dialog la mappa nasce con dimensione zero: si ricalcola e solo allora si inquadra la vista iniziale.
    let framed = !picking || start.length === 0;
    const resize = new ResizeObserver(() => {
      instance.invalidateSize();
      if (framed || !ref.current.clientWidth) return;
      framed = true;
      instance.fitBounds(L.latLngBounds(start.map((house) => [house.lat, house.lng])), { padding: [48, 48], maxZoom: 17 });
    });
    resize.observe(ref.current);
    map.current = instance;
    layer.current = L.layerGroup().addTo(instance);
    fitted.current = false;
    return () => {
      resize.disconnect();
      instance.remove();
    };
  }, [start, picking]);

  useEffect(() => {
    layer.current.clearLayers();
    const rankOf = new Map((ranking ?? []).map((number, index) => [number, index]));
    houses.forEach((house) => {
      const rank = rankOf.get(house.number);
      const label = `Casa ${house.number}${house.title ? `, ${house.title}` : ''}${rank !== undefined ? `, ${rank + 1}° in classifica` : ''}`;
      const marker = L.marker([house.lat, house.lng], {
        icon: L.divIcon({ className: 'pin-wrap', html: pinHtml(house.number, rank), iconSize: [44, 44] }),
        title: label,
        interactive: !picking,
        keyboard: !picking,
      }).addTo(layer.current);
      if (!picking) {
        marker.getElement().setAttribute('aria-label', `${label}: apri la scheda`);
        marker.on('click', () => handlers.current.onSelect?.(house));
      }
    });
    if (!picking && houses.length > 0 && !fitted.current) {
      map.current.fitBounds(L.latLngBounds(houses.map((house) => [house.lat, house.lng])), { padding: [48, 48], maxZoom: 17 });
      fitted.current = true;
    }
  }, [houses, ranking, picking]);

  return <div ref={ref} className={`house-map ${className}`} data-picking={picking} />;
}

export default HouseMap;
