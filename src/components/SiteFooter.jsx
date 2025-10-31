import { Link } from 'react-router-dom';

function SiteFooter() {
  return (
    <footer className="site-footer">
      Sito sviluppato da{' '}
      <Link className="site-footer__link" to="/alex-siroli">
        Alex Siroli
      </Link>
    </footer>
  );
}

export default SiteFooter;
