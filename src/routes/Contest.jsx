import { useState } from 'react';
import { CheckIcon, CopyIcon, EyeIcon, HashIcon, InstagramLogoIcon } from '@phosphor-icons/react';
import BackHomeLink from '../components/BackHomeLink.jsx';
import { useAppConfig } from '../data.js';

function Contest() {
  const { edition } = useAppConfig();
  const hashtag = `#BagnaHalloween${edition}`;
  const [copied, setCopied] = useState(false);

  const copyHashtag = async () => {
    try {
      await navigator.clipboard.writeText(hashtag);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copia non riuscita', err);
    }
  };

  return (
    <div className="app-shell app-shell--narrow contest-page">
      <BackHomeLink />
      <header className="page-head">
        <h1>Contest fotografico</h1>
        <p className="contest-intro">
          Partecipa al nostro contest fotografico e racconta la tua notte di Halloween!
        </p>
      </header>

      <div className="hashtag-plate">
        <span className="hashtag-plate__tag">{hashtag}</span>
        <button type="button" className="chip-btn" onClick={copyHashtag}>
          {copied ? (
            <>
              <CheckIcon aria-hidden="true" weight="bold" /> Copiato
            </>
          ) : (
            <>
              <CopyIcon aria-hidden="true" weight="bold" /> Copia l’hashtag
            </>
          )}
        </button>
        <span className="sr-only" aria-live="polite">
          {copied ? 'Hashtag copiato' : ''}
        </span>
      </div>

      <details className="panel contest-rules">
        <summary>Regolamento</summary>
        <h2>Come partecipare</h2>
        <ul className="contest-list">
          <li>
            <InstagramLogoIcon className="contest-list__icon" aria-hidden="true" weight="duotone" />
            <p>
              <strong className="contest-highlight">Crea la tua storia:</strong> Condividi una storia
              su Instagram che metta in mostra la tua casa o la decorazione più paurosa.
            </p>
          </li>
          <li>
            <EyeIcon className="contest-list__icon" aria-hidden="true" weight="duotone" />
            <p>
              <strong className="contest-highlight">Profilo pubblico obbligatorio:</strong> Il tuo
              account deve essere visibile (non privato) così possiamo trovarti e ricondividere.
            </p>
          </li>
          <li>
            <HashIcon className="contest-list__icon" aria-hidden="true" weight="duotone" />
            <p>
              <strong className="contest-highlight">Hashtag ben visibile:</strong> Inserisci
              chiaramente l’hashtag <strong className="contest-highlight">{hashtag}</strong> nella
              storia per partecipare ufficialmente.
            </p>
          </li>
        </ul>
        <p className="contest-note">
          Le storie più belle riceveranno un <span className="contest-highlight">premio speciale</span>:
          libera tutta la tua creatività e spaventa la giuria!
        </p>
      </details>
    </div>
  );
}

export default Contest;
