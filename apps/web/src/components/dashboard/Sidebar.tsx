'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Inbox,
  Users,
  BarChart3,
  Award,
  UserCheck,
  History,
  Settings,
  LogOut,
  GraduationCap,
  Sparkles,
  User as UserIcon,
  Bell,
  FileBarChart,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSocket } from '@/contexts/SocketContext';

interface SidebarProps {
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ currentTab = 'overview', onSelectTab, mobileOpen = false, onCloseMobile }: SidebarProps) {
  const { user, logout } = useAuth();
  const { unreadCount } = useSocket();
  const pathname = usePathname();

  const role = user?.role || 'STUDENT';

  const teacherNav = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'classes', label: 'My Classes', icon: BookOpen },
    { id: 'assignments', label: 'Assignments', icon: FileText },
    { id: 'submissions', label: 'Submissions', icon: Inbox },
    { id: 'evaluations', label: 'Evaluations', icon: Award },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
    { id: 'students', label: 'Students', icon: Users },
  ];

  const studentNav = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'classes', label: 'My Classes', icon: BookOpen },
    { id: 'assignments', label: 'Assignments', icon: FileText },
    { id: 'submissions', label: 'Submissions', icon: Inbox },
    { id: 'grades', label: 'My Grades', icon: Award },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const adminNav = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'users', label: 'User Directory', icon: UserCheck },
    { id: 'logs', label: 'Activity Logs', icon: History },
  ];

  const navItems = role === 'TEACHER' ? teacherNav : role === 'ADMIN' ? adminNav : studentNav;

  const getRoleBadge = () => {
    switch (role) {
      case 'TEACHER':
        return <Badge className="bg-[#172554] text-white text-[10px] uppercase font-bold">Teacher</Badge>;
      case 'ADMIN':
        return <Badge className="bg-purple-900 text-white text-[10px] uppercase font-bold">Admin</Badge>;
      default:
        return <Badge className="bg-blue-700 text-white text-[10px] uppercase font-bold">Student</Badge>;
    }
  };

  const content = (
    <div className="flex flex-col h-full bg-[#0F172A] text-slate-300">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-white tracking-tight text-lg leading-tight flex items-center gap-1.5">
              EduSync
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Cloud Academic OS</span>
          </div>
        </Link>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* User Mini Bar */}
      <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <p className="text-xs font-bold text-white truncate">{user?.fullName}</p>
              {getRoleBadge()}
            </div>
            <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
          Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          const getHref = () => {
            if (role === 'TEACHER') {
              if (item.id === 'classes') return '/teacher/classes';
              if (item.id === 'assignments') return '/teacher/assignments';
              if (item.id === 'submissions') return '/teacher/submissions';
              if (item.id === 'evaluations') return '/teacher/evaluations';
              if (item.id === 'analytics') return '/teacher/analytics';
              if (item.id === 'reports') return '/teacher/reports';
              return `/teacher/dashboard?tab=${item.id}`;
            }
            if (role === 'ADMIN') {
              if (item.id === 'analytics') return '/admin/analytics';
              return `/admin/dashboard?tab=${item.id}`;
            }
            if (item.id === 'classes') return '/student/classes';
            if (item.id === 'assignments') return '/student/assignments';
            if (item.id === 'grades') return '/student/grades';
            if (item.id === 'analytics') return '/student/analytics';
            return `/student/dashboard?tab=${item.id}`;
          };

          return (
            <Link
              key={item.id}
              href={getHref()}
              onClick={() => {
                if (onSelectTab) onSelectTab(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-6 px-3 pb-2 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
          Account
        </div>
        <Link
          href="/notifications"
          onClick={() => onCloseMobile && onCloseMobile()}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all"
        >
          <div className="flex items-center gap-3">
            <Bell className="w-4 h-4 text-slate-400" />
            <span>Notifications</span>
          </div>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
        <Link
          href="/profile"
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all"
        >
          <UserIcon className="w-4 h-4 text-slate-400" />
          <span>My Profile</span>
        </Link>
      </nav>

      {/* Logout Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/60">
        <Button
          variant="outline"
          onClick={logout}
          className="w-full justify-center gap-2 text-xs font-semibold border-slate-700 bg-slate-800/50 hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 hover:border-rose-500/30 rounded-xl py-2"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-30 border-r border-slate-800">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0F172A] z-10 shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
