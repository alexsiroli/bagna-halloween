# Sicurezza: problemi riscontrati

Rilevati il 2026-09-29 durante il redesign (branch `redesign/bagna-halloween-2026`).

## Risolti nel branch (da pubblicare con PROCEDURA-2026.md)
- **Area admin protetta solo da un URL segreto.** Ora richiede il login Google e l'appartenenza alla allowlist `config/admins`.
- **Regole non versionate.** `firestore.rules` e' ora nel repo, testato sull'emulatore (6 test):
  - `houses` e `config` scrivibili solo dagli admin;
  - un voto si crea o modifica solo se e' tuo, intero da 6 a 10, dell'edizione corrente e a votazioni aperte;
  - i voti degli altri non si leggono.

## Aperti
1. **Le regole pubblicate oggi sono sconosciute.** Se permettono a chiunque di scrivere `houses` o `config`, il sito resta esposto finche' non pubblichi quelle nuove. Salvale e confrontale (PROCEDURA-2026.md, passo 1).
2. **Voti su case inesistenti.** Le regole non controllano che la casa votata esista. Il rischio e' basso: le medie mostrano solo le case reali. Da aggiungere con un `exists()` sulla casa dell'edizione.
3. **Export dei voti.** `edizione-2025.json` contiene uid e nomi dei votanti: lo script lo scrive solo fuori dal repo (`--out`, es. `/Volumes/Dev/privati/bagna-halloween/`) e si cancella entro 30 giorni dalla premiazione.
4. **Service account.** Revoca la chiave dopo il passaggio d'edizione (Google Cloud > IAM > Account di servizio).
