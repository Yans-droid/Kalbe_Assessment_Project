'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutList,
  FileText,
  GitBranch,
  LogOut,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/formatters';
import { apiFetch } from '@/lib/api';

const navItems = [
  { href: '/trackers', label: 'Trackers', icon: LayoutList },
  { href: '/requests', label: 'Requests', icon: FileText },
  { href: '/trackings', label: 'Trackings', icon: GitBranch },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      window.location.href = '/login';
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo + close button (mobile) */}
      <div className="px-6 py-5 border-b border-kalbe-600 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wider">
            TRACK<span className="text-kalbe-100">LAB</span>
          </h1>
          <p className="text-kalbe-200 text-xs mt-0.5">Kalbe Biopharma</p>
        </div>
        <button
          onClick={onMobileClose}
          className="lg:hidden p-1 rounded text-kalbe-200 hover:text-white"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-kalbe-100 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-kalbe-600">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-kalbe-100 hover:bg-white/10 hover:text-white transition-colors w-full"
        >
          {loggingOut ? (
            <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
          ) : (
            <LogOut className="w-5 h-5 flex-shrink-0" />
          )}
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar — fixed on desktop, slide-over on mobile */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-kalbe-500 transform transition-transform duration-200 ease-in-out',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
