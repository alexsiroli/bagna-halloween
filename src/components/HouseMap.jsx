import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BRICK, glyphSvg, isKind, KIND_LABELS, POINT_LABELS } from '../mapKinds.js';

// Bagnarola di Cesenatico: vista di ripiego finche' nessuna casa ha una posizione.
const CENTER = [44.2, 12.34];
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const round = (value) => Math.round(value * 1e6) / 1e6;

// Solo numeri e glifi fissi nell'HTML: niente testo dei partecipanti dentro innerHTML.
const pinHtml = (number, rank, kind) => {
  const ranked = rank !== undefined;
  const typed = isKind(kind); // il tipo entra nell'HTML solo se e' uno dei due noti
  return (
    `<span class="pin" data-ranked="${ranked}" data-podium="${ranked && rank < 3}" style="--order:${rank ?? 0}">` +
    `<span class="pin__plate"${typed ? ` data-t="${kind}"` : ''}>${typed ? glyphSvg(kind) : ''}<span>${Number(number)}</span></span>` +
    (ranked && rank < 3 ? `<span class="pin__rank">${rank + 1}°</span>` : '') +
    '</span>'
  );
};

const NO_SERVICES = { points: [], closedRoads: [] };

// Popup con nodi DOM e textContent: nome e indirizzo arrivano da un file, mai in una stringa HTML.
const popupNode = (point) => {
  const box = document.createElement('div');
  const name = document.createElement('strong');
  name.textContent = point.name;
  box.append(name);
  if (point.address) {
    const address = document.createElement('p');
    address.textContent = point.address;
    box.append(address);
  }
  return box;
};

/**
 * Mappa Leaflet con tessere OpenStreetMap.
 * - houses: case con lat/lng (number, title, lat, lng).
 * - ranking: numeri in ordine di classifica (se pubblicata): le prime tre portano il badge.
 * - services: { points, closedRoads } gia' validati da src/points.js (mappa pubblica).
 * - onSelect(house): tocco su un segnaposto (mappa pubblica).
 * - onPick({lat, lng}): modalita' admin, un tocco sulla mappa sceglie il punto; i segnaposto non sono toccabili.
 * - startAt: punti su cui il selettore si centra all'apertura (uno: zoom sulla casa; piu' di uno: li inquadra tutti).
 */
function HouseMap({ houses, ranking = null, services: servicesData = NO_SERVICES, onSelect, onPick, startAt = [], className = '' }) {
  const ref = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const servicesLayer = useRef(null);
  const fitted = useRef(false); // false | 'houses' | 'services': su cosa si e' inquadrato
  const placedCount = useRef(0);
  placedCount.current = houses.length;
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
    servicesLayer.current = L.layerGroup().addTo(instance);
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
      const kind = isKind(house.kind) ? `, ${KIND_LABELS[house.kind].toLowerCase()}` : '';
      const label = `Casa ${house.number}${house.title ? `, ${house.title}` : ''}${kind}${rank !== undefined ? `, ${rank + 1}° in classifica` : ''}`;
      const marker = L.marker([house.lat, house.lng], {
        icon: L.divIcon({ className: 'pin-wrap', html: pinHtml(house.number, rank, house.kind), iconSize: [44, 44] }),
        title: label,
        interactive: !picking,
        keyboard: !picking,
      }).addTo(layer.current);
      if (!picking) {
        marker.getElement().setAttribute('aria-label', `${label}: apri la scheda`);
        marker.on('click', () => handlers.current.onSelect?.(house));
      }
    });
    if (!picking && houses.length > 0 && fitted.current !== 'houses') {
      map.current.fitBounds(L.latLngBounds(houses.map((house) => [house.lat, house.lng])), { padding: [48, 48], maxZoom: 17 });
      fitted.current = 'houses';
    }
  }, [houses, ranking, picking]);

  // Punti di servizio e strade chiuse: non votabili, un tocco sul punto apre nome e indirizzo.
  useEffect(() => {
    servicesLayer.current.clearLayers();
    if (picking) return;
    const { points, closedRoads } = servicesData;
    closedRoads.forEach((road) => L.polyline(road.path, { color: BRICK, weight: 5, opacity: 0.9, interactive: false }).addTo(servicesLayer.current));
    points.forEach((point) => {
      const label = `${POINT_LABELS[point.type]}: ${point.name}`;
      const marker = L.marker([point.lat, point.lng], {
        icon: L.divIcon({
          className: 'pin-wrap',
          html: `<span class="chip chip--point" data-t="${point.type}">${glyphSvg(point.type)}</span>`,
          iconSize: [32, 32],
          popupAnchor: [0, -14],
        }),
        title: label,
      }).addTo(servicesLayer.current);
      marker.getElement().setAttribute('aria-label', label);
      marker.bindPopup(popupNode(point), { closeButton: false });
    });
    // Senza case sulla mappa si inquadrano punti e strade; con le case resta la vista sulle case.
    const coords = [...points.map((point) => [point.lat, point.lng]), ...closedRoads.flatMap((road) => road.path)];
    if (coords.length > 0 && placedCount.current === 0 && !fitted.current) {
      map.current.fitBounds(L.latLngBounds(coords), { padding: [48, 48], maxZoom: 17 });
      fitted.current = 'services';
    }
  }, [servicesData, picking]);

  return <div ref={ref} className={`house-map ${className}`} data-picking={picking} />;
}

export default HouseMap;
