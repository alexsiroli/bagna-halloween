import { Link, Navigate, Route, Routes, matchPath, useLocation } from 'react-router-dom';
import Home from './routes/Home.jsx';
import Contest from './routes/Contest.jsx';
import Vote from './routes/Vote.jsx';
import MapPage from './routes/MapPage.jsx';
import AdminGate from './routes/AdminGate.jsx';
import Privacy from './routes/Privacy.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import BackHomeLink from './components/BackHomeLink.jsx';
import Splash from './components/Splash.jsx';

// La route e' fissa: la protezione vera sono login Google + config/admins + regole.
const adminRoute = '/admin';

const NotFound = () => (
  <div className="app-shell app-shell--narrow">
    <BackHomeLink />
    <header className="page-head">
      <h1>Pagina non trovata</h1>
      <p>
        Il percorso che hai seguito non esiste. Torna alla <Link to="/">home</Link>.
      </p>
    </header>
  </div>
);

// Chi arriva da un QR di voto o dall'admin va dritto al contenuto, senza splash.
const noSplash = (pathname) => ['/vote', '/vota/:numero', adminRoute].some((path) => matchPath(path, pathname));

function App() {
  const { pathname } = useLocation();
  return (
    <div className="app-wrapper">
      <Splash skip={noSplash(pathname)} />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/contest" element={<Contest />} />
          <Route path="/vote" element={<Vote />} />
          <Route path="/vota/:numero" element={<Vote />} />
          <Route path="/mappa" element={<MapPage />} />
          <Route path={adminRoute} element={<AdminGate />} />
          <Route path="/alex-siroli" element={<Navigate to="/" replace />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <SiteFooter />
    </div>
  );
}

export default App;
