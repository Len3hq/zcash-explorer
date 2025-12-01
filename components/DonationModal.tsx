'use client';

import { useEffect, useRef, useState } from 'react';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DonationModal({ isOpen, onClose }: DonationModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const unifiedAddress = 'u1c6mszxj7t70suqcwk07txusjgpdrxpf4t4kwgqk2pt26r33dnvsk7v4q6fe4fu9dlgrlhwglv4fzucdevm06umq2heyttjrgq7y6uy855qa07cenayy82lfaj2memnlcp28csscfwqyfnepazquqpv6vmmnqknxassnxq9yz25lnek2q';

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.classList.add('modal-open');
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(unifiedAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" ref={backdropRef} onClick={handleBackdropClick}>
      <div className="modal donation-modal">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>💚</span>
            <h3 className="section-title" style={{ margin: 0 }}>Support Zcash Explorer</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        
        <div className="modal-body">
          <p className="donation-subtitle">
            Building and maintaining a free, open-source blockchain explorer takes time, effort, and resources. 
            Your support helps us keep this tool accessible to everyone in the Zcash community.
          </p>

          <div className="donation-info-badge">
            <i className="fa-solid fa-shield-halved" aria-hidden="true" />
            <span>Unified Shielded Address</span>
          </div>

          <div className="donation-content">
            <div className="donation-label">
              ZCASH DONATION ADDRESS
            </div>
            <div className="donation-address">
              {unifiedAddress}
            </div>
            <button
              type="button"
              className="donation-copy-btn"
              onClick={handleCopy}
            >
              <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} aria-hidden="true" />
              <span>{copied ? 'Copied!' : 'Copy Address'}</span>
            </button>
          </div>

          <div className="donation-message">
            <i className="fa-solid fa-lock" aria-hidden="true" style={{ color: '#16a34a' }} />
            <span>
              Your donation is <strong>fully private and encrypted</strong> through Zcash's shielded pool. 
              Every contribution, no matter the size, helps us improve and expand this explorer. Thank you for supporting open-source development! 💚
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
