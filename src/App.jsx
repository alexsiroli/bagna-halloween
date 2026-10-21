import { Link, Route, Routes } from 'react-router-dom';
import Home from './routes/Home.jsx';
import Contest from './routes/Contest.jsx';
import Vote from './routes/Vote.jsx';
import MapPage from './routes/MapPage.jsx';
import AdminGate from './routes/AdminGate.jsx';
import AlexSiroli from './routes/AlexSiroli.jsx';
import Privacy from './routes/Privacy.jsx';
import SiteFooter from './components/SiteFooter.jsx';

// La route resta configurabile, ma la protezione vera sono login Google + config/admins + regole.
const adminRouteRaw = import.meta.env.VITE_ADMIN_ROUTE || '/admin';
const adminRoute = adminRouteRaw.startsWith('/') ? adminRouteRaw : `/${adminRouteRaw}`;

const NotFound = () => (
  <div className="app-shell app-shell--narrow">
    <header className="page-head">
      <h1>Pagina non trovata</h1>
      <p>
        Il percorso che hai seguito non esiste. Torna alla <Link to="/">home</Link>.
      </p>
    </header>
  </div>
);

function App() {
  return (
    <div className="app-wrapper">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/contest" element={<Contest />} />
          <Route path="/vote" element={<Vote />} />
          <Route path="/mappa" element={<MapPage />} />
          <Route path={adminRoute} element={<AdminGate />} />
          <Route path="/alex-siroli" element={<AlexSiroli />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <SiteFooter />
    </div>
  );
}

export default App;
