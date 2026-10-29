---
autore: Chiara (product-manager)
data: 2026-10-29
ticket: "#41, #42, #43"
stato: approvata dal CEO il 2026-10-29 (risposte predefinite D1-D5)
rif: "#E00000"
---

# Spec: percorso del visitatore 2026, voto e mappa insieme

Rif. pratica #E00000. Approvata dal CEO il 2026-10-29 tramite Giulia; le domande sono chiuse nella sezione 7.

## 1. Problema

Sabato 31/10 il visitatore gira a piedi tra 20 case e 18 punti di servizio, con il telefono in mano. Oggi votare e orientarsi sono due esperienze staccate:

- dalla pagina di voto non si arriva alla mappa, e dalla mappa si vota cambiando pagina;
- la mappa non sa quali case ho già votato;
- per raggiungere un posto bisogna copiare l'indirizzo in Maps a mano.

Il CEO chiede un sistema pensato dalla A alla Z: voto e mappa diventano un'unica esperienza, con la navigazione verso ogni casa e ogni punto.

### Percorso reale oggi (codice su `main` = `develop`, 6abb949 + merge 3aa78cb)

| Passo | Cosa succede oggi | Interruzione o giro inutile |
| --- | --- | --- |
| QR casa → `/vota/<n>` | Niente splash. Senza login: pannello «Stai per votare la casa n» e «Accedi con Google». Dopo il login si apre la scheda di voto della casa | Nessun accesso alla mappa da qui. Unico link: «Torna alla home» |
| QR sito → `/` | Splash una volta per sessione, poi la home con «Vota le case» (`/vote`), «Mappa del quartiere» e «Contest foto» | Va bene |
| `/vote` | Login, ricerca per numero, «Case valutate X su N» con le lampadine, elenco «I miei voti» (punteggio oppure «Da votare»), scheda di voto | **G1** Nessun link alla mappa: per arrivarci servono 2 tocchi, home e poi mappa. **G2** La scheda di voto non mostra indirizzo, tipo e navigazione. **G3** La descrizione è vuota per tutte le 2026 (nel CSV la colonna è vuota, il tipo la sostituisce), quindi ogni scheda dice «Nessuna descrizione disponibile.» |
| `/mappa` | Leaflet con le case per tipo, 18 punti e 6 strade chiuse, legenda, sezione «Spettacoli», classifica quando è pubblicata. Il tocco su una casa apre una scheda con «Vota» | **G4** La mappa non legge i miei voti: tutte le case sembrano uguali. **G5** «Vota» porta a `/vota/<n>`, una pagina diversa. Dopo il voto si resta lì e per tornare servono home e poi mappa, e la mappa si reinquadra da capo. **G6** Non ci sono filtri. **G7** Non c'è «Portami qui», né per le case né per i punti (il popup dei punti mostra solo nome e indirizzo). **G8** Non c'è l'avanzamento |
| Classifica | Compare solo dentro `/mappa`, quando l'admin la pubblica | **G9** Dalla home non si vede che è uscita (non bloccante) |
| Privacy | Footer e pannello di login → `/privacy` | Va bene |
| Splash | Montata una volta, decide solo al primo caricamento | Non interrompe la navigazione interna. Ricompare solo se la pagina viene ricaricata in una sessione nuova |

## 2. Utenti

- **Visitatore a piedi** (principale): telefono, spesso con una mano sola, di sera, con la rete a tratti. Ha il login Google o lo fa al primo voto. Arriva da un QR di una casa o dal QR del sito.
- **Visitatore senza login**: guarda la mappa e i servizi, non vota.
- **Admin**: fuori perimetro. Questa spec non cambia l'area admin.

## 3. Requisiti

Definizioni usate negli RF:
- **casa votata**: casa visibile dell'edizione con un mio voto ≥ 6. È lo stesso criterio di «Case valutate» di oggi.
- **case dell'edizione**: tutte le case visibili, comprese quelle senza posizione.

Lo stile (forma dei bottoni, colori, barra o linguetta) lo decide la ux-ui-designer nelle varianti di `marketing/brand/proposte/bagna-halloween-tema/`. Qui c'è solo il comportamento.

