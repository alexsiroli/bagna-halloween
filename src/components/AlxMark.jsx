// Il marchio Alx Studio in versione Halloween (lo stesso dello splash #30, fermo): la A con l'orbita e la zucca.
function AlxMark() {
  return (
    <svg className="alx-mark" viewBox="-30 -72 114 80" role="img" aria-label="Alx Studio">
      <defs>
        <mask id="alx-orbita" maskUnits="userSpaceOnUse" x="-60" y="-90" width="200" height="200">
          <rect x="-60" y="-90" width="200" height="200" fill="#fff" />
          <path d="M62.81 -40.68A40 10 -14 0 1 -14.81 -21.32" fill="none" stroke="#000" strokeWidth="7.2" />
        </mask>
      </defs>
      <path className="alx-mark__orbit" d="M-14.81 -21.32A40 10 -14 0 1 62.81 -40.68" />
      <path
        className="alx-mark__a"
        d="M0.2 0 11.2 -66H33L43.9 0H27.9L22.2 -54.3H21.4L16.3 0ZM10.2 -11V-21H33.3V-11Z"
        mask="url(#alx-orbita)"
      />
      <path className="alx-mark__orbit" d="M62.81 -40.68A40 10 -14 0 1 -14.81 -21.32" />
      <g transform="translate(24 -31) rotate(-14) translate(40 0)">
        <ellipse className="alx-mark__pumpkin" rx="6.5" ry="5.6" />
        <path className="alx-mark__ribs" d="M-2.4 -5.3Q-4.6 0 -2.4 5.3M2.4 -5.3Q4.6 0 2.4 5.3" />
        <path className="alx-mark__stem" d="M0 -5.2L1 -8.6" />
      </g>
    </svg>
  );
}

export default AlxMark;
