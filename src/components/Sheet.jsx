import { useEffect, useRef } from 'react';

// Dialog nativo: focus intrappolato, Esc e top layer gratis. Da telefono e' un foglio dal basso.
function Sheet({ open, onClose, labelledBy, className = '', children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`sheet ${className}`}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Il contenuto sta in .sheet__body: un click sul dialog stesso e' un click sullo sfondo.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open && <div className="sheet__body">{children}</div>}
    </dialog>
  );
}

export default Sheet;
