import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { glyphSvg, isKind, KIND_LABELS, POINT_LABELS } from '../mapKinds.js';

// Bagnarola di Cesenatico: vista di ripiego finche' nessuna casa ha una posizione.
const CENTER = [44.2, 12.34];
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const round = (value) => Math.round(value * 1e6) / 1e6;

// Solo numeri e glifi fissi nell'HTML: niente testo dei partecipanti dentro innerHTML.
// Un solo segnaposto per casa: cerchietto col numero (acceso se l'hai votata) e, se c'e', il glifo del tipo attaccato in basso a destra.
const pinHtml = (number, rank, kind, voted) => {
  const ranked = rank !== undefined;
  return (
    `<span class="pin" data-ranked="${ranked}" data-podium="${ranked && rank < 3}" style="--order:${rank ?? 0}">` +
    `<span class="pin__disc" data-lit="${Boolean(voted)}">${Number(number)}</span>` +
    (isKind(kind) ? `<span class="chip pin__tipo" data-t="${kind}">${glyphSvg(kind)}</span>` : '') +
    (ranked && rank < 3 ? `<span class="pin__rank">${rank + 1}°</span>` : '') +
    '</span>'
  );
};

const NO_SERVICES = { points: [], closedRoads: [] };

// Inquadra solo le case, con poco margine: strade chiuse e servizi possono restare fuori vista.
const fitHouses = (map, group) => {
  const coords = group.getLayers().map((marker) => marker.getLatLng());
  if (coords.length > 0) map.fitBounds(L.latLngBounds(coords), { padding: [24, 24], maxZoom: 18 });
};

/**
 * Mappa Leaflet con tessere OpenStreetMap.
 * - houses: case con lat/lng (number, title, lat, lng).
 * - votes: Map numero -> voto delle case votate da chi e' dentro; null = nessun accesso, nessuno stato.
 * - ranking: numeri in ordine di classifica (se pubblicata): le prime tre portano il badge.
 * - services: { points, closedRoads } gia' validati da src/points.js (mappa pubblica).
 * - onSelect(house): tocco su un segnaposto (mappa pubblica).
 * - onSelectPoint(point): tocco su un punto di servizio (mappa pubblica).
 * - onPick({lat, lng}): modalita' admin, un tocco sulla mappa sceglie il punto; i segnaposto non sono toccabili.
 * - startAt: punti su cui il selettore si centra all'apertura (uno: zoom sulla casa; piu' di uno: li inquadra tutti).
 */
function HouseMap({ houses, votes = null, ranking = null, services: servicesData = NO_SERVICES, onSelect, onSelectPoint, onPick, startAt = [], className = '' }) {
  const ref = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const servicesLayer = useRef(null);
  // Si inquadra una volta sola, al primo arrivo delle case: poi la vista resta di chi la usa (anche quando arrivano i servizi).
  const fitted = useRef(false);
  const handlers = useRef({});
  handlers.current = { onSelect, onSelectPoint, onPick };
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
    // Finche' nessuno tocca la mappa, un cambio di misura (la legenda che si allunga) la reinquadra sulle case: nessuna casa resta tagliata.
    const el = ref.current;
    let touched = false;
    const touch = () => {
      touched = true;
    };
    el.addEventListener('pointerdown', touch);
    el.addEventListener('keydown', touch);
    const resize = new ResizeObserver(() => {
      instance.invalidateSize();
      if (!picking && fitted.current && !touched) fitHouses(instance, layer.current);
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
      el.removeEventListener('pointerdown', touch);
      el.removeEventListener('keydown', touch);
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
      const score = votes?.get(house.number);
      const state = votes ? (score ? `, votata ${score} su 10` : ', da votare') : '';
      const label = `Casa ${house.number}${house.title ? `, ${house.title}` : ''}${kind}${rank !== undefined ? `, ${rank + 1}° in classifica` : ''}${state}`;
      const marker = L.marker([house.lat, house.lng], {
        icon: L.divIcon({ className: 'pin-wrap', html: pinHtml(house.number, rank, house.kind, Boolean(score)), iconSize: [44, 44] }),
        title: label,
        zIndexOffset: 1000, // le case sopra i punti di servizio: con le coordinate 2026 la casa 3 sta sotto un food truck
        interactive: !picking,
        keyboard: !picking,
      }).addTo(layer.current);
      if (!picking) {
        marker.getElement().setAttribute('aria-label', `${label}: apri la scheda`);
        marker.on('click', () => handlers.current.onSelect?.(house));
      }
    });
    if (!picking && houses.length > 0 && !fitted.current) {
      fitHouses(map.current, layer.current);
      fitted.current = true;
    }
  }, [houses, votes, ranking, picking]);

  // Punti di servizio e strade chiuse: non votabili, un tocco sul punto chiama onSelectPoint (la scheda sta in MapPage).
  useEffect(() => {
    servicesLayer.current.clearLayers();
    if (picking) return;
    const { points, closedRoads } = servicesData;
    closedRoads.forEach((road) => L.polyline(road.path, { className: 'road-closed', weight: 6, opacity: 1, interactive: false }).addTo(servicesLayer.current));
    points.forEach((point) => {
      const label = `${POINT_LABELS[point.type]}: ${point.name}`;
      const marker = L.marker([point.lat, point.lng], {
        icon: L.divIcon({
          className: 'pin-wrap',
          html: `<span class="chip chip--point" data-t="${point.type}">${glyphSvg(point.type)}</span>`,
          iconSize: point.type === 'radio' ? [56, 56] : [44, 44], // area da toccare 44px, il cerchio resta piu' piccolo
        }),
        title: label,
        zIndexOffset: point.type === 'radio' ? 2000 : 0, // sopra case (1000) e punti
      }).addTo(servicesLayer.current);
      marker.getElement().setAttribute('aria-label', label);
      marker.on('click', () => handlers.current.onSelectPoint?.(point));
    });
  }, [servicesData, picking]);

  return <div ref={ref} className={`house-map ${className}`} data-picking={picking} />;
}

export default HouseMap;
