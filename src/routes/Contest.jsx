import { useState } from 'react';
import { CheckIcon, CopyIcon, EyeIcon, HashIcon, InstagramLogoIcon } from '@phosphor-icons/react';
import PageHeader from '../components/PageHeader.jsx';
import Scene from '../components/Scene.jsx';
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
    <div className="app-shell app-shell--narrow app-shell--fit contest-page">
      <PageHeader title="Contest foto" />

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

      <section className="contest-rules" aria-labelledby="contest-how">
        <h2 id="contest-how">Come partecipare</h2>
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
      </section>

      {/* Lo spazio che avanza si riempie col quartiere: si stringe fino a sparire, mai scroll */}
      <Scene className="contest-scene" />
    </div>
  );
}

export default Contest;
