import { casettaHtml } from '../casetta.js';

// Decorativa: il numero e lo stato stanno sempre anche nel testo o nel nome accessibile accanto.
function Casetta({ number, lit = false, kind, size }) {
  return (
    <span
      className={`casetta-slot${size === 'lg' ? ' casetta-slot--lg' : ''}`}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: casettaHtml(number, { lit, kind }) }}
    />
  );
}

export default Casetta;
