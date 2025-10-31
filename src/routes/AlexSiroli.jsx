import { Link } from 'react-router-dom';

function AlexSiroli() {
  return (
    <div className="app-shell">
      <nav className="back-nav">
        <Link className="back-link" to="/">
          <span aria-hidden="true">←</span> Torna alla home
        </Link>
      </nav>

      <header>
        <h1>Alex Siroli</h1>
        <p>Ho creato questo sito!</p>

        <p>
          Se vuoi un sito per un evento e per la tua azienda contattami a{' '}
          <a className="email-link" href="mailto:alex.siroli@gmail.com">
            alex.siroli@gmail.com
          </a>
          .
        </p>
      </header>
      
    </div>
  );
}

export default AlexSiroli;
