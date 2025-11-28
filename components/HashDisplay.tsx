'use client';

import CopyButton from './CopyButton';

interface HashDisplayProps {
    hash: string;
    label?: string;
    truncate?: boolean | 'middle';
    copyable?: boolean;
    className?: string;
    hashClassName?: string;
}

export default function HashDisplay({
    hash,
    label,
    truncate = 'middle',
    copyable = true,
    className = '',
    hashClassName = '',
}: HashDisplayProps) {
    if (!hash) return null;

    const displayHash = () => {
        if (!truncate) return hash;
        if (truncate === 'middle' && hash.length > 16) {
            return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
        }
        return hash;
    };

    return (
        <div className={`hash-with-copy ${className}`} title={hash}>
            <span className={`hash ${hashClassName}`}>{displayHash()}</span>
            {copyable && <CopyButton text={hash} label={label || 'Copy hash'} />}
        </div>
    );
}
