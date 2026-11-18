'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/types';
import { Loader2, ShieldAlert, ArrowRight, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user)) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
          <p className="text-sm font-medium text-slate-500">Verifying session credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  // If role is not allowed, show informative Role Mismatch barrier with switch option
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const userDashboard =
      user.role === 'TEACHER'
        ? '/teacher/dashboard'
        : user.role === 'ADMIN'
        ? '/admin/dashboard'
        : '/student/dashboard';

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 text-center animate-in fade-in zoom-in-95 duration-150">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Access Restricted</h2>
          <p className="text-xs text-slate-500 mt-1">Role permission mismatch</p>

          <div className="my-5 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-left text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Current Account:</span>
              <span className="font-semibold text-slate-900">{user.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Active Role:</span>
              <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-blue-100 text-blue-700">
                {user.role}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Required Role:</span>
              <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 text-amber-800">
                {allowedRoles.join(' or ')}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            You are signed in as a <strong className="text-slate-800">{user.role}</strong>. To access this workspace, please switch to a <strong className="text-slate-800">{allowedRoles.join(' / ')}</strong> account or return to your dashboard.
          </p>

          <div className="flex flex-col gap-2.5">
            <Button
              onClick={() => router.push(userDashboard)}
              className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold py-2.5 shadow-sm"
            >
              Go to My {user.role} Dashboard <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <Button
              onClick={async () => {
                await logout();
                router.push('/login');
              }}
              variant="outline"
              className="w-full border-slate-200 text-rose-600 hover:bg-rose-50 font-semibold py-2.5"
            >
              <LogOut className="w-4 h-4 mr-2" /> Sign Out & Switch Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
