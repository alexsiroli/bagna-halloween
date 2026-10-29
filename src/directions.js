// «Portami qui»: link di navigazione a piedi verso le coordinate. Solo lat, lng e modo: mai dati dell'utente.
// Apple Maps su iPhone e iPad (l'iPadOS si presenta come Mac con il touch), Google Maps sul resto.
export const isApple = ({ userAgent = '', platform = '', maxTouchPoints = 0 } = {}) =>
  /iPhone|iPad|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);

// null se le coordinate non sono numeri finiti: niente link rotto.
export const directionsUrl = ({ lat, lng }, nav = {}) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return isApple(nav)
    ? `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
};
