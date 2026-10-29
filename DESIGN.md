# Design: "Il quartiere di notte"

Halloween di Bagnarola come una festa di paese vista di notte: vie buie, case che sono punti
di luce, luminarie che si accendono. Niente Halloween di catalogo (nero, arancio e viola,
fantasmi emoji, font horror): il protagonista e' il paese.

**Scena d'uso** (e' questa a imporre il tema scuro): persone a piedi per le vie di Bagnarola
la sera del 31 ottobre, telefono in una mano, schermo a luminosita' bassa, occhi abituati al
buio. Un'interfaccia chiara abbaglierebbe; il contrasto resta comunque alto (testo 16:1).

Tutti i valori vivono come variabili CSS in `src/styles/halloween.css` (`:root`). Nei
componenti non ci sono colori scritti a mano.

## Colori

| Token | Hex | Ruolo |
|---|---|---|
| `--notte-950` | `#070b17` | fondo della mappa, fine pagina |
| `--notte-900` | `#0b1224` | fondo pagina (cielo sulla pianura) |
| `--notte-800` | `#111a33` | pannelli e fogli (muri in ombra) |
| `--notte-700` | `#1a2547` | campi, chip, righe attive |
| `--notte-600` | `#27345f` | bordi dei pannelli, divisori |
| `--notte-500` | `#3a4a80` | lampadine spente, tratti decorativi |
| `--notte-400` | `#6878b4` | bordi dei controlli (>= 3:1 sui pannelli) |
| `--luna` | `#f4efe4` | testo (16:1 sul fondo) |
| `--nebbia` | `#a3acc9` | testo secondario (7.6:1 sui pannelli) |
| `--lampione` | `#ffb238` | azioni primarie, fuoco, link (10:1) |
| `--lampione-chiaro` | `#ffc062` | hover dell'azione primaria |
| `--finestra` | `#ffe19a` | finestre e lampadine accese, stato "aperto" |
| `--zucca` | `#ff6b1a` | voti, zucche accese |
| `--zucca-scura` | `#c94a0c` | contorno delle zucche accese |
| `--stelo` | `#7c8a3e` | picciolo delle zucche |
| `--brace` | `#ff7a6b` | errori (6.8:1) |
| `--ceramica` | `#f4efe4` | targa civica |
| `--smalto` | `#1c2f7a` | numero sulla targa (10.5:1) |
| `--tipo-spettacolo` | `var(--zucca)` | casa e punto «spettacolo»/«intrattenimento» |
| `--tipo-addobbi` | `#5b3a9e` | casa addobbata |
| `--punto-bar` | `#3ccfc0` | punto «bar» |
| `--punto-wc` | `#7fb0ff` | punto «servizi igienici» |
| `--punto-parcheggio` | `#dfe3f0` | punto «parcheggio» |
| `--strada-chiusa` | `#d9533a` | strade chiuse (linea e chip) |

Arancio fantasma (`--tipo-spettacolo`) e mattone (`--strada-chiusa`) seguono la legenda della mappa degli organizzatori.

Strategia: un fondo notturno pieno, una sola luce d'azione (lampione). Zucca e finestra hanno
un significato fisso: zucca = voto, finestra = acceso/aperto. Lo stato non e' mai affidato al
solo colore: c'e' sempre il testo accanto.

## Tipografia

- **Display: Bowlby One** (Vernon Adams, SIL OFL), lettering da manifesto di sagra. Per titoli
  di pagina, numeri civici, punteggi. Tracking tra -0.015em e -0.01em.
- **Testo e UI: Atkinson Hyperlegible Next** (Braille Institute, SIL OFL, variabile 200-800),
  scelta per la leggibilita' in penombra e per un pubblico di tutte le eta'.
- Self-host in `public/fonts/` (woff2 latin, `font-display: swap`, preload in `index.html`,
  licenze accanto ai file).
