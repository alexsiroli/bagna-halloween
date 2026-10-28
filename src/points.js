import { useEffect, useState } from 'react';

// Punti di servizio e strade chiuse di un'edizione: public/punti/<edizione>.json (lo scrive scripts/points-file.mjs).
// Un solo punto di lettura e validazione: tutto cio' che e' malformato si scarta, la mappa non si rompe mai.
export const POINT_TYPES = ['bar', 'food', 'wc', 'parcheggio', 'intrattenimento'];
const EMPTY = { note: '', points: [], closedRoads: [] };

const isCoord = (lat, lng) =>
  typeof lat === 'number' && typeof lng === 'number' && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
const text = (value) => (typeof value === 'string' ? value.trim() : '');
const list = (value) => (Array.isArray(value) ? value : []);

export function parsePoints(data) {
  if (!data || typeof data !== 'object') return EMPTY;
  const points = list(data.points).flatMap((item) => {
    const name = text(item?.name);
    if (!POINT_TYPES.includes(item?.type) || !name || !isCoord(item.lat, item.lng)) return [];
    const address = text(item.address);
    return [{ type: item.type, name, ...(address ? { address } : {}), lat: item.lat, lng: item.lng }];
  });
  const closedRoads = list(data.closedRoads).flatMap((item) => {
    const name = text(item?.name);
    const path = list(item?.path);
    const valid = path.length >= 2 && path.every((pair) => Array.isArray(pair) && pair.length === 2 && isCoord(pair[0], pair[1]));
    return name && valid ? [{ name, path: path.map(([lat, lng]) => [lat, lng]) }] : [];
  });
  return { note: text(data.note), points, closedRoads };
}

// File assente (404), HTML del redirect SPA, JSON non valido o rete assente: nessun punto.
export async function loadPoints(edition, fetchFn = fetch) {
  try {
    const response = await fetchFn(`/punti/${edition}.json`);
    if (!response.ok) return EMPTY;
    return parsePoints(await response.json());
  } catch (err) {
    console.warn('File dei punti non leggibile, la mappa resta senza punti.', err);
    return EMPTY;
  }
}

export function usePoints(edition) {
  const [state, setState] = useState(EMPTY);
  useEffect(() => {
    let cancelled = false;
    loadPoints(edition).then((loaded) => !cancelled && setState(loaded));
    return () => {
      cancelled = true;
    };
  }, [edition]);
  return state;
}
