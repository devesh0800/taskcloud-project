'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, CheckCircle2, XCircle, ArrowLeft, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { apiClient } from '@/lib/axios';
import { toast } from 'sonner';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Resend state
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    async function executeVerification() {
      setVerifying(true);
      try {
        await apiClient.post('/auth/verify-email', { token });
        if (isMounted) {
          setVerified(true);
          toast.success('Your email has been verified successfully!');
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err.response?.data?.message || 'Verification link is invalid or has expired.');
        }
      } finally {
        if (isMounted) setVerifying(false);
      }
    }

    executeVerification();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;

    setResending(true);
    try {
      await apiClient.post('/auth/resend-verification', { email: resendEmail });
      toast.success('If the account exists and is unverified, a new verification link was sent.');
      setResendEmail('');
    } catch {
      toast.error('Failed to dispatch verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-border shadow-md bg-white">
      <CardHeader className="text-center pb-2">
        <div
          className={`mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-sm ${
            verified
              ? 'bg-emerald-100 text-emerald-600'
              : errorMessage
              ? 'bg-rose-100 text-rose-600'
              : 'bg-blue-50 text-[#2563EB]'
          }`}
        >
          {verifying ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : verified ? (
            <CheckCircle2 className="w-6 h-6" />
          ) : errorMessage ? (
            <XCircle className="w-6 h-6" />
          ) : (
            <Mail className="w-6 h-6" />
          )}
        </div>
        <CardTitle className="text-xl font-bold text-[#0F172A]">
          {verifying
            ? 'Verifying Email...'
            : verified
            ? 'Email Verified Successfully!'
            : errorMessage
            ? 'Verification Failed'
            : 'Email Verification'}
        </CardTitle>
        <CardDescription>
          {verifying
            ? 'Connecting to Neon PostgreSQL to validate verification token...'
            : verified
            ? 'Your EduSync account is now active and verified.'
            : errorMessage ||
              'Please check your inbox or submit your email to request a verification link.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {verified ? (
          <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-sm text-center">
            Thank you for confirming your email address. You now have full access to EduSync.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-700 mb-2">Need a new verification link?</p>
              <form onSubmit={handleResend} className="flex gap-2">
                <input
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="your@university.edu"
                  className="flex-1 px-3 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white text-slate-900"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={resending}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs gap-1"
                >
                  {resending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Resend
                </Button>
              </form>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2 pt-2">
        <Link href="/login" className="w-full">
          <Button className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold">
            Proceed to Sign In
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function VerifyEmailPage() {
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
            <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" /> Loading verification...
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