- Scala: `--step--1` 15px, `--step-0` 17px (corpo), `--step-1` 20px, `--step-2` 24-30px,
  `--step-3` 32-48px (h1), `--step-4` 38-80px (nome dell'evento; 64-96px in desktop).
- Campi a 18px: iOS non forza lo zoom. Lo zoom della pagina non e' mai bloccato.

## Forme, spazi, profondita'

- Raggi: `--radius-s` 6px (targhe), `--radius-m` 12px (controlli), `--radius-l` 20px
  (pannelli, fogli, mappa).
- Spazi: scala 4-8-12-16-24-32-48-72 (`--space-1` ... `--space-8`).
- Target: 48px minimo, 64px (`--target-xl`) per il flusso di voto (cerca, zucche 84px,
  salva). Bottone principale di pagina a tutta larghezza sul telefono.
- Ombre con offset e sfocatura (`--shadow-panel`, `--shadow-lampione`); il bagliore
  (`--glow-finestra`) e' riservato alle cose accese.

## Componenti firma

- **Casetta** (`src/casetta.js`, `Casetta.jsx`): il numero dentro la sagoma di una casa con il
  camino. Spenta (muro notte, bordo `--notte-400`) = da votare; accesa (`--finestra`, bordo
  lampione, alone) = votata. Ogni casa e' il suo numero: griglia «I miei voti», schede, mappa.
  Una casa con spettacolo porta il glifo nel tondo sul tetto. Decisione del CEO del 29/10/2026:
  niente piu' targhe quadrate (la `.plate` resta solo nell'admin); nell'albo d'oro basta «Casa 13».
- **Intestazione** (`PageHeader`): freccia indietro, titolo, profilo. **Profilo**: cerchio con le
  iniziali in alto a destra; il tocco apre il foglio con nome, email ed Esci. In home: albo d'oro
  (trofeo) a sinistra, profilo e marchio Alx Studio di Halloween (`AlxMark`, lo splash fermo) a destra.
- **Tag** (`.tag--closed`): «Votazioni chiuse» in rosso brace, in pagina e nella scheda.
- **Zucche** (`PumpkinRating`): cinque zucche SVG da 6 a 10, radiogroup con frecce. Spente
  sono sagome blu; accendendosi prendono colore da sinistra e la faccia "prende fuoco" come
  una candela. Accanto, il punteggio in display e una parola (Carina ... Da paura!).
- **Filo di lampadine** (`.bulb-string`): il progresso dei voti, una lampadina per casa, su righe
  piene e pareggiate (al massimo 20 per riga).
- **Foglio** (`Sheet`): `<dialog>` nativo; dal basso sul telefono, centrato da 640px.
- **Stato** (`.status-line`): lampadina accesa o spenta piu' testo.
- **Grafico a fasce** (admin): una fascia ogni 10 minuti, luce da zucca a finestra
  proporzionale ai voti.

## Movimento

Durate 150 / 220 / 320 ms (`--dur-fast`, `--dur`, `--dur-slow`), entrate con
`--ease-out` (cubic-bezier(0.23, 1, 0.32, 1)), fogli con `--ease-drawer`. Pressione dei
bottoni: `scale(0.97)`. Hover solo con `(hover: hover) and (pointer: fine)`.

Vocabolario unico, l'**accensione**: una luce che prende con due guizzi e poi resta ferma.
Si anima solo `opacity` e `transform`. Gli SVG si animano una volta sola: un ciclo dentro un
SVG costerebbe un repaint continuo sul telefono.

Cicli lenti (tema «Luce di candela», decisione del CEO del 29/10/2026): ammessi solo su
`opacity` e `transform`, solo come livelli HTML sopra la scena (mai dentro gli SVG), lenti
(3 s o piu') e pochi. Oggi sono quattro:
- la candela nelle due zucche grandi della Home (`.fiamma`, `flicker`, 3,4 e 4,1 s, solo opacity);
- il banco di nebbia della Home (`.banco-nebbia`, `fog-drift`, 18 s avanti e indietro, solo transform);
- l'alone della zucca nel pannello di accesso (`.lume`, `flicker`);
- le luci delle case della Home (`.luce`, `window-glow`, 3,2-5,9 s avanti e indietro, solo opacity):
  aloni HTML sopra meta' delle finestre accese delle case (`LUCI` esportato da `Skyline.jsx`,
  coordinate SVG in cqw come la candela). Richiesta del CEO del 29/10/2026.
Con `prefers-reduced-motion: reduce` si fermano nello stato finale, come le altre animazioni.

Mappa: luci sempre accese, niente velo scuro, niente torcia, niente bottone «Accendi le luci».

