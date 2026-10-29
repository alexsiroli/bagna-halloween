// Orario di fine votazione: sempre ora di Roma, qualunque sia il fuso del browser.
const ZONE = 'Europe/Rome';
const FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const romeParts = (date) => Object.fromEntries(FORMAT.formatToParts(date).map((p) => [p.type, p.value]));

// Differenza (ms) tra l'ora di Roma letta come se fosse UTC e l'istante vero.
const offset = (ms) => {
  const p = romeParts(new Date(ms));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(ms / 60000) * 60000;
};

// "YYYY-MM-DDTHH:mm" (valore di datetime-local) -> Date, oppure null.
// shortcut: all'ora ripetuta del cambio d'ora vale la seconda (ora solare), nel buco di marzo si scivola avanti; ok per una votazione di sera.
export function romeToDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value ?? '');
  if (!m) return null;
  const wall = Date.UTC(m[1], m[2] - 1, m[3], m[4], m[5]);
  return new Date(wall - offset(wall - offset(wall)));
}

// Date -> "YYYY-MM-DDTHH:mm" in ora di Roma.
export function dateToRome(date) {
  const p = romeParts(date);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

// «HH:MM», oppure «gg/mm HH:MM» se non e oggi (a Roma).
export function formatEnd(date, now = new Date()) {
  const [day, time] = dateToRome(date).split('T');
  const [, month, d] = day.split('-');
  return day === dateToRome(now).split('T')[0] ? time : `${d}/${month} ${time}`;
}
