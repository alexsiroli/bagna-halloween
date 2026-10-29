import googleG from '../assets/google-g.svg';

// Bottone «Accedi con Google» secondo le linee guida Sign in with Google, tema scuro:
// logo G a colori, Roboto Medium self-hosted, forma a pillola. Misure del bottone da 40 px scalate a 48 px
// per il target di tocco: confrontate con le linee guida ufficiali il 29/10/2026 (scala proporzionale 1,2
// del bottone da 40 px, Roboto Medium al posto di Google Sans; vedi DESIGN.md).
export function GoogleSignInButton({ onClick }) {
  return (
    <button type="button" className="gsi" onClick={onClick}>
      <img src={googleG} alt="" width="24" height="24" />
      <span>Accedi con Google</span>
      <span aria-hidden="true" />
    </button>
  );
}

// La zucca accesa sopra «Accedi per votare»: stessa forma di PumpkinRating, alone che tremola come una candela.
export function LitPumpkin() {
  return (
    <div className="lume" aria-hidden="true">
      <svg className="zucca" viewBox="0 0 48 48" focusable="false">
        <path className="zucca__stelo" d="M22.5 13.5c-.2-4 .8-7.6 4.6-9.5l1.9 2.6c-2.7 1.4-3.4 3.6-3.2 6.9z" />
        <g className="zucca__corpo">
          <ellipse cx="14.5" cy="29" rx="10" ry="12.5" />
          <ellipse cx="33.5" cy="29" rx="10" ry="12.5" />
          <ellipse cx="24" cy="28.5" rx="10.5" ry="14" />
        </g>
        <path
          className="zucca__faccia"
          d="M14.5 26.5l3.8-5.2 3.8 5.2zM25.9 26.5l3.8-5.2 3.8 5.2zM13 32c3.4 5.6 18.6 5.6 22 0l-3.2 1.2-1.9 2.6-2.8-1.9-3.1 2.6-3.1-2.6-2.8 1.9-1.9-2.6z"
        />
      </svg>
    </div>
  );
}