### A. Indispensabile per sabato

**RF-1 Mappa con un tocco dal voto, e ritorno.** In `/vote` e `/vota/<n>` c'è un comando «Mappa» visibile senza scorrere, sia con il login sia senza. In `/mappa` c'è un comando «Vota» / «I miei voti», visibile senza scorrere, che porta a `/vote`.
*Verifica:* a 375×667, da `/vota/3` dopo il login: un tocco porta a `/mappa`, un tocco riporta a `/vote`. Nessun passaggio dalla home e nessun nuovo login.

**RF-2 Le mie case votate sulla mappa.** Con il login, ogni segnaposto di casa mostra uno di due stati, «votata» o «da votare». Lo stato si distingue senza il colore (per esempio con un segno di spunta o il punteggio) e sta nell'`aria-label` («Casa 3, …, votata 8 su 10» oppure «…, da votare»). Senza login i segnaposto restano come oggi.
*Verifica:* utente con voti sulle case 2 e 5: sulla mappa solo 2 e 5 risultano votate, anche in scala di grigi. Lettore di schermo: l'etichetta contiene lo stato. Dopo il logout gli stati spariscono.

**RF-3 Votare dalla scheda sulla mappa senza lasciarla.** Il tocco su una casa apre la scheda con:
- numero, titolo, tipo e indirizzo;
- il mio voto attuale;
- le zucche per votare;
- «Salva voto».

Dopo il salvataggio la scheda si chiude e compare la conferma «Voto salvato». Restano uguali la pagina (`/mappa`), il centro, lo zoom e il filtro. Il segnaposto passa a «votata» senza ricaricare. Valgono le regole di oggi: votazioni chiuse oppure orario di fine passato vuol dire zucche disabilitate con l'avviso; voto modificabile; scrittura identica a quella di `/vote`.
Senza login la scheda mostra «Accedi con Google per votare». Dopo il login la stessa scheda mostra le zucche, senza cambiare pagina.
*Verifica:* zoomato sulla casa 7, voto 9: l'URL resta `/mappa`, vista e filtro non cambiano, il segnaposto 7 diventa «votata 9». In `/vote` la casa 7 risulta 9/10. Con votazioni chiuse non si salva. Login dalla scheda: dopo il popup Google la scheda è aperta sulla stessa casa.

**RF-4 Filtro per stato.** Sulla mappa c'è un filtro a scelta singola: «Tutte», «Da votare», «Votate». All'apertura vale «Tutte». Il filtro agisce solo sui segnaposto delle case, mentre punti di servizio e strade chiuse restano. Senza login il filtro per stato non compare. Se la scelta lascia zero case compare un messaggio, per esempio «Hai votato tutte le case!» oppure «Nessuna casa votata ancora». Votando una casa con «Da votare» attivo, il segnaposto sparisce.
*Verifica:* con 2 voti su 20: «Da votare» mostra 18 segnaposto, «Votate» ne mostra 2, «Tutte» 20. I 18 punti e le 6 strade sono sempre visibili. I bottoni dichiarano lo stato attivo (`aria-pressed` o equivalente).

**RF-5 Filtro per tipo, dalla legenda.** Le voci della legenda (Spettacolo, Casa addobbata, Bar, Food truck, Servizi igienici, Parcheggio, Intrattenimento, Strada chiusa) diventano interruttori: si toccano per mostrare o nascondere quel tipo. All'apertura sono tutte attive. Il filtro per tipo si combina con quello per stato (RF-4). Compaiono solo i tipi presenti nei dati, come nella legenda di oggi.
*Verifica:* spento «Parcheggio» spariscono i 7 parcheggi e resta il resto. «Da votare» più solo «Spettacolo» mostra solo le case spettacolo non votate. Da tastiera ogni voce si attiva e annuncia il suo stato.

**RF-6 «Portami qui».** La scheda di ogni casa con posizione e il popup di ogni punto di servizio hanno il link «Portami qui». Il link apre la navigazione verso le coordinate salvate, in una nuova scheda o nell'app, così il sito resta aperto:
- su iPhone/iPad, compreso l'iPadOS che si presenta come Mac con il touch: Apple Maps, `https://maps.apple.com/?daddr=<lat>,<lng>&dirflg=<modo>`;
- su tutti gli altri: Google Maps, `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>&travelmode=<modo>`.