Accesso: pannello centrato con la zucca accesa e il bottone ufficiale «Accedi con Google» in
tema scuro (fondo #131314, bordo #8E918F, testo #E3E3E3, logo G a colori in `src/assets`,
Roboto Medium self-hosted in `public/fonts`, Apache 2.0). Le misure (48 px, margini 14, logo
24, spazio 12) sono il bottone standard da 40 px scalato per il tocco. Confrontate con le linee
guida ufficiali «Sign in with Google branding» il 29/10/2026: scala proporzionale 1,2 del bottone
da 40 px (le linee guida la ammettono se restano le proporzioni), Roboto Medium al posto di Google
Sans come compromesso accettato dal tech-lead.
- Cambio pagina: la pagina entra con opacita' e 6px di salita (`page-in`, 320 ms); si riparte
  dall'alto (`ScrollToTop`).
- Home: le lampadine delle luminarie si accendono in fila, poi le finestre del quartiere; i
  pipistrelli arrivano una volta davanti alla luna.
- Voto: le zucche si accendono una dopo l'altra fino al punteggio scelto; la targa della casa
  appena votata fa lo stesso guizzo nella lista.
- Mappa: a classifica pubblicata le case si accendono in ordine di classifica (110 ms l'una),
  il podio con un bagliore piu' ampio e il piazzamento.

Con `prefers-reduced-motion: reduce` le animazioni finiscono subito nello stato finale
(niente guizzi, niente scorrimenti).

## Il quartiere (Skyline)

`Skyline.jsx` e' la scena della locandina v2 (marketing/brand/proposte/bagna-halloween-stampa/v2)
in formato 240x160: case di paese, villa stregata con il gatto, campanile, luna con le nuvole,
pipistrelli, alberi spogli, luminarie, zucche intagliate, nebbia. Markup generato una volta con
seme fisso. Sul telefono la scena prende l'altezza rimasta (`preserveAspectRatio` slice: si
taglia il cielo dall'alto) cosi' la home sta in una schermata; in desktop ha i bordi sfumati.

## La mappa

`/mappa` e' solo mappa e legenda, in una schermata. Usa Leaflet con tessere OpenStreetMap scurite via CSS (`filter` sul solo strato delle
tessere: le targhe restano a piena luce). Le case sono casette (area da toccare 44px), accese
se le hai votate; il tocco apre la stessa scheda di voto di `/vote` (accesso compreso).
Le case senza posizione si votano da `/vote`: sotto la mappa non ci sono elenchi.
Ogni segnaposto (targhe e cerchi dei punti) ha un anello chiaro sopra uno scuro: si stacca dalle
tessere scure. Punti di servizio con area da toccare 44px; strade chiuse 6px con alone mattone.
La vista iniziale inquadra case, punti e strade insieme. La legenda sta sotto la mappa, in due
colonne sul telefono; la mappa prende l'altezza che resta.

«Alex Siroli» nel piede e' un link email sottolineato (area 44px, focus visibile); la firma dello splash resta testo. Il piede e' fisso in basso, una riga da 44px.

## Una schermata

Home, Vota le case, Mappa, Contest foto e Albo stanno in una schermata a 390x844 e 375x667, piede
compreso (`.app-shell--fit`: colonna alta quanto lo schermo, un solo elemento elastico per pagina:
la scena in home, la mappa, la griglia delle casette che scorre al suo interno se le case sono tante).
Lo verifica l'e2e «una schermata».

## Schermate chiave

1. **Home**: nome dell'evento in grande (a tutta larghezza in desktop), stato edizione e
   votazioni, quartiere illustrato con le luci che pulsano, "Vota le case" 64px, poi Mappa e
   Contest foto affiancati, senza descrizioni.
2. **Voto**: login, poi il solo campo «Inserisci numero casa», filo di lampadine, «I miei voti»
   come griglia di casette; il voto si da' in un foglio dal basso, raggiungibile col pollice.
3. **Mappa**: tessere OpenStreetMap scurite, casette toccabili, legenda.
4. **Contest**: l'hashtag dell'edizione su una targa, copiabile con un tocco, e «Come
   partecipare» sempre visibile.
5. **Admin**: interruttori votazioni e classifica, case con posizionamento sulla mappa,
   statistiche ordinabili, grafico a fasce.
