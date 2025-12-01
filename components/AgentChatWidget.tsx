'use client';

import React, { useState } from 'react';
import ChatClient from './ChatClient';

export default function AgentChatWidget() {
  const [open, setOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);



  return (
    <>
      {/* Floating toggle button */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) setHasNewMessage(false);
        }}
        style={{
          position: 'fixed',
          right: '1.5rem',
          bottom: '1.5rem',
          zIndex: 50,
          borderRadius: '9999px',
          padding: '0.65rem 1.3rem',
          backgroundColor: open ? '#1e293b' : '#0f172a',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          border: '1px solid rgba(148, 163, 184, 0.6)',
          boxShadow: '0 18px 45px rgba(15, 23, 42, 0.6)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
        className="agent-toggle-btn"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#1e40af';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = open ? '#1e293b' : '#0f172a';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <div style={{ position: 'relative' }}>
          <i className="fa-solid fa-robot" aria-hidden="true" />
          {hasNewMessage && !open && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '8px',
                height: '8px',
                backgroundColor: '#ef4444',
                borderRadius: '50%',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
          )}
        </div>
        <span className="agent-toggle-text">{open ? 'Close Zcash Agent' : 'Ask Zcash Agent'}</span>
      </button>

      {/* Popup chat container */}
      {open && (
        <div
          style={{
            position: 'fixed',
            right: '1rem',
            bottom: '4.5rem',
            width: '420px',
            height: '520px',
            maxWidth: 'calc(100vw - 2rem)',
            maxHeight: 'calc(100vh - 6rem)',
            zIndex: 40,
            borderRadius: '1rem',
            overflow: 'hidden',
            backgroundColor: '#020617',
            boxShadow:
              '0 24px 60px rgba(15, 23, 42, 0.8), 0 0 0 1px rgba(148, 163, 184, 0.25)',
            animation: 'slideUp 0.3s ease-out',
          }}
          className="agent-chat-popup"
        >
          <ChatClient onNewMessage={() => setHasNewMessage(true)} />
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @media (max-width: 768px) {
          .agent-chat-popup {
            right: 0.5rem !important;
            bottom: 4rem !important;
            left: 0.5rem !important;
            width: auto !important;
            max-height: calc(100vh - 5rem) !important;
          }

          .agent-toggle-btn {
            right: 0.75rem !important;
            bottom: 0.75rem !important;
            padding: 0.6rem 1rem !important;
            font-size: 0.75rem !important;
          }
        }
      `}</style>
    </>
  );
}
