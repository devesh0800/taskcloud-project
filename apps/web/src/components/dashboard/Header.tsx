'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSocket, NotificationItem } from '@/contexts/SocketContext';
import {
  Menu,
  Bell,
  Search,
  CheckCheck,
  ExternalLink,
  BookOpen,
  GraduationCap,
  FileCheck2,
  Users,
  Info,
  Clock,
} from 'lucide-react';

interface HeaderProps {
  title?: string;
  onOpenMobile?: () => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  showSearch?: boolean;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSec < 60) return 'Just now';
    if (diffInSec < 3600) return `${Math.floor(diffInSec / 60)}m ago`;
    if (diffInSec < 86400) return `${Math.floor(diffInSec / 3600)}h ago`;
    if (diffInSec < 604800) return `${Math.floor(diffInSec / 86400)}d ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Recent';
  }
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'ASSIGNMENT_PUBLISHED':
      return <BookOpen className="w-3.5 h-3.5 text-blue-600" />;
    case 'GRADE_PUBLISHED':
      return <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />;
    case 'SUBMISSION_CREATED':
      return <FileCheck2 className="w-3.5 h-3.5 text-purple-600" />;
    case 'STUDENT_JOINED':
    case 'STUDENT_REMOVED':
      return <Users className="w-3.5 h-3.5 text-amber-600" />;
    default:
      return <Info className="w-3.5 h-3.5 text-slate-600" />;
  }
}

export function Header({
  title = 'Dashboard',
  onOpenMobile,
  searchValue = '',
  onSearchChange,
  showSearch = true,
}: HeaderProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, isConnected } = useSocket();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }
    setDropdownOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const previewNotifications = notifications.slice(0, 6);

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 md:px-8">
      {/* Left: Mobile hamburger & title */}
      <div className="flex items-center gap-3">
        {onOpenMobile && (
          <button
            onClick={onOpenMobile}
            className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight">{title}</h2>
          <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
            Welcome back, <span className="font-semibold text-slate-700">{user?.fullName}</span>
          </p>
        </div>
      </div>

      {/* Center: Search bar */}
      {showSearch && (
        <div className="hidden lg:flex items-center relative max-w-sm w-full mx-4">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search classes, assignments..."
            value={searchValue}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
          />
        </div>
      )}

      {/* Right: Notifications & Profile */}
      <div className="flex items-center gap-3">
        {/* Notification Bell & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className={`relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors ${
              dropdownOpen ? 'bg-slate-100 text-slate-900' : ''
            }`}
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-blue-600 rounded-full flex items-center justify-center ring-2 ring-white animate-in zoom-in-50 duration-200">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            {/* Live Socket Status indicator */}
            <span
              className={`absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
              title={isConnected ? 'Real-time connected' : 'Connecting to real-time service'}
            />
          </button>

          {/* Dropdown Panel */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-600 rounded-md">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {previewNotifications.length === 0 ? (
                  <div className="py-8 text-center px-4">
                    <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">No notifications</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      You are all caught up with classes and tasks!
                    </p>
                  </div>
                ) : (
                  previewNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-3 ${
                        !n.isRead ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="p-2 rounded-xl bg-slate-100 flex-shrink-0 mt-0.5">
                        {getNotificationIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={`text-xs truncate ${
                              !n.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                            }`}
                          >
                            {n.title}
                          </p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {formatRelativeTime(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                          {n.message}
                        </p>
                      </div>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-2" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-slate-100 text-center bg-slate-50/50">
                <Link
                  href="/notifications"
                  onClick={() => setDropdownOpen(false)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  View all notifications
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile Pill */}
        <Link
          href="/profile"
          className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
              {user?.fullName}
            </p>
            <p className="text-[10px] text-slate-400 uppercase font-medium">{user?.role}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
