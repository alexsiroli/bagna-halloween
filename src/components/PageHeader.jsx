import { Link } from 'react-router-dom';
import { CaretLeftIcon } from '@phosphor-icons/react';
import Profile from './Profile.jsx';

// Intestazione delle pagine interne: bottone tondo indietro (come l'avatar del profilo), titolo, profilo (se c'e' l'accesso).
function PageHeader({ title }) {
  return (
    <header className="topbar">
      <Link className="icon-btn topbar__back" to="/" aria-label="Torna alla home">
        <CaretLeftIcon aria-hidden="true" weight="bold" />
      </Link>
      <h1 className="topbar__title">{title}</h1>
      <div className="topbar__end">
        <Profile />
      </div>
    </header>
  );
}

export default PageHeader;
