# Procedura Halloween 2026: checklist

Da fare entro il **25 ottobre**, con le votazioni chiuse. Il dettaglio di ogni passo (spiegazioni, piano di ritorno) e' in [`docs/EDIZIONE-2026.md`](docs/EDIZIONE-2026.md).

**Chi fa cosa.** Il CEO lavora solo da console web e dashboard. I comandi li esegue il release-manager dal Mac mini (zsh, percorsi assoluti, `npm --prefix`, `git -C`, un comando per volta). Nessuno fa `git merge` su `main` a mano.

**L'ordine dei passi 1-6 e' tassativo.** Non invertirli e non saltarne uno. Le regole vengono prima di export e prepare perche' questi due usano l'Admin SDK e non dipendono dalle regole: cosi' la finestra in cui chiunque puo' scrivere tra gli admin si chiude prima.

## Prima di iniziare (CEO)
- [ ] Dashboard > Collegamenti: Firebase `bagna-halloween` collegato.
- [ ] Console Firebase: piano **Blaze** con avviso di spesa a 5 euro.
- [ ] Chiave per gli script. Consigliato: in Google Cloud > IAM crea un account di servizio dedicato con il solo ruolo **Cloud Datastore User** e genera da li' la chiave JSON. In alternativa, Console Firebase > Impostazioni progetto > Account di servizio > "Genera nuova chiave privata" (ruoli piu' ampi). Consegna il JSON dalla dashboard (Consegne). Non aprirlo, non inoltrarlo.
- [ ] Immagine `public/mappa-2026.webp` pronta (circa 2400 px, sotto 600 KB), vedi guida §6. Arriva in `develop` con una PR, non con un commit su `main`.

## Prima di iniziare (release-manager)
- [ ] Cartella privata fuori dal repo: `mkdir -p /Volumes/Dev/privati/bagna-halloween`, poi `chmod 700 /Volumes/Dev/privati/bagna-halloween`.
- [ ] Sposta la chiave consegnata in `/Volumes/Dev/privati/bagna-halloween/service-account.json` (proprio questo nome: i divieti di lettura degli agenti coprono `*service-account*.json`) e `chmod 600` sul file. Cancella la copia in `consegne/in-arrivo/` e annotala in `consegne/registro.md`. Scrivi nella issue #7 la data di consegna della chiave.
- [ ] Checkout su `develop` con albero pulito: `git -C /Volumes/Dev/repos/bagna-halloween status --short` non stampa nulla; se `branch --show-current` dice `main`, `git -C /Volumes/Dev/repos/bagna-halloween switch develop`; poi `git -C /Volumes/Dev/repos/bagna-halloween pull --ff-only`.
- [ ] `npm --prefix /Volumes/Dev/repos/bagna-halloween ci`.

## 1. Salva le regole pubblicate oggi (piano di ritorno)
- [ ] **CEO, in console:** Firestore > Regole, copia tutto il testo e consegnalo dalla dashboard come file di testo. E' il piano di ritorno.
- [ ] **Release-manager:** salva il file in `/Volumes/Dev/privati/bagna-halloween/regole-pubblicate.rules`.

## 2. Allowlist admin
- [ ] **CEO, in console:** Firestore > Dati > collezione `config`, documento `admins`, campo `emails` di tipo array con le email Google degli organizzatori, **in minuscolo**, una per elemento.

## 3. Pubblica le regole
- [ ] `firebase deploy` dagli agenti oggi e' negato dal guard: prima del passo serve il permesso del CEO (`ops/bin/chiedi-permesso`), chiesto dal release-manager.
- [ ] **Release-manager:**
```zsh
firebase deploy --only firestore:rules --project bagna-halloween --config /Volumes/Dev/repos/bagna-halloween/firebase.json
```

Da questo momento il vecchio sito non salva piu' voti (le votazioni sono gia' chiuse): non e' un problema, si passa al sito dopo i passi 4 e 5.

## 3b. Ricontrollo in console (CEO), subito dopo il passo 3
Fino al passo 3 le regole vecchie potevano essere aperte: qualcuno puo' aver scritto dati nel frattempo. In console il CEO controlla:
- [ ] `config/admins`, campo `emails`: ci sono **solo** le email attese.
- [ ] `config/app` e `config/results`: nessun valore estraneo.
- [ ] Collezione `houses`: nessuna casa con id `2026_*` gia' presente.

**Se qualcosa non torna, ferma tutto e avvisa il tech-lead.** Non andare avanti con i passi 4-6.

