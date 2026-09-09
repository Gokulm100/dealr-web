import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import BetaBanner from './components/BetaBanner';
import AppDownloadBanner from './components/AppDownloadBanner';
import PushPrompt from './components/PushPrompt';
import { ToastContainer, ModalDialog } from './components/UI';
import HomePage from './pages/HomePage';
import AdDetailPage from './pages/AdDetailPage';
import MessagesPage from './pages/MessagesPage';
import ChatDetailPage from './pages/ChatDetailPage';
import PostAdPage from './pages/PostAdPage';
import MyAdsPage from './pages/MyAdsPage';
import ProfilePage from './pages/ProfilePage';
import ConsentPage from './pages/ConsentPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import AdminPage from './pages/AdminPage';
import SellerProfilePage from './pages/SellerProfilePage';

function PageRouter() {
  const { currentPage } = useApp();

  const pages = {
    home: <HomePage />,
    detail: <AdDetailPage />,
    'ad-detail': <AdDetailPage />,
    messages: <MessagesPage />,
    chat: <ChatDetailPage />,
    post: <PostAdPage />,
    'my-ads': <MyAdsPage />,
    profile: <ProfilePage />,
    consent: <ConsentPage />,
    about: <AboutPage />,
    contact: <ContactPage />,
    admin: <AdminPage />,
    'seller-profile': <SellerProfilePage />,
  };

  return pages[currentPage] || <HomePage />;
}

function AppShell() {
  return (
    <div className="app-root">
      <Topbar />
      <BetaBanner />
      <div className="app-body">
        <Sidebar />
        <main className="main">
          <PushPrompt />
          <PageRouter />
        </main>
      </div>
      <AppDownloadBanner />
      <MobileNav />
      <ToastContainer />
      <ModalDialog />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
