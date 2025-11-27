'use client';

export default function SkeletonLoader({ variant = 'card', count = 1 }: { variant?: 'card' | 'text' | 'stat' | 'table'; count?: number; }) {
    if (variant === 'card') {
        return (
            <div className="skeleton-card">
                <div className="skeleton skeleton-title"></div>
                <div className="skeleton skeleton-text"></div>
                <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
            </div>
        );
    }

    if (variant === 'stat') {
        return (
            <div className="skeleton-stat">
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="skeleton-stat-item">
                        <div className="skeleton skeleton-label"></div>
                        <div className="skeleton skeleton-value"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (variant === 'table') {
        return (
            <div className="skeleton-table">
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="skeleton skeleton-row"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="skeleton skeleton-text" style={{ width: count > 1 ? '100%' : '60%' }}></div>
    );
}
