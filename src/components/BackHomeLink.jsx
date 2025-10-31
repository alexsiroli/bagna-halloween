import { Link } from 'react-router-dom';

function BackHomeLink() {
  return (
    <nav className="back-nav" aria-label="Torna alla home">
      <Link className="back-link" to="/">
        <span aria-hidden="true">←</span>
        Torna alla home
      </Link>
    </nav>
  );
}

export default BackHomeLink;
