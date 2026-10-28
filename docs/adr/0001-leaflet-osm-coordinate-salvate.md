# ADR-0001: Mappa con Leaflet e tessere OpenStreetMap, coordinate salvate nella casa

**Data**: 2026-10-28
**Stato**: accettata
**Decisori**: Marco (tech-lead), su brief di Giulia (chief-of-staff) per l'edizione 2026

## Contesto

La mappa delle case era un'immagine illustrata con le case posizionate a mano in percentuale
(`x`, `y`) dall'admin. Per il 2026 l'immagine non c'è e il CEO manda l'elenco delle case con via e
civico la sera del 28/10; il sito va online il 31/10. Serve una mappa vera, toccabile dal telefono,
che porti alla votazione di ogni casa, senza costi e senza account nuovi.

## Decisione

Usiamo `leaflet` (senza wrapper React) con le tessere standard di OpenStreetMap. Ogni casa salva
`street`, `civic`, `lat`, `lng` nel suo documento: le coordinate si ricavano una volta sola
(script di geocodifica su Nominatim, poi controllo e ritocco dall'admin toccando la mappa), mai a
ogni visita.

## Alternative considerate

### Google Maps / Mapbox
- **Pro**: geocodifica integrata, tessere curate.
- **Contro**: chiave API, account di fatturazione, cookie e un altro fornitore nell'informativa.
- **Perché no**: a tre giorni dall'evento non vale un account a pagamento e un cancello del CEO.

### Geocodifica nel browser a ogni visita
- **Pro**: nessuno script da lanciare.
- **Contro**: richieste a Nominatim da ogni visitatore (vietato dalla loro policy), lento, posizioni
  che cambiano da sole.
- **Perché no**: le coordinate sono dati della casa, si controllano una volta.

### Tenere l'immagine illustrata con `x`, `y`
- **Pro**: nessuna dipendenza nuova, effetto torcia.
- **Contro**: serve un'illustrazione che non c'è e il posizionamento a mano di ogni casa.
- **Perché no**: non arriva in tempo per sabato.

## Conseguenze

### Positive
- La mappa nasce dagli indirizzi; correggere una posizione è un tocco nell'admin.
- Nessuna chiave, nessun costo, nessun cookie di terzi.

### Negative
- Un fornitore in più nell'informativa (OpenStreetMap Foundation vede l'IP di chi apre la mappa).
- Si perde l'effetto torcia e l'illustrazione notturna; resta solo una tinta scura delle tessere.

### Rischi
- Policy d'uso delle tessere OSM: traffico di un evento di quartiere, accettabile; se crescesse,
  passare a un fornitore di tessere con chiave.
- Nominatim può non trovare i civici di Bagnarola: le case restano senza posizione (elencate sotto
  la mappa) finché l'admin non le posiziona a mano.
