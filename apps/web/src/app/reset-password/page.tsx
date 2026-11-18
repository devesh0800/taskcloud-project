'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { apiClient } from '@/lib/axios';
import { toast } from 'sonner';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Missing password reset token in URL.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        password,
        confirmPassword,
      });

      setSuccess(true);
      toast.success('Your password has been successfully updated!');
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Password reset failed or token expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Card className="w-full max-w-md border-border shadow-md bg-white p-6 text-center space-y-4">
        <h2 className="text-lg font-bold text-red-600">Invalid Password Reset Link</h2>
        <p className="text-sm text-slate-600">
          No reset token was detected in the URL parameters. Please check your reset email or request a new reset link.
        </p>
        <Link href="/forgot-password">
          <Button className="bg-[#2563EB] text-white">Request New Reset Link</Button>
        </Link>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="w-full max-w-md border-border shadow-md bg-white p-6 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#0F172A]">Password Reset Complete</h2>
        <p className="text-sm text-slate-600">
          Your password has been securely updated. Redirecting you to the sign in page...
        </p>
        <Link href="/login">
          <Button className="bg-[#2563EB] text-white">Sign In Now</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-border shadow-md bg-white">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563EB] mb-3">
          <Lock className="w-6 h-6" />
        </div>
        <CardTitle className="text-xl font-bold text-[#0F172A]">Create New Password</CardTitle>
        <CardDescription>Enter a strong password with letters and numbers</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">New Password *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full pl-9 pr-10 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white text-slate-900"
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Confirm New Password *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white text-slate-900"
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Update Password
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4">
      <div className="mb-6">
        <Link href="/login">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </Button>
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" /> Loading reset token...
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
