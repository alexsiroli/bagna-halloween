// Regole del punteggio, senza Firebase: le usano myVotes.js e i test.
export const MIN_SCORE = 6;

// Un voto vale da 6 in su (0 = voto tolto): il criterio di /vote e della mappa.
export const isVoted = (vote) => (vote?.score || 0) >= MIN_SCORE;

export const countVoted = (houses, votesMap) => houses.reduce((count, house) => count + (isVoted(votesMap.get(house.number)) ? 1 : 0), 0);

// 0 toglie il voto; il resto sta tra 6 e 10; un valore non numerico vale 0.
export const clampScore = (score) => {
  const parsed = Number(score);
  const sanitized = Number.isFinite(parsed) ? parsed : 0;
  return sanitized <= 0 ? 0 : Math.min(10, Math.max(MIN_SCORE, sanitized));
};