Il modo di viaggio dipende dalla domanda D1. Il link contiene solo le coordinate della destinazione, senza dati dell'utente. Una casa senza posizione non ha il link.
*Verifica:* Safari iOS sulla casa 3 apre Apple Maps con la destinazione alle coordinate di `houses/2026_3`. Chrome Android su un parcheggio apre Google Maps sulle coordinate del punto in `public/punti/2026.json`. Tornando al browser la mappa è dov'era. L'href non contiene uid, email o nome.

**RF-7 Avanzamento.** Con il login, sulla mappa compare «N su M votate» accanto ai filtri. Il valore è identico a quello di `/vote` e si aggiorna dopo ogni voto, sulla mappa e su `/vote`, senza ricaricare. M conta le case dell'edizione.
*Verifica:* 0 voti dà «0 su 20». Dopo un voto dalla mappa diventa «1 su 20» su entrambe le pagine.

**RF-8 La scheda di voto in `/vote` e `/vota/<n>` dice dove andare.** Al posto di «Nessuna descrizione disponibile.» la scheda mostra tipo e indirizzo. La descrizione compare solo se c'è. In più ci sono «Portami qui» (RF-6) e «Vedi sulla mappa», che apre `/mappa` centrata sulla casa con la sua scheda aperta.
*Verifica:* in `/vota/3` la scheda mostra tipo e indirizzo e nessun «Nessuna descrizione». «Vedi sulla mappa» porta a `/mappa` zoomata sulla casa 3 con la sua scheda aperta.

**RF-9 Nessuna lettura in più che costi, nessun voto altrui.**
- Le case si leggono una volta per sessione, come oggi (`housesCache`).
- I miei voti si leggono con un solo ascolto per utente ed edizione (`userId == uid`, `edition`, al massimo 20 documenti), condiviso tra `/vote` e `/mappa`: passare da una pagina all'altra non lo riapre.
- I punti restano il file statico.
- Nessuna query legge voti di altri utenti.

