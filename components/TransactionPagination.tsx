'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface PaginationProps {
    currentPage: number;
    hasNextPage: boolean;
}

export default function TransactionPagination({ currentPage, hasNextPage }: PaginationProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleNavigation = (page: number) => {
        setIsLoading(true);
        router.push(`/txs?page=${page}`);
    };

    return (
        <div className="pagination-controls">
            <button
                onClick={() => handleNavigation(currentPage - 1)}
                className="pagination-btn pagination-btn-prev"
                disabled={currentPage <= 1 || isLoading}
            >
                <i className="fa-solid fa-chevron-left"></i>
                <span className="pagination-btn-text">Previous</span>
            </button>

            <div className="pagination-info">
                {isLoading ? (
                    <>
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        <span className="pagination-loading-text">Loading...</span>
                    </>
                ) : (
                    <>
                        <span className="pagination-label">Page</span>
                        <span className="pagination-number">{currentPage}</span>
                    </>
                )}
            </div>

            <button
                onClick={() => handleNavigation(currentPage + 1)}
                className="pagination-btn pagination-btn-next"
                disabled={!hasNextPage || isLoading}
            >
                <span className="pagination-btn-text">Next</span>
                <i className="fa-solid fa-chevron-right"></i>
            </button>
        </div>
    );
}
