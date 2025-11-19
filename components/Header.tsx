'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial: 'light' | 'dark' = stored === 'dark' || stored === 'light' ? (stored as 'light' | 'dark') : systemPrefersDark ? 'dark' : 'light';

    document.documentElement.dataset.theme = initial;
    setTheme(initial);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        document.documentElement.dataset.theme = next;
        window.localStorage.setItem('theme', next);
      }
      return next;
    });
  };

  const getActiveTab = () => {
    if (pathname === '/') return 'home';
    if (pathname.startsWith('/block')) return 'blocks';
    if (pathname.startsWith('/tx')) return 'txs';
    return '';
  };

  const activeTab = getActiveTab();

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    // Try block height directly on the client
    if (/^\d+$/.test(trimmed)) {
      router.push(`/block/${trimmed}`);
      return;
    }

    // For non-numeric values, ask the server whether this looks like a block or a transaction
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);

      if (!res.ok) {
        // Fallback: keep previous behavior (try block route)
        router.push(`/block/${trimmed}`);
        return;
      }

      const data: { type?: 'block' | 'tx' | 'not-found'; id?: string } = await res.json();

      if (data.type === 'tx') {
        router.push(`/tx/${data.id || trimmed}`);
      } else if (data.type === 'block') {
        router.push(`/block/${data.id || trimmed}`);
      } else {
        // Unknown id: still send to block route so the app's 404 can handle it
        router.push(`/block/${trimmed}`);
      }
    } catch (err) {
      // Network or server error: degrade gracefully to previous behavior
      router.push(`/block/${trimmed}`);
    }
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
        <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label="Toggle dark mode">
          <i className={theme === 'dark' ? 'fa-regular fa-sun' : 'fa-regular fa-moon'} aria-hidden="true"></i>
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>
    </header>
  );
}
