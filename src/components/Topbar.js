import React from 'react';
import { PlusCircle, Smartphone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { APP_DOWNLOAD_PATH } from '../content/siteInfo';
import DealrLogo from './DealrLogo';
import SearchBar from './SearchBar';

export default function Topbar() {
  const { user, navigate } = useApp();

  return (
    <header className="topbar">
      <DealrLogo
        variant="light"
        size="title"
        showTagline
        onClick={() => navigate('home')}
        className="topbar-brand"
      />

      <SearchBar />

      <div className="topbar-right">
        <a className="topbar-btn topbar-btn-app" href={APP_DOWNLOAD_PATH}>
          <Smartphone size={16} />
          <span className="topbar-btn-label">Get the app</span>
        </a>
        <button type="button" className="topbar-btn" onClick={() => navigate('post')}>
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
          <button type="button" className="topbar-btn primary" onClick={() => navigate('profile')}>Sign In</button>
        )}
      </div>
    </header>
  );
}
