'use client';

import React, { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    // Read username from document.cookie (tracklab_user is httpOnly so we
    // expose it via GET /api/auth/me and cache it in memory)
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.username) setUsername(data.username); })
      .catch(() => {});
  }, []);

  const initials = username
    ? username.substring(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0">
      {/* Left: hamburger (mobile) + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
      </div>

      {/* Right: user badge */}
      {username && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-kalbe-500 text-white flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
          <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[160px] truncate">
            {username}
          </span>
        </div>
      )}
    </header>
  );
}
