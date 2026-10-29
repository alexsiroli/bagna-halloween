import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import Profile from './Profile.jsx';

// Intestazione delle pagine interne: freccia indietro, titolo, profilo (se c'e' l'accesso).
function PageHeader({ title }) {
  return (
    <header className="topbar">
      <Link className="icon-btn topbar__back" to="/" aria-label="Torna alla home">
        <ArrowLeftIcon aria-hidden="true" weight="bold" />
      </Link>
      <h1 className="topbar__title">{title}</h1>
      <div className="topbar__end">
        <Profile />
      </div>
    </header>
  );
}

export default PageHeader;
