'use client';

import { useState } from 'react';

interface ExplainerItem {
  label: string;
  body: string;
}

interface ExplainerCardProps {
  title: string;
  description?: string;
  items: ExplainerItem[];
}

export default function ExplainerCard({ title, description, items }: ExplainerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className={`card explainer-card mt-lg ${isExpanded ? 'expanded' : ''}`}>
      <div className="card-header">
        <div className="section-title">{title}</div>
        {description && <span className="card-subtext">{description}</span>}
      </div>

      {/* Mobile toggle button */}
      <button
        className="explainer-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label={isExpanded ? 'Collapse explainer' : 'Expand explainer'}
      >
        <span>{isExpanded ? 'Hide Details' : 'Show Details'}</span>
        <i className="fa-solid fa-chevron-down" aria-hidden="true"></i>
      </button>

      <div className="explainer-items">
        <div className="explainer-grid">
          {items.map((item) => (
            <div key={item.label} className="explainer-item">
              <div className="key-label">
                <i className="fa-solid fa-info-circle" style={{ marginRight: '0.5rem', color: 'var(--zec-gold)' }} aria-hidden="true"></i>
                {item.label}
              </div>
              <p className="explainer-text">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
