import { useState, useCallback, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSidebar();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeSidebar]);

  return (
    <div className="flex h-screen bg-gray-50">
      <a
        href="#main"
        className="absolute left-2 top-2 z-50 bg-white text-blue-700 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Skip to content
      </a>
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={toggleSidebar} />
        <main id="main" className="flex-1 overflow-y-auto p-4 sm:p-6" role="main" aria-label="Main content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
