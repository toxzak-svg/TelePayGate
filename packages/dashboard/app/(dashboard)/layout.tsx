import type { Metadata } from 'next';
import { LayoutDashboard, CreditCard, ArrowRightLeft, Users, TrendingUp, Webhook, Settings, Zap, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import DashboardSidebar from '@/components/dashboard-sidebar';

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
  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">
            Dashboard
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
