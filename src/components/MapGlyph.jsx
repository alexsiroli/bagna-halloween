import { glyphSvg, isKind, KIND_LABELS } from '../mapKinds.js';

// Chip con il glifo di un tipo (colori in CSS da data-t). Decorativo: il testo sta sempre accanto.
export function Chip({ t }) {
  return <span className="chip" data-t={t} aria-hidden="true" dangerouslySetInnerHTML={{ __html: glyphSvg(t) }} />;
}

// Etichetta del tipo di casa («Spettacolo», «Casa addobbata»); niente se il tipo non e' indicato.
export function KindTag({ kind }) {
  if (!isKind(kind)) return null;
  return (
    <span className="kind-tag">
      <Chip t={kind} />
      {KIND_LABELS[kind]}
    </span>
  );
}
