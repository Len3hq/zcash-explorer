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
                    <div className="preloader-logo-mark">
                        <div className="preloader-logo-dot" />
                    </div>
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
