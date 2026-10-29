# Halloween di Bagnarola

Votazione delle case addobbate per Halloween a Bagnarola di Cesenatico.

## Linguaggio

**Edizione**:
L'anno della manifestazione; case, voti e classifica appartengono a un'edizione.
_Da evitare_: anno, stagione

**Casa**:
Un'abitazione addobbata che partecipa a un'edizione, identificata dal suo **Numero**.
_Da evitare_: partecipante, iscritto

**Numero**:
Il numero della targa di una casa in un'edizione, unico nell'edizione; è quello stampato sul cartello e nel QR.
_Da evitare_: id, codice

**Indirizzo**:
Via e civico di una casa, come li comunica l'organizzazione.

**Posizione**:
Il punto della casa sulla mappa (latitudine e longitudine), ricavato una volta dall'indirizzo e corretto a mano se serve.
_Da evitare_: coordinate x/y

**Tipo di casa**:
spettacolo (la casa offre uno spettacolo o un intrattenimento) oppure addobbi (casa decorata). Si votano allo stesso modo.
_Da evitare_: categoria

**Punto di servizio**:
Un luogo dell'evento che non si vota (bar, food truck, servizi igienici, parcheggio, intrattenimento), con nome e posizione.
_Da evitare_: POI, punto di interesse

**Strada chiusa**:
Un tratto chiuso al traffico durante l'evento, disegnato sulla mappa come linea.

**Voto**:
Il punteggio da 6 a 10 che un votante dà a una casa; uno per casa per votante, modificabile finché la votazione è aperta.

**Orario di fine**:
L'ora, in ora di Roma, in cui la votazione si chiude da sola; la sceglie l'admin e può toglierla. Dopo quell'ora non si vota più, anche se la votazione era rimasta aperta.
_Da evitare_: scadenza, deadline

**Classifica**:
L'ordine delle case che l'admin pubblica a votazione chiusa.

**Admin**:
Chi gestisce un'edizione (case, votazioni, classifica, altri admin); è admin chi ha l'email, verificata, nell'elenco degli admin. Un admin non può togliere sé stesso e l'elenco non resta mai vuoto.
_Da evitare_: amministratore, organizzatore

**Elenco delle case**:
Il file con numero, titolo, indirizzo ed eventuale posizione di ogni casa, da cui si caricano le case di un'edizione.

## Relazioni

- Un'**Edizione** ha molte **Case**; il **Numero** è unico solo dentro l'edizione.
- Una **Casa** ha un **Indirizzo** e al più una **Posizione**; senza posizione non compare sulla mappa ma si vota lo stesso; può avere un **Tipo di casa**.
- I **Punti di servizio** e le **Strade chiuse** di un'**Edizione** stanno in un file dati (`public/punti/<edizione>.json`), non nel database.
- Ogni **QR** di casa porta alla votazione della casa con quel **Numero** nell'edizione corrente.
