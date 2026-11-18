'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  GraduationCap,
  BookOpen,
  Shield,
  Layers,
  ArrowRight,
  Sparkles,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const userDashboard =
    user?.role === 'TEACHER'
      ? '/teacher/dashboard'
      : user?.role === 'ADMIN'
      ? '/admin/dashboard'
      : '/student/dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Top Navigation */}
      <header className="border-b border-border bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#172554] flex items-center justify-center text-white shadow-md">
              <GraduationCap className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[#0F172A]">EduSync</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Academic Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-semibold text-slate-800">{user.fullName}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">
                    {user.role}
                  </span>
                </div>
                <Link href={userDashboard}>
                  <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-sm">
                    My Dashboard
                  </Button>
                </Link>
                <Button
                  onClick={async () => {
                    await logout();
                    router.push('/login');
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold text-rose-600 hover:bg-rose-50 border-slate-200"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" /> Sign Out
                </Button>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-sm font-semibold">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold shadow-sm">
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-24 border-b border-border bg-gradient-to-b from-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6">
              <Sparkles className="w-4 h-4 text-[#2563EB]" />
              Modern Academic & Evaluation Management
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#0F172A] tracking-tight leading-tight">
              Cloud-Based Assignment & Evaluation{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#7C3AED]">
                Platform
              </span>
            </h1>

            <p className="mt-6 text-lg text-slate-600 leading-relaxed">
              Empowering teachers and students with real-time class management, secure assignment submissions, automated grading, and comprehensive performance analytics.
            </p>

            {/* Quick Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              {isAuthenticated && user ? (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <Link href={userDashboard}>
                    <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-7 py-3 font-semibold shadow-md">
                      Go to Your {user.role} Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Button
                    onClick={async () => {
                      await logout();
                      router.push('/login');
                    }}
                    variant="outline"
                    className="border-slate-300 text-slate-700 px-5 py-3 font-medium"
                  >
                    Switch Account / Sign Out
                  </Button>
                </div>
              ) : (
                <>
                  <Link href="/teacher">
                    <Button className="bg-[#172554] hover:bg-[#0b0f19] text-white px-6 py-2.5 font-medium shadow-md">
                      <BookOpen className="w-4 h-4 mr-2 text-blue-400" />
                      Teacher Portal
                    </Button>
                  </Link>
                  <Link href="/student">
                    <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 py-2.5 font-medium shadow-md">
                      <GraduationCap className="w-4 h-4 mr-2" />
                      Student Portal
                    </Button>
                  </Link>
                  <Link href="/admin">
                    <Button variant="outline" className="px-6 py-2.5 font-medium border-slate-300">
                      <Shield className="w-4 h-4 mr-2 text-slate-600" />
                      Admin Panel
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Role Dashboards Workspaces Section */}
      <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
            Comprehensive Academic Workspaces
          </h2>
          <p className="mt-2 text-slate-600 text-sm">
            Everything you need for seamless teaching, active student participation, and academic excellence.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Teacher Portal */}
          <div className="p-6 rounded-2xl bg-white border border-border shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#0F172A] mb-2">Teacher Workspace</h3>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Create classes with joining codes, assign tasks, attach reference files, evaluate submissions, and award marks.
            </p>
            <Link
              href="/teacher"
              className="inline-flex items-center text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
            >
              Explore Teacher View <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          {/* Student Portal */}
          <div className="p-6 rounded-2xl bg-white border border-border shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#7C3AED] flex items-center justify-center mb-4">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#0F172A] mb-2">Student Workspace</h3>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Join teacher classes via code, review deadline countdowns, submit work with multiple file attachments, and track grades.
            </p>
            <Link
              href="/student"
              className="inline-flex items-center text-sm font-semibold text-[#7C3AED] hover:text-[#6D28D9]"
            >
              Explore Student View <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          {/* Admin Portal */}
          <div className="p-6 rounded-2xl bg-white border border-border shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#172554] flex items-center justify-center mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#0F172A] mb-2">Admin Control Center</h3>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              System monitoring, user roles management, platform analytics, and class activity audits.
            </p>
            <Link
              href="/admin"
              className="inline-flex items-center text-sm font-semibold text-[#172554] hover:text-[#0b0f19]"
            >
              Explore Admin View <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 EduSync. All rights reserved. Professional educational platform.</p>
          <div className="flex items-center gap-4">
            <span>Fast & Reliable</span>
            <span>•</span>
            <span>Real-time Sync</span>
            <span>•</span>
            <span>Secure Storage</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
