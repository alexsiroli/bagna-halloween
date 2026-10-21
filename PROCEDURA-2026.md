# Procedura Halloween 2026: checklist

Da fare entro il **25 ottobre**, con le votazioni chiuse. Il dettaglio di ogni passo (spiegazioni, piano di ritorno) e' in [`docs/EDIZIONE-2026.md`](docs/EDIZIONE-2026.md).

**Chi fa cosa.** Il CEO lavora solo da console web e dashboard. I comandi li esegue il release-manager dal Mac mini (zsh, percorsi assoluti, `npm --prefix`, `git -C`, un comando per volta). Nessuno fa `git merge` su `main` a mano.

**L'ordine dei passi 1-6 e' tassativo.** Non invertirli e non saltarne uno.

## Prima di iniziare (CEO)
- [ ] Dashboard > Collegamenti: Firebase `bagna-halloween` collegato.
- [ ] Console Firebase: piano **Blaze** con avviso di spesa a 5 euro.
- [ ] Console Firebase > Impostazioni progetto > Account di servizio > "Genera nuova chiave privata". Consegna il JSON dalla dashboard (Consegne). Non aprirlo, non inoltrarlo.
- [ ] Immagine `public/mappa-2026.webp` pronta (circa 2400 px, sotto 600 KB), vedi guida §6. Arriva in `develop` con una PR, non con un commit su `main`.

## Prima di iniziare (release-manager)
- [ ] Cartella privata fuori dal repo: `mkdir -p /Volumes/Dev/privati/bagna-halloween`, poi `chmod 700 /Volumes/Dev/privati/bagna-halloween`.
- [ ] Sposta la chiave consegnata in `/Volumes/Dev/privati/bagna-halloween/sa.json` e `chmod 600` sul file. Cancella la copia in `consegne/in-arrivo/` e annotala in `consegne/registro.md`.
- [ ] `git -C /Volumes/Dev/repos/bagna-halloween branch --show-current` dice `develop` e l'albero e' pulito; poi `git -C /Volumes/Dev/repos/bagna-halloween pull --ff-only`.
- [ ] `npm --prefix /Volumes/Dev/repos/bagna-halloween ci`.

## 1. Salva le regole pubblicate oggi (piano di ritorno)
- [ ] **CEO, in console:** Firestore > Regole, copia tutto il testo e consegnalo dalla dashboard come file di testo. E' il piano di ritorno.
- [ ] **Release-manager:** salva il file in `/Volumes/Dev/privati/bagna-halloween/regole-pubblicate.rules`.

## 2. Allowlist admin
- [ ] **CEO, in console:** Firestore > Dati > collezione `config`, documento `admins`, campo `emails` di tipo array con le email Google degli organizzatori, **in minuscolo**, una per elemento.

## 3. Archivia il 2025 (fuori dal repo)
- [ ] **Release-manager:**
```zsh
env GOOGLE_APPLICATION_CREDENTIALS=/Volumes/Dev/privati/bagna-halloween/sa.json node /Volumes/Dev/repos/bagna-halloween/scripts/export-edition.mjs 2025 --out /Volumes/Dev/privati/bagna-halloween
```
Crea `/Volumes/Dev/privati/bagna-halloween/edizione-2025.json` (contiene i votanti: mai nel repo). Lo script rifiuta `--out` dentro il repo.

## 4. Prepara il 2026 (prova, poi `--apply`)
- [ ] **Release-manager, prova** (non scrive nulla; se il piano non torna, ferma tutto e scrivi al tech-lead):
```zsh
env GOOGLE_APPLICATION_CREDENTIALS=/Volumes/Dev/privati/bagna-halloween/sa.json node /Volumes/Dev/repos/bagna-halloween/scripts/prepare-edition.mjs --from 2025 --to 2026 --export-dir /Volumes/Dev/privati/bagna-halloween
```
- [ ] **Release-manager, applica** (stesso comando con `--apply` in fondo).

## 5. Pubblica le regole
- [ ] **Release-manager:**
```zsh
firebase deploy --only firestore:rules --project bagna-halloween --config /Volumes/Dev/repos/bagna-halloween/firebase.json
```

Da questo momento il vecchio sito non salva piu' voti: passa subito al passo 6.

## 6. Sito (solo dopo il passo 5)
- [ ] **Release-manager:** su Netlify NON impostare `VITE_MAP_IMAGE` ne' `VITE_USE_EMULATORS`. `VITE_ADMIN_ROUTE` e' facoltativa.
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
- [ ] **Entro 30 giorni dalla premiazione, release-manager:** cancella l'export e i voti: `rm /Volumes/Dev/privati/bagna-halloween/edizione-2025.json` e gli eventuali altri export, poi la cartella (`rmdir`). I voti si cancellano da Firestore (collezione `votes`) solo con una richiesta esplicita del tech-lead.
- [ ] **CEO, in console Google Cloud > IAM > Account di servizio:** revoca (elimina) la chiave del service account. Il release-manager cancella `sa.json`.
- [ ] **Release-manager:** scrive nella issue che export e chiave sono stati eliminati, con la data.

## Se qualcosa va storto
- **Regole:** il CEO incolla in Console > Firestore > Regole il testo salvato al passo 1 e pubblica.
- **Sito:** il CEO rimette online il deploy precedente da Netlify (Deploys > Publish deploy).
