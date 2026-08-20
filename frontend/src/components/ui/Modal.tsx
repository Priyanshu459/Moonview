import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      onClose={onClose}
      style={{
        padding: '2rem',
        borderRadius: '0.5rem',
        border: 'none',
        background: 'var(--color-bg-base)',
        color: 'var(--color-text-primary)',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
        maxWidth: '500px',
        width: '100%',
      }}
    >
      {children}
    </dialog>,
    document.body
  );
}
