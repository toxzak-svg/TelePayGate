import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Settings, Zap, LogOut, TrendingUp, Bell, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import useTheme from '../../hooks/useTheme';

const navigation = [
  { name: 'Dashboard', to: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Transactions', to: '/app/transactions', icon: ArrowLeftRight },
  { name: 'P2P Orders', to: '/app/p2p-orders', icon: Zap },
  { name: 'DEX Analytics', to: '/app/dex-analytics', icon: TrendingUp },
  { name: 'Webhooks', to: '/app/webhooks', icon: Bell },
  { name: 'Settings', to: '/app/settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <aside
      className={`w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col fixed sm:static inset-y-0 left-0 z-40 transform transition-transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
      }`}
      role="navigation"
      aria-label="Primary"
    >
      <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800">
        <Zap className="h-8 w-8 text-blue-600" />
        <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">TG Payment</span>
        <button
          onClick={onClose}
          className="ml-auto sm:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-1" aria-label="Sidebar links">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`
            }
            aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center" aria-hidden="true">
            <span className="text-blue-700 font-semibold">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.email || 'User'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Developer</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          aria-label="Log out"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </button>
        <button
          onClick={toggle}
          className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="mr-3 h-5 w-5" /> : <Moon className="mr-3 h-5 w-5" />}
          Toggle Theme
        </button>
      </div>
    </aside>
  );
}
