import { Routes, Route } from 'react-router-dom';
import Home from './routes/Home.jsx';
import Contest from './routes/Contest.jsx';
import Vote from './routes/Vote.jsx';
import Admin from './routes/Admin.jsx';

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
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/contest" element={<Contest />} />
      <Route path="/vote" element={<Vote />} />
      <Route path={adminRoute} element={<Admin />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