## 4. Archivia il 2025 (fuori dal repo)
- [ ] **Release-manager:**
```zsh
node /Volumes/Dev/repos/bagna-halloween/scripts/export-edition.mjs 2025 --out /Volumes/Dev/privati/bagna-halloween --key /Volumes/Dev/privati/bagna-halloween/service-account.json
```
Crea `/Volumes/Dev/privati/bagna-halloween/edizione-2025.json` (contiene i votanti: mai nel repo; permessi 600). Lo script rifiuta `--out` e `--key` dentro il repo, anche tramite symlink.

## 5. Prepara il 2026 (prova, poi `--apply`)
- [ ] **Release-manager, prova** (non scrive nulla; se il piano non torna, ferma tutto e scrivi al tech-lead):
```zsh
node /Volumes/Dev/repos/bagna-halloween/scripts/prepare-edition.mjs --from 2025 --to 2026 --export-dir /Volumes/Dev/privati/bagna-halloween --key /Volumes/Dev/privati/bagna-halloween/service-account.json
```
- [ ] **Release-manager, applica** (stesso comando con `--apply` in fondo).

## 5b. Revoca la chiave (subito dopo il passo 5)
I passi 6-7 non la usano.
- [ ] **CEO, in console Google Cloud > IAM > Account di servizio:** elimina la chiave (e, se creato apposta, l'account di servizio).
- [ ] **Release-manager:** `rm /Volumes/Dev/privati/bagna-halloween/service-account.json`, poi scrive nella issue #7 le date di consegna e di revoca.

## 6. Sito (solo dopo il passo 5)
- [ ] **Release-manager:** su Netlify NON impostare `VITE_MAP_IMAGE` ne' `VITE_USE_EMULATORS`. `VITE_ADMIN_ROUTE` e' facoltativa.
- [ ] **Release-manager:** su Netlify `VITE_FIREBASE_AUTH_DOMAIN` deve valere il dominio del sito servito: oggi `bagna-halloween.netlify.app`, `halloween.alxstudio.it` quando ci sara' il dominio (da autorizzare anche in Firebase Auth). Le variabili si scrivono solo con `python3 /Users/alexsiroli/AlxStudio/ops/bin/imposta-env netlify <progetto> <NOME> <ambiente>` (valore messo dal CEO nel Portachiavi da dashboard > Collegamenti).
- [ ] **Release-manager:** anteprima Netlify da `develop`.
- [ ] **CEO, da telefono, sull'anteprima (prova generale):**
  - [ ] Home: "Edizione 2026 · votazioni chiuse".
  - [ ] Admin con un account non in lista: risponde "non autorizzato".
  - [ ] Admin con il tuo account: aggiungi le case 2026 e posiziona ognuna cliccando sulla mappa.
  - [ ] Apri le votazioni, vota una casa, controlla "I miei voti", poi rimetti in pausa.
  - [ ] Mappa: la torcia segue il dito e "Accendi le luci" funziona.
- [ ] **Release-manager:** apre la PR di release `develop` verso `main`. **CEO:** conferma dalla dashboard (Serve te > Release pronta). Il release-manager esegue il merge solo dopo quella conferma.

## 7. La sera del 31 ottobre (CEO, dall'area admin)
- [ ] "Apri votazioni".
- [ ] A fine serata "Metti in pausa", poi "Pubblica classifica": le case si accendono sulla mappa in ordine.

## Dopo l'evento
- [ ] **Entro il 2026-11-30, release-manager** (data fissa, da mettere nel calendario): cancella prima i file e poi la cartella:
```zsh
rm /Volumes/Dev/privati/bagna-halloween/edizione-2025.json
rm /Volumes/Dev/privati/bagna-halloween/regole-pubblicate.rules
rmdir /Volumes/Dev/privati/bagna-halloween
```
  Se nella cartella restano altri export, cancellali prima di `rmdir`. Poi scrive nella issue #7 che export e regole salvate sono stati eliminati, con la data.
- **Voti in Firestore (2025 e 2026):** la durata di conservazione la decide il privacy-officer, sull'informativa. Fino ad allora restano nel database e non si cancellano. Se servira' cancellarli, serve una nuova chiave per quell'operazione e una richiesta esplicita del tech-lead.

## Se qualcosa va storto
- **Regole:** il CEO incolla in Console > Firestore > Regole il testo salvato al passo 1 e pubblica.
- **Sito:** il CEO rimette online il deploy precedente da Netlify (Deploys > Publish deploy).
