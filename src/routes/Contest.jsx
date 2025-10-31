import BackHomeLink from '../components/BackHomeLink.jsx';

function Contest() {
  return (
    <div className="app-shell contest-page">
      <BackHomeLink />
      <header>
        <p className="badge">Contest ufficiale</p>
        <h1>Contest fotografico</h1>
      </header>

      <div className="card contest-card">
        <h2>Come partecipare</h2>
        <p className="contest-intro">
          Partecipa al nostro contest fotografico e racconta la tua notte di Halloween!
        </p>
        <ul className="contest-list">
          <li>
            <strong className="contest-highlight">Crea la tua storia:</strong> Condividi una
            storia su Instagram che metta in mostra la tua casa o la decorazione più paurosa.
          </li>
          <li>
            <strong className="contest-highlight">Profilo pubblico obbligatorio:</strong> Il tuo
            account deve essere visibile (non privato) così possiamo trovarti e ricondividere.
          </li>
          <li>
            <strong className="contest-highlight">Hashtag ben visibile:</strong> Inserisci
            chiaramente l'hashtag{' '}
            <strong className="contest-highlight">#BagnaHalloween2025</strong> nella storia per
            partecipare ufficialmente.
          </li>
        </ul>
        <p className="contest-note">
          Le storie più belle riceveranno un{' '}
          <span className="contest-highlight">premio speciale</span>: libera tutta la tua
          creatività e spaventa la giuria!
        </p>
      </div>
    </div>
  );
}

export default Contest;
