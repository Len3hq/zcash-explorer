'use client';

import { useEffect, useState } from 'react';
import './Preloader.css';

export default function Preloader() {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate initial load time
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    if (!isLoading) return null;

    return (
        <div className="preloader-overlay">
            <div className="preloader-content">
                <div className="preloader-logo">
                    <svg viewBox="0 0 100 100" className="preloader-svg">
                        {/* Zcash-inspired shield/block icon */}
                        <path
                            d="M50 10 L80 25 L80 65 L50 90 L20 65 L20 25 Z"
                            className="preloader-shield"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                        />
                        <path
                            d="M35 40 L65 40 L50 50 L65 60 L35 60"
                            className="preloader-z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
                <div className="preloader-text">
                    <h2>Zcash Explorer</h2>
                    <div className="preloader-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        </div>
    );
}
