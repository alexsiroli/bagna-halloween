import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import PageHeader from '../components/PageHeader.jsx';
import MyVotes from '../components/MyVotes.jsx';
import VoteSheet, { ClosedTag } from '../components/VoteSheet.jsx';
import { GoogleSignInButton, LitPumpkin } from '../components/SignIn.jsx';
import { loginWithGoogle, useAuthUser } from '../auth.js';
import { useAppConfig, useHouses } from '../data.js';
import { countVoted, isVoted, useMyVotes } from '../myVotes.js';

// Filo di lampadine su righe piene: al massimo 20 per riga, righe pareggiate (25 case = 13 + 12).
const bulbColumns = (count) => Math.ceil(count / Math.ceil(count / 20)) || 1;

function Vote() {
  const user = useAuthUser();
  const config = useAppConfig();
  const { edition } = config;
  const { houses, loading: loadingHouses, error: housesError } = useHouses(edition);
  const { votesMap, ready: votesReady, error: votesError } = useMyVotes(user, edition);
  const [error, setError] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [selected, setSelected] = useState(null);
  const [savedHouse, setSavedHouse] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const totalVisible = houses.length;
  const totalRated = countVoted(houses, votesMap);
  const progressPercent = totalVisible ? (totalRated / totalVisible) * 100 : 0;

  const handleLogin = async () => {
    setError(await loginWithGoogle());
  };

  const openHouseModal = useCallback((house) => {
    setSelected(house);
    setSearchMessage('');
  }, []);

  // Arrivo dalla mappa: /vote?casa=12 apre subito la casa (dopo il login).
  // Arrivo dal QR: /vota/12 (l'URL resta; il messaggio per numeri sbagliati e' nel render).
  const { numero } = useParams();
  const requestedHouse = Number(numero ?? searchParams.get('casa'));
  const qrOpened = useRef(false);
  const qrHouse = numero === undefined ? null : houses.find((item) => item.number === requestedHouse);
  const qrInvalid = numero !== undefined && !loadingHouses && !housesError && !qrHouse;
  useEffect(() => {
    if (!user || loadingHouses || !votesReady || !requestedHouse) return;
    if (numero !== undefined) {
      if (qrHouse && !qrOpened.current) {
        qrOpened.current = true;
        openHouseModal(qrHouse);
      }
      return;
    }
    const house = houses.find((item) => item.number === requestedHouse);
    if (house) openHouseModal(house);
    else setSearchMessage(`Nessuna casa ${requestedHouse} trovata (forse è nascosta).`);
    setSearchParams({}, { replace: true });
  }, [user, loadingHouses, votesReady, houses, requestedHouse, numero, qrHouse, openHouseModal, setSearchParams]);

  const handleHouseSelectFromList = useCallback(
    (houseNumber) => {
      const house = houses.find((item) => item.number === houseNumber);
      if (!house) return;
      openHouseModal(house);
    },
    [houses, openHouseModal],
  );

  const handleSaved = (saved) => {
    setSavedHouse(saved);
    setSelected(null);
    // La prossima casa e' gia' pronta: campo numero vuoto (il dialog rimette il focus da dove eri).
    setSearchValue('');
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const trimmed = searchValue.trim();
    if (!trimmed) {
      setSearchMessage('Inserisci un numero di casa.');
      return;
    }
    const targetNumber = Number.parseInt(trimmed, 10);
    if (Number.isNaN(targetNumber)) {
      setSearchMessage('Inserisci un numero di casa valido.');
      return;
    }

    const house = houses.find((item) => item.number === targetNumber);
    if (!house) {
      setSearchMessage(`Nessuna casa ${targetNumber} trovata (forse è nascosta).`);
      return;
    }

    openHouseModal(house);
  };

  const shownError = error || votesError || housesError;

  return (
    <div className="app-shell app-shell--narrow app-shell--fit vote-page">
      <PageHeader title="Vota le case" />
      {config.loaded && !config.votingOpen && <ClosedTag />}

      {shownError && (
        <div className="notice notice--error" role="alert">
          <strong>Attenzione:</strong> {shownError}
        </div>
      )}

      {qrInvalid && (
        <div className="notice" role="status">
          La casa {numero} non esiste in questa edizione.{' '}
          {user ? 'Cerca il numero giusto qui sotto o apri la ' : 'Controlla il numero sul cartello o apri la '}
          <Link to="/mappa">mappa</Link>.
        </div>
      )}

      {user === null && (
        <section className="panel login-panel">
          <LitPumpkin />
          <h2>Accedi per votare</h2>
          {qrHouse && (
            <p>
              <strong>
                Stai per votare la casa {qrHouse.number} · {qrHouse.title || 'Senza titolo'}
              </strong>
            </p>
          )}
          <p>Usa il tuo account Google per esprimere i voti. Un voto per casa, modificabile finché le votazioni sono aperte.</p>
          <GoogleSignInButton onClick={handleLogin} />
          <Link className="email-link privacy-link" to="/privacy">
            Privacy
          </Link>
        </section>
      )}

      {user && (
        <>
          <form className="search-bar" onSubmit={handleSearchSubmit}>
            <label htmlFor="house-search" className="sr-only">
              Inserisci numero casa
            </label>
            <div className="search-bar__row">
              <input
                id="house-search"
                type="number"
                inputMode="numeric"
                min="1"
                placeholder="Inserisci numero casa"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                disabled={loadingHouses}
                enterKeyHint="go"
              />
              <button type="submit" className="primary-btn" disabled={loadingHouses} aria-label="Cerca">
                <MagnifyingGlassIcon aria-hidden="true" weight="bold" />
              </button>
            </div>
            {searchMessage && (
              <p className="field-message" role="status">
                {searchMessage}
              </p>
            )}
          </form>

          <div className="vote-progress">
            <p>
              Case votate <strong>{totalRated}</strong> su {totalVisible || 'nessuna'}
            </p>
            <div
              className="bulb-string"
              style={{ '--cols': bulbColumns(totalVisible) }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progressPercent)}
              aria-label={`${totalRated} case votate su ${totalVisible}`}
            >
              {houses.map((house) => (
                <span key={house.id} className="bulb" data-lit={isVoted(votesMap.get(house.number))} />
              ))}
            </div>
          </div>

          {savedHouse && (
            <p className="notice notice--saved" role="status" key={`${savedHouse.number}-${savedHouse.score}`}>
              {savedHouse.deleted
                ? `Voto cancellato: casa ${savedHouse.number}.`
                : `Voto salvato: casa ${savedHouse.number}, ${savedHouse.score} su 10.`}
            </p>
          )}

          <MyVotes
            houses={houses}
            votesMap={votesMap}
            loading={loadingHouses || !votesReady}
            onHouseSelect={handleHouseSelectFromList}
            highlight={savedHouse?.number}
          />
        </>
      )}

      <VoteSheet house={selected} user={user} config={config} onClose={() => setSelected(null)} onSaved={handleSaved} />
    </div>
  );
}

export default Vote;
