# Procedura Halloween 2026: checklist

Da fare entro il **25 ottobre**, con le votazioni chiuse. Tempo: circa 40 minuti.
Il dettaglio di ogni passo (comandi, spiegazioni, piano di ritorno) e' in [`docs/EDIZIONE-2026.md`](docs/EDIZIONE-2026.md).

## Prima di iniziare
- [ ] `firebase login` fatto. Verifica l'id del progetto in Console > Impostazioni progetto: probabilmente `bagna-halloween`.
- [ ] Service account scaricato FUORI dal repo, poi `$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\Users\alexs\segreti\bagna-halloween-sa.json"`.
- [ ] Immagine `public/mappa-2026.webp` pronta (circa 2400 px, sotto 600 KB). Il comando `magick` e' nella guida, §6.

## 1. Porta il branch su main
```powershell
cd C:\Users\alexs\Documents\Progetti\bagna-halloween
git merge redesign/bagna-halloween-2026
npm install
npm test          # 6 test regole + 4 smoke sull'emulatore (serve Java)
```

## 2. Produzione: dati e regole (nell'ordine)
- [ ] **Salva le regole attuali:** Console > Firestore > Regole, copia il testo. E' il piano di ritorno.
- [ ] **Allowlist admin:** crea `config/admins` con `emails: ["tua@email"]`, array in minuscolo.
- [ ] **Archivia il 2025:** `node scripts/export-edition.mjs 2025`. Conserva `exports/` in un posto privato: contiene i votanti.
- [ ] **Prepara il 2026:** prima la prova, `node scripts/prepare-edition.mjs --from 2025 --to 2026`; se il piano torna, `... --apply`.
- [ ] **Pubblica le regole:** `firebase deploy --only firestore:rules --project <ID>`.

Da questo momento il vecchio sito non salva piu' voti: fai subito il passo 3.

## 3. Sito
- [ ] Commit di `public/mappa-2026.webp`, poi `git push`.
- [ ] Su Netlify: NON impostare `VITE_MAP_IMAGE` ne' `VITE_USE_EMULATORS`. `VITE_ADMIN_ROUTE` e' facoltativa.
- [ ] Deploy di anteprima.

## 4. Prova generale (sull'anteprima, da telefono)
- [ ] Home: "Edizione 2026 · votazioni chiuse".
- [ ] Admin con un account non in lista: risponde "non autorizzato".
- [ ] Admin con il tuo account: aggiungi le case 2026 e posiziona ognuna cliccando sulla mappa.
- [ ] Apri le votazioni, vota una casa, controlla "I miei voti", poi rimetti in pausa.
- [ ] Mappa: la torcia segue il dito e "Accendi le luci" funziona. La torcia finora e' stata provata solo con il touch emulato.
- [ ] Deploy di produzione.

## 5. La sera del 31 ottobre
- [ ] "Apri votazioni".
- [ ] A fine serata "Metti in pausa", poi "Pubblica classifica": le case si accendono sulla mappa in ordine.

## Se qualcosa va storto
Incolla in Console > Firestore > Regole il testo salvato al passo 2 e pubblica. Poi rimetti online il deploy precedente da Netlify (Deploys > Publish deploy).
