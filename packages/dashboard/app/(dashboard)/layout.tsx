import type { Metadata } from 'next';
import { LayoutDashboard, CreditCard, ArrowRightLeft, Users, TrendingUp, Webhook, Settings, Zap, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/authStore';

export const metadata: Metadata = {
  title: 'Dashboard',
};

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/dashboard/payments',
    label: 'Payments',
    icon: CreditCard,
  },
  {
    href: '/dashboard/conversions',
    label: 'Conversions',
    icon: ArrowRightLeft,
  },
  {
    href: '/dashboard/p2p',
    label: 'P2P Marketplace',
    icon: Users,
  },
  {
    href: '/dashboard/dex',
    label: 'DEX',
    icon: TrendingUp,
  },
  {
    href: '/dashboard/webhooks',
    label: 'Webhooks',
    icon: Webhook,
  },
  {
    href: '/dashboard/admin',
    label: 'Admin',
    icon: Settings,
    adminOnly: true,
  },
  {
    href: '/dashboard/nitro',
    label: 'Nitro Swaps',
    icon: Zap,
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: Settings,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card">
        <div className="p-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors">
            <LayoutDashboard className="h-6 w-6" />
            <span>TelePayGate</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="mt-auto p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <User className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{user?.email || 'User'}</p>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">
            {navItems.find((item) => item.href === pathname)?.label || 'Dashboard'}
          </h1>
          <div className="flex items-center gap-4">
            {/* Mobile menu button could go here */}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