*Verifica:* nella scheda Rete (o con il contatore dell'emulatore), andata e ritorno `/vote` → `/mappa` → `/vote` non produce una nuova lettura delle case né un secondo ascolto dei voti. I test delle regole restano verdi senza modifiche.

### B. Se c'è tempo (in quest'ordine)

**RF-10 La mappa ricorda la vista.** Tornando su `/mappa` nella stessa sessione, centro, zoom e filtri sono quelli lasciati. Non si reinquadra da capo.
*Verifica:* zoom sulla casa 12 con filtro «Da votare», poi `/vote`, poi «Mappa»: stessa vista e stesso filtro.

**RF-11 Prossima da votare.** Dopo «Voto salvato», sulla mappa o su `/vote`, la conferma propone la prossima casa da votare con il numero più basso: «Prossima: casa X · Portami qui». Se non ne restano: «Hai votato tutte le case!».
*Verifica:* votata la 1 con la 2 da votare, la conferma propone la 2 e il link apre la navigazione verso la 2.

**RF-12 Classifica annunciata.** Quando la classifica è pubblicata, la home mostra «Classifica pubblicata: guardala» con un link a `/mappa`, alla sezione della classifica.
*Verifica:* con `config/results.published = true` per il 2026 compare il link e porta alla classifica. Con false non compare.

## 4. Non-obiettivi

- **La mia posizione sul telefono** (geolocalizzazione, «casa più vicina»): richiederebbe un permesso del browser e una nuova voce nell'informativa. «Portami qui» lascia la posizione all'app Maps.
- Percorso consigliato tra le case, ordine ottimale del giro.
- Voti, medie o classifica degli altri visibili prima della pubblicazione.
- Editor dei punti di servizio in admin: restano un file statico per edizione.
- Modifiche all'area admin, allo splash e al contest.
- Funzionamento offline e PWA.
- Lo stile visivo, che spetta alla ux-ui-designer: questa spec dice cosa c'è e cosa fa, non come appare.

## 5. Vincoli e confini

- **Regole Firestore: nessuna modifica.** La regola attuale fa già leggere a ognuno solo i propri voti (`resource.data.userId == request.auth.uid`) e il voto dalla mappa usa la stessa scrittura di `/vote`. Quindi non serve una security review sulle regole. Serve il `/security-review` di routine se la PR tocca dati o auth, perché il voto parte da una nuova schermata. Se il tech-lead scegliesse una strada che cambia le regole, entra la security review completa e la spec va riaperta.
- Nessuna dipendenza nuova: gli URL di Maps sono link semplici.
- Il voto resta valido solo lato server (regole + orario di fine). L'interfaccia della mappa lo riflette e basta.
- Accessibilità: stati e filtri non affidati solo al colore, comandi da 44 px, tastiera e lettore di schermo come per i segnaposto attuali.
- Architettura (stato condiviso dei voti, scheda di voto riusata, parametri d'URL come `/mappa?casa=<n>`): decide il tech-lead.

## 6. Stima

- **Indispensabile (RF-1…RF-9):** circa 1 giornata di sviluppo e mezza di QA, compresi gli e2e su voto dalla mappa, filtri, «Portami qui» (solo href) e scheda in `/vota/<n>`.
- **Token:** circa 600-900k in totale (sviluppo Sonnet ~400-550k, review tech-lead ~100k, QA ~150-250k).
- **Se c'è tempo (RF-10…RF-12):** +150-250k token, 2-3 ore.

Non verificabile dagli agenti, da fare nella prova generale sul telefono vero: l'apertura reale di Apple Maps e Google Maps da Safari iOS e da Chrome Android, e dai browser in-app se qualcuno scansiona dal QR con un'app.

## 7. Domande chiuse (CEO, 2026-10-29)

- **D1:** «Portami qui» a piedi, per case e per tutti i punti.
- **D2:** su iPhone e iPad solo Apple Maps.
- **D3:** dopo il login la mappa parte dal filtro «Da votare». Prevale su «All'apertura vale "Tutte"» di RF-4.
- **D4:** un solo interruttore «Servizi» per tutti i punti di servizio. Restano gli interruttori per i tipi di casa. Le strade chiuse restano sempre visibili (scelta del tech-lead: sono un'informazione di sicurezza).
- **D5:** se manca tempo si taglia prima RF-5, poi RF-8.
- **In più:** l'area admin sta sempre su `/admin` e non dipende più da `VITE_ADMIN_ROUTE`. Il vecchio indirizzo mostra «Pagina non trovata».

Ticket: #41 (admin su `/admin` e questa spec), #42 (RF-1, 2, 3, 4, 7, 9), #43 (RF-6, 8, 5).

### Testo originale delle domande

1. **D1 Modo di viaggio di «Portami qui».** A piedi per tutto, oppure a piedi per case e servizi e in auto solo per i parcheggi? Le strade sono chiuse dalle 18:30 alle 23:00.
2. **D2 iPhone.** Su iOS solo Apple Maps, come chiede il brief, oppure due link «Apple Maps» e «Google Maps»? Molti usano Google Maps anche su iPhone.
3. **D3 Filtro all'apertura.** Con il login la mappa parte da «Tutte», come propone la spec, oppure da «Da votare»?
4. **D4 Cosa conta come «tipi di servizio» nei filtri.** Un interruttore per ogni tipo (bar, food truck, servizi igienici, parcheggio, intrattenimento, strada chiusa), come propone RF-5, oppure un solo interruttore «Servizi»?
5. **D5 Priorità.** Se venerdì il tempo non basta, l'ordine di taglio proposto è: prima RF-5 (filtro per tipo), poi RF-8 «Vedi sulla mappa». RF-1, 2, 3, 4, 6, 7 e 9 restano in ogni caso. Va bene?

Nessuna di queste domande blocca l'avvio dello sviluppo. Se una risposta non arriva, valgono i default scritti negli RF, che vanno confermati al collaudo.

## 8. Collaudo

Al collaudo (`/collaudo`) confronto ogni RF con il comportamento sull'anteprima e sul telefono vero e scrivo `reports/collaudo/2026-10-30-percorso-visitatore-2026.md`.

Chiara (product-manager)
