# bagna-halloween

Web app per l evento di Halloween a Cesenatico con mappa delle case addobbate, valutazioni con accesso Google (ogni voto è legato all'account e non è mostrato pubblicamente) e classifica per premiare le migliori.

## Alx Studio

Progetto gestito dagli agenti di Alx Studio: regole complete in `~/AlxStudio/CLAUDE.md` e
`~/AlxStudio/.claude/rules/`. Scheda: `~/AlxStudio/knowledge/bagna-halloween.md`.

- Branch: `main` = produzione (solo via PR di release approvata dal CEO), `develop` = integrazione,
  lavoro su `feat/<ticket>-<nome>` o `fix/<ticket>-<nome>` in un worktree (`wt bagna-halloween <ticket> <slug>`).
- Conventional Commits. Ogni PR verso `develop` chiude una issue (`Closes #n`).
- La PR non si unisce con la CI rossa (job obbligatori: test e build). Lint, typecheck e analyze
  sono informativi finché le issue di debito non sono chiuse.
- Nessun segreto nel repo: `.env` è locale, le variabili sono in `.env.example`.
- Stack: react, vite. Spec in `docs/spec/`, ADR in `docs/adr/`.

## Agent skills

### Issue tracker

Le issue vivono in GitHub Issues di alexsiroli/bagna-halloween (CLI `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Etichette predefinite: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: un `CONTEXT.md` e `docs/adr/` alla radice. See `docs/agents/domain.md`.
