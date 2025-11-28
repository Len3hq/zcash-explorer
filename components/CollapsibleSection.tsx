'use client';

import { useState } from 'react';

interface CollapsibleSectionProps {
    title: string;
    count?: number;
    defaultOpen?: boolean;
    children: React.ReactNode;
    className?: string;
}

export default function CollapsibleSection({
    title,
    count,
    defaultOpen = false,
    children,
    className = ''
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={`card ${className} ${isOpen ? 'collapsible-open' : ''}`}>
            <button
                type="button"
                className="collapsible-header"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="collapsible-title">
                    {title} {count !== undefined && `(${count})`}
                </span>
                <i className="fa-solid fa-chevron-down collapsible-icon"></i>
            </button>
            <div className="collapsible-content">
                {children}
            </div>
        </div>
    );
}
