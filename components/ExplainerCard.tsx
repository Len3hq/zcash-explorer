'use client';

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
  return (
    <section className="card explainer-card mt-lg">
      <div className="card-header">
        <div className="section-title">{title}</div>
        {description && <span className="card-subtext">{description}</span>}
      </div>
      <div className="explainer-grid">
        {items.map((item) => (
          <div key={item.label} className="explainer-item">
            <div className="key-label">{item.label}</div>
            <p className="explainer-text">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
