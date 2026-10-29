import BackHomeLink from '../components/BackHomeLink.jsx';

// Testo approvato dal privacy-officer (HQ: reports/privacy/2026-10-20-bagna-halloween-informativa.md).
// Rif. pratica #E00000 (non va nella pagina pubblica). [REGIONE FIREBASE] resta visibile finché non verificata in console.
function Privacy() {
  return (
    <div className="app-shell app-shell--narrow">
      <BackHomeLink />
      <header className="page-head">
        <h1>Privacy</h1>
        <p>Ultimo aggiornamento: 28 ottobre 2026</p>
      </header>

      <article className="panel privacy-text">
        <h2>Chi tratta i tuoi dati</h2>
        <p>
          Il titolare è Alex Siroli, organizzatore delle votazioni "Halloween a Bagnarola" (Cesenatico, 31 ottobre
          2026). Per qualsiasi domanda scrivi a{' '}
          <a className="email-link" href="mailto:privacy@alxstudio.it">
            privacy@alxstudio.it
          </a>
          .
        </p>

        <h2>Quali dati usiamo e perché</h2>
        <p>
          Per votare accedi con Google. Google ci fornisce un identificativo tecnico del tuo account (e l'email, che
          resta nel sistema di accesso). Il tuo nome Google lo vedi solo nell'app mentre sei collegato: non lo
          salviamo.
        </p>
        <p>
          Per ogni voto salviamo: l'identificativo dell'account, il numero della casa, il punteggio (da 6 a 10),
          l'edizione e le date del voto. Servono solo a fare la classifica, premiare le case e permettere un solo voto
          per casa. La base giuridica è la fornitura del servizio di voto che richiedi accedendo (art. 6.1.b GDPR).
        </p>
        <p>
          Non pubblichiamo chi ha votato cosa. I voti sono visibili solo agli organizzatori autorizzati, con
          l'identificativo dell'account.
        </p>
        <p>
          Le case in mappa mostrano numero, nome dello spettacolo (o "Casa n."), via e numero civico, pubblicati con il
          consenso dei partecipanti. Non pubblichiamo il cognome delle famiglie. Chi ospita può chiedere in qualsiasi
          momento di togliere la propria casa dalla mappa, scrivendo a privacy@alxstudio.it.
        </p>

        <h2>Cookie e strumenti</h2>
        <p>
          Nessun analytics, nessuna pubblicità, nessun cookie di terzi. Il browser conserva solo i dati tecnici della
          tua sessione di accesso, necessari per tenerti collegato. Per questo non c'è un banner dei cookie.
        </p>
        <p>
          La mappa non usa cookie. Per mostrarla, il tuo browser scarica le immagini direttamente da OpenStreetMap (vedi
          sotto).
        </p>

        <h2>Chi li riceve</h2>
        <ul>
          <li>Google (Firebase: accesso e database). I dati sono nella regione [REGIONE FIREBASE].</li>
          <li>Netlify (hosting del sito, che registra tecnicamente le visite).</li>
        </ul>
        <p>
          Google e Netlify trattano i dati per nostro conto. Alcuni possono trattarli anche fuori dall'Unione Europea
          (ad esempio negli USA): in quel caso si usano le clausole contrattuali standard della Commissione europea o
          il Data Privacy Framework.
        </p>
        <p>
          La mappa è di OpenStreetMap Foundation. Le immagini non passano da noi: le scarica il tuo browser dai suoi
          server, che vedono il tuo indirizzo IP, il tipo di browser e il sito da cui arrivi. OpenStreetMap non lavora
          per noi: usa questi dati per conto proprio, secondo la sua informativa (osmfoundation.org/wiki/Privacy_Policy),
          e i suoi server possono trovarsi anche fuori dall'Unione Europea. Lo facciamo per mostrarti dove sono le case.
          Non c'è nessun cookie, e non colleghiamo la tua visita alla mappa al tuo voto.
        </p>

        <h2>Per quanto tempo</h2>
        <p>Voti e account di accesso sono cancellati entro 30 giorni dalla premiazione.</p>

        <h2>I tuoi diritti</h2>
        <p>
          Puoi chiedere accesso, correzione, cancellazione, limitazione e opposizione (artt. 15-21 GDPR) scrivendo a{' '}
          <a className="email-link" href="mailto:privacy@alxstudio.it">
            privacy@alxstudio.it
          </a>
          . Se pensi che i tuoi dati non siano trattati bene, puoi fare reclamo al Garante per la protezione dei dati
          personali (
          <a className="email-link" href="https://www.garanteprivacy.it" rel="noopener noreferrer">
            garanteprivacy.it
          </a>
          ).
        </p>
      </article>
    </div>
  );
}

export default Privacy;
