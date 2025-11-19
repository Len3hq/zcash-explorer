interface StatItemProps {
  icon: string;
  label: string;
  value: string | number;
  suffix?: string;
}

function StatItem({ icon, label, value, suffix }: StatItemProps) {
  return (
    <div>
      <div className="key-label">
        <i className={`${icon} stat-icon`} aria-hidden="true"></i>
        {label}
      </div>
      <div className="key-value">
        {value}
        {suffix && <span className="muted"> {suffix}</span>}
      </div>
    </div>
  );
}

interface StatsCardProps {
  title: string;
  badge?: { dot?: boolean; text: string };
  children: React.ReactNode;
}

export default function StatsCard({ title, badge, children }: StatsCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <span className="card-title-icon"></span>
          {title}
        </div>
        {badge && (
          <div className="badge">
            {badge.dot && <span className="badge-dot"></span>}
            <span>{badge.text}</span>
          </div>
        )}
      </div>
      <div className="key-value-grid">{children}</div>
    </div>
  );
}

export { StatItem };
