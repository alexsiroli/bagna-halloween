import { Link } from 'react-router-dom';
import { ArrowRightIcon, CameraIcon, MapTrifoldIcon, TrophyIcon } from '@phosphor-icons/react';
import AlxMark from '../components/AlxMark.jsx';
import Profile from '../components/Profile.jsx';
import Skyline, { LUCI } from '../components/Skyline.jsx';
import { useAppConfig } from '../data.js';
import { formatEnd } from '../votingTime.js';

function Home() {
  const { edition, votingOpen, votingEndsAt, loaded } = useAppConfig();

  return (
    <div className="app-shell app-shell--fit home">
      <div className="home-bar">
        <Link className="icon-btn" to="/albo" aria-label="Albo d’oro" title="Albo d’oro">
          <TrophyIcon aria-hidden="true" weight="duotone" />
        </Link>
        <div className="topbar__end">
          <Profile />
          <AlxMark />
        </div>
      </div>

      <section className="home-hero">
        <h1 className="display home-hero__title">
          Halloween <span>di Bagnarola</span>
        </h1>
        <p className="status-line home-hero__status" data-open={loaded ? votingOpen : undefined}>
          <span className="status-bulb" aria-hidden="true" />
          Edizione {edition}
          {loaded && <> · {votingOpen ? 'votazioni aperte' : 'votazioni chiuse'}</>}
          {votingOpen && votingEndsAt && <> · fino alle {formatEnd(votingEndsAt)}</>}
        </p>
        <div className="home-hero__scene">
          <Skyline />
          {/* Candele nelle due zucche grandi (x 46 e 170 su 240) e nebbia: livelli HTML, l'SVG resta fermo */}
          <span className="fiamma" style={{ '--x': 19.2 }} aria-hidden="true" />
          <span className="fiamma" style={{ '--x': 70.8, '--d': '4.1s' }} aria-hidden="true" />
          {/* Luci delle case che pulsano piano: aloni HTML sopra alcune finestre accese (solo opacity) */}
          {LUCI.map(([x, y], index) => (
            <span
              key={`${x}-${y}`}
              className="luce"
              style={{ '--x': x, '--y': y, '--d': `${3.2 + (index % 4) * 0.9}s`, '--w': `${2 + (index % 5) * 0.7}s` }}
              aria-hidden="true"
            />
          ))}
          <span className="banco-nebbia" aria-hidden="true" />
        </div>
        <Link className="primary-btn primary-btn--xl home-hero__cta" to="/vote">
          Vota le case <ArrowRightIcon aria-hidden="true" weight="bold" />
        </Link>
        <nav className="home-links" aria-label="Altre sezioni">
          <Link className="secondary-btn home-link" to="/mappa">
            <MapTrifoldIcon aria-hidden="true" weight="duotone" /> Mappa
          </Link>
          <Link className="secondary-btn home-link" to="/contest">
            <CameraIcon aria-hidden="true" weight="duotone" /> Contest foto
          </Link>
        </nav>
      </section>
    </div>
  );
}

export default Home;
