import { Link } from 'react-router-dom';

// «Alex Siroli» e' solo una firma: testo, mai un link.
function SiteFooter() {
  return (
    <footer className="site-footer">
      Sito sviluppato da <span className="site-footer__name">Alex Siroli</span>
      {' · '}
      <Link className="site-footer__link" to="/privacy">
        Privacy
      </Link>
    </footer>
  );
}

export default SiteFooter;
