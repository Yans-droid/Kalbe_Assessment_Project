'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  GitBranch,
  History,
  Files,
  User,
  Key,
  Users,
  LayoutList,
  FileCheck,
  Bell,
  Settings,
  FlaskConical,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  FlaskRound,
} from 'lucide-react';
import { cn } from '@/lib/formatters';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  mobileOpen = false,
  onMobileClose,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();

  // Accordion state for Request submenu
  const [requestAccordionOpen, setRequestAccordionOpen] = useState(
    pathname.startsWith('/requests')
  );

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-xs transition-opacity duration-200"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar: White clean theme (#ffffff with border-r border-gray-200) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out select-none shadow-sm',
          collapsed ? 'lg:w-20' : 'lg:w-64',
          'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header Sidebar: Logo + Branding + Collapse / Close buttons */}
        <div className="h-16 px-4 border-b border-gray-100 flex items-center justify-between relative bg-white">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Logo bulat hijau */}
            <div className="w-9 h-9 rounded-full bg-[#008444] text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
              <FlaskRound className="w-5 h-5" />
            </div>

            {(!collapsed || mobileOpen) && (
              <div className="leading-tight">
                <span className="text-base font-extrabold text-gray-900 tracking-tight">
                  TRACK<span className="text-[#008444]">LAB</span>
                </span>
                <p className="text-[10px] text-gray-400 font-medium">Kalbe Biopharma</p>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle Button (Tombol hijau « / » di tepi kanan atas) */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded-full bg-[#008444] hover:bg-[#006b37] text-white shadow-sm transition-transform hover:scale-105"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5 stroke-[3]" />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list with small green category labels */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 text-xs font-medium scrollbar-thin">
          {/* CATEGORY: MAIN MENU */}
          <div>
            {(!collapsed || mobileOpen) ? (
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#008444] px-2 py-1 mb-1">
                MAIN MENU
              </div>
            ) : (
              <div className="h-px bg-gray-100 my-2 mx-1" />
            )}

            <div className="space-y-0.5">
              {/* Dashboard */}
              <Link
                href="/requests"
                onClick={onMobileClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group',
                  pathname === '/'
                    ? 'bg-kalbe-50 text-[#008444] font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
                title={collapsed && !mobileOpen ? 'Dashboard' : undefined}
              >
                <LayoutDashboard className="w-4 h-4 flex-shrink-0 text-gray-400 group-hover:text-[#008444]" />
                {(!collapsed || mobileOpen) && <span>Dashboard</span>}
              </Link>

              {/* Request (Accordion: Lab Analysis & BA/BE) */}
              <div>
                <button
                  type="button"
                  onClick={() => setRequestAccordionOpen((prev) => !prev)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors group',
                    pathname.startsWith('/requests')
                      ? 'bg-kalbe-50/60 text-[#008444] font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                  title={collapsed && !mobileOpen ? 'Request' : undefined}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 flex-shrink-0 text-gray-400 group-hover:text-[#008444]" />
                    {(!collapsed || mobileOpen) && <span>Request</span>}
                  </div>
                  {(!collapsed || mobileOpen) && (
                    <span className="text-gray-400 group-hover:text-gray-600">
                      {requestAccordionOpen ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </span>
                  )}
                </button>

                {/* Sub-menu accordion */}
                {requestAccordionOpen && (!collapsed || mobileOpen) && (
                  <div className="ml-4 pl-4 border-l border-gray-100 space-y-0.5 mt-0.5">
                    {/* Lab Analysis -> /requests */}
                    <Link
                      href="/requests"
                      onClick={onMobileClose}
                      className={cn(
                        'flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors text-xs',
                        pathname.startsWith('/requests')
                          ? 'text-[#008444] font-semibold bg-kalbe-50'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      )}
                    >
                      <span>Lab Analysis</span>
                      {pathname.startsWith('/requests') && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#008444]" />
                      )}
                    </Link>

                    {/* BA/BE */}
                    <span
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-gray-400 text-xs cursor-default select-none hover:bg-gray-50"
                      title="Coming Soon"
                    >
                      <span>BA/BE</span>
                      <span className="text-[9px] uppercase font-semibold text-gray-400 bg-gray-100 px-1 rounded">Soon</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Tracking Progress -> /trackings */}
              <Link
                href="/trackings"
                onClick={onMobileClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group',
                  pathname.startsWith('/trackings')
                    ? 'bg-kalbe-50 text-[#008444] font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
                title={collapsed && !mobileOpen ? 'Tracking Progress' : undefined}
              >
                <GitBranch className="w-4 h-4 flex-shrink-0 text-gray-400 group-hover:text-[#008444]" />
                {(!collapsed || mobileOpen) && <span>Tracking Progress</span>}
              </Link>

              {/* Data History */}
              <span
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 cursor-default select-none hover:bg-gray-50 group"
                title={collapsed && !mobileOpen ? 'Data History' : undefined}
              >
                <History className="w-4 h-4 flex-shrink-0 text-gray-300" />
                {(!collapsed || mobileOpen) && <span>Data History</span>}
              </span>

              {/* Documents */}
              <span
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 cursor-default select-none hover:bg-gray-50 group"
                title={collapsed && !mobileOpen ? 'Documents' : undefined}
              >
                <Files className="w-4 h-4 flex-shrink-0 text-gray-300" />
                {(!collapsed || mobileOpen) && <span>Documents</span>}
              </span>
            </div>
          </div>

          {/* CATEGORY: USER */}
          <div>
            {(!collapsed || mobileOpen) ? (
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#008444] px-2 py-1 mb-1">
                USER
              </div>
            ) : (
              <div className="h-px bg-gray-100 my-2 mx-1" />
            )}

            <div className="space-y-0.5">
              <span
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 cursor-default select-none hover:bg-gray-50 group"
                title={collapsed && !mobileOpen ? 'Profile' : undefined}
              >
                <User className="w-4 h-4 flex-shrink-0 text-gray-400" />
                {(!collapsed || mobileOpen) && <span>Profile</span>}
              </span>

              <span
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 cursor-default select-none hover:bg-gray-50 group"
                title={collapsed && !mobileOpen ? 'Change Password' : undefined}
              >
                <Key className="w-4 h-4 flex-shrink-0 text-gray-400" />
                {(!collapsed || mobileOpen) && <span>Change Password</span>}
              </span>
            </div>
          </div>

          {/* CATEGORY: MASTER */}
          <div>
            {(!collapsed || mobileOpen) ? (
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#008444] px-2 py-1 mb-1">
                MASTER
              </div>
            ) : (
              <div className="h-px bg-gray-100 my-2 mx-1" />
            )}

            <div className="space-y-0.5">
              {/* Customer */}
              <span
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 cursor-default select-none hover:bg-gray-50 group"
                title={collapsed && !mobileOpen ? 'Customer' : undefined}
              >
                <Users className="w-4 h-4 flex-shrink-0 text-gray-400" />
                {(!collapsed || mobileOpen) && <span>Customer</span>}
              </span>

              {/* Tracker -> /trackers */}
              <Link
                href="/trackers"
                onClick={onMobileClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group',
                  pathname.startsWith('/trackers')
                    ? 'bg-kalbe-50 text-[#008444] font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
                title={collapsed && !mobileOpen ? 'Tracker' : undefined}
              >
                <LayoutList className="w-4 h-4 flex-shrink-0 text-gray-400 group-hover:text-[#008444]" />
                {(!collapsed || mobileOpen) && <span>Tracker</span>}
              </Link>

              {/* Document */}
              <span
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 cursor-default select-none hover:bg-gray-50 group"
                title={collapsed && !mobileOpen ? 'Document' : undefined}
              >
                <FileCheck className="w-4 h-4 flex-shrink-0 text-gray-400" />
                {(!collapsed || mobileOpen) && <span>Document</span>}
              </span>

              {/* Notification */}
              <span
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 cursor-default select-none hover:bg-gray-50 group"
                title={collapsed && !mobileOpen ? 'Notification' : undefined}
              >
                <Bell className="w-4 h-4 flex-shrink-0 text-gray-400" />
                {(!collapsed || mobileOpen) && <span>Notification</span>}
              </span>

              {/* Setup */}
              <span
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 cursor-default select-none hover:bg-gray-50 group"
                title={collapsed && !mobileOpen ? 'Setup' : undefined}
              >
                <Settings className="w-4 h-4 flex-shrink-0 text-gray-400" />
                {(!collapsed || mobileOpen) && <span>Setup</span>}
              </span>

              {/* Lab Analysis */}
              <span
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 cursor-default select-none hover:bg-gray-50 group"
                title={collapsed && !mobileOpen ? 'Lab Analysis' : undefined}
              >
                <FlaskConical className="w-4 h-4 flex-shrink-0 text-gray-400" />
                {(!collapsed || mobileOpen) && <span>Lab Analysis</span>}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Sidebar: Branding teks PharmaMetricLabs */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/50">
          {(!collapsed || mobileOpen) ? (
            <div className="text-center">
              <p className="text-[11px] font-bold text-gray-600 tracking-wider">PharmaMetricLabs</p>
              <p className="text-[9px] text-gray-400">v1.0 Assessment</p>
            </div>
          ) : (
            <div className="text-center" title="PharmaMetricLabs">
              <span className="text-[10px] font-bold text-[#008444]">PML</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
