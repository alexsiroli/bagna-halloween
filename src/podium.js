// Calcolo della top 3 di un'edizione (puro, testato in tests/podium.test.mjs).

// I documenti creati prima del campo `edition` sono del 2025 (come scripts/export-edition.mjs).
export const editionOf = (doc) => doc.edition ?? 2025;

// houses e votes sono gia' filtrati sull'edizione. Conta solo chi ha voti >= 6 su case esistenti.
// Ordine: media piu' alta, poi piu' voti, poi numero piu' basso.
export function topThree(houses, votes) {
  const titles = new Map(houses.map((house) => [house.number, house.title || '']));
  const sums = new Map();
  for (const vote of votes) {
    const score = Number(vote.score) || 0;
    if (score < 6 || !titles.has(vote.houseNumber)) continue;
    const entry = sums.get(vote.houseNumber) ?? { sum: 0, votes: 0 };
    sums.set(vote.houseNumber, { sum: entry.sum + score, votes: entry.votes + 1 });
  }
  return [...sums.entries()]
    .map(([number, { sum, votes: count }]) => ({ number, title: titles.get(number), avg: sum / count, votes: count }))
    .sort((a, b) => b.avg - a.avg || b.votes - a.votes || a.number - b.number)
    .slice(0, 3);
}

// Classifica provvisoria dell'admin. Righe { houseNumber, scoreAverage, count }.
// Per media: case con voti prima (anche in asc), poi media, poi piu' voti, poi numero piu' basso.
export function sortStats(rows, { field, direction }) {
  const sign = direction === 'asc' ? 1 : -1;
  if (field !== 'scoreAverage') return [...rows].sort((a, b) => sign * (a[field] - b[field]) || a.houseNumber - b.houseNumber);
  return [...rows].sort(
    (a, b) => (b.count > 0) - (a.count > 0) || -sign * (b.scoreAverage - a.scoreAverage) || b.count - a.count || a.houseNumber - b.houseNumber,
  );
}

// houseNumber -> posizione (1, 2, ...) secondo la media; le case senza voti non hanno posizione.
export const positions = (rows) =>
  new Map(sortStats(rows.filter((r) => r.count > 0), { field: 'scoreAverage', direction: 'desc' }).map((r, i) => [r.houseNumber, i + 1]));
