'use client';

import React, { useState } from 'react';

const AGENT_CHAT_URL =
  process.env.NEXT_PUBLIC_AGENT_CHAT_URL ?? 'http://localhost:5173/';

export default function AgentChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'fixed',
          right: '1.5rem',
          bottom: '1.5rem',
          zIndex: 50,
          borderRadius: '9999px',
          padding: '0.65rem 1.3rem',
          backgroundColor: '#0f172a',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          border: '1px solid rgba(148, 163, 184, 0.6)',
          boxShadow: '0 18px 45px rgba(15, 23, 42, 0.6)',
        }}
      >
        <i className="fa-solid fa-robot" aria-hidden="true" />
        <span>{open ? 'Close Zcash Agent' : 'Ask Zcash Agent'}</span>
      </button>

      {/* Popup iframe container */}
      {open && (
        <div
          style={{
            position: 'fixed',
            right: '1.5rem',
            bottom: '4.5rem',
            width: '420px',
            height: '520px',
            maxWidth: '100vw',
            maxHeight: '80vh',
            zIndex: 40,
            borderRadius: '1rem',
            overflow: 'hidden',
            backgroundColor: '#020617',
            boxShadow:
              '0 24px 60px rgba(15, 23, 42, 0.8), 0 0 0 1px rgba(148, 163, 184, 0.25)',
          }}
        >
          <iframe
            src={AGENT_CHAT_URL}
            title="Zcash Agent Chat"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: 'transparent',
            }}
          />
        </div>
      )}
    </>
  );
}
