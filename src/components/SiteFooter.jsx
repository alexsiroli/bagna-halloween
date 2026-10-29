import { Link } from 'react-router-dom';

// «Alex Siroli» e' un link mailto (scelta del CEO, sostituisce la vecchia regola «solo testo»).
function SiteFooter() {
  return (
    <footer className="site-footer">
      Sito sviluppato da <a
        className="site-footer__link site-footer__name"
        href="mailto:alex.siroli@gmail.com?subject=Halloween%20a%20Bagnarola"
      >
        Alex Siroli
      </a>
      {' · '}
      <Link className="site-footer__link" to="/privacy">
        Privacy
      </Link>
    </footer>
  );
}

export default SiteFooter;
