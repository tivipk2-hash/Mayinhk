import React, { useState, useEffect, useRef } from 'react';
import { AppState, User } from './types';
import { loadState, saveState, onStateChange, mergeStates } from './services/storage';
import { subscribeToCloudState, pushStateToCloud } from './services/firebase';
import { HomeHeader } from './components/home/HomeHeader';
import { VintageTv } from './components/home/VintageTv';
import { PhotoGallery } from './components/home/PhotoGallery';
import { FeaturedMenu } from './components/home/FeaturedMenu';
import { ServicesSection } from './components/home/ServicesSection';
import { HomeFooter } from './components/home/HomeFooter';
import { PosLayout } from './components/pos/PosLayout';
import { CustomerDisplayView } from './components/display/CustomerDisplayView';
import { LoginModal } from './components/auth/LoginModal';
import { AdminModal } from './components/admin/AdminModal';

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [view, setView] = useState<'home' | 'pos'>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Check if opened as Customer Facing Display (?pos=orderdisplay)
  const [isCustomerDisplay, setIsCustomerDisplay] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const pos = params.get('pos')?.toLowerCase();
    const display = params.get('display')?.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return (
      pos === 'orderdisplay' ||
      pos === 'order_display' ||
      pos === 'display' ||
      display === 'customer' ||
      display === 'order' ||
      display === 'orderdisplay' ||
      hash === '#orderdisplay'
    );
  });

  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const pos = params.get('pos')?.toLowerCase();
      const display = params.get('display')?.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      setIsCustomerDisplay(
        pos === 'orderdisplay' ||
        pos === 'order_display' ||
        pos === 'display' ||
        display === 'customer' ||
        display === 'order' ||
        display === 'orderdisplay' ||
        hash === '#orderdisplay'
      );
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Sync state changes with localStorage and Firebase Firestore across all devices
  useEffect(() => {
    // 1. Same-browser tab listener
    const unsubLocal = onStateChange((newState) => {
      setState(newState);
    });

    // 2. Realtime cloud listener across different networks, computers, and devices
    const unsubCloud = subscribeToCloudState((cloudState) => {
      setState(cloudState);
      saveState(cloudState);
    }, state);

    return () => {
      unsubLocal();
      unsubCloud();
    };
  }, []);

  const handleUpdateState = (newState: AppState) => {
    setState(newState);
    saveState(newState);
    pushStateToCloud(newState, currentUser?.name || 'HongKong_POS');
  };

  // Open POS flow
  const handleOpenPos = () => {
    if (currentUser) {
      if (currentUser.role === 'viewer') {
        setShowAdminModal(true);
      } else {
        setView('pos');
      }
    } else {
      setShowLoginModal(true);
    }
  };

  // Login success (Redirect "Xem sổ sách" directly to Report)
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setShowLoginModal(false);
    if (user.role === 'viewer') {
      // Tự động chuyển hướng (redirect) thẳng vào màn hình "Báo cáo Doanh thu, Chi phí & Lợi nhuận"
      setShowAdminModal(true);
      setView('home');
    } else {
      setView('pos');
    }
  };

  // Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setView('home');
  };

  // Password reset via Master Key 0112143
  const handleResetPasswordWithMaster = (username: string, newPass: string): boolean => {
    const userIndex = state.users.findIndex(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (userIndex === -1) return false;

    const updatedUsers = [...state.users];
    updatedUsers[userIndex] = {
      ...updatedUsers[userIndex],
      passwordHash: newPass,
    };

    handleUpdateState({
      ...state,
      users: updatedUsers,
    });
    return true;
  };

  // Dedicated Customer Facing Display View (?pos=orderdisplay)
  if (isCustomerDisplay) {
    return <CustomerDisplayView state={state} />;
  }

  return (
    <div className="min-h-screen bg-[#0c0908] text-neutral-100 selection:bg-amber-600 selection:text-white">
      {view === 'home' ? (
        /* HOMEPAGE (Customer 1980s Hong Kong vintage experience) */
        <div className="flex flex-col min-h-screen">
          <HomeHeader
            config={state.homepage}
            currentUser={currentUser}
            onOpenPos={handleOpenPos}
            onOpenAdmin={() => setShowAdminModal(true)}
          />

          <main className="flex-1">
            {/* Vintage CRT Wooden Television with 5 YouTube Channels */}
            <VintageTv
              channels={state.homepage.tvChannels}
              onOpenPos={handleOpenPos}
            />

            {/* 9 Corner Photo Gallery with 5-image slide carousels */}
            <PhotoGallery
              corners={state.homepage.corners}
            />

            {/* Featured Drink Showcase */}
            <FeaturedMenu
              menu={state.menu}
              onOpenPos={handleOpenPos}
            />

            {/* Heritage Services */}
            <ServicesSection />
          </main>

          <HomeFooter
            config={state.homepage}
            onOpenPos={handleOpenPos}
          />
        </div>
      ) : (
        /* POS INTERFACE (Staff sales, touch menu, Local Print Bridge LAN printing) */
        currentUser && (
          <PosLayout
            state={state}
            currentUser={currentUser}
            onUpdateState={handleUpdateState}
            onOpenSettings={() => setShowAdminModal(true)}
            onLogout={handleLogout}
            onBackToHome={() => setView('home')}
          />
        )
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          users={state.users}
          masterPassword={state.masterPassword}
          onLoginSuccess={handleLoginSuccess}
          onBackToHome={() => setShowLoginModal(false)}
          onResetPasswordWithMaster={handleResetPasswordWithMaster}
        />
      )}

      {/* Admin Settings Modal */}
      {showAdminModal && (
        <AdminModal
          state={state}
          currentUser={currentUser}
          onUpdateState={handleUpdateState}
          onClose={() => setShowAdminModal(false)}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
