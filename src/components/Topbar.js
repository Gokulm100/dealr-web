import React, { useState } from 'react';
import { Search, X, PlusCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import DealrLogo from './DealrLogo';

export default function Topbar() {
  const { user, navigate, setSearchQuery, setPage } = useApp();
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      setSearchQuery(query);
      setPage(1);
      navigate('home');
    }
  };

  const handleClear = () => {
    setQuery('');
    setSearchQuery('');
    setPage(1);
  };

  return (
    <header className="topbar">
      <DealrLogo
        variant="light"
        size="title"
        showTagline
        onClick={() => navigate('home')}
        className="topbar-brand"
      />

      <div className="topbar-search">
        <Search size={16} style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search listings, categories, places…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleSearch}
        />
        {query && (
          <button onClick={handleClear}>
            <X size={16} />
          </button>
        )}
      </div>

      <div className="topbar-right">
        <button className="topbar-btn" onClick={() => navigate('post')}>
          <PlusCircle size={16} /> Post Ad
        </button>
        {user ? (
          user.profilePic
            ? <img className="topbar-avatar" src={user.profilePic} alt={user.name} onClick={() => navigate('profile')} />
            : (
              <div
                className="topbar-avatar"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.25)', color: '#fff', fontWeight: 800, fontSize: 16 }}
                onClick={() => navigate('profile')}
              >
                {user.name?.charAt(0) || 'U'}
              </div>
            )
        ) : (
          <button className="topbar-btn primary" onClick={() => navigate('profile')}>Sign In</button>
        )}
      </div>
    </header>
  );
}
