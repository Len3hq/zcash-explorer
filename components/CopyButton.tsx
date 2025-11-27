'use client';

import { useState } from 'react';

interface CopyButtonProps {
    text: string;
    label?: string;
    className?: string;
    showToast?: boolean;
    onCopy?: () => void;
}

export default function CopyButton({ text, label, className = '', showToast = true, onCopy }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }

            setCopied(true);
            if (onCopy) onCopy();

            setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className={`copy-button ${copied ? 'copy-button-copied' : ''} ${className}`}
            title={label || 'Copy to clipboard'}
            aria-label={label || 'Copy to clipboard'}
            type="button"
        >
            <i className={`fa-${copied ? 'solid fa-check' : 'regular fa-copy'}`} aria-hidden="true"></i>
            {showToast && copied && <span className="copy-feedback">Copied!</span>}
        </button>
    );
}
