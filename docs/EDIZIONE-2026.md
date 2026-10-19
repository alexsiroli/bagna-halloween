# Passaggio all'edizione 2026

Questi passi toccano la **produzione** e li esegue l'utente. Nessuno di questi comandi e'
stato lanciato durante lo sviluppo, che e' avvenuto solo sugli emulatori (`npm test`).
Gli script sono stati provati sull'emulatore con dati finti.

Tempo stimato: 30-40 minuti. Da fare entro il 25 ottobre, con le votazioni chiuse.

## 0. Prerequisiti

- `firebase-tools` installato e login fatto: `firebase login`.
- Id del progetto: dal proxy in `netlify.toml` dovrebbe essere `bagna-halloween`; verificalo in
  Console Firebase, Impostazioni progetto. Sotto lo chiamo `<ID>`.
- Un **service account** per gli script: Console Firebase, Impostazioni progetto, Account di
  servizio, "Genera nuova chiave privata". Salva il JSON **fuori dal repo** (es.
  `C:\Users\alexs\segreti\bagna-halloween-sa.json`) e non condividerlo. Dopo il passaggio
  puoi revocare la chiave dalla console Google Cloud.

In PowerShell imposta la variabile una volta per la sessione:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\Users\alexs\segreti\bagna-halloween-sa.json"
```

In bash: `export GOOGLE_APPLICATION_CREDENTIALS=/c/Users/alexs/segreti/bagna-halloween-sa.json`.

## 1. Controlla le regole pubblicate oggi

Console Firebase, Firestore, **Regole**. Copia il testo attuale in un file di appunti: e' il
tuo piano di ritorno. Confrontalo con `firestore.rules` del repo. Se oggi le regole
permettono a chiunque di scrivere `houses` o `config`, il sito e' esposto finche' non fai il
passo 5.

## 2. Crea la allowlist degli admin

Console Firebase, Firestore, Dati: collezione `config`, documento `admins`, campo `emails`
di tipo **array** con le email Google degli organizzatori, **in minuscolo**, una per
elemento. Esempio: `["alex.siroli@gmail.com"]`.

Solo chi e' in questa lista (con email verificata, come tutte quelle Google) puo' aprire
l'area admin e scrivere case e configurazione. Per aggiungere un admin in futuro basta
modificare l'array (anche da un admin loggato).

## 3. Archivia il 2025 (sola lettura)

```powershell
node scripts/export-edition.mjs 2025
```

Crea `exports/edizione-2025.json` con case, voti, config e un riepilogo con medie e
conteggi per casa. Lo script fa solo letture. La cartella `exports/` e' ignorata da git:
contiene uid e nomi dei votanti, quindi conservala in un posto privato (es. Drive personale).

I documenti senza campo `edition` vengono considerati 2025.

## 4. Prepara il 2026

Prima la prova, che non scrive nulla e stampa il piano:

```powershell
node scripts/prepare-edition.mjs --from 2025 --to 2026
```

Se il piano torna (numero di case da marcare, config/app attuale), applica:

```powershell
node scripts/prepare-edition.mjs --from 2025 --to 2026 --apply
```

Cosa fa: aggiunge `edition: 2025` alle case che non l'hanno, imposta `config/app` con
`edition: 2026` e `votingOpen: false`, e azzera `config/results` (classifica non
pubblicata). Non cancella niente: le case e i voti 2025 restano nel database, filtrati per
edizione. Senza l'export del passo 3 lo script si rifiuta di applicare.

## 5. Pubblica le regole

```powershell
firebase deploy --only firestore:rules --project <ID>
```

Ritorno indietro: incolla nella console le regole salvate al passo 1 e pubblica.

Nota: da qui la vecchia versione del sito non puo' piu' salvare voti (i voti ora richiedono
`edition`). Con le votazioni chiuse dal passo 4 non e' un problema: pubblica subito il sito
nuovo (passo 7).

## 6. Mappa 2026

Serve un'immagine `public/mappa-2026.webp`, larga circa 2000-2400 px e sotto i 600 KB. Dal
PDF dell'organizzazione, per esempio con ImageMagick:

```powershell
magick -density 200 "mappa-2026.pdf[0]" -resize 2400x -quality 80 public/mappa-2026.webp
```

oppure con `ffmpeg` da un PNG esportato: `ffmpeg -i mappa-2026.png -vf scale=2400:-1 -quality 80 public/mappa-2026.webp`.
Poi un commit. Finche' il file manca, la pagina Mappa mostra il link al PDF
(`VITE_MAP_URL` o `/map.pdf`).

Il vecchio `public/map.pdf` (14 MB) resta solo come ripiego: quando la webp c'e' puoi
toglierlo e lasciare `VITE_MAP_URL` puntato al PDF su Drive.

## 7. Netlify

Variabili (Site settings, Environment variables), stesse di oggi piu' eventuali nuove:

| Variabile | Valore |
|---|---|
| `VITE_FIREBASE_*` | invariati |
| `VITE_ADMIN_ROUTE` | facoltativa (default `/admin`); ora e' solo un indirizzo, non una protezione |
| `VITE_MAP_URL` | link al PDF di ripiego (facoltativa) |
| `VITE_MAP_IMAGE` | **non** impostarla in produzione (serve solo per la mappa segnaposto) |

Non impostare mai `VITE_USE_EMULATORS` su Netlify.

Deploy: prima un deploy di anteprima dal branch, poi la produzione.

## 8. Prova generale (su anteprima Netlify)

1. Home: "Edizione 2026 · votazioni chiuse".
2. Area admin con un account **non** in lista: deve dire "non autorizzato".
3. Area admin con il tuo account: aggiungi le case 2026, posiziona ognuna cliccando sulla
   mappa, poi "Apri votazioni".
4. Da telefono: vota una casa, controlla "I miei voti", poi rimetti in pausa.
5. La sera del 31: "Apri votazioni"; a fine serata "Metti in pausa" e, quando vuoi,
   "Pubblica classifica" (le case si accendono sulla mappa in ordine).

Le nuove case hanno id `2026_<numero>`, i voti `2026_<uid>_<numero>`: nessuna collisione con
il 2025.
