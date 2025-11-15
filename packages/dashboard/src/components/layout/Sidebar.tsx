import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Settings, Zap } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Transactions', to: '/transactions', icon: ArrowLeftRight },
  { name: 'Settings', to: '/settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <Zap className="h-8 w-8 text-blue-600" />
        <span className="ml-2 text-xl font-bold text-gray-900">TG Payment</span>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-700 font-semibold">DV</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">Developer</p>
            <p className="text-xs text-gray-500">dev@example.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
