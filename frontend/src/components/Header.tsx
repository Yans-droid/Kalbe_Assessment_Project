'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Menu, LogOut, ChevronDown, User, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  const [username, setUsername] = useState<string>('assessment.it');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.username) setUsername(data.username);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      window.location.href = '/login?logout=true';
    }
  };

  const initials = username
    ? username.substring(0, 2).toUpperCase()
    : 'AI';

  return (
    <header className="h-16 bg-white border-b border-gray-100 px-4 sm:px-6 flex items-center justify-between gap-4 flex-shrink-0 sticky top-0 z-30">
      {/* Kiri: Hamburger (mobile) + Judul modul aktif */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      {/* Kanan: User Profile + Avatar + Dropdown Logout */}
      <div className="relative flex-shrink-0" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none"
          aria-expanded={dropdownOpen}
        >
          <div className="w-8 h-8 rounded-full bg-[#008444] text-white flex items-center justify-center text-xs font-bold shadow-xs">
            {initials}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-gray-800 leading-tight max-w-[140px] truncate">
              {username}
            </span>
            <span className="text-[10px] text-gray-400">Kalbe IT</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-40 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
              <p className="text-xs font-bold text-gray-900">{username}</p>
              <p className="text-[10px] text-gray-400">Kalbe IT Assessment</p>
            </div>
            <div className="px-3 py-1.5 text-xs text-gray-600 flex items-center gap-2 font-medium">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <span>Signed in as <strong className="text-gray-900">{username}</strong></span>
            </div>
            <div className="h-px bg-gray-100 my-1" />
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors text-left disabled:opacity-50"
            >
              {loggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
              ) : (
                <LogOut className="w-3.5 h-3.5 text-red-500" />
              )}
              <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
