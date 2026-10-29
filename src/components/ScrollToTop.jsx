import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Cambio di pagina: si riparte dall'alto, come in un sito normale (BrowserRouter non lo fa da solo).
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default ScrollToTop;
