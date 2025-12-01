'use client';

import { useState } from 'react';
import DonationModal from './DonationModal';

export default function Footer() {
  const year = new Date().getFullYear();
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);

  return (
    <>
      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-top">
            {/* Left: brand + tagline */}
            <div className="footer-col footer-brand">
              <div className="footer-brand-row">
                <div className="footer-logo-mark" aria-hidden="true">
                  <span className="footer-logo-dot" />
                </div>
                <div className="footer-brand-text">
                  <span className="footer-title">Zcash Explorer</span>
                  <span className="footer-subtitle">Lightweight Zcash chain insights</span>
                </div>
              </div>
              <div className="footer-pill">Open data • Zero‑knowledge ready • Minimal UI</div>
            </div>

            {/* Center: support button */}
            <div className="footer-col footer-center">
              <button
                type="button"
                onClick={() => setIsDonationModalOpen(true)}
                className="footer-support-btn"
              >
                <i className="fa-solid fa-heart" aria-hidden="true" />
                <span>Support Our Work</span>
              </button>
            </div>

          {/* Right: powered by + built with */}
          <div className="footer-col footer-right">
            <div className="footer-powered-row">
              <span className="footer-powered-label">Powered by</span>
              <a
                href="https://getblock.io/"
                target="_blank"
                rel="noreferrer"
                className="footer-powered-name footer-link"
              >
                GetBlock RPC
              </a>
            </div>
            <div className="footer-links-row" aria-hidden="true">
              <a
                href="https://x.com/len3_x"
                target="_blank"
                rel="noreferrer"
                className="footer-link"
              >
                <i className="fa-brands fa-x-twitter footer-icon" />
              </a>
              <a
                href="https://github.com/Len3hq/zcash-explorer"
                target="_blank"
                rel="noreferrer"
                className="footer-link"
              >
                <i className="fa-brands fa-github footer-icon" />
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="footer-bottom-text">
            © {year} Zcash Explorer. Open source blockchain explorer.
          </span>
          <span className="footer-built-row">
            Built by{' '}
            <a
              href="https://twitter.com/danny_4reel"
              target="_blank"
              rel="noreferrer"
              className="footer-link"
            >
              Daniel
            </a>{' '}
            and{' '}
            <a
              href="https://twitter.com/_christian_obi"
              target="_blank"
              rel="noreferrer"
              className="footer-link"
            >
              Realist
            </a>
            .
          </span>
        </div>
      </div>
    </footer>
    
    <DonationModal 
      isOpen={isDonationModalOpen} 
      onClose={() => setIsDonationModalOpen(false)} 
    />
    </>
  );
}
