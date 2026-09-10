import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function Dialog({ title, onClose, children, footer }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first =
      (panelRef.current && panelRef.current.querySelector('.te-modal__body input, .te-modal__body select, .te-modal__body textarea')) ||
      (panelRef.current && panelRef.current.querySelector('input, select, textarea'));
    if (first && typeof first.focus === 'function') {
      first.focus();
      if (first.select) {
        first.select();
      }
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="te-modal" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="te-modal__backdrop" aria-label="Close dialog" onClick={onClose} />
      <div className="te-modal__panel" ref={panelRef}>
        <div className="te-modal__head">
          <strong>{title}</strong>
          <button type="button" className="te-tb te-tb--wide" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="te-modal__body">{children}</div>
        {footer ? <div className="te-modal__foot">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}
