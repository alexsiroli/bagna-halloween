function Contest() {
  return (
    <div className="app-shell">
      <header>
        <p className="badge">Contest ufficiale</p>
        <h1>Contest fotografico</h1>
        <p>
          Trasforma la tua serata di Halloween in un ricordo memorabile: scatta le
          case più spaventose e condividile con la community!
        </p>
      </header>

      <div className="card">
        <h2>Come partecipare</h2>
        <p>
          1. Scatta una foto della tua casa preferita o della tua decorazione. <br />
          2. Pubblica la foto su Instagram o TikTok con l’hashtag{' '}
          <strong>#BagnaHalloween2025</strong>. <br />
          3. Tagga il profilo ufficiale dell’evento così possiamo ricondividerla. <br />
          4. In alternativa invia la foto via e-mail a{' '}
          <a href="mailto:halloween@bagna.it">halloween@bagna.it</a>.
        </p>
        <p>
          Le foto più votate saranno annunciate alla fine della serata. Buona caccia
          alle zucche!
        </p>
      </div>
    </div>
  );
}

export default Contest;
