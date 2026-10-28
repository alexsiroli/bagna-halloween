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

- **Targa civica** (`.plate`): ceramica chiara, numero in smalto blu, doppio filetto. Ogni
  casa e' il suo numero: lista voti, dialog, admin, mappa, classifica.
- **Zucche** (`PumpkinRating`): cinque zucche SVG da 6 a 10, radiogroup con frecce. Spente
  sono sagome blu; accendendosi prendono colore da sinistra e la faccia "prende fuoco" come
  una candela. Accanto, il punteggio in display e una parola (Carina ... Da paura!).
- **Filo di lampadine** (`.bulb-string`): il progresso dei voti, una lampadina per casa.
- **Foglio** (`Sheet`): `<dialog>` nativo; dal basso sul telefono, centrato da 640px.
- **Stato** (`.status-line`): lampadina accesa o spenta piu' testo.
- **Grafico a fasce** (admin): una fascia ogni 10 minuti, luce da zucca a finestra
  proporzionale ai voti.

## Movimento

Durate 150 / 220 / 320 ms (`--dur-fast`, `--dur`, `--dur-slow`), entrate con
`--ease-out` (cubic-bezier(0.23, 1, 0.32, 1)), fogli con `--ease-drawer`. Pressione dei
bottoni: `scale(0.97)`. Hover solo con `(hover: hover) and (pointer: fine)`.

Vocabolario unico, l'**accensione**: una luce che prende con due guizzi e poi resta ferma.
- Home: le lampadine delle luminarie si accendono in fila, poi le finestre del quartiere.
- Voto: le zucche si accendono una dopo l'altra fino al punteggio scelto; la targa della casa
  appena votata fa lo stesso guizzo nella lista.
- Mappa: a classifica pubblicata le case si accendono in ordine di classifica (110 ms l'una),
  il podio con un bagliore piu' ampio e il piazzamento.

Con `prefers-reduced-motion: reduce` le animazioni finiscono subito nello stato finale
(niente guizzi, niente scorrimenti).

## La mappa

`/mappa` usa Leaflet con tessere OpenStreetMap scurite via CSS (`filter` sul solo strato delle
tessere: le targhe restano a piena luce). Le case sono targhe (`.pin__plate`, area da toccare
44px) nello stile della targa civica; il tocco apre il foglio con la scheda e il bottone Vota.
Le case senza posizione stanno in un elenco sotto la mappa.

## Schermate chiave

1. **Home**: nome dell'evento in grande (a tutta larghezza in desktop), invito, stato
   edizione e votazioni, quartiere illustrato, "Vota le case" 64px, poi Mappa e Contest.
2. **Voto**: login, poi campo numero grande + Cerca, filo di lampadine, "I miei voti" come
   lista di targhe; il voto si da' in un foglio dal basso, raggiungibile col pollice.
3. **Mappa**: tessere OpenStreetMap scurite, targhe toccabili, classifica sotto quando e' pubblica.
4. **Contest**: l'hashtag dell'edizione su una targa, copiabile con un tocco.
5. **Admin**: interruttori votazioni e classifica, case con posizionamento sulla mappa,
   statistiche ordinabili, grafico a fasce.
