'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const getActiveTab = () => {
    if (pathname === '/') return 'home';
    if (pathname.startsWith('/block')) return 'blocks';
    if (pathname.startsWith('/tx')) return 'txs';
    return '';
  };

  const activeTab = getActiveTab();

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query) return;

    // Try block height
    if (/^\d+$/.test(query)) {
      router.push(`/block/${query}`);
      return;
    }

    // Try block hash or txid - just redirect and let the page handle it
    // We'll try block first, then transaction
    router.push(`/block/${query}`);
  };

  return (
    <header className="topbar">
      <Link href="/" className="brand brand-link">
        <div className="brand-logo">Z</div>
        <div className="brand-text">
          <span className="brand-title">Zcash Explorer</span>
          <span className="brand-subtitle">Blocks · Transactions · Chain state</span>
        </div>
      </Link>
      <nav className="nav-tabs">
        <Link href="/" className={`nav-tab ${activeTab === 'home' ? 'nav-tab-active' : ''}`}>
          Overview
        </Link>
        <Link href="/blocks" className={`nav-tab ${activeTab === 'blocks' ? 'nav-tab-active' : ''}`}>
          Blocks
        </Link>
        <Link href="/txs" className={`nav-tab ${activeTab === 'txs' ? 'nav-tab-active' : ''}`}>
          Transactions
        </Link>
      </nav>
      <div className="topbar-actions">
        <form onSubmit={handleSearch} className="search-form">
          <input
            className="search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by block height, block hash, or transaction ID"
            required
          />
          <button type="submit" className="button-primary">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <span>Search</span>
          </button>
        </form>
      </div>
    </header>
  );
}
