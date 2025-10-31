import { Routes, Route } from 'react-router-dom';
import Home from './routes/Home.jsx';
import Contest from './routes/Contest.jsx';
import Vote from './routes/Vote.jsx';
import Admin from './routes/Admin.jsx';
import AlexSiroli from './routes/AlexSiroli.jsx';
import SiteFooter from './components/SiteFooter.jsx';

const adminRouteRaw = import.meta.env.VITE_ADMIN_ROUTE || '/admin-halloween-2025';
const adminRoute = adminRouteRaw.startsWith('/') ? adminRouteRaw : `/${adminRouteRaw}`;

const NotFound = () => (
  <div className="app-shell">
    <header>
      <h1>👻 Pagina non trovata</h1>
      <p>
        Il percorso che hai seguito non esiste. Torna alla <a href="/">home</a>.
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
          <Route path={adminRoute} element={<Admin />} />
          <Route path="/alex-siroli" element={<AlexSiroli />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <SiteFooter />
    </div>
  );
}

export default App;
