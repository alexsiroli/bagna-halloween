import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@phosphor-icons/react';

function BackHomeLink() {
  return (
    <nav className="back-nav" aria-label="Torna alla home">
      <Link className="back-link" to="/">
        <ArrowLeftIcon aria-hidden="true" weight="bold" />
        Torna alla home
      </Link>
    </nav>
  );
}

export default BackHomeLink;
