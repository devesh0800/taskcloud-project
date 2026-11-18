'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { GraduationCap, Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, isAuthenticated, logout } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('session_expired') === 'true') {
        toast.info('Your session has expired. Please sign in again.');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      const redirectPath = await login({ email, password, rememberMe });
      router.push(redirectPath);
    } catch {
      setLoading(false);
    }
  };

  const userDashboard =
    user?.role === 'TEACHER'
      ? '/teacher/dashboard'
      : user?.role === 'ADMIN'
      ? '/admin/dashboard'
      : '/student/dashboard';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Back to EduSync
          </Button>
        </Link>
      </div>

      {isAuthenticated && user ? (
        <Card className="w-full max-w-md border-border shadow-md bg-white text-center p-2">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center mb-3 shadow-sm border border-blue-100">
              <GraduationCap className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold text-[#0F172A]">Already Signed In</CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Active session found for this browser
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-left text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Account:</span>
                <span className="font-semibold text-slate-800">{user.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="text-slate-700 font-mono text-[11px]">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Role:</span>
                <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                  {user.role}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <Button
                onClick={() => router.push(userDashboard)}
                className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold py-2.5 shadow-sm"
              >
                Go to My {user.role} Dashboard
              </Button>
              <Button
                onClick={async () => {
                  await logout();
                }}
                variant="outline"
                className="w-full border-slate-200 text-rose-600 hover:bg-rose-50 font-semibold py-2.5"
              >
                Sign Out to Switch Account
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-md border-border shadow-md bg-white">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-xl bg-[#172554] flex items-center justify-center text-white mb-3 shadow">
              <GraduationCap className="w-6 h-6 text-[#2563EB]" />
            </div>
            <CardTitle className="text-xl font-bold text-[#0F172A]">Welcome to EduSync</CardTitle>
            <CardDescription>Sign in to your educational workspace</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@university.edu"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Password</label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                />
                <label htmlFor="rememberMe" className="text-xs text-slate-600 select-none cursor-pointer">
                  Remember me for 30 days
                </label>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold shadow-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Sign In
              </Button>
              <p className="text-xs text-center text-slate-500">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-[#2563EB] font-semibold hover:underline">
                  Register as Student or Teacher
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  );
}
