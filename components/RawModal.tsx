'use client';

import { useState, useEffect } from 'react';

interface RawModalProps {
  data: any;
}

export default function RawModal({ data }: RawModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }, [isOpen]);

  return (
    <>
      <section className="card mt-lg">
        <div className="card-header">
          <div className="section-title">Raw Transaction</div>
          <button
            type="button"
            className="button-secondary"
            onClick={() => setIsOpen(true)}
          >
            View raw tx
          </button>
        </div>
      </section>

      {isOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="raw-json-title">
            <div className="modal-header">
              <div className="section-title" id="raw-json-title">Raw transaction (JSON)</div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close raw transaction JSON"
                >
                  &times;
                </button>
              </div>
            </div>
            <div className="modal-body">
              <pre id="raw-json">{JSON.stringify(data, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
