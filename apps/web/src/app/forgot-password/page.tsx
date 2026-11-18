'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { apiClient } from '@/lib/axios';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email });
      setSubmitted(true);
      toast.success('Password reset instructions dispatched.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not process password reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4">
      <div className="mb-6">
        <Link href="/login">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </Button>
        </Link>
      </div>

      <Card className="w-full max-w-md border-border shadow-md bg-white">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563EB] mb-3">
            <Mail className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl font-bold text-[#0F172A]">Reset Your Password</CardTitle>
          <CardDescription>
            Enter your registered email and we&apos;ll send single-use instructions to reset your password.
          </CardDescription>
        </CardHeader>

        {submitted ? (
          <CardContent className="space-y-4 pt-4 text-center">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="font-semibold text-emerald-900">Reset instructions dispatched</p>
                <p className="text-xs text-emerald-700 mt-1">
                  If an account exists for <strong className="font-semibold">{email}</strong>, check your inbox for your single-use reset link. In development, check the backend console terminal.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setSubmitted(false)}
              className="w-full text-xs font-semibold"
            >
              Try another email address
            </Button>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Registered Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@university.edu"
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
                Send Reset Link
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
