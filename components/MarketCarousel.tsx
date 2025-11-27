'use client';

import { useState, useRef, useEffect } from 'react';

export default function MarketCarousel({ children }: { children: React.ReactNode[] }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleScroll = () => {
        if (scrollRef.current) {
            const scrollLeft = scrollRef.current.scrollLeft;
            const width = scrollRef.current.offsetWidth;
            const index = Math.round(scrollLeft / width);
            setActiveIndex(index);
        }
    };

    return (
        <div>
            <div
                className="market-carousel"
                ref={scrollRef}
                onScroll={handleScroll}
            >
                {children.map((child, index) => (
                    <div key={index} className="market-slide">
                        {child}
                    </div>
                ))}
            </div>
            <div className="carousel-indicators">
                {children.map((_, index) => (
                    <div
                        key={index}
                        className={`carousel-dot ${index === activeIndex ? 'active' : ''}`}
                    />
                ))}
            </div>
        </div>
    );
}
